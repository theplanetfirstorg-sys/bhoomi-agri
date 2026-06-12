import { query, queryOne } from '../db/client';
import { Crop, CarePlan } from '../types';

export async function getPlotCrops(plotId: string, userId: string): Promise<Crop[]> {
  return query<Crop>(
    `SELECT c.* FROM crops c
     JOIN plots p ON p.id = c.plot_id
     JOIN farms f ON f.id = p.farm_id
     WHERE c.plot_id = $1 AND f.user_id = $2
     ORDER BY c.planting_date DESC`,
    [plotId, userId]
  );
}

export async function getCropById(id: string, userId: string): Promise<Crop | null> {
  return queryOne<Crop>(
    `SELECT c.* FROM crops c
     JOIN plots p ON p.id = c.plot_id
     JOIN farms f ON f.id = p.farm_id
     WHERE c.id = $1 AND f.user_id = $2`,
    [id, userId]
  );
}

export async function getAllUserCrops(userId: string): Promise<(Crop & { plot_name: string; farm_name: string })[]> {
  return query(
    `SELECT c.*, p.name as plot_name, f.name as farm_name
     FROM crops c
     JOIN plots p ON p.id = c.plot_id
     JOIN farms f ON f.id = p.farm_id
     WHERE f.user_id = $1 AND c.status = 'active'
     ORDER BY c.planting_date DESC`,
    [userId]
  );
}

export async function createCrop(
  plotId: string,
  userId: string,
  data: Partial<Crop>
): Promise<Crop> {
  const plot = await queryOne(
    `SELECT p.id FROM plots p JOIN farms f ON f.id = p.farm_id
     WHERE p.id = $1 AND f.user_id = $2`,
    [plotId, userId]
  );
  if (!plot) throw new Error('Plot not found');

  const crop = await queryOne<Crop>(
    `INSERT INTO crops (plot_id, crop_type, variety, planting_date, expected_harvest_date,
       growing_method, seed_source, goal, quantity_planted, quantity_unit,
       soil_ph_at_planting, fertiliser_used, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      plotId, data.crop_type, data.variety ?? null,
      data.planting_date ?? null, data.expected_harvest_date ?? null,
      data.growing_method ?? 'in_ground', data.seed_source ?? null,
      data.goal ?? 'home_consumption', data.quantity_planted ?? null,
      data.quantity_unit ?? null, null, null, data.notes ?? null,
    ]
  );

  return crop!;
}

export async function updateCropStatus(
  id: string,
  userId: string,
  status: Crop['status']
): Promise<Crop | null> {
  return queryOne<Crop>(
    `UPDATE crops SET status = $3
     FROM plots p JOIN farms f ON f.id = p.farm_id
     WHERE crops.id = $1 AND crops.plot_id = p.id AND f.user_id = $2
     RETURNING crops.*`,
    [id, userId, status]
  );
}

export async function updateCrop(id: string, userId: string, data: Partial<Crop>): Promise<Crop | null> {
  const { crop_type, variety, planting_date, expected_harvest_date, growing_method,
    seed_source, goal, status, quantity_planted, quantity_unit, notes } = data;

  return queryOne<Crop>(
    `UPDATE crops SET
       crop_type = COALESCE($3, crop_type),
       variety = COALESCE($4, variety),
       planting_date = COALESCE($5, planting_date),
       expected_harvest_date = COALESCE($6, expected_harvest_date),
       growing_method = COALESCE($7, growing_method),
       seed_source = COALESCE($8, seed_source),
       goal = COALESCE($9, goal),
       status = COALESCE($10, status),
       quantity_planted = COALESCE($11, quantity_planted),
       quantity_unit = COALESCE($12, quantity_unit),
       notes = COALESCE($13, notes)
     FROM plots p JOIN farms f ON f.id = p.farm_id
     WHERE crops.id = $1 AND crops.plot_id = p.id AND f.user_id = $2
     RETURNING crops.*`,
    [id, userId, crop_type, variety, planting_date || null, expected_harvest_date || null,
     growing_method, seed_source, goal, status, quantity_planted, quantity_unit, notes]
  );
}

// ─── Care Plans ──────────────────────────────────────────────────────────────

export async function getCarePlan(cropId: string, userId: string): Promise<CarePlan | null> {
  return queryOne<CarePlan>(
    `SELECT cp.* FROM care_plans cp
     JOIN crops c ON c.id = cp.crop_id
     JOIN plots p ON p.id = c.plot_id
     JOIN farms f ON f.id = p.farm_id
     WHERE cp.crop_id = $1 AND f.user_id = $2
     ORDER BY cp.generated_at DESC
     LIMIT 1`,
    [cropId, userId]
  );
}

export async function saveCarePlan(
  cropId: string,
  plan: Omit<CarePlan, 'id' | 'crop_id' | 'created_at' | 'updated_at'>,
  modelVersion: string
): Promise<CarePlan> {
  // Replace existing plan for crop
  await query('DELETE FROM care_plans WHERE crop_id = $1', [cropId]);

  const saved = await queryOne<CarePlan>(
    `INSERT INTO care_plans (crop_id, model_version, watering_schedule, fertiliser_schedule,
       pest_watch, alerts, growth_stages, raw_ai_response)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      cropId, modelVersion,
      JSON.stringify(plan.watering_schedule),
      JSON.stringify(plan.fertiliser_schedule),
      JSON.stringify(plan.pest_watch),
      JSON.stringify(plan.alerts),
      JSON.stringify(plan.growth_stages),
      (plan as CarePlan & { raw_ai_response?: string }).raw_ai_response ?? null,
    ]
  );

  return saved!;
}

// ─── Yield Outcomes ──────────────────────────────────────────────────────────

export async function logYieldOutcome(
  cropId: string,
  userId: string,
  data: {
    harvest_date: Date;
    actual_yield_kg?: number;
    quality_rating?: number;
    issues_faced?: string;
    photo_url?: string;
  }
): Promise<void> {
  const crop = await getCropById(cropId, userId);
  if (!crop) throw new Error('Crop not found');

  const comparison = crop.expected_harvest_date
    ? data.actual_yield_kg
      ? 'on_target'  // Will be refined by AI
      : 'under'
    : null;

  await query(
    `INSERT INTO yield_outcomes (crop_id, harvest_date, actual_yield_kg, quality_rating,
       issues_faced, photo_url, comparison_result)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [cropId, data.harvest_date, data.actual_yield_kg ?? null,
     data.quality_rating ?? null, data.issues_faced ?? null,
     data.photo_url ?? null, comparison]
  );

  await query("UPDATE crops SET status = 'harvested', actual_harvest_date = $2 WHERE id = $1", [
    cropId, data.harvest_date,
  ]);
}
