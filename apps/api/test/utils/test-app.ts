import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { MeResponse } from '@nexus/shared';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import type { MemberRole } from '../../src/generated/prisma/client';
import { createDefaultPipeline } from '../../src/modules/deals/default-pipeline';
import type { MailMessage } from '../../src/modules/mail/mail.service';
import { MailService } from '../../src/modules/mail/mail.service';
import { PrismaService } from '../../src/prisma/prisma.service';

/** Substitui o envio de e-mails, guardando as mensagens para inspeção nos testes. */
export class FakeMailService {
  readonly sent: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }

  lastTo(email: string): MailMessage | undefined {
    return this.sent.filter((message) => message.to === email).at(-1);
  }
}

export interface TestContext {
  app: NestExpressApplication;
  prisma: PrismaService;
  mail: FakeMailService;
}

export async function createTestApp(): Promise<TestContext> {
  const mail = new FakeMailService();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app);
  // Porta aleatória: o servidor permanece ativo entre as requisições do `request.agent`.
  await app.listen(0, '127.0.0.1');

  return { app, prisma: app.get(PrismaService), mail };
}

/** Limpa todas as tabelas do banco de testes (comando fixo, sem entrada externa). */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "audit_logs", "invitations", "activities", "tasks", "deal_stage_history", "deals", "pipeline_stages", "pipelines", "contacts", "customers", "password_reset_tokens", "sessions", "organization_members", "organizations", "users" CASCADE',
  );
}

export const TEST_PASSWORD = 'SenhaSegura123';
let passwordHash: Promise<string> | undefined;

export async function createUser(
  prisma: PrismaService,
  data: { name: string; email: string },
): Promise<{ id: string; email: string }> {
  passwordHash ??= argon2.hash(TEST_PASSWORD, { type: argon2.argon2id });
  return prisma.user.create({
    data: { ...data, passwordHash: await passwordHash },
    select: { id: true, email: true },
  });
}

/** Cria a organização já com o funil padrão, como acontece no cadastro. */
export async function createOrganization(
  prisma: PrismaService,
  data: { name: string; slug: string },
): Promise<{ id: string }> {
  const organization = await prisma.organization.create({ data, select: { id: true } });
  await createDefaultPipeline(prisma, organization.id);
  return organization;
}

export async function addMember(
  prisma: PrismaService,
  organizationId: string,
  userId: string,
  role: MemberRole,
): Promise<void> {
  await prisma.organizationMember.create({ data: { organizationId, userId, role } });
}

/**
 * Cliente HTTP com cookies persistentes (como um navegador) que obtém e envia o
 * token CSRF automaticamente nas requisições de escrita.
 */
export class HttpClient {
  readonly agent: ReturnType<typeof request.agent>;
  private csrfToken?: string;

  constructor(app: NestExpressApplication) {
    this.agent = request.agent(app.getHttpServer());
  }

  async csrf(): Promise<string> {
    if (!this.csrfToken) {
      const response = await this.agent.get('/api/auth/csrf').expect(200);
      this.csrfToken = (response.body as { csrfToken: string }).csrfToken;
    }
    return this.csrfToken;
  }

  get(path: string) {
    return this.agent.get(`/api${path}`);
  }

  // O token é obtido antes de criar a requisição: o agent anexa os cookies na criação.
  async post(path: string, body?: object) {
    const token = await this.csrf();
    return this.agent.post(`/api${path}`).set('X-CSRF-Token', token).send(body);
  }

  async patch(path: string, body?: object) {
    const token = await this.csrf();
    return this.agent.patch(`/api${path}`).set('X-CSRF-Token', token).send(body);
  }

  async put(path: string, body?: object) {
    const token = await this.csrf();
    return this.agent.put(`/api${path}`).set('X-CSRF-Token', token).send(body);
  }

  async delete(path: string) {
    const token = await this.csrf();
    return this.agent.delete(`/api${path}`).set('X-CSRF-Token', token);
  }

  async login(email: string, password = TEST_PASSWORD): Promise<MeResponse> {
    const response = await this.post('/auth/login', { email, password });
    if (response.status !== 200) {
      throw new Error(`Login falhou (${response.status}): ${JSON.stringify(response.body)}`);
    }
    return response.body as MeResponse;
  }
}

export function sessionCookieFrom(response: request.Response): string | undefined {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined;
  return header?.find((cookie) => cookie.startsWith('nexus_session='));
}
