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

export async function createFarm(
  userId: string,
  data: Partial<Farm>
): Promise<Farm> {
  const { name, latitude, longitude, region, address, total_area, area_unit, soil_type, farming_type, elevation_m, notes } = data;

  const locationExpr = latitude && longitude
    ? `ST_SetSRID(ST_MakePoint($7, $8), 4326)`
    : 'NULL';

  const params = [
    userId, name, region ?? null, address ?? null,
    total_area ?? null, area_unit ?? 'perches',
    longitude ?? null, latitude ?? null,
    soil_type ?? 'unknown', farming_type ?? 'home_garden',
    elevation_m ?? null, notes ?? null,
  ];

  const farm = await queryOne<Farm>(
    `INSERT INTO farms (user_id, name, region, address, total_area, area_unit,
       longitude, latitude, location, soil_type, farming_type, elevation_m, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${locationExpr}, $9, $10, $11, $12)
     RETURNING *`,
    params
  );

  return farm!;
}

export async function updateFarm(
  id: string,
  userId: string,
  data: Partial<Farm>
): Promise<Farm | null> {
  const { name, latitude, longitude, region, address, total_area, area_unit, soil_type, farming_type, elevation_m, notes } = data;

  return queryOne<Farm>(
    `UPDATE farms SET
       name = COALESCE($3, name),
       latitude = COALESCE($4, latitude),
       longitude = COALESCE($5, longitude),
       location = CASE WHEN $4 IS NOT NULL AND $5 IS NOT NULL
                  THEN ST_SetSRID(ST_MakePoint($5, $4), 4326) ELSE location END,
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
    "UPDATE farms SET is_active = FALSE WHERE id = $1 AND user_id = $2",
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

export async function createPlot(
  farmId: string,
  userId: string,
  data: Partial<Plot>
): Promise<Plot> {
  // Verify farm belongs to user
  const farm = await queryOne('SELECT id FROM farms WHERE id = $1 AND user_id = $2', [farmId, userId]);
  if (!farm) throw new Error('Farm not found');

  const plot = await queryOne<Plot>(
    `INSERT INTO plots (farm_id, name, boundary_geojson, area, area_unit, orientation,
       sun_exposure, drainage, irrigation_method, water_source, soil_ph, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      farmId,
      data.name,
      data.boundary_geojson ? JSON.stringify(data.boundary_geojson) : null,
      data.area ?? null,
      data.area_unit ?? 'perches',
      data.orientation ?? null,
      data.sun_exposure ?? null,
      data.drainage ?? null,
      data.irrigation_method ?? null,
      data.water_source ?? null,
      data.soil_ph ?? null,
      data.notes ?? null,
    ]
  );

  return plot!;
}

export async function updatePlot(
  id: string,
  userId: string,
  data: Partial<Plot>
): Promise<Plot | null> {
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
