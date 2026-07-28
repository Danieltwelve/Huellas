import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Envía un correo intentando primero con Resend y luego con SMTP (nodemailer).
   * Retorna true si se envió exitosamente por alguno de los dos métodos.
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const sentByResend = await this.sendByResend(options);
    if (sentByResend) return true;

    const sentBySmtp = await this.sendBySmtp(options);
    if (sentBySmtp) return true;

    this.logger.warn(
      `[EMAIL] No se pudo enviar correo a ${options.to} por ningún proveedor.`,
    );
    return false;
  }

  private async sendByResend(options: SendEmailOptions): Promise<boolean> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      return false;
    }

    // Resend requiere un email de dominio verificado (no @gmail.com)
    // Usar RESEND_FROM_EMAIL si está configurado, sino SMTP_FROM_EMAIL como fallback
    const fromEmail =
      options.fromEmail ||
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      'no-reply@huellas.com';
    const fromName =
      options.fromName ||
      this.configService.get<string>('RESEND_FROM_NAME') ||
      this.configService.get<string>('SMTP_FROM_NAME') ||
      'Revista Huellas';

    try {
      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (result.error) {
        this.logger.warn(
          `[RESEND] Error enviando a ${options.to}: ${result.error.message}`,
        );
        return false;
      }

      this.logger.log(`[RESEND] Correo enviado exitosamente a ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `[RESEND] Excepción enviando a ${options.to}:`,
        (error as any)?.message,
      );
      return false;
    }
  }

  private async sendBySmtp(options: SendEmailOptions): Promise<boolean> {
    const host =
      this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    const portRaw =
      this.configService.get<string>('SMTP_PORT') || process.env.SMTP_PORT;
    const secureRaw =
      this.configService.get<string>('SMTP_SECURE') || process.env.SMTP_SECURE;
    const user =
      this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const pass =
      this.configService.get<string>('SMTP_PASS') || process.env.SMTP_PASS;
    const fromEmail =
      options.fromEmail ||
      this.configService.get<string>('SMTP_FROM_EMAIL') ||
      process.env.SMTP_FROM_EMAIL;
    const fromName =
      options.fromName ||
      this.configService.get<string>('SMTP_FROM_NAME') ||
      process.env.SMTP_FROM_NAME ||
      'Revista Huellas';

    if (!host || !portRaw || !fromEmail) {
      this.logger.warn('[SMTP] Configuración SMTP incompleta, omitiendo.');
      return false;
    }

    const port = Number(portRaw);
    if (Number.isNaN(port)) return false;

    try {
      const transport = nodemailer.createTransport({
        host,
        port,
        secure: secureRaw === 'true',
        auth: user && pass ? { user, pass } : undefined,
      });

      await transport.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      this.logger.log(`[SMTP] Correo enviado exitosamente a ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `[SMTP] Error enviando a ${options.to}:`,
        (error as any)?.message,
      );
      return false;
    }
  }
}
