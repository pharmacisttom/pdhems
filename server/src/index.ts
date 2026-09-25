import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection } from './db/connection';
import authRoutes from './routes/authRoutes';
import mapRoutes from './routes/mapRoutes';
import facilityRoutes from './routes/facilityRoutes';
import baseRoutes from './routes/baseRoutes';
import ambulanceRoutes from './routes/ambulanceRoutes';
import missionRoutes from './routes/missionRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint (Required by Section 50)
app.get('/api/health', async (req: Request, res: Response) => {
  const dbConnected = await testConnection();
  res.json({
    status: dbConnected ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    service: 'PDH Smart EMS Core & Geospatial Intelligence API',
    database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
  });
});

// Register Core Routes
app.use('/api/auth', authRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/bases', baseRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/missions', missionRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'API Endpoint not found' });
});

// Centralized error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚑 PDH Smart EMS Server running on port ${PORT}`);
    console.log(`📍 Geospatial Intelligence Module: Active`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

export default app;
