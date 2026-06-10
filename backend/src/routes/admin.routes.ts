import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { query, queryOne } from '../db/client';

const router = Router();
router.use(requireAuth, requireAdmin);

// All farmers
router.get('/farmers', async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string ?? '1', 10));
  const limit = Math.min(100, parseInt(req.query.limit as string ?? '50', 10));
  const offset = (page - 1) * limit;

  const farmers = await query(
    `SELECT u.id, u.email, u.name, u.phone, u.subscription_status,
            u.trial_ends_at, u.subscription_ends_at, u.last_active_at, u.created_at,
            COUNT(DISTINCT f.id) as farm_count
     FROM users u
     LEFT JOIN farms f ON f.user_id = u.id AND f.is_active = TRUE
     WHERE u.role = 'farmer'
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const total = await queryOne<{ count: string }>(
    "SELECT COUNT(*)::text as count FROM users WHERE role = 'farmer'"
  );

  res.json({ farmers, total: parseInt(total?.count ?? '0', 10), page, limit });
});

// Platform analytics
router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
  const [users, farms, crops, conversations, alerts] = await Promise.all([
    queryOne<{
      total: string; trial: string; active: string; expired: string;
    }>(
      `SELECT
         COUNT(*)::text as total,
         COUNT(*) FILTER (WHERE subscription_status = 'trial')::text as trial,
         COUNT(*) FILTER (WHERE subscription_status = 'active')::text as active,
         COUNT(*) FILTER (WHERE subscription_status = 'expired')::text as expired
       FROM users WHERE role = 'farmer'`
    ),
    queryOne<{ count: string }>("SELECT COUNT(*)::text as count FROM farms WHERE is_active = TRUE"),
    queryOne<{ count: string; active: string }>(
      `SELECT COUNT(*)::text as count,
              COUNT(*) FILTER (WHERE status = 'active')::text as active
       FROM crops`
    ),
    queryOne<{ count: string; queries: string }>(
      `SELECT COUNT(*)::text as count, SUM(ai_query_count)::text as queries FROM conversations`
    ),
    queryOne<{ pending: string }>(
      "SELECT COUNT(*) FILTER (WHERE status = 'pending')::text as pending FROM alerts"
    ),
  ]);

  res.json({ users, farms, crops, conversations, alerts });
});

// Manage subscription
router.put('/farmers/:userId/subscription', async (req: Request, res: Response): Promise<void> => {
  const { status, plan, extends_days } = req.body;
  const { userId } = req.params;

  const user = await queryOne('SELECT id FROM users WHERE id = $1 AND role = $2', [userId, 'farmer']);
  if (!user) { res.status(404).json({ error: 'Farmer not found' }); return; }

  if (extends_days) {
    await query(
      `UPDATE users SET subscription_ends_at = GREATEST(subscription_ends_at, NOW()) + ($1 * INTERVAL '1 day')
       WHERE id = $2`,
      [extends_days, userId]
    );
  }

  if (status) {
    await query('UPDATE users SET subscription_status = $1 WHERE id = $2', [status, userId]);
  }

  // Audit log
  await query(
    `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
     VALUES ($1, 'subscription_update', 'user', $2, $3)`,
    [req.user!.userId, userId, JSON.stringify({ status, plan, extends_days })]
  );

  res.json({ message: 'Subscription updated' });
});

// Impersonate farmer (returns a short-lived token)
router.post('/farmers/:userId/impersonate', async (req: Request, res: Response): Promise<void> => {
  const farmer = await queryOne<{ id: string; email: string; role: string }>(
    "SELECT id, email, role FROM users WHERE id = $1 AND role = 'farmer'",
    [req.params.userId]
  );
  if (!farmer) { res.status(404).json({ error: 'Farmer not found' }); return; }

  import('jsonwebtoken').then((jwt) => {
    const token = jwt.default.sign(
      { userId: farmer.id, role: farmer.role, impersonatedBy: req.user!.userId },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
       VALUES ($1, 'impersonate', 'user', $2)`,
      [req.user!.userId, farmer.id]
    );

    res.json({ token, farmer: { id: farmer.id, email: farmer.email } });
  });
});

export default router;
