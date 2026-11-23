import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.ts';
import { AuthRequest, generateToken, requireAuth } from '../middleware/auth.ts';
import { authRateLimiter } from '../middleware/rateLimiter.ts';
import { validate } from '../middleware/validation.ts';
import { validatePassword, generateRandomToken, hashToken } from '../utils/security.ts';
import { sendPasswordResetEmail } from '../services/emailService.ts';
import { isProduction } from '../config/env.ts';

const router = Router();

// Zod Validation Schemas
const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  email: z.string().trim().email('Valid email is required.'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.'),
  password: z.string().min(1, 'Password is required.'),
});

const profileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().optional(),
  addresses: z.array(z.any()).optional(),
});

const addressSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required.'),
  phone: z.string().trim().min(1, 'Phone is required.'),
  street: z.string().trim().min(1, 'Street is required.'),
  city: z.string().trim().min(1, 'City is required.'),
  state: z.string().trim().min(1, 'State is required.'),
  pincode: z.string().trim().min(1, 'Pincode is required.'),
  type: z.enum(['home', 'work', 'other']).optional(),
  isDefault: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Valid email is required.'),
});

const resetPasswordSchema = z.object({
  token: z.string().optional(),
  email: z.string().trim().email().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
});

// Register
router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, email, phone, password } = req.body;

      // Validate password strength
      const pwdValidation = validatePassword(password);
      if (!pwdValidation.valid) {
        res.status(400).json({ success: false, message: pwdValidation.message });
        return;
      }

      const existing = await db.users.findByEmail(email);
      if (existing) {
        res
          .status(409)
          .json({ success: false, message: 'An account with this email already exists.' });
        return;
      }

      // Password hashing with salt factor 10
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);

      // Mass-assignment protection: explicitly pick fields, role is always customer
      const newUser = await db.users.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? String(phone).trim() : '',
        password: hashedPassword,
        role: 'customer',
        addresses: [],
        isBlocked: false,
        failedLoginAttempts: 0,
        lockUntil: null,
        tokenVersion: 0,
      });

      const token = generateToken(newUser);

      const {
        password: _,
        resetPasswordToken: __,
        resetPasswordExpires: ___,
        ...userSafe
      } = newUser;
      res.status(201).json({
        success: true,
        message: 'Account registered successfully!',
        token,
        user: userSafe,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Registration failed.' });
    }
  }
);

// Login
router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = await db.users.findByEmail(email);
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      // Check account lockout
      if (user.lockUntil && user.lockUntil > Date.now()) {
        const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
        res.status(423).json({
          success: false,
          message: `Account is temporarily locked due to repeated failed logins. Please try again in ${remainingMinutes} minute(s).`,
        });
        return;
      }

      if (user.isBlocked) {
        res
          .status(403)
          .json({ success: false, message: 'This account has been deactivated. Contact support.' });
        return;
      }

      const isMatch = bcrypt.compareSync(password, user.password || '');
      if (!isMatch) {
        // Increment failed attempts and trigger lockout if >= 5 attempts
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const updates: Partial<typeof user> = { failedLoginAttempts: attempts };

        if (attempts >= 5) {
          updates.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
        }

        await db.users.update(user._id, updates);

        if (attempts >= 5) {
          res.status(423).json({
            success: false,
            message:
              'Too many failed login attempts. Your account has been temporarily locked for 15 minutes.',
          });
          return;
        }

        res.status(401).json({ success: false, message: 'Invalid email or password.' });
        return;
      }

      // Successful login: reset lockout counters
      if (user.failedLoginAttempts || user.lockUntil) {
        await db.users.update(user._id, { failedLoginAttempts: 0, lockUntil: null });
      }

      const token = generateToken(user);
      const { password: _, resetPasswordToken: __, resetPasswordExpires: ___, ...userSafe } = user;

      res.json({
        success: true,
        message: 'Logged in successfully.',
        token,
        user: userSafe,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Login failed.' });
    }
  }
);

// Current User Profile
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const { password: _, resetPasswordToken: __, resetPasswordExpires: ___, ...userSafe } = req.user!;
  res.json({
    success: true,
    user: userSafe,
  });
});

