import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const PROVIDER_DEFAULTS = {
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
  outlook: { host: 'smtp.office365.com', port: 587, secure: false },
  office365: { host: 'smtp.office365.com', port: 587, secure: false },
  hotmail: { host: 'smtp.office365.com', port: 587, secure: false },
};

const inferProviderFromUser = (user) => {
  const domain = String(user || '').split('@')[1]?.toLowerCase() || '';

  if (!domain) return 'gmail';
  if (domain === 'gmail.com') return 'gmail';
  if (
    domain.endsWith('sena.edu.co') ||
    domain.includes('outlook.') ||
    domain === 'hotmail.com' ||
    domain === 'live.com' ||
    domain === 'msn.com'
  ) {
    return 'outlook';
  }

  return 'outlook';
};

const resolveSmtpConfig = ({ provider, host, port, secure, user, pass, from }) => {
  if (!user || !pass) {
    return null;
  }

  const normalizedProvider = String(provider || 'auto').toLowerCase();
  const effectiveProvider = normalizedProvider === 'auto'
    ? inferProviderFromUser(user)
    : normalizedProvider;

  const defaults = PROVIDER_DEFAULTS[effectiveProvider] || PROVIDER_DEFAULTS.outlook;
  const effectiveHost = host || defaults.host;
  const effectivePort = Number(port || defaults.port || 587);

  return {
    provider: effectiveProvider,
    host: effectiveHost,
    port: effectivePort,
    secure: Boolean(secure),
    user,
    pass,
    from,
  };
};

const createTransport = (config) => {
  if (!config) return null;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

const primaryConfig = resolveSmtpConfig({
  provider: env.smtpProvider,
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  user: env.smtpUser,
  pass: env.smtpPass,
  from: env.smtpFrom,
});

const fallbackConfig = env.smtpFallbackEnabled
  ? resolveSmtpConfig({
      provider: env.smtpFallbackProvider,
      host: env.smtpFallbackHost,
      port: env.smtpFallbackPort,
      secure: env.smtpFallbackSecure,
      user: env.smtpFallbackUser,
      pass: env.smtpFallbackPass,
      from: env.smtpFallbackFrom || env.smtpFrom,
    })
  : null;

export const mailer = createTransport(primaryConfig);
const fallbackMailer = createTransport(fallbackConfig);

export const enviarCorreo = async ({ to, subject, html, attachments = [] }) => {
  if (!mailer) {
    throw new Error('SMTP no configurado. Define SMTP_USER y SMTP_PASS en backend/.env. SMTP_PROVIDER puede ser auto, outlook o gmail.');
  }

  const mail = {
    from: primaryConfig?.from || env.smtpFrom,
    to,
    subject,
    html,
    attachments,
  };

  try {
    return await mailer.sendMail(mail);
  } catch (primaryError) {
    if (!fallbackMailer) {
      throw primaryError;
    }

    const sameTransport =
      primaryConfig?.host === fallbackConfig?.host &&
      primaryConfig?.port === fallbackConfig?.port &&
      primaryConfig?.user === fallbackConfig?.user;

    if (sameTransport) {
      throw primaryError;
    }

    return fallbackMailer.sendMail({
      ...mail,
      from: fallbackConfig?.from || mail.from,
    });
  }
};
