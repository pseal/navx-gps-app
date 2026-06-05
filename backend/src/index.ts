// src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import searchRoutes from './routes/search';
import routeRoutes from './routes/route';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests', timestamp: Date.now() },
});
app.use(limiter);

// Middleware
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/search', searchRoutes);
app.use('/api/route', routeRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), version: '1.0.0' });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`🗺️  GPS Nav Backend running on http://localhost:${PORT}`);
});

export default app;
