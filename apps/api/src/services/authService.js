import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { withTransaction } from '../db/pool.js';

const PUBLIC_USER_FIELDS = `
  id, email, display_name, avatar_url, level, xp, energy,
  energy_updated_at, residence_region_id, onboarding_step,
  is_premium, premium_until, new_player_shield_until, created_at
`;

export function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export async function findUserByEmail(email) {
  const { query } = await import('../db/pool.js');
  const { rows } = await query(
    `SELECT * FROM users WHERE email = $1`,
    [email.toLowerCase().trim()],
  );
  return rows[0] ?? null;
}

export async function findUserById(id) {
  const { query } = await import('../db/pool.js');
  const { rows } = await query(
    `SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getWalletByUserId(userId) {
  const { query } = await import('../db/pool.js');
  const { rows } = await query(
    `SELECT id, user_id, balance, currency FROM wallets WHERE user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function registerUser({ email, password, displayName }) {
  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const name = displayName?.trim() || normalizedEmail.split('@')[0];

  return withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail],
    );
    if (existing.rows.length > 0) {
      const err = new Error('Bu e-posta adresi zaten kayıtlı');
      err.status = 409;
      err.code = 'EMAIL_EXISTS';
      throw err;
    }

    const shieldUntil = new Date();
    shieldUntil.setDate(shieldUntil.getDate() + config.newPlayerShieldDays);

    const { rows: userRows } = await client.query(
      `INSERT INTO users (email, password_hash, display_name, new_player_shield_until)
       VALUES ($1, $2, $3, $4)
       RETURNING ${PUBLIC_USER_FIELDS}`,
      [normalizedEmail, passwordHash, name, shieldUntil.toISOString()],
    );

    const user = userRows[0];

    const { rows: walletRows } = await client.query(
      `INSERT INTO wallets (user_id, balance, currency)
       VALUES ($1, 0, 'HA')
       RETURNING id, user_id, balance, currency`,
      [user.id],
    );

    return { user, wallet: walletRows[0] };
  });
}

export async function loginUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const { query } = await import('../db/pool.js');

  const { rows } = await query(
    `SELECT id, email, password_hash, display_name, avatar_url, level, xp, energy,
            energy_updated_at, residence_region_id, onboarding_step,
            is_premium, premium_until, new_player_shield_until, created_at
     FROM users WHERE email = $1`,
    [normalizedEmail],
  );

  const user = rows[0];
  if (!user) {
    const err = new Error('E-posta veya şifre hatalı');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('E-posta veya şifre hatalı');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

  const wallet = await getWalletByUserId(user.id);
  const { password_hash: _, ...publicUser } = user;

  return { user: publicUser, wallet };
}

export function toAuthResponse({ user, wallet, token }) {
  return {
    user: serializeUser(user),
    wallet,
    token,
  };
}

export function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    level: user.level,
    xp: Number(user.xp),
    energy: user.energy,
    energyUpdatedAt: user.energy_updated_at,
    residenceRegionId: user.residence_region_id,
    onboardingStep: user.onboarding_step,
    isPremium: user.is_premium,
    premiumUntil: user.premium_until,
    newPlayerShieldUntil: user.new_player_shield_until,
    createdAt: user.created_at,
  };
}
