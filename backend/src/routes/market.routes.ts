import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import * as cbslService from '../market/cbsl.service';

const router = Router();
router.use(requireAuth);

router.get('/prices', async (req: Request, res: Response): Promise<void> => {
  const commodities = req.query.commodities
    ? (req.query.commodities as string).split(',').map((c) => c.trim())
    : undefined;

  const prices = await cbslService.getLatestPrices(commodities);
  res.json({ prices });
});

router.get('/prices/:commodity/trend', async (req: Request, res: Response): Promise<void> => {
  const months = parseInt(req.query.months as string ?? '6', 10);
  const trend = await cbslService.getPriceTrend(req.params.commodity, Math.min(months, 24));
  res.json({ trend });
});

router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query;
  if (!q) { res.status(400).json({ error: 'Query required' }); return; }
  const results = await cbslService.searchCommodity(q as string);
  res.json({ results });
});

export default router;
