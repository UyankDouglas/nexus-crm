import { Injectable, Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { maskEmail } from '../../common/utils/request-meta';
import { slugify } from '../../common/utils/slug';
import { AppConfigService } from '../../config/app-config.service';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Envio de e-mails. Nesta fase não há provedor SMTP: em desenvolvimento as mensagens
 * são gravadas como arquivos `.eml` na pasta `MAIL_OUTBOX_DIR` (fora do Git), sem
 * registrar o conteúdo — que pode conter links com tokens — nos logs.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: AppConfigService) {}

  async send(message: MailMessage): Promise<void> {
    if (this.config.isProduction) {
      this.logger.warn(
        `Nenhum provedor de e-mail configurado; mensagem "${message.subject}" para ${maskEmail(message.to)} não enviada.`,
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
      'From: NEXUS CRM <nao-responda@nexuscrm.local>',
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
