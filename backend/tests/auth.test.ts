import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.ts';
import { db } from '../src/db.ts';

describe('Authentication & Security Hardening Tests', () => {
  const testEmail = `auth_test_${Date.now()}@test.com`;
  const validPassword = 'SecurePassword123!';

  it('rejects passwords failing complexity rules', async () => {
    // Too short (< 8 chars)
    const shortRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short User', email: `short_${Date.now()}@test.com`, password: 'Sh1!' });
    expect(shortRes.status).toBe(400);
    expect(shortRes.body.success).toBe(false);

    // No uppercase
    const noUpperRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'No Upper',
        email: `noupper_${Date.now()}@test.com`,
        password: 'nouppercase123!',
      });
    expect(noUpperRes.status).toBe(400);

    // No lowercase
    const noLowerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'No Lower',
        email: `nolower_${Date.now()}@test.com`,
        password: 'NOLOWERCASE123!',
      });
    expect(noLowerRes.status).toBe(400);

    // No digit or special char
    const noDigitRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'No Digit',
        email: `nodigit_${Date.now()}@test.com`,
        password: 'JustLettersPassword',
      });
    expect(noDigitRes.status).toBe(400);
  });

  it('registers a user successfully and prevents mass assignment of privileged fields', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Mass Assign Tester',
      email: testEmail,
      password: validPassword,
      role: 'admin', // Attempted privilege escalation
      isBlocked: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    // Role must be forced to customer
    expect(res.body.user.role).toBe('customer');
    expect(res.body.user.isBlocked).toBe(false);
    expect(res.body.user.password).toBeUndefined();
  });

  it('prevents mass assignment via PUT /api/auth/profile', async () => {
    // Login to obtain token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: validPassword });
    const token = loginRes.body.token;

    const profileRes = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        role: 'admin', // Privilege escalation attempt
        isBlocked: true,
      });

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.user.name).toBe('Updated Name');
    expect(profileRes.body.user.role).toBe('customer'); // Role remains customer
  });

  it('enforces account lockout after 5 consecutive failed login attempts', async () => {
    const lockoutEmail = `lockout_${Date.now()}@test.com`;
    // Register the account
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Lockout Target', email: lockoutEmail, password: validPassword });

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      const failRes = await request(app)
        .post('/api/auth/login')
        .send({ email: lockoutEmail, password: 'WrongPassword123!' });
      expect(failRes.status).toBe(401);
    }

    // 5th failed attempt triggers 423 Locked
    const fifthRes = await request(app)
      .post('/api/auth/login')
      .send({ email: lockoutEmail, password: 'WrongPassword123!' });
    expect(fifthRes.status).toBe(423);
    expect(fifthRes.body.message).toMatch(/locked/i);

    // Subsequent attempt even with the CORRECT password is still locked
    const lockedRes = await request(app)
      .post('/api/auth/login')
      .send({ email: lockoutEmail, password: validPassword });
    expect(lockedRes.status).toBe(423);
  });

  it('supports secure forgot-password and single-use reset tokens', async () => {
    const resetEmail = `reset_${Date.now()}@test.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Reset User', email: resetEmail, password: validPassword });

    // Request reset link
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: resetEmail });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);

    const resetToken = forgotRes.body.demoToken;
    expect(resetToken).toBeDefined();

    // Reset password with single-use token
    const newPassword = 'BrandNewPassword123!';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: resetEmail, token: resetToken, newPassword });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Attempting to reuse the exact same token must fail (single-use)
    const reuseRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: resetEmail, token: resetToken, newPassword: 'AnotherPassword123!' });
    expect(reuseRes.status).toBe(400);

    // Login with new password must succeed
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: resetEmail, password: newPassword });
    expect(newLoginRes.status).toBe(200);
  });

  it('invalidates JWT token on explicit logout', async () => {
    const logoutEmail = `logout_${Date.now()}@test.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Logout User', email: logoutEmail, password: validPassword });
    const token = regRes.body.token;

    // Verify token works
    const meRes1 = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(meRes1.status).toBe(200);

    // Call logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    // Verify token is now invalid (401)
    const meRes2 = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(meRes2.status).toBe(401);
  });
});
