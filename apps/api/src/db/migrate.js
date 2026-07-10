import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_VERSION = '001_initial';
const schemaPath = path.resolve(__dirname, '../../db/schema.sql');

export async function migrate() {
  const pool = getPool();
  if (!pool) throw new Error('DATABASE_URL is not configured');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);

    const { rows } = await client.query(
      'SELECT version FROM schema_migrations WHERE version = $1',
      [SCHEMA_VERSION],
    );

    if (rows.length === 0) {
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [SCHEMA_VERSION],
      );
      console.log(`[migrate] Applied schema ${SCHEMA_VERSION}`);
    } else {
      console.log(`[migrate] Schema ${SCHEMA_VERSION} already recorded — tables verified`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  migrate()
    .then(() => {
      console.log('[migrate] Done');
      return getPool()?.end();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] Failed:', err);
      process.exit(1);
    });
}
