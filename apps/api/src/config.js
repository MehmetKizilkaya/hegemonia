import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 3001),
  databaseUrl:
    process.env.DATABASE_URL
    ?? (isProduction ? null : 'postgresql://postgres:postgres@localhost:5432/hegemonia'),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  isProduction,
  webDistPath: path.resolve(__dirname, '../../web/dist'),
  bcryptRounds: 12,
  newPlayerShieldDays: 7,
};

export function assertProductionSecrets() {
  if (!config.isProduction) return;

  if (!config.databaseUrl) {
    throw new Error(
      'DATABASE_URL is required in production. Add PostgreSQL to the Railway project and reference ${{Postgres.DATABASE_URL}} on this service.',
    );
  }
  if (!process.env.JWT_SECRET) {
    console.warn('[hegemonia] JWT_SECRET is not set — using insecure default (set before launch)');
  }
}
