import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import equipmentRoutes from './routes/equipment.js';
import aiRoutes from './routes/ai.js';
import discoveryRoutes from './routes/discovery.js';
import requestsRoutes from './routes/requests.js';
import facultyRoutes from './routes/faculty.js';
import adminRoutes from './routes/admin.js';
import matchmakerRoutes from './routes/matchmaker.js';
import copilotRoutes from './routes/copilot.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security and utility middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Permit flexible dev proxy
  })
);

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(
  cors({
    origin: [corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// Serve static equipment photographs with security and cache headers
const baseDir = process.cwd().endsWith('server') ? process.cwd() : path.join(process.cwd(), 'server');
const mediaEquipmentPath = path.resolve(baseDir, 'media', 'equipment');
app.use(
  '/media/equipment',
  (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    next();
  },
  express.static(mediaEquipmentPath)
);

// API Routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', equipmentRoutes);
app.use('/api', aiRoutes);
app.use('/api', discoveryRoutes);
app.use('/api', requestsRoutes);
app.use('/api', facultyRoutes);
app.use('/api', adminRoutes);
app.use('/api/matchmaker', matchmakerRoutes);
app.use('/api/copilot', copilotRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
