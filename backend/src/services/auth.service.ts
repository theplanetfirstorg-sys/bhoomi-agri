import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, withTransaction } from '../db/client';
import { User, JwtPayload } from '../types';

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<User> {
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()]);
  if (existing) throw new Error('Email already registered');

  const password_hash = await bcrypt.hash(data.password, 12);
  const trial_ends_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const emailVerifyToken = uuidv4();

  const user = await withTransaction(async (client) => {
    const { rows } = await client.query<User>(
      `INSERT INTO users (email, password_hash, name, phone, role, subscription_status, trial_ends_at, email_verify_token)
       VALUES ($1, $2, $3, $4, 'farmer', 'trial', $5, $6)
       RETURNING id, email, name, phone, role, subscription_status, trial_ends_at, subscription_ends_at,
                 email_verified, fcm_token, last_active_at, created_at, updated_at`,
      [data.email.toLowerCase(), password_hash, data.name, data.phone ?? null, trial_ends_at, emailVerifyToken]
    );

    await client.query(
      `INSERT INTO subscriptions (user_id, plan, status, starts_at, ends_at)
       VALUES ($1, 'trial', 'trial', NOW(), $2)`,
      [rows[0].id, trial_ends_at]
    );

    return rows[0];
  });

  return user;
}

export async function verifyCredentials(email: string, password: string): Promise<User> {
  const row = await queryOne<User & { password_hash: string }>(
    `SELECT id, email, password_hash, name, phone, role, subscription_status,
            trial_ends_at, subscription_ends_at, email_verified, fcm_token,
            last_active_at, created_at, updated_at
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (!row) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) throw new Error('Invalid credentials');

  // Update last_active_at
  await query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [row.id]);

  const { password_hash: _, ...user } = row;
  return user as User;
}

export function signTokens(user: User): { accessToken: string; refreshToken: string } {
  const payload: JwtPayload = { userId: user.id, role: user.role };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
}

export async function getUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    `SELECT id, email, name, phone, role, subscription_status,
            trial_ends_at, subscription_ends_at, email_verified, fcm_token,
            last_active_at, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );
}

export async function initiatePasswordReset(email: string): Promise<string | null> {
  const token = uuidv4();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const result = await query(
    `UPDATE users SET password_reset_token = $1, password_reset_expires = $2
     WHERE email = $3 RETURNING id`,
    [token, expires, email.toLowerCase()]
  );

  return result.length > 0 ? token : null;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const user = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
    [token]
  );

  if (!user) return false;

  const password_hash = await bcrypt.hash(newPassword, 12);
  await query(
    `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
     WHERE id = $2`,
    [password_hash, user.id]
  );

  return true;
}

export async function verifyEmail(token: string): Promise<boolean> {
  const result = await query(
    `UPDATE users SET email_verified = TRUE, email_verify_token = NULL
     WHERE email_verify_token = $1 AND email_verified = FALSE
     RETURNING id`,
    [token]
  );
  return result.length > 0;
}
