import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.ts';
import { IUser } from '../types.ts';
import { env } from '../config/env.ts';

export interface AuthRequest extends Request {
  user?: IUser;
}

export function generateToken(user: IUser): string {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      tokenVersion: user.tokenVersion ?? 0,
    },
    env.JWT_SECRET,
    { expiresIn: (env.JWT_EXPIRES_IN || '7d') as any }
  );
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; tokenVersion?: number };
    const user = await db.users.findById(decoded.id);
    if (user) {
      // Invalidate if tokenVersion does not match (logout or password reset)
      if (
        decoded.tokenVersion !== undefined &&
        user.tokenVersion !== undefined &&
        decoded.tokenVersion !== user.tokenVersion
      ) {
        return next();
      }
      req.user = user;
    }
  } catch (err) {
    // Invalid or expired token
  }
  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to continue.',
    });
    return;
  }
  if (req.user.isBlocked) {
    res.status(403).json({
      success: false,
      message: 'Your account has been deactivated. Please contact support.',
    });
    return;
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in with an administrator account.',
    });
    return;
  }
  if (req.user.isBlocked) {
    res.status(403).json({
      success: false,
      message: 'Your account has been deactivated. Please contact support.',
    });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Access denied: Administrator privileges required.',
    });
    return;
  }
  next();
}
