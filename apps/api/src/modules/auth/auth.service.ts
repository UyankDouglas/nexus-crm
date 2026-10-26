import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  API_ERROR_CODES,
  permissionsForRole,
  type MeResponse,
  type MessageResponse,
} from '@nexus/shared';
import type { AuthContext } from '../../common/auth/auth-context';
import { AppException } from '../../common/errors/app.exception';
import { generateToken, sha256 } from '../../common/security/tokens';
import { maskEmail, type RequestMeta } from '../../common/utils/request-meta';
import { AppConfigService } from '../../config/app-config.service';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OrganizationsService } from '../organizations/organizations.service';
import type {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth-request.dto';
import { PasswordHasherService } from './password-hasher.service';
import { SessionsService } from './sessions.service';

export interface AuthResult {
  token: string;
  me: MeResponse;
}

const FORGOT_PASSWORD_MESSAGE =
  'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly hasher: PasswordHasherService,
    private readonly sessions: SessionsService,
    private readonly organizations: OrganizationsService,
    private readonly mail: MailService,
  ) {}

  /** Cadastro inicial: cria usuário, organização e vínculo de administrador em uma transação. */
  async register(dto: RegisterDto, meta: RequestMeta): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) throw this.emailInUse();

    const passwordHash = await this.hasher.hash(dto.password);

    try {
      const { userId, organizationId } = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: dto.name, email: dto.email, passwordHash, lastLoginAt: new Date() },
        });
        const organization = await this.organizations.createWithAdmin(tx, {
          name: dto.organizationName,
          adminUserId: user.id,
        });
        return { userId: user.id, organizationId: organization.id };
      });

      return await this.startSession(userId, organizationId, meta);
    } catch (error) {
      // Corrida entre dois cadastros simultâneos com o mesmo e-mail.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (await this.prisma.user.count({ where: { email: dto.email } })) > 0
      ) {
        throw this.emailInUse();
      }
      throw error;
    }
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      await this.hasher.verifyAgainstDummy(dto.password);
      throw this.invalidCredentials();
    }
    if (!(await this.hasher.verify(user.passwordHash, dto.password))) {
      throw this.invalidCredentials();
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      select: { organizationId: true },
    });
    // Com uma única organização ela já é ativada; com várias, o usuário escolhe no frontend.
    const activeOrganizationId = memberships.length === 1 ? memberships[0]!.organizationId : null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        ...(this.hasher.needsRehash(user.passwordHash)
          ? { passwordHash: await this.hasher.hash(dto.password) }
          : {}),
      },
    });

    return this.startSession(user.id, activeOrganizationId, meta);
  }

  async logout(auth: AuthContext): Promise<void> {
    await this.sessions.revoke(auth.session.id);
  }

  async switchOrganization(auth: AuthContext, organizationId: string): Promise<MeResponse> {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: auth.user.id } },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });

    // Mesma resposta para organização inexistente ou sem vínculo: não revela quais existem.
    if (!member || member.status !== 'ACTIVE') {
      throw AppException.forbidden('Você não tem acesso a esta organização.');
    }

    await this.sessions.setActiveOrganization(auth.session.id, organizationId);

    return this.buildMe({
      ...auth,
      organization: member.organization,
      membership: { id: member.id, role: member.role },
    });
  }

  async buildMe(auth: AuthContext): Promise<MeResponse> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: auth.user.id, status: 'ACTIVE' },
      include: { organization: { select: { id: true, name: true, slug: true } } },
      orderBy: { organization: { name: 'asc' } },
    });

    return {
      user: auth.user,
      memberships: memberships.map((member) => ({
        organizationId: member.organization.id,
        organizationName: member.organization.name,
        organizationSlug: member.organization.slug,
        role: member.role,
      })),
      activeOrganization:
        auth.organization && auth.membership
          ? {
              ...auth.organization,
              role: auth.membership.role,
              permissions: permissionsForRole(auth.membership.role),
            }
          : null,
      session: {
        createdAt: auth.session.createdAt.toISOString(),
        expiresAt: auth.session.expiresAt.toISOString(),
      },
    };
  }

  /** Sempre responde com a mesma mensagem, exista ou não o e-mail (evita enumeração). */
  async requestPasswordReset(dto: ForgotPasswordDto): Promise<MessageResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      const token = generateToken(32);
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        this.prisma.passwordResetToken.create({
          data: {
            tokenHash: sha256(token),
            userId: user.id,
            expiresAt: new Date(Date.now() + this.config.passwordResetTtlMs),
          },
        }),
      ]);

      const link = new URL('/redefinir-senha', this.config.appUrl);
      link.searchParams.set('token', token);
      const minutes = Math.round(this.config.passwordResetTtlMs / 60_000);

      // Envio em segundo plano: a resposta tem o mesmo status e o mesmo tempo para e-mails
      // cadastrados ou não, mesmo quando o servidor de e-mail é lento ou falha.
      void this.mail
        .send({
          to: user.email,
          subject: 'Redefinição de senha — NEXUS CRM',
          text: [
            `Olá, ${user.name}.`,
            '',
            'Recebemos uma solicitação para redefinir a senha da sua conta no NEXUS CRM.',
            `Para criar uma nova senha, acesse o link abaixo (válido por ${minutes} minutos):`,
            '',
            link.toString(),
            '',
            'Se você não fez esta solicitação, ignore este e-mail. Sua senha atual continua válida.',
          ].join('\n'),
        })
        .catch((error: unknown) =>
          this.logger.error(
            `Falha ao enviar a redefinição de senha para ${maskEmail(user.email)}: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
    }

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  /** Redefine a senha, invalida o token e encerra todas as sessões ativas do usuário. */
  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponse> {
    const now = new Date();
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(dto.token) },
    });

    if (!record || record.usedAt || record.expiresAt <= now) {
      throw this.invalidResetToken();
    }

    const passwordHash = await this.hasher.hash(dto.password);

    await this.prisma.$transaction(async (tx) => {
      // A condição `usedAt: null` torna o consumo do token atômico sob concorrência.
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) throw this.invalidResetToken();

      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await tx.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    return { message: 'Senha redefinida com sucesso. Entre com a nova senha.' };
  }

  private async startSession(
    userId: string,
    activeOrganizationId: string | null,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const { token } = await this.sessions.create(userId, activeOrganizationId, meta);
    const auth = await this.sessions.resolve(token);
    if (!auth) throw new Error('Sessão recém-criada não pôde ser carregada.');
    return { token, me: await this.buildMe(auth) };
  }

  private invalidCredentials(): AppException {
    return new AppException(
      HttpStatus.UNAUTHORIZED,
      API_ERROR_CODES.INVALID_CREDENTIALS,
      'E-mail ou senha incorretos.',
    );
  }

  private emailInUse(): AppException {
    return new AppException(
      HttpStatus.CONFLICT,
      API_ERROR_CODES.EMAIL_IN_USE,
      'Já existe uma conta com este e-mail.',
      { email: ['Já existe uma conta com este e-mail.'] },
    );
  }

  private invalidResetToken(): AppException {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      API_ERROR_CODES.INVALID_RESET_TOKEN,
      'Link de redefinição inválido ou expirado. Solicite um novo.',
    );
  }
}
