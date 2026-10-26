import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { createTransport, type Transporter } from 'nodemailer';
import { maskEmail } from '../../common/utils/request-meta';
import { slugify } from '../../common/utils/slug';
import { AppConfigService } from '../../config/app-config.service';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Envio de e-mails (convites e redefinição de senha):
 *  - com `SMTP_URL`, envia pelo servidor SMTP configurado;
 *  - sem SMTP, em desenvolvimento grava cada mensagem como `.eml` em `MAIL_OUTBOX_DIR`;
 *  - sem SMTP, em produção não envia e registra um aviso.
 * O conteúdo (que contém links com tokens) e a URL do SMTP nunca vão para os logs.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;

  constructor(private readonly config: AppConfigService) {}

  async send(message: MailMessage): Promise<void> {
    const smtpUrl = this.config.smtpUrl;
    if (smtpUrl) {
      this.transporter ??= createTransport(smtpUrl);
      await this.transporter.sendMail({ from: this.config.mailFrom, ...message });
      this.logger.log(`E-mail "${message.subject}" enviado para ${maskEmail(message.to)}`);
      return;
    }

    if (this.config.isProduction) {
      this.logger.warn(
        `SMTP_URL não configurado; mensagem "${message.subject}" para ${maskEmail(message.to)} não enviada.`,
      );
      return;
    }

    const outbox = resolve(process.cwd(), this.config.mailOutboxDir);
    await mkdir(outbox, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(outbox, `${timestamp}-${slugify(message.subject)}.eml`);
    await writeFile(file, this.toEml(message), 'utf8');

    this.logger.log(
      `E-mail para ${maskEmail(message.to)} gravado em ${relative(process.cwd(), file)}`,
    );
  }

  private toEml(message: MailMessage): string {
    return [
      `From: ${this.config.mailFrom}`,
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      `Date: ${new Date().toUTCString()}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      message.text,
      '',
    ].join('\r\n');
  }
}
