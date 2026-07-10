import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows: regions } = await query(
      `SELECT r.id, r.slug, r.name, r.plate_code, r.svg_path_id,
              r.population, r.defense_points, r.tax_rate,
              COALESCE(
                json_agg(
                  json_build_object('sector', rb.sector, 'multiplier', rb.multiplier)
                  ORDER BY rb.sector
                ) FILTER (WHERE rb.id IS NOT NULL),
                '[]'
              ) AS bonuses
       FROM regions r
       LEFT JOIN region_bonuses rb ON rb.region_id = r.id
       GROUP BY r.id
       ORDER BY r.plate_code`,
    );

    return res.json(
      regions.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        plateCode: r.plate_code,
        svgPathId: r.svg_path_id,
        population: Number(r.population),
        defensePoints: Number(r.defense_points),
        taxRate: r.tax_rate,
        bonuses: r.bonuses,
      })),
    );
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT r.id, r.slug, r.name, r.plate_code, r.svg_path_id,
              r.population, r.defense_points, r.tax_rate, r.treasury_balance,
              COALESCE(
                json_agg(
                  json_build_object('sector', rb.sector, 'multiplier', rb.multiplier)
                  ORDER BY rb.sector
                ) FILTER (WHERE rb.id IS NOT NULL),
                '[]'
              ) AS bonuses
       FROM regions r
       LEFT JOIN region_bonuses rb ON rb.region_id = r.id
       WHERE r.slug = $1
       GROUP BY r.id`,
      [req.params.slug],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'İl bulunamadı', code: 'REGION_NOT_FOUND' });
    }

    const r = rows[0];
    return res.json({
      id: r.id,
      slug: r.slug,
      name: r.name,
      plateCode: r.plate_code,
      svgPathId: r.svg_path_id,
      population: Number(r.population),
      defensePoints: Number(r.defense_points),
      taxRate: r.tax_rate,
      treasuryBalance: Number(r.treasury_balance),
      bonuses: r.bonuses,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
