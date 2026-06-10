import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../db/client';
import { User } from '../types';

export async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await queryOne<User>(
    'SELECT subscription_status, trial_ends_at, subscription_ends_at FROM users WHERE id = $1',
    [req.user!.userId]
  );

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  const now = new Date();

  if (user.subscription_status === 'trial') {
    if (user.trial_ends_at && new Date(user.trial_ends_at) < now) {
      // Auto-expire trial
      await queryOne(
        "UPDATE users SET subscription_status = 'expired' WHERE id = $1",
        [req.user!.userId]
      );
      res.status(402).json({
        error: 'Trial expired',
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Your 14-day trial has ended. Please subscribe to continue.',
      });
      return;
    }
  } else if (user.subscription_status === 'active') {
    if (user.subscription_ends_at && new Date(user.subscription_ends_at) < now) {
      await queryOne(
        "UPDATE users SET subscription_status = 'expired' WHERE id = $1",
        [req.user!.userId]
      );
      res.status(402).json({
        error: 'Subscription expired',
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Your subscription has expired. Please renew to continue.',
      });
      return;
    }
  } else if (user.subscription_status === 'expired' || user.subscription_status === 'cancelled') {
    res.status(402).json({
      error: 'Subscription required',
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'Please subscribe to access this feature.',
    });
    return;
  }

  next();
}

export async function checkAiQueryLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await queryOne<User & { plan: string }>(
    `SELECT u.subscription_status, u.trial_ends_at,
            COALESCE(sp.max_ai_queries, 999999) as max_queries,
            COUNT(cm.id) as query_count
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status IN ('trial','active')
     LEFT JOIN subscription_plans sp ON sp.name = s.plan
     LEFT JOIN conversations c ON c.user_id = u.id
     LEFT JOIN LATERAL jsonb_array_elements(c.messages) cm ON cm->>'role' = 'user'
     WHERE u.id = $1
     GROUP BY u.subscription_status, u.trial_ends_at, sp.max_ai_queries`,
    [req.user!.userId]
  );

  // Simple approach: check trial users haven't exceeded 20 queries
  if (user?.subscription_status === 'trial') {
    const totalQueries = await queryOne<{ count: string }>(
      `SELECT SUM(ai_query_count)::text as count FROM conversations WHERE user_id = $1`,
      [req.user!.userId]
    );
    const count = parseInt(totalQueries?.count ?? '0', 10);
    if (count >= 20) {
      res.status(402).json({
        error: 'AI query limit reached',
        code: 'QUERY_LIMIT_REACHED',
        message: 'You have used all 20 AI queries in your free trial. Please subscribe for unlimited access.',
      });
      return;
    }
  }

  next();
}
