# hegemonia

Türkiye haritası üzerinde ekonomi, siyaset ve savaş MMO — Railway monolith (Node.js + React + PostgreSQL).

## Railway deploy (tek servis)

1. GitHub repo bağla → **yalnızca 1 servis** kullan (`@hegemonia/web` gibi ekstra workspace servislerini sil).
2. **PostgreSQL** ekle → API servisine `DATABASE_URL` referansını bağla.
3. Variables:
   - `JWT_SECRET` = güçlü secret
   - `NODE_ENV` = `production`
4. Root Directory: repo kökü (`.`).
5. Start: `npm start` | Healthcheck: `/health`
