import nodemailer from 'nodemailer';
import { env, isProduction } from '../config/env.ts';

interface SendResetEmailOptions {
  to: string;
  name: string;
  resetToken: string;
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetToken,
}: SendResetEmailOptions): Promise<void> {
  const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;

  // If SMTP is configured, deliver the email via nodemailer
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: 'ShopKart - Password Reset Request',
        text: `Hello ${name},\n\nYou requested a password reset. Please use the following link to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.\n`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2874F0;">ShopKart Password Reset</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>You recently requested to reset your password for your ShopKart account.</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background-color: #2874F0; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Reset Password
              </a>
            </p>
            <p style="color: #666; font-size: 13px;">This link will expire in 1 hour. If you did not request this password reset, please ignore this email.</p>
          </div>
        `,
      });
      return;
    } catch (err: any) {
      console.error('SMTP Email Delivery Error:', err.message);
      if (isProduction) {
        throw new Error('Failed to send password reset email. Please contact support.');
      }
    }
  }

  // Development / Test mode fallback: log the reset link to stdout
  console.log('----------------------------------------------------------------------');
  console.log(`[DEV/TEST EMAIL NOTIFICATION]`);
  console.log(`Recipient:   ${to} (${name})`);
  console.log(`Subject:     ShopKart Password Reset Request`);
  console.log(`Reset Token: ${resetToken}`);
  console.log(`Reset URL:   ${resetUrl}`);
  console.log('----------------------------------------------------------------------');
}
