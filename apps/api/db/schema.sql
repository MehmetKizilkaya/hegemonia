-- Hegemonia MVP — PostgreSQL şema (Phase 1)
-- Railway dahili PostgreSQL | UTC timestamptz

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Bölgeler (81 il) ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS regions (
  id                  SERIAL PRIMARY KEY,
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  plate_code          SMALLINT NOT NULL UNIQUE,
  svg_path_id         TEXT NOT NULL UNIQUE,
  population          BIGINT NOT NULL DEFAULT 0,
  controller_party_id UUID,
  country_id          INTEGER NOT NULL DEFAULT 1,
  defense_points      BIGINT NOT NULL DEFAULT 10000,
  tax_rate            SMALLINT NOT NULL DEFAULT 10,
  treasury_balance    BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS region_bonuses (
  id          SERIAL PRIMARY KEY,
  region_id   INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  sector      TEXT NOT NULL,
  multiplier  DECIMAL(4, 2) NOT NULL,
  UNIQUE (region_id, sector)
);

CREATE INDEX IF NOT EXISTS idx_region_bonuses_region ON region_bonuses(region_id);

-- ─── Kullanıcılar & cüzdan ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                   TEXT NOT NULL UNIQUE,
  password_hash           TEXT NOT NULL,
  display_name            TEXT,
  avatar_url              TEXT,
  level                   INTEGER NOT NULL DEFAULT 1,
  xp                      BIGINT NOT NULL DEFAULT 0,
  energy                  INTEGER NOT NULL DEFAULT 20,
  energy_updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  residence_region_id     INTEGER REFERENCES regions(id),
  last_war_attack_at      TIMESTAMPTZ,
  onboarding_step         TEXT NOT NULL DEFAULT 'registered',
  is_premium              BOOLEAN NOT NULL DEFAULT false,
  premium_until           TIMESTAMPTZ,
  mentor_user_id          UUID REFERENCES users(id),
  mentor_until            TIMESTAMPTZ,
  new_player_shield_until TIMESTAMPTZ,
  last_login_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_residence ON users(residence_region_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS wallets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance    BIGINT NOT NULL DEFAULT 0,
  currency   TEXT NOT NULL DEFAULT 'HA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id      UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount         BIGINT NOT NULL,
  type           TEXT NOT NULL,
  reference_type TEXT,
  reference_id   UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet_created ON ledger_entries(wallet_id, created_at DESC);

-- ─── Fabrika tipleri & fabrikalar ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS factory_types (
  id                  SERIAL PRIMARY KEY,
  code                TEXT NOT NULL UNIQUE,
  sector              TEXT NOT NULL,
  name                TEXT NOT NULL,
  build_cost          BIGINT NOT NULL,
  build_duration_sec  INTEGER NOT NULL,
  daily_maintenance   BIGINT NOT NULL,
  max_workers         INTEGER NOT NULL,
  base_capacity       INTEGER NOT NULL DEFAULT 1,
  storage_capacity    INTEGER NOT NULL DEFAULT 200,
  energy_per_unit     DECIMAL(6, 2) NOT NULL DEFAULT 1.00
);

CREATE TABLE IF NOT EXISTS factories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region_id        INTEGER NOT NULL REFERENCES regions(id),
  factory_type_id  INTEGER NOT NULL REFERENCES factory_types(id),
  name             TEXT,
  level            INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'building',
  active_workers   INTEGER NOT NULL DEFAULT 0,
  built_at         TIMESTAMPTZ,
  build_ends_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT factories_status_check CHECK (status IN ('building', 'active', 'destroyed'))
);

CREATE INDEX IF NOT EXISTS idx_factories_owner ON factories(owner_id);
CREATE INDEX IF NOT EXISTS idx_factories_region ON factories(region_id);

-- ─── Envanter ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS items (
  id           SERIAL PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  sector       TEXT NOT NULL,
  base_price   BIGINT NOT NULL,
  stackable    BOOLEAN NOT NULL DEFAULT true,
  stack_max    INTEGER NOT NULL DEFAULT 9999,
  weapon_power INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_inventories (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id    INTEGER NOT NULL REFERENCES items(id),
  quantity   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id),
  CONSTRAINT user_inventories_qty_check CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS factory_inventories (
  factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  item_id    INTEGER NOT NULL REFERENCES items(id),
  quantity   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (factory_id, item_id),
  CONSTRAINT factory_inventories_qty_check CHECK (quantity >= 0)
);

-- ─── Sohbet (PostgreSQL — Firebase yok) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type TEXT NOT NULL,
  channel_id   TEXT NOT NULL,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_channel_type_check CHECK (
    channel_type IN ('region', 'party', 'war', 'global')
  )
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_type, channel_id, created_at DESC);

-- ─── Şema sürüm takibi ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
