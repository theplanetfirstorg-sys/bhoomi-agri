import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import farmRoutes from './routes/farms.routes';
import cropRoutes from './routes/crops.routes';
import advisorRoutes from './routes/advisor.routes';
import marketRoutes from './routes/market.routes';
import adminRoutes from './routes/admin.routes';
import iotRoutes from './iot/stub';

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL ?? 'http://localhost:5173',
    process.env.ADMIN_URL ?? 'http://localhost:5174',
  ],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

// AI advisor rate limit — more restrictive
app.use('/api/v1/advisor/chat', rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many AI requests. Please wait a minute.' },
}));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/farms', farmRoutes);
app.use('/api/v1/crops', cropRoutes);
app.use('/api/v1/advisor', advisorRoutes);
app.use('/api/v1/market', marketRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/sensors', iotRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', service: 'bhoomi-agri-api' });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT ?? '3001', 10);
app.listen(PORT, () => {
  console.log(`🌱 Bhoomi.Agri API running on port ${PORT}`);
});

export default app;
