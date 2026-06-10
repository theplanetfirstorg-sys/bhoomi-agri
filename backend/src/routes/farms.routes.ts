import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import * as farmService from '../services/farm.service';

const router = Router();
router.use(requireAuth);

// ─── Farms ────────────────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const farms = await farmService.getUserFarms(req.user!.userId);
  res.json({ farms });
});

router.post('/', requireSubscription, async (req: Request, res: Response): Promise<void> => {
  try {
    const farm = await farmService.createFarm(req.user!.userId, req.body);
    res.status(201).json({ farm });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create farm' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const farm = await farmService.getFarmById(req.params.id, req.user!.userId);
  if (!farm) { res.status(404).json({ error: 'Farm not found' }); return; }
  res.json({ farm });
});

router.put('/:id', requireSubscription, async (req: Request, res: Response): Promise<void> => {
  const farm = await farmService.updateFarm(req.params.id, req.user!.userId, req.body);
  if (!farm) { res.status(404).json({ error: 'Farm not found' }); return; }
  res.json({ farm });
});

router.delete('/:id', requireSubscription, async (req: Request, res: Response): Promise<void> => {
  const ok = await farmService.deleteFarm(req.params.id, req.user!.userId);
  if (!ok) { res.status(404).json({ error: 'Farm not found' }); return; }
  res.json({ message: 'Farm deleted' });
});

// ─── Plots ────────────────────────────────────────────────────────────────────

router.get('/:farmId/plots', async (req: Request, res: Response): Promise<void> => {
  const plots = await farmService.getFarmPlots(req.params.farmId, req.user!.userId);
  res.json({ plots });
});

router.post('/:farmId/plots', requireSubscription, async (req: Request, res: Response): Promise<void> => {
  try {
    const plot = await farmService.createPlot(req.params.farmId, req.user!.userId, req.body);
    res.status(201).json({ plot });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create plot' });
  }
});

router.put('/plots/:plotId', requireSubscription, async (req: Request, res: Response): Promise<void> => {
  const plot = await farmService.updatePlot(req.params.plotId, req.user!.userId, req.body);
  if (!plot) { res.status(404).json({ error: 'Plot not found' }); return; }
  res.json({ plot });
});

export default router;
