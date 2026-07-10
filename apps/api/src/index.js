import http from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config.js';
import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { checkConnection } from './db/pool.js';
import { verifyToken, findUserById } from './services/authService.js';

async function bootstrap() {
  console.log('[hegemonia] Starting API...');
  console.log(`[hegemonia] Environment: ${config.nodeEnv}`);

  const dbOk = await checkConnection().catch(() => false);
  if (!dbOk) {
    console.error('[hegemonia] Cannot connect to PostgreSQL. Check DATABASE_URL.');
    process.exit(1);
  }

  await migrate();
  await seed();

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

    socket.on('disconnect', () => {
      // presence tracking — Phase 2
    });
  });

  app.set('io', io);

  server.listen(config.port, () => {
    console.log(`[hegemonia] Server listening on port ${config.port}`);
    if (!config.isProduction) {
      console.log(`[hegemonia] API: http://localhost:${config.port}/api`);
      console.log(`[hegemonia] Health: http://localhost:${config.port}/health`);
    }
  });

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
