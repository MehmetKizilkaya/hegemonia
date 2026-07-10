import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import { REGIONS, FACTORY_TYPES, ITEMS } from '../../db/seeds/regions.js';

const __filename = fileURLToPath(import.meta.url);

export async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existing } = await client.query('SELECT COUNT(*)::int AS count FROM regions');
    if (existing[0].count >= 81) {
      console.log('[seed] Regions already seeded — skipping region data');
    } else {
      await client.query('TRUNCATE region_bonuses, regions RESTART IDENTITY CASCADE');

      for (const region of REGIONS) {
        const { rows } = await client.query(
          `INSERT INTO regions (slug, name, plate_code, svg_path_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [region.slug, region.name, region.plateCode, region.svgPathId],
        );
        const regionId = rows[0].id;

        for (const bonus of region.bonuses) {
          await client.query(
            `INSERT INTO region_bonuses (region_id, sector, multiplier)
             VALUES ($1, $2, $3)`,
            [regionId, bonus.sector, bonus.multiplier],
          );
        }
      }
      console.log(`[seed] Inserted ${REGIONS.length} regions with bonuses`);
    }

    for (const ft of FACTORY_TYPES) {
      await client.query(
        `INSERT INTO factory_types (code, sector, name, build_cost, build_duration_sec, daily_maintenance, max_workers, storage_capacity)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (code) DO NOTHING`,
        [ft.code, ft.sector, ft.name, ft.buildCost, ft.buildDurationSec, ft.dailyMaintenance, ft.maxWorkers, ft.storageCapacity],
      );
    }
    console.log(`[seed] Factory types ready (${FACTORY_TYPES.length})`);

    for (const item of ITEMS) {
      await client.query(
        `INSERT INTO items (code, name, sector, base_price, stack_max, weapon_power)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO NOTHING`,
        [item.code, item.name, item.sector, item.basePrice, item.stackMax ?? 9999, item.weaponPower ?? 0],
      );
    }
    console.log(`[seed] Items ready (${ITEMS.length})`);

    await client.query('COMMIT');
    console.log('[seed] Complete');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  seed()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] Failed:', err);
      process.exit(1);
    });
}
