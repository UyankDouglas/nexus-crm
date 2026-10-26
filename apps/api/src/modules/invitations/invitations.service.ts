import { HttpStatus, Injectable } from '@nestjs/common';
import {
  API_ERROR_CODES,
  INVITATION_TTL_DAYS,
  ROLE_LABELS,
  type InvitationItem,
  type InvitationPreview,
} from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { AppException } from '../../common/errors/app.exception';
import { generateToken, sha256 } from '../../common/security/tokens';
import { AppConfigService } from '../../config/app-config.service';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { actorOf, AuditService } from '../audit/audit.service';
import { PasswordHasherService } from '../auth/password-hasher.service';
import { MailService } from '../mail/mail.service';
import type { AcceptInvitationDto, CreateInvitationDto } from './dto/invitation-request.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

const invitationInclude = {
  invitedBy: { select: { id: true, name: true } },
} satisfies Prisma.InvitationInclude;

type InvitationWithInviter = Prisma.InvitationGetPayload<{ include: typeof invitationInclude }>;

/** Convite ainda utilizável: nem aceito, nem cancelado. A validade é checada à parte. */
const pending = { acceptedAt: null, revokedAt: null } satisfies Prisma.InvitationWhereInput;

export interface AcceptedInvitation {
  userId: string;
  organizationId: string;
  organizationName: string;
  accountCreated: boolean;
}

/**
 * Convites por e-mail. O link carrega um token aleatório de 256 bits; o banco guarda apenas o
 * hash SHA-256. Possuir o link prova o acesso à caixa de e-mail convidada (como na redefinição
 * de senha), e o aceite consome o convite de forma atômica.
 */
