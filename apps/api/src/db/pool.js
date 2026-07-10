import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!config.databaseUrl) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.isProduction ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on('error', (err) => {
      console.error('[db] Unexpected pool error:', err);
    });
  }
  return pool;
}

export async function query(text, params) {
  const db = getPool();
  if (!db) throw new Error('DATABASE_URL is not configured');
  return db.query(text, params);
}

export async function withTransaction(fn) {
  const db = getPool();
  if (!db) throw new Error('DATABASE_URL is not configured');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function checkConnection() {
  const db = getPool();
  if (!db) return false;
  const { rows } = await db.query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}
