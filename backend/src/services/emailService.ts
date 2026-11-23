import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env, isProduction } from '../config/env.ts';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

interface SendResetEmailOptions {
  to: string;
  name: string;
  resetToken: string;
}

/**
 * Dispatches an email using Resend (primary), SMTP (fallback), or stdout logger (development/test).
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const from = options.from || env.EMAIL_FROM;

  // 1. Primary delivery: Resend API
  if (env.RESEND_API_KEY) {
    try {
      const resend = new Resend(env.RESEND_API_KEY);
      const to = Array.isArray(options.to) ? options.to : [options.to];
      const { error } = await resend.emails.send({
        from,
        to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error('Resend Email Delivery Error:', error);
        if (isProduction) {
          throw new Error(`Resend email delivery failed: ${error.message}`);
        }
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Resend Execution Error:', err.message);
      if (isProduction) {
        throw new Error('Failed to send email via Resend.', { cause: err });
      }
      return false;
    }
  }

  // 2. Secondary fallback: SMTP via nodemailer (if configured)
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
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return true;
    } catch (err: any) {
      console.error('SMTP Email Delivery Error:', err.message);
      if (isProduction) {
        throw new Error('Failed to send email via SMTP.', { cause: err });
      }
      return false;
    }
  }

  // 3. Development / Test mode fallback: log notification to console
  console.log('----------------------------------------------------------------------');
  console.log(`[DEV/TEST EMAIL NOTIFICATION]`);
  console.log(`Recipient: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
  console.log(`Subject:   ${options.subject}`);
  if (options.text) {
    console.log(`Body:      ${options.text.replace(/\n+/g, ' ')}`);
  }
  console.log('----------------------------------------------------------------------');
  return true;
}

/**
 * Sends a branded password reset email with secure token.
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetToken,
}: SendResetEmailOptions): Promise<void> {
  const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;

  const text = `Hello ${name},\n\nYou recently requested to reset your password for your ShopKart account.\n\nReset Link: ${resetUrl}\n\nThis link will expire in 1 hour. If you did not request this, please ignore this email.`;

  const html = `
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
  `;

  await sendEmail({
    to,
    subject: 'ShopKart - Password Reset Request',
    text,
    html,
  });
}
