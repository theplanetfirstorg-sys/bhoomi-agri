import { query, queryOne } from '../db/client';
import { Farm, Plot } from '../types';

export async function getUserFarms(userId: string): Promise<Farm[]> {
  return query<Farm>(
    'SELECT * FROM farms WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at',
    [userId]
  );
}

export async function getFarmById(id: string, userId: string): Promise<Farm | null> {
  return queryOne<Farm>(
    'SELECT * FROM farms WHERE id = $1 AND user_id = $2 AND is_active = TRUE',
    [id, userId]
  );
}

export async function createFarm(userId: string, data: Partial<Farm>): Promise<Farm> {
  const { name, latitude, longitude, region, address, total_area, area_unit, soil_type, farming_type, elevation_m, notes } = data;

  const farm = await queryOne<Farm>(
    `INSERT INTO farms (user_id, name, region, address, total_area, area_unit,
       latitude, longitude, soil_type, farming_type, elevation_m, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      userId, name, region ?? null, address ?? null,
      total_area ?? null, area_unit ?? 'perches',
      latitude ?? null, longitude ?? null,
      soil_type ?? 'unknown', farming_type ?? 'home_garden',
      elevation_m ?? null, notes ?? null,
    ]
  );

  return farm!;
}

export async function updateFarm(id: string, userId: string, data: Partial<Farm>): Promise<Farm | null> {
  const { name, latitude, longitude, region, address, total_area, area_unit, soil_type, farming_type, elevation_m, notes } = data;

  return queryOne<Farm>(
    `UPDATE farms SET
       name = COALESCE($3, name),
       latitude = COALESCE($4, latitude),
       longitude = COALESCE($5, longitude),
       region = COALESCE($6, region),
       address = COALESCE($7, address),
       total_area = COALESCE($8, total_area),
       area_unit = COALESCE($9, area_unit),
       soil_type = COALESCE($10, soil_type),
       farming_type = COALESCE($11, farming_type),
       elevation_m = COALESCE($12, elevation_m),
       notes = COALESCE($13, notes)
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId, name, latitude, longitude, region, address, total_area, area_unit, soil_type, farming_type, elevation_m, notes]
  );
}

export async function deleteFarm(id: string, userId: string): Promise<boolean> {
  const result = await query(
    'UPDATE farms SET is_active = FALSE WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.length > 0;
}

// ─── Plots ───────────────────────────────────────────────────────────────────

export async function getFarmPlots(farmId: string, userId: string): Promise<Plot[]> {
  return query<Plot>(
    `SELECT p.* FROM plots p
     JOIN farms f ON f.id = p.farm_id
     WHERE p.farm_id = $1 AND f.user_id = $2 AND p.is_active = TRUE
     ORDER BY p.created_at`,
    [farmId, userId]
  );
}

export async function getPlotById(id: string, userId: string): Promise<Plot | null> {
  return queryOne<Plot>(
    `SELECT p.* FROM plots p
     JOIN farms f ON f.id = p.farm_id
     WHERE p.id = $1 AND f.user_id = $2 AND p.is_active = TRUE`,
    [id, userId]
  );
}

async function checkPlotAreaAllowance(farmId: string, newAreaPerches: number, excludePlotId?: string): Promise<void> {
  const farm = await queryOne<{ total_area: string | null; area_unit: string }>(
    'SELECT total_area, area_unit FROM farms WHERE id = $1',
    [farmId]
  );
  if (!farm?.total_area) return; // no farm area set — skip check

  // Convert farm total_area to perches
  const toPerches = (value: number, unit: string) => {
    switch (unit) {
      case 'acres':    return value * 160;
      case 'hectares': return value * 395.369;
      case 'sqm':      return value / 25.2929;
      default:         return value; // perches
    }
  };

  const farmTotalPerches = toPerches(parseFloat(farm.total_area), farm.area_unit);

  const usedRow = await queryOne<{ used: string }>(
    `SELECT COALESCE(SUM(
       CASE area_unit
         WHEN 'acres'    THEN area * 160
         WHEN 'hectares' THEN area * 395.369
         WHEN 'sqm'      THEN area / 25.2929
         ELSE area
       END
     ), 0)::text AS used
     FROM plots
     WHERE farm_id = $1 AND is_active = TRUE ${excludePlotId ? 'AND id != $2' : ''}`,
    excludePlotId ? [farmId, excludePlotId] : [farmId]
  );

  const usedPerches = parseFloat(usedRow?.used ?? '0');
  if (usedPerches + newAreaPerches > farmTotalPerches) {
    const remaining = Math.max(0, farmTotalPerches - usedPerches);
    throw new Error(
      `Plot area exceeds available farm area. Farm has ${remaining.toFixed(2)} perches remaining (farm total: ${farmTotalPerches.toFixed(2)} perches).`
    );
  }
}

export async function createPlot(farmId: string, userId: string, data: Partial<Plot>): Promise<Plot> {
  const farm = await queryOne('SELECT id FROM farms WHERE id = $1 AND user_id = $2', [farmId, userId]);
  if (!farm) throw new Error('Farm not found');

  if (data.area) {
    await checkPlotAreaAllowance(farmId, data.area, undefined);
  }

  const plot = await queryOne<Plot>(
    `INSERT INTO plots (farm_id, name, boundary_geojson, area, area_unit, orientation,
       sun_exposure, drainage, irrigation_method, water_source, soil_ph, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      farmId, data.name,
      data.boundary_geojson ? JSON.stringify(data.boundary_geojson) : null,
      data.area ?? null, data.area_unit ?? 'perches',
      data.orientation ?? null, data.sun_exposure ?? null,
      data.drainage ?? null, data.irrigation_method ?? null,
      data.water_source ?? null, data.soil_ph ?? null, data.notes ?? null,
    ]
  );

  return plot!;
}

export async function updatePlot(id: string, userId: string, data: Partial<Plot>): Promise<Plot | null> {
  if (data.area) {
    const existing = await queryOne<{ farm_id: string }>('SELECT farm_id FROM plots WHERE id = $1', [id]);
    if (existing) await checkPlotAreaAllowance(existing.farm_id, data.area, id);
  }

  return queryOne<Plot>(
    `UPDATE plots SET
       name = COALESCE($3, name),
       boundary_geojson = COALESCE($4::jsonb, boundary_geojson),
       area = COALESCE($5, area),
       area_unit = COALESCE($6, area_unit),
       orientation = COALESCE($7, orientation),
       sun_exposure = COALESCE($8, sun_exposure),
       drainage = COALESCE($9, drainage),
       irrigation_method = COALESCE($10, irrigation_method),
       water_source = COALESCE($11, water_source),
       soil_ph = COALESCE($12, soil_ph),
       notes = COALESCE($13, notes)
     FROM farms f
     WHERE plots.id = $1 AND plots.farm_id = f.id AND f.user_id = $2
     RETURNING plots.*`,
    [id, userId, data.name, data.boundary_geojson ? JSON.stringify(data.boundary_geojson) : null,
     data.area, data.area_unit, data.orientation, data.sun_exposure, data.drainage,
     data.irrigation_method, data.water_source, data.soil_ph, data.notes]
  );
}
