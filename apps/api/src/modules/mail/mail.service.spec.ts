import { Logger } from '@nestjs/common';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTransport } from 'nodemailer';
import type { AppConfigService } from '../../config/app-config.service';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const MESSAGE = {
  to: 'pessoa@empresa.example',
  subject: 'Convite para Horizonte',
  text: 'Acesse http://localhost:5173/convite?token=segredo',
};

function serviceWith(config: Partial<AppConfigService>): MailService {
  return new MailService({
    isProduction: false,
    mailFrom: 'NEXUS CRM <nao-responda@nexuscrm.local>',
    mailOutboxDir: '.mail-outbox',
    smtpUrl: undefined,
    ...config,
  } as AppConfigService);
}

describe('MailService', () => {
  const sendMail = jest.fn().mockResolvedValue({});
  let logs: jest.SpyInstance[];

  beforeEach(() => {
    sendMail.mockClear();
    jest.mocked(createTransport).mockClear();
    jest.mocked(createTransport).mockReturnValue({ sendMail } as never);
    logs = [
      jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined),
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined),
    ];
  });

  afterEach(() => {
    logs.forEach((spy) => spy.mockRestore());
  });

  it('envia pelo SMTP configurado sem registrar a URL nem o conteúdo nos logs', async () => {
    const smtpUrl = 'smtps://usuario:senha-secreta@smtp.example.com:465';
    const service = serviceWith({ isProduction: true, smtpUrl });

    await service.send(MESSAGE);
    await service.send(MESSAGE);

    expect(createTransport).toHaveBeenCalledWith(smtpUrl);
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({
      from: 'NEXUS CRM <nao-responda@nexuscrm.local>',
      ...MESSAGE,
    });
    const logged = JSON.stringify(logs.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain('senha-secreta');
    expect(logged).not.toContain('token=');
    expect(logged).not.toContain('pessoa@empresa.example');
  });

  it('em produção sem SMTP, não envia e avisa', async () => {
    await serviceWith({ isProduction: true }).send(MESSAGE);

    expect(createTransport).not.toHaveBeenCalled();
    expect(logs[1]).toHaveBeenCalledWith(expect.stringContaining('SMTP_URL não configurado'));
  });

  it('em desenvolvimento sem SMTP, grava a mensagem na caixa de saída local', async () => {
    const outbox = await mkdtemp(join(tmpdir(), 'nexus-mail-'));
    try {
      await serviceWith({ mailOutboxDir: outbox }).send(MESSAGE);

      const [file] = await readdir(outbox);
      expect(file).toMatch(/convite-para-horizonte\.eml$/);
      const eml = await readFile(join(outbox, file!), 'utf8');
      expect(eml).toContain('To: pessoa@empresa.example');
      expect(eml).toContain(MESSAGE.text);
    } finally {
      await rm(outbox, { recursive: true, force: true });
    }
  });
});
