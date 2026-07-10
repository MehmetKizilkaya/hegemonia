import http from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { config, assertProductionSecrets } from './config.js';
import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { checkConnection } from './db/pool.js';
import { verifyToken, findUserById } from './services/authService.js';

let dbReady = false;

export function isDatabaseReady() {
  return dbReady;
}

async function waitForDatabase(maxAttempts = 20, delayMs = 3000) {
  if (!config.databaseUrl) {
    console.error(
      '[hegemonia] DATABASE_URL missing. Add PostgreSQL in Railway → Variables → DATABASE_URL = ${{Postgres.DATABASE_URL}}',
    );
    return false;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const ok = await checkConnection().catch(() => false);
    if (ok) {
      console.log('[hegemonia] PostgreSQL connected');
      return true;
    }
    console.warn(`[hegemonia] PostgreSQL not ready (${attempt}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

async function initializeDatabase() {
  try {
    assertProductionSecrets();
  } catch (err) {
    console.error(`[hegemonia] ${err.message}`);
    return;
  }

  const dbOk = await waitForDatabase();
  if (!dbOk) {
    console.error('[hegemonia] Database initialization skipped — will retry on next deploy after DATABASE_URL is set');
    return;
  }

  try {
    await migrate();
    await seed();
    dbReady = true;
    console.log('[hegemonia] Database migrate + seed complete');
  } catch (err) {
    console.error('[hegemonia] Database initialization failed:', err);
  }
}

async function bootstrap() {
  console.log('[hegemonia] Starting API...');
  console.log(`[hegemonia] Environment: ${config.nodeEnv}`);
  console.log(`[hegemonia] Binding ${config.host}:${config.port}`);
  console.log(`[hegemonia] DATABASE_URL: ${config.databaseUrl ? 'set' : 'NOT SET'}`);

  const app = createApp();
  const server = http.createServer(app);

  const io = new SocketServer(server, {
    cors: {
      origin: config.isProduction ? false : config.corsOrigin,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    if (!dbReady) {
      return next(new Error('DB_NOT_READY'));
    }
    try {
      const token = socket.handshake.auth?.token
        ?? socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('AUTH_REQUIRED'));
      }

      const payload = verifyToken(token);
      const user = await findUserById(payload.sub);
      if (!user) {
        return next(new Error('INVALID_TOKEN'));
      }

      socket.data.user = user;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(`user:${user.id}`);

    socket.on('chat:join', ({ channelType, channelId }) => {
      if (!channelType || !channelId) return;
      socket.join(`${channelType}:${channelId}`);
    });

    socket.on('chat:leave', ({ channelType, channelId }) => {
      if (!channelType || !channelId) return;
      socket.leave(`${channelType}:${channelId}`);
    });
  });

  app.set('io', io);

  await new Promise((resolve, reject) => {
    server.listen(config.port, config.host, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log(`[hegemonia] Server listening on ${config.host}:${config.port}`);

  void initializeDatabase();

  const shutdown = (signal) => {
    console.log(`[hegemonia] ${signal} received — shutting down`);
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[hegemonia] Bootstrap failed:', err);
  process.exit(1);
});
