import { AppException } from '../../common/errors/app.exception';
import type { AppConfigService } from '../../config/app-config.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MailService } from '../mail/mail.service';
import type { OrganizationsService } from '../organizations/organizations.service';
import { AuthService } from './auth.service';
import type { PasswordHasherService } from './password-hasher.service';
import type { SessionsService } from './sessions.service';

const meta = { ipAddress: '127.0.0.1', userAgent: 'jest' };
const user = { id: 'user-1', email: 'ana@alpha.example', passwordHash: 'hash' };

function setup() {
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    organizationMember: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const hasher = {
    verify: jest.fn(),
    verifyAgainstDummy: jest.fn().mockResolvedValue(undefined),
    needsRehash: jest.fn().mockReturnValue(false),
    hash: jest.fn(),
  };
  const sessions = {
    create: jest.fn().mockResolvedValue({ token: 'token', expiresAt: new Date() }),
    resolve: jest.fn().mockResolvedValue({
      user: { id: user.id, name: 'Ana', email: user.email },
      session: { id: 's1', createdAt: new Date(), expiresAt: new Date() },
      organization: null,
      membership: null,
    }),
  };

  const service = new AuthService(
    prisma as unknown as PrismaService,
    {} as AppConfigService,
    hasher as unknown as PasswordHasherService,
    sessions as unknown as SessionsService,
    {} as OrganizationsService,
    {} as MailService,
  );

  return { service, prisma, hasher, sessions };
}

describe('AuthService.login', () => {
  it('executa verificação fictícia quando o e-mail não existe (tempo constante)', async () => {
    const { service, prisma, hasher, sessions } = setup();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login({ email: 'x@y.example', password: 'abc' }, meta)).rejects.toThrow(
      AppException,
    );
    expect(hasher.verifyAgainstDummy).toHaveBeenCalledWith('abc');
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('não cria sessão com senha incorreta', async () => {
    const { service, prisma, hasher, sessions } = setup();
    prisma.user.findUnique.mockResolvedValue(user);
    hasher.verify.mockResolvedValue(false);

    await expect(service.login({ email: user.email, password: 'errada' }, meta)).rejects.toThrow(
      'E-mail ou senha incorretos.',
    );
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it('ativa automaticamente a organização quando o usuário só tem uma', async () => {
    const { service, prisma, hasher, sessions } = setup();
    prisma.user.findUnique.mockResolvedValue(user);
    hasher.verify.mockResolvedValue(true);
    prisma.organizationMember.findMany.mockResolvedValueOnce([{ organizationId: 'org-1' }]);

    await service.login({ email: user.email, password: 'correta' }, meta);
    expect(sessions.create).toHaveBeenCalledWith(user.id, 'org-1', meta);
  });

  it('deixa a escolha para o usuário quando há várias organizações', async () => {
    const { service, prisma, hasher, sessions } = setup();
    prisma.user.findUnique.mockResolvedValue(user);
    hasher.verify.mockResolvedValue(true);
    prisma.organizationMember.findMany.mockResolvedValueOnce([
      { organizationId: 'org-1' },
      { organizationId: 'org-2' },
    ]);

    await service.login({ email: user.email, password: 'correta' }, meta);
    expect(sessions.create).toHaveBeenCalledWith(user.id, null, meta);
  });
});
