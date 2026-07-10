import { Router } from 'express';
import { config } from '../config.js';
import { checkConnection } from '../db/pool.js';

const router = Router();

router.get('/', async (_req, res) => {
  if (!config.databaseUrl) {
    return res.status(503).json({
      status: 'degraded',
      service: 'hegemonia-api',
      database: 'not_configured',
      hint: 'Add PostgreSQL and set DATABASE_URL=${{Postgres.DATABASE_URL}} on this service',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const dbOk = await checkConnection();
    if (!dbOk) {
      return res.status(503).json({
        status: 'degraded',
        service: 'hegemonia-api',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      status: 'ok',
      service: 'hegemonia-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      status: 'degraded',
      service: 'hegemonia-api',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
