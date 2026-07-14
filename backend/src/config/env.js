import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  smtpProvider: String(process.env.SMTP_PROVIDER || 'auto').toLowerCase(),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: String(process.env.SMTP_SECURE || 'false') === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'Planeador SENA <no-reply@planeador.local>',
  smtpFallbackEnabled: String(process.env.SMTP_FALLBACK_ENABLED || 'false') === 'true',
  smtpFallbackProvider: String(process.env.SMTP_FALLBACK_PROVIDER || 'auto').toLowerCase(),
  smtpFallbackHost: process.env.SMTP_FALLBACK_HOST || '',
  smtpFallbackPort: Number(process.env.SMTP_FALLBACK_PORT || 587),
  smtpFallbackSecure: String(process.env.SMTP_FALLBACK_SECURE || 'false') === 'true',
  smtpFallbackUser: process.env.SMTP_FALLBACK_USER || '',
  smtpFallbackPass: process.env.SMTP_FALLBACK_PASS || '',
  smtpFallbackFrom: process.env.SMTP_FALLBACK_FROM || '',
  cronDaysBeforeDue: Number(process.env.CRON_DAYS_BEFORE_DUE || 3),
};
