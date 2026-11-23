import dotenv from 'dotenv';
dotenv.config();

const DEFAULT_INSECURE_SECRETS = [
  'dev-only-insecure-secret',
  'shopkart-secret-key-change-in-production',
  'change-me-to-a-long-random-string',
  'secret',
  'password',
  'default',
];

export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

export function validateEnvironment(): void {
  const jwtSecret = process.env.JWT_SECRET?.trim() || '';

  if (isProduction) {
    if (!jwtSecret) {
      console.error('❌ FATAL: JWT_SECRET environment variable is missing in production!');
      process.exit(1);
    }
    if (DEFAULT_INSECURE_SECRETS.includes(jwtSecret)) {
      console.error(
        '❌ FATAL: Refusing to start in production with a default / example JWT_SECRET!'
      );
      process.exit(1);
    }
    if (jwtSecret.length < 32) {
      console.error('❌ FATAL: JWT_SECRET must be at least 32 characters long in production!');
      process.exit(1);
    }
  }
}

// Run validation immediately on import if in production
if (isProduction) {
  validateEnvironment();
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-insecure-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  MONGODB_URI: process.env.MONGODB_URI || '',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM:
    process.env.EMAIL_FROM || process.env.SMTP_FROM || 'ShopKart <onboarding@resend.dev>',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'no-reply@shopkart.com',
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10)
    : 15 * 60 * 1000,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 500,
  RATE_LIMIT_AUTH_MAX: process.env.RATE_LIMIT_AUTH_MAX
    ? parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10)
    : 60,
  RATE_LIMIT_PAYMENT_MAX: process.env.RATE_LIMIT_PAYMENT_MAX
    ? parseInt(process.env.RATE_LIMIT_PAYMENT_MAX, 10)
    : 60,
};
