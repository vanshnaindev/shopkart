import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.ts';
import { escapeCsvCell, escapeRegex } from '../src/utils/security.ts';

describe('Security Controls & Defense-in-Depth', () => {
  it('enforces Helmet security headers on responses', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    // Helmet headers
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    // Request ID tracking
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('rejects oversized JSON request bodies (> 1MB) with 413', async () => {
    // Generate a payload slightly larger than 1MB
    const bigString = 'A'.repeat(1024 * 1024 + 100);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: bigString, email: 'big@test.com', password: 'Password123!' });

    expect(res.status).toBe(413);
  });

  it('sanitizes NoSQL injection operators ($gt, $ne, dots) in request body and query', async () => {
    // Attempt NoSQL query injection: { email: { $gt: "" } }
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: { $gt: '' },
        password: 'Password123!',
      });

    // Sanitizer removes $gt key, resulting in validation rejecting invalid email format or 400/401
    expect([400, 401]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('prevents ReDoS attacks via regex metacharacter escaping in search', async () => {
    // Catastrophic backtracking pattern that would freeze an unescaped RegExp
    const evilPattern = '((((((((a+)+)+)+)+)+)+)+)+$';
    const start = Date.now();
    const res = await request(app).get(`/api/products?search=${encodeURIComponent(evilPattern)}`);
    const duration = Date.now() - start;

    expect(res.status).toBe(200);
    // Must complete rapidly (under 500ms) without hanging
    expect(duration).toBeLessThan(500);
    // Verify utility escaping directly
    const escaped = escapeRegex(evilPattern);
    expect(escaped).not.toContain('(a+)+');
    expect(escaped.includes('\\(')).toBe(true);
  });

  it('escapes dangerous spreadsheet formula characters in CSV exports', () => {
    const maliciousFormulas = [
      '=cmd|"/C calc"!A0',
      '+2+5',
      '-1+1',
      '@SUM(1,1)',
      '\t=cmd',
      '\r=cmd',
    ];

    for (const formula of maliciousFormulas) {
      const safe = escapeCsvCell(formula);
      expect(safe.startsWith('"\'')).toBe(true);
    }

    // Normal strings without formula triggers remain untouched except CSV quote wrapping
    const safeString = 'ShopKart Laptop Bag';
    expect(escapeCsvCell(safeString)).toBe(`"${safeString}"`);
  });

  it('returns 404 for non-existent API routes with standard JSON shape', async () => {
    const res = await request(app).get('/api/completely-unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('triggers rate limiting (429) when evaluation header is provided', async () => {
    // Request with test rate limiter header active
    const requests: Promise<any>[] = [];
    for (let i = 0; i < 70; i++) {
      requests.push(
        request(app)
          .post('/api/auth/login')
          .set('x-test-rate-limit', 'true')
          .send({ email: `ratelimit_${i}@test.com`, password: 'Password123!' })
      );
    }

    const responses = await Promise.all(requests);
    const has429 = responses.some((r) => r.status === 429);
    expect(has429).toBe(true);
  });
});
