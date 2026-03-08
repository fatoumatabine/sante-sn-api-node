import nodemailer, { Transporter } from 'nodemailer';

type MailFailureReason = 'SMTP_NOT_CONFIGURED' | 'SMTP_SEND_FAILED';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
}

interface PasswordResetEmailInput {
  to: string;
  resetLink: string;
  expiresInMinutes: number;
}

export interface MailSendResult {
  sent: boolean;
  reason?: MailFailureReason;
}

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

function resolveSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim() || process.env.MAIL_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim() || process.env.MAIL_PORT?.trim();
  const user = process.env.SMTP_USER?.trim() || process.env.MAIL_USERNAME?.trim();
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASSWORD;

  if (isBlank(host) || isBlank(portRaw) || isBlank(user) || isBlank(pass)) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  const secureFromEnv = process.env.SMTP_SECURE?.trim();
  const mailEncryption = process.env.MAIL_ENCRYPTION?.trim().toLowerCase();
  const secure = secureFromEnv
    ? secureFromEnv === 'true'
    : mailEncryption
      ? mailEncryption === 'ssl'
      : port === 465;

  const fromAddress = process.env.MAIL_FROM_ADDRESS?.trim();
  const fromName = process.env.MAIL_FROM_NAME?.trim();
  const fromByParts = fromAddress
    ? (fromName ? `${fromName} <${fromAddress}>` : fromAddress)
    : '';
  const from = (process.env.MAIL_FROM?.trim() || fromByParts || user)!;

  return {
    host: host!,
    port,
    user: user!,
    pass: pass!,
    secure,
    from,
  };
}

class MailerService {
  private transporter: Transporter | null = null;
  private smtpConfig: SmtpConfig | null = null;
  private warnedMissingSmtp = false;

  constructor() {
    this.smtpConfig = resolveSmtpConfig();

    if (this.smtpConfig) {
      this.transporter = nodemailer.createTransport({
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        secure: this.smtpConfig.secure,
        auth: {
          user: this.smtpConfig.user,
          pass: this.smtpConfig.pass,
        },
      });
    }
  }

  private ensureSmtpConfigured(): boolean {
    if (this.smtpConfig && this.transporter) {
      return true;
    }

    if (!this.warnedMissingSmtp) {
      console.warn('[Mail] SMTP non configuré. Aucun email sortant ne sera envoyé.');
      this.warnedMissingSmtp = true;
    }

    return false;
  }

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<MailSendResult> {
    if (!this.ensureSmtpConfigured()) {
      return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    try {
      await this.transporter!.sendMail({
        from: this.smtpConfig!.from,
        to: input.to,
        subject: 'Réinitialisation de votre mot de passe - Santé SN',
        text: [
          'Vous avez demandé la réinitialisation de votre mot de passe.',
          `Ce lien est valide pendant ${input.expiresInMinutes} minutes.`,
          '',
          `Lien: ${input.resetLink}`,
          '',
          'Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.',
        ].join('\n'),
        html: [
          '<p>Vous avez demandé la réinitialisation de votre mot de passe.</p>',
          `<p>Ce lien est valide pendant <strong>${input.expiresInMinutes} minutes</strong>.</p>`,
          `<p><a href="${input.resetLink}">Réinitialiser mon mot de passe</a></p>`,
          "<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>",
        ].join(''),
      });

      return { sent: true };
    } catch (error) {
      console.error('[Mail] Échec de l’envoi de l’email de réinitialisation:', error);
      return { sent: false, reason: 'SMTP_SEND_FAILED' };
    }
  }
}

export const mailerService = new MailerService();
