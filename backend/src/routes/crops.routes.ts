import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import * as cropService from '../services/crop.service';
import { generateCarePlan } from '../ai/advisor';
import { buildFarmContext } from '../ai/context';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const crops = await cropService.getAllUserCrops(req.user!.userId);
  res.json({ crops });
});

router.get('/plots/:plotId', async (req: Request, res: Response): Promise<void> => {
  const crops = await cropService.getPlotCrops(req.params.plotId, req.user!.userId);
  res.json({ crops });
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const crop = await cropService.getCropById(req.params.id, req.user!.userId);
  if (!crop) { res.status(404).json({ error: 'Crop not found' }); return; }
  res.json({ crop });
});

router.post('/plots/:plotId', requireSubscription, async (req: Request, res: Response): Promise<void> => {
  try {
    const crop = await cropService.createCrop(req.params.plotId, req.user!.userId, req.body);
    res.status(201).json({ crop });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create crop' });
  }
});

router.put('/:id', requireSubscription, async (req: Request, res: Response): Promise<void> => {
  try {
    const crop = await cropService.updateCrop(req.params.id, req.user!.userId, req.body);
    if (!crop) { res.status(404).json({ error: 'Crop not found' }); return; }
    res.json({ crop });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update crop' });
  }
});

// Generate care plan for a crop
router.post('/:id/care-plan', requireSubscription, async (req: Request, res: Response): Promise<void> => {
  const crop = await cropService.getCropById(req.params.id, req.user!.userId);
  if (!crop) { res.status(404).json({ error: 'Crop not found' }); return; }

  try {
    const ctx = await buildFarmContext(req.user!.userId);
    const primaryFarm = ctx.farms[0];
    const plot = primaryFarm?.plots.find((p) => p.currentCrops.some((c) => c.crop === crop.crop_type));

    const planJson = await generateCarePlan({
      cropType: crop.crop_type,
      variety: crop.variety,
      plantingDate: crop.planting_date?.toString() ?? null,
      growingMethod: crop.growing_method,
      goal: crop.goal,
      plotArea: plot?.area ?? 'unknown',
      sunExposure: plot?.sunExposure ?? null,
      irrigation: plot?.irrigation ?? null,
      soilPh: null,
      farmerLocation: ctx.farmer.location,
    });

    const parsed = JSON.parse(planJson);
    const plan = await cropService.saveCarePlan(
      crop.id,
      { ...parsed, generated_at: new Date(), raw_ai_response: planJson },
      'claude-sonnet-4-6'
    );

    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate care plan', detail: err instanceof Error ? err.message : 'Unknown error' });
  }
});

router.get('/:id/care-plan', async (req: Request, res: Response): Promise<void> => {
  const plan = await cropService.getCarePlan(req.params.id, req.user!.userId);
  if (!plan) { res.status(404).json({ error: 'No care plan found' }); return; }
  res.json({ plan });
});

// Log yield outcome
router.post('/:id/yield', requireSubscription, async (req: Request, res: Response): Promise<void> => {
  try {
    await cropService.logYieldOutcome(req.params.id, req.user!.userId, {
      harvest_date: new Date(req.body.harvest_date),
      actual_yield_kg: req.body.actual_yield_kg,
      quality_rating: req.body.quality_rating,
      issues_faced: req.body.issues_faced,
      photo_url: req.body.photo_url,
    });
    res.json({ message: 'Yield outcome logged' });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to log yield' });
  }
});

export default router;
