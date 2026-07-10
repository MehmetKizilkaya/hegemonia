import { Router } from 'express';
import { config } from '../config.js';
import { checkConnection } from '../db/pool.js';
import { isDatabaseReady } from '../state.js';

const router = Router();

router.get('/', async (_req, res) => {
  const payload = {
    service: 'hegemonia-api',
    timestamp: new Date().toISOString(),
  };

  if (!config.databaseUrl) {
    return res.status(200).json({
      ...payload,
      status: 'ok',
      database: 'not_configured',
      ready: false,
      hint: 'Set DATABASE_URL on this service → Add Reference → Postgres.DATABASE_URL',
    });
  }

  try {
    const dbOk = await checkConnection();
    return res.status(200).json({
      ...payload,
      status: dbOk && isDatabaseReady() ? 'ok' : 'starting',
      database: dbOk ? (isDatabaseReady() ? 'connected' : 'migrating') : 'disconnected',
      ready: dbOk && isDatabaseReady(),
    });
  } catch {
    return res.status(200).json({
      ...payload,
      status: 'starting',
      database: 'disconnected',
      ready: false,
    });
  }
});

export default router;
