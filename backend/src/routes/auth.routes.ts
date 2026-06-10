import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { requireAuth } from '../middleware/auth';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const user = await authService.createUser(parsed.data);
    const tokens = authService.signTokens(user);
    res.status(201).json({ user, ...tokens });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signup failed';
    res.status(400).json({ error: message });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed' });
    return;
  }

  try {
    const user = await authService.verifyCredentials(parsed.data.email, parsed.data.password);
    const tokens = authService.signTokens(user);
    res.json({ user, ...tokens });
  } catch {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const payload = authService.verifyRefreshToken(refreshToken);
    const user = await authService.getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    const tokens = authService.signTokens(user);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = await authService.getUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email required' });
    return;
  }

  // Always return 200 to avoid email enumeration
  await authService.initiatePasswordReset(email);
  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) {
    res.status(400).json({ error: 'Token and password (min 8 chars) required' });
    return;
  }

  const success = await authService.resetPassword(token, password);
  if (!success) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
    return;
  }

  res.json({ message: 'Password reset successful' });
});

router.get('/verify-email/:token', async (req: Request, res: Response): Promise<void> => {
  const success = await authService.verifyEmail(req.params.token);
  if (!success) {
    res.status(400).json({ error: 'Invalid verification token' });
    return;
  }
  res.json({ message: 'Email verified' });
});

export default router;
