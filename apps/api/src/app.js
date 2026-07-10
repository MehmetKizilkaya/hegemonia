import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import regionsRouter from './routes/regions.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors({
    origin: config.isProduction ? false : config.corsOrigin,
    credentials: true,
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/regions', regionsRouter);

  app.get('/api', (_req, res) => {
    res.json({
      name: 'Hegemonia API',
      version: '0.1.0',
      docs: '/api/auth, /api/regions',
    });
  });

  if (fs.existsSync(config.webDistPath)) {
    app.use(express.static(config.webDistPath));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(config.webDistPath, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  } else if (config.isProduction) {
    console.warn('[app] Web dist not found at', config.webDistPath);
  }

  app.use((err, _req, res, _next) => {
    console.error('[app] Unhandled error:', err);
    res.status(err.status ?? 500).json({
      error: config.isProduction ? 'Sunucu hatası' : err.message,
      code: err.code ?? 'INTERNAL_ERROR',
    });
  });

  return app;
}
