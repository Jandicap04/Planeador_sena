import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export const mailer = env.smtpHost && env.smtpUser && env.smtpPass
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    })
  : null;

export const enviarCorreo = async ({ to, subject, html, attachments = [] }) => {
  if (!mailer) {
    throw new Error('SMTP no configurado. Define SMTP_HOST, SMTP_USER y SMTP_PASS en backend/.env');
  }

  return mailer.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    html,
    attachments,
  });
};
