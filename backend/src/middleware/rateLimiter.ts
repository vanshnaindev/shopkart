import rateLimit from 'express-rate-limit';
import { env } from '../config/env.ts';

// Skip helper for automated smoke test runs or when explicitly bypassed
const shouldSkip = (req: any) => {
  if (req.headers['x-test-rate-limit'] === 'true') {
    return false; // Force rate limiter to evaluate during rate limit testing
  }
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.BYPASS_RATE_LIMIT === 'true' ||
    req.headers['x-bypass-rate-limit'] === 'true'
  );
};

// General API Rate Limiter: 500 requests per 15 minutes
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Strict Auth Rate Limiter
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// Strict Payment Rate Limiter
export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.RATE_LIMIT_PAYMENT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    message: 'Too many payment requests from this IP. Please try again later.',
  },
});
