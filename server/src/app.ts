import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import equipmentRoutes from './routes/equipment.js';
import aiRoutes from './routes/ai.js';
import discoveryRoutes from './routes/discovery.js';
import requestsRoutes from './routes/requests.js';
import facultyRoutes from './routes/faculty.js';
import adminRoutes from './routes/admin.js';
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

// API Routes
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', equipmentRoutes);
app.use('/api', aiRoutes);
app.use('/api', discoveryRoutes);
app.use('/api', requestsRoutes);
app.use('/api', facultyRoutes);
app.use('/api', adminRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