@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly hasher: PasswordHasherService,
  ) {}

  async list(auth: TenantAuthContext): Promise<InvitationItem[]> {
    const invitations = await this.prisma.invitation.findMany({
      where: { organizationId: auth.organization.id, ...pending },
      include: invitationInclude,
      orderBy: { createdAt: 'desc' },
    });
    return invitations.map(toInvitationItem);
  }

  async create(auth: TenantAuthContext, dto: CreateInvitationDto): Promise<InvitationItem> {
    const organizationId = auth.organization.id;
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, user: { email: dto.email } },
      select: { status: true },
    });
    if (member) {
      throw AppException.conflict(
        member.status === 'ACTIVE'
          ? 'Este e-mail já pertence a um membro da organização.'
          : 'Este e-mail pertence a um membro suspenso. Reative o acesso na lista de membros.',
      );
    }

    const token = generateToken(32);
    const now = new Date();
    let invitation: InvitationWithInviter;
    try {
      invitation = await this.prisma.$transaction(async (tx) => {
        const current = await tx.invitation.findFirst({
          where: { organizationId, email: dto.email, ...pending },
        });
        if (current && current.expiresAt > now) {
          throw AppException.conflict(
            'Já existe um convite pendente para este e-mail. Reenvie ou cancele o convite atual.',
          );
        }
        // Um convite vencido dá lugar ao novo.
        if (current) {
          await tx.invitation.update({ where: { id: current.id }, data: { revokedAt: now } });
        }

        const created = await tx.invitation.create({
          data: {
            organizationId,
            email: dto.email,
            role: dto.role,
            tokenHash: sha256(token),
            invitedById: auth.user.id,
            expiresAt: this.expiry(now),
          },
          include: invitationInclude,
        });
        await this.audit.record(tx, actorOf(auth), {
          action: 'invitation.created',
          entityType: 'invitation',
          entityId: created.id,
          summary: `Convite enviado para ${dto.email} como ${ROLE_LABELS[dto.role]}.`,
          metadata: { email: dto.email, role: dto.role },
        });
        return created;
      });
    } catch (error) {
      // Dois convites simultâneos para o mesmo e-mail: o índice parcial único recusa o segundo.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw AppException.conflict('Já existe um convite pendente para este e-mail.');
      }
      throw error;
    }

    await this.sendInvitationEmail(auth, invitation, token);
    return toInvitationItem(invitation);
  }

  /** Gera um novo link (o anterior deixa de valer) e renova a validade. */
  async resend(auth: TenantAuthContext, id: string): Promise<InvitationItem> {
    const current = await this.findPending(auth, id);
    const token = generateToken(32);
    const invitation = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.invitation.update({
        where: { id: current.id },
        data: { tokenHash: sha256(token), expiresAt: this.expiry(new Date()) },
        include: invitationInclude,
      });
      await this.audit.record(tx, actorOf(auth), {
        action: 'invitation.resent',
        entityType: 'invitation',
        entityId: id,
        summary: `Convite reenviado para ${current.email}.`,
      });
      return updated;
    });

    await this.sendInvitationEmail(auth, invitation, token);
    return toInvitationItem(invitation);
  }

  async revoke(auth: TenantAuthContext, id: string): Promise<void> {
    const current = await this.findPending(auth, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({ where: { id: current.id }, data: { revokedAt: new Date() } });
      await this.audit.record(tx, actorOf(auth), {
        action: 'invitation.revoked',
        entityType: 'invitation',
        entityId: id,
        summary: `Convite para ${current.email} cancelado.`,
      });
    });
  }

  async preview(token: string): Promise<InvitationPreview> {
    const invitation = await this.findUsable(token);
    const account = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });
    return {
      organizationName: invitation.organization.name,
      email: invitation.email,
      role: invitation.role,
      invitedBy: invitation.invitedBy?.name ?? null,
      expiresAt: invitation.expiresAt.toISOString(),
      accountExists: account !== null,
    };
  }

  /**
   * Aceita o convite: quem já tem conta ganha o vínculo com a organização; quem não tem cria a
   * conta com nome e senha. O convite é consumido na mesma transação.
   */
  async accept(dto: AcceptInvitationDto): Promise<AcceptedInvitation> {
    const invitation = await this.findUsable(dto.token);
    const existing = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true, name: true },
    });

    let passwordHash: string | null = null;
    if (!existing) {
      const fieldErrors: Record<string, string[]> = {};
      if (!dto.name) fieldErrors.name = ['Informe o nome.'];
      if (!dto.password) fieldErrors.password = ['Crie uma senha.'];
      if (Object.keys(fieldErrors).length) throw AppException.validation(fieldErrors);
      passwordHash = await this.hasher.hash(dto.password!);
    }

    const now = new Date();
    const organizationId = invitation.organizationId;
    const userId = await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.invitation.updateMany({
        where: { id: invitation.id, ...pending, expiresAt: { gt: now } },
        data: { acceptedAt: now },
      });
      if (consumed.count !== 1) throw invalidInvitation();

      const user =
        existing ??
        (await tx.user.create({
          // A conta nova já sai com sessão aberta, como no cadastro.
          data: {
            name: dto.name!,
            email: invitation.email,
            passwordHash: passwordHash!,
            lastLoginAt: new Date(),
          },
          select: { id: true, name: true },
        }));

      const membership = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.id } },
        select: { id: true },
      });
      if (membership) throw AppException.conflict('Você já faz parte desta organização.');

      await tx.organizationMember.create({
        data: { organizationId, userId: user.id, role: invitation.role },
      });
      await this.audit.record(
        tx,
        { organizationId, actorId: user.id },
        {
          action: 'invitation.accepted',
          entityType: 'invitation',
          entityId: invitation.id,
          summary: `${user.name} aceitou o convite e entrou como ${ROLE_LABELS[invitation.role]}.`,
          metadata: { email: invitation.email, role: invitation.role, accountCreated: !existing },
        },
      );
      return user.id;
    });

    return {
      userId,
      organizationId,
      organizationName: invitation.organization.name,
      accountCreated: !existing,
    };
  }

  private async findPending(auth: TenantAuthContext, id: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id, organizationId: auth.organization.id, ...pending },
    });
    if (!invitation) throw AppException.notFound('Convite não encontrado.');
    return invitation;
  }

  /** Convite pelo token, desde que pendente e dentro da validade. */
  private async findUsable(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: sha256(token) },
      include: { ...invitationInclude, organization: { select: { name: true } } },
    });
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= new Date()
    ) {
      throw invalidInvitation();
    }
    return invitation;
  }

  private expiry(from: Date): Date {
    return new Date(from.getTime() + INVITATION_TTL_DAYS * DAY_MS);
  }

  private async sendInvitationEmail(
    auth: TenantAuthContext,
    invitation: InvitationWithInviter,
    token: string,
  ): Promise<void> {
    const link = new URL('/convite', this.config.appUrl);
    link.searchParams.set('token', token);
    await this.mail.send({
      to: invitation.email,
      subject: `Convite para ${auth.organization.name} — NEXUS CRM`,
      text: [
        'Olá!',
        '',
        `${auth.user.name} convidou você para participar da organização ${auth.organization.name} no NEXUS CRM, com o perfil ${ROLE_LABELS[invitation.role]}.`,
        '',
        `Para aceitar, acesse o link abaixo (válido por ${INVITATION_TTL_DAYS} dias):`,
        '',
        link.toString(),
        '',
        'Se você não esperava este convite, ignore este e-mail.',
      ].join('\n'),
    });
  }
}

function invalidInvitation(): AppException {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    API_ERROR_CODES.INVALID_INVITATION,
    'Convite inválido, expirado ou já utilizado. Peça um novo convite ao administrador.',
  );
}

function toInvitationItem(invitation: InvitationWithInviter): InvitationItem {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    invitedBy: invitation.invitedBy,
    createdAt: invitation.createdAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
    expired: invitation.expiresAt <= new Date(),
  };
}