// Update Profile & Addresses (Mass-assignment safe)
router.put(
  '/profile',
  requireAuth,
  validate({ body: profileSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, phone, addresses } = req.body;

      // Only allow updating safe fields: name, phone, addresses
      const updateData: any = {};
      if (name) updateData.name = name.trim();
      if (phone !== undefined) updateData.phone = String(phone).trim();
      if (addresses && Array.isArray(addresses)) updateData.addresses = addresses;

      const updated = await db.users.update(req.user!._id, updateData);
      if (!updated) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const {
        password: _,
        resetPasswordToken: __,
        resetPasswordExpires: ___,
        ...userSafe
      } = updated;
      res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: userSafe,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
  }
);

// Add / Update Address
router.post(
  '/address',
  requireAuth,
  validate({ body: addressSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { fullName, phone, street, city, state, pincode, isDefault, type } = req.body;
      const user = req.user!;

      const newAddress = {
        id: 'addr_' + Math.random().toString(36).substring(2, 8),
        fullName: fullName.trim(),
        phone: phone.trim(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        type: type || 'home',
        isDefault: isDefault || user.addresses.length === 0,
      };

      let updatedAddresses = [...user.addresses];
      if (newAddress.isDefault) {
        updatedAddresses = updatedAddresses.map((a) => ({ ...a, isDefault: false }));
      }
      updatedAddresses.push(newAddress);

      const updated = await db.users.update(user._id, { addresses: updatedAddresses });
      const {
        password: _,
        resetPasswordToken: __,
        resetPasswordExpires: ___,
        ...userSafe
      } = updated!;

      res.json({
        success: true,
        message: 'Address saved successfully.',
        user: userSafe,
        address: newAddress,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to save address.' });
    }
  }
);

// Change Password
router.put(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await db.users.findById(req.user!._id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const isMatch = bcrypt.compareSync(currentPassword, user.password || '');
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        return;
      }

      const pwdValidation = validatePassword(newPassword);
      if (!pwdValidation.valid) {
        res.status(400).json({ success: false, message: pwdValidation.message });
        return;
      }

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(newPassword, salt);

      await db.users.update(user._id, {
        password: hashedPassword,
      });

      res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to change password.' });
    }
  }
);

// Forgot Password - generates single-use hashed token with expiry
router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;
      const user = await db.users.findByEmail(email);

      if (!user) {
        // Prevent email enumeration: return same positive message
        res.json({
          success: true,
          message:
            'If an account exists with that email, a password reset link has been dispatched.',
        });
        return;
      }

      // Generate cryptographically secure random token
      const rawToken = generateRandomToken(32);
      const hashedToken = hashToken(rawToken);
      const expires = Date.now() + 60 * 60 * 1000; // 1 hour expiry

      await db.users.update(user._id, {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expires,
      });

      // Send email (or log in development/test mode)
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetToken: rawToken,
      });

      const responsePayload: any = {
        success: true,
        message: 'If an account exists with that email, a password reset link has been dispatched.',
      };

      // In non-production environments only, provide demoToken for evaluation convenience
      if (!isProduction) {
        responsePayload.demoToken = rawToken;
      }

      res.json(responsePayload);
    } catch (err: any) {
      res
        .status(500)
        .json({ success: false, message: 'Failed to process password reset request.' });
    }
  }
);

// Reset Password with single-use token
router.post(
  '/reset-password',
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { token, email, newPassword } = req.body;

      const pwdValidation = validatePassword(newPassword);
      if (!pwdValidation.valid) {
        res.status(400).json({ success: false, message: pwdValidation.message });
        return;
      }

      let user: any = null;

      if (token) {
        const hashedToken = hashToken(token);
        const allUsers = await db.users.find();
        user = allUsers.find(
          (u) =>
            u.resetPasswordToken === hashedToken &&
            u.resetPasswordExpires &&
            u.resetPasswordExpires > Date.now()
        );
      } else if (!isProduction && email) {
        // Dev convenience fallback if testing without explicit token
        user = await db.users.findByEmail(email);
      }

      if (!user) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired password reset token.',
        });
        return;
      }

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(newPassword, salt);

      // Single-use: clear token, expiry, and failed attempts; bump tokenVersion
      await db.users.update(user._id, {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        failedLoginAttempts: 0,
        lockUntil: null,
        tokenVersion: (user.tokenVersion || 0) + 1,
      });

      res.json({
        success: true,
        message: 'Password has been reset successfully. You can now log in.',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Password reset failed.' });
    }
  }
);

// Logout - invalidates current session tokens
router.post('/logout', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user) {
    try {
      await db.users.update(req.user._id, {
        tokenVersion: (req.user.tokenVersion || 0) + 1,
      });
    } catch {}
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
