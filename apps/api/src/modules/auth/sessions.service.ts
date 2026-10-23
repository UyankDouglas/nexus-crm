import { Injectable, Logger } from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth-context';
import { generateToken, sha256 } from '../../common/security/tokens';
import type { RequestMeta } from '../../common/utils/request-meta';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';

/** Intervalo mínimo entre atualizações de `lastUsedAt`, evitando uma escrita por requisição. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async create(
    userId: string,
    activeOrganizationId: string | null,
    meta: RequestMeta,
  ): Promise<CreatedSession> {
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + this.config.sessionTtlMs);

    await this.prisma.session.create({
      data: {
        tokenHash: sha256(token),
        userId,
        activeOrganizationId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  /**
   * Resolve o token do cookie em um contexto autenticado. Retorna `null` para sessões
   * inexistentes, expiradas ou revogadas. A organização ativa só é considerada quando
   * o vínculo do usuário com ela continua ATIVO.
   */
  async resolve(token: string): Promise<AuthContext | null> {
    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!session || session.revokedAt || session.expiresAt <= now) {
      return null;
    }

    let organization: AuthContext['organization'] = null;
    let membership: AuthContext['membership'] = null;

    if (session.activeOrganizationId) {
      const member = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: session.activeOrganizationId,
            userId: session.userId,
          },
        },
        include: { organization: { select: { id: true, name: true, slug: true } } },
      });

      if (member?.status === 'ACTIVE') {
        organization = member.organization;
        membership = { id: member.id, role: member.role };
      }
    }

    if (now.getTime() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.session
        .update({ where: { id: session.id }, data: { lastUsedAt: now } })
        .catch((error: unknown) =>
          this.logger.warn(`Falha ao atualizar lastUsedAt da sessão: ${String(error)}`),
        );
    }

    return {
      user: session.user,
      session: { id: session.id, createdAt: session.createdAt, expiresAt: session.expiresAt },
      organization,
      membership,
    };
  }

  async setActiveOrganization(sessionId: string, organizationId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { activeOrganizationId: organizationId },
    });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
