# hegemonia

Türkiye haritası üzerinde ekonomi, siyaset ve savaş MMO — Railway monolith (Node.js + React + PostgreSQL).

## Railway deploy (tek servis)

1. GitHub repo bağla → **yalnızca 1 servis** kullan.
2. **+ New** → **Database** → **PostgreSQL** ekle.
3. API servisinde **Variables** → **Add Variable**:
   - `DATABASE_URL` → **Add Reference** → Postgres servisinden `DATABASE_URL` seç
   - `JWT_SECRET` → rastgele güçlü bir değer
   - `NODE_ENV` → `production`
4. **Redeploy** — `/health` → `"database": "connected"` olmalı.
