/**
 * IoT integration stub — v2 ready.
 * All endpoints exist and validate input. Data is stored but alerts/automations are inactive.
 * MQTT broker connection is configured but disabled (MQTT_ENABLED=false in v1).
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/client';

const router = Router();

const sensorPayloadSchema = z.object({
  device_id: z.string(),
  plot_id: z.string().uuid(),
  readings: z.array(z.object({
    sensor_type: z.enum(['soil_moisture','soil_temperature','soil_ph','soil_ec',
      'air_temperature','air_humidity','light_intensity','rainfall','wind_speed','co2_level']),
    value: z.number(),
    unit: z.string(),
    recorded_at: z.string().datetime().optional(),
  })),
});

// POST /api/v1/sensors/ingest — accepts sensor payload, stores readings
router.post('/ingest', async (req: Request, res: Response): Promise<void> => {
  const parsed = sensorPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    return;
  }

  const { device_id, plot_id, readings } = parsed.data;

  for (const reading of readings) {
    await query(
      `INSERT INTO sensor_readings (plot_id, device_id, sensor_type, value, unit, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [plot_id, device_id, reading.sensor_type, reading.value, reading.unit,
       reading.recorded_at ? new Date(reading.recorded_at) : new Date()]
    );
  }

  // Update device last_seen_at
  await query(
    `INSERT INTO sensor_devices (plot_id, device_id, last_seen_at, is_active)
     VALUES ($1, $2, NOW(), FALSE)
     ON CONFLICT (device_id) DO UPDATE SET last_seen_at = NOW()`,
    [plot_id, device_id]
  );

  res.json({ message: 'Readings stored', count: readings.length, active: false });
});

router.get('/devices/:plotId', async (req: Request, res: Response): Promise<void> => {
  const devices = await query(
    'SELECT * FROM sensor_devices WHERE plot_id = $1',
    [req.params.plotId]
  );
  res.json({ devices, note: 'IoT integration active in v2' });
});

export default router;
