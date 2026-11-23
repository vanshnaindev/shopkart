import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { env, isProduction, validateEnvironment } from './config/env.ts';
import { authMiddleware } from './middleware/auth.ts';
import { globalRateLimiter } from './middleware/rateLimiter.ts';
import { noSqlSanitizer } from './middleware/sanitizer.ts';
import { connectMongoDB, getStorageMode } from './db.ts';

// Routes
import authRoutes from './routes/authRoutes.ts';
import productRoutes from './routes/productRoutes.ts';
import categoryRoutes from './routes/categoryRoutes.ts';
import cartRoutes from './routes/cartRoutes.ts';
import wishlistRoutes from './routes/wishlistRoutes.ts';
import orderRoutes from './routes/orderRoutes.ts';
import paymentRoutes from './routes/paymentRoutes.ts';
import couponRoutes from './routes/couponRoutes.ts';
import reviewRoutes from './routes/reviewRoutes.ts';
import adminRoutes from './routes/adminRoutes.ts';
import seedRoutes from './routes/seedRoutes.ts';

// Validate environment secrets in production
validateEnvironment();

export function createApp(): express.Application {
  const app = express();

  // Security Headers via Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: isProduction ? undefined : false,
    })
  );

  // CORS from explicit allow-list
  const allowedOrigins = env.CORS_ORIGIN;
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked: origin ${origin} is not allowed.`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-Id',
        'x-test-rate-limit',
        'x-bypass-rate-limit',
      ],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  // Request ID and Request Logging Middleware
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    (req as any).id = reqId;
    res.setHeader('X-Request-Id', reqId);

    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== 'test') {
        console.log(
          `[${new Date().toISOString()}] [${reqId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
        );
      }
    });
    next();
  });

  // Body Size Limit & Parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // NoSQL Injection Sanitizer
  app.use(noSqlSanitizer);

  // Global Rate Limiter
  app.use('/api', globalRateLimiter);

  // Core Authentication Middleware (attaches req.user if Bearer token valid)
  app.use(authMiddleware);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ShopKart API',
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development',
      storageMode: getStorageMode(),
    });
  });

  // REST API Domain Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/seed', seedRoutes);

  // 404 handler for unknown routes
  app.use('/api', (req, res) => {
    res.status(404).json({
      success: false,
      message: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Centralized Error Handling Middleware (leaks no internals in production)
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const reqId = (req as any).id;

    if (status >= 500 && process.env.NODE_ENV !== 'test') {
      console.error(`[Error] [${reqId}] Unhandled Server Error:`, err);
    }

    const message =
      isProduction && status >= 500
        ? 'Internal Server Error'
        : err.message || 'An unexpected error occurred.';

    res.status(status).json({
      success: false,
      message,
      ...(isProduction ? {} : { stack: err.stack }),
      requestId: reqId,
    });
  });

  return app;
}

export const app = createApp();

let server: any = null;

export async function startServer() {
  await connectMongoDB();

  const PORT = env.PORT;
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ShopKart Server running on http://0.0.0.0:${PORT} (${env.NODE_ENV})`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
    if (server) {
      server.close(async () => {
        console.log('✓ HTTP server closed.');
        try {
          await mongoose.disconnect();
          console.log('✓ Database connections closed.');
        } catch {}
        process.exit(0);
      });

      // Force exit after 10 seconds if hanging
      setTimeout(() => {
        console.error('⚠️ Forcing server termination after timeout.');
        process.exit(1);
      }, 10000).unref();
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Only launch standalone server if executed directly (not when imported in Vitest)
if (!process.env.VITEST) {
  startServer().catch((err) => {
    console.error('Fatal Server Error:', err);
    process.exit(1);
  });
}
