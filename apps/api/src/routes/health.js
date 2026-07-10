import { Router } from 'express';
import { checkConnection } from '../db/pool.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const dbOk = await checkConnection();
    res.json({
      status: 'ok',
      service: 'hegemonia-api',
      database: dbOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      service: 'hegemonia-api',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
