import { Router } from 'express';
import { getEmsKpis, getTripSummary, getSpatialDensity } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All report endpoints require authentication
router.use(authenticate);

// 1. EMS KPI Metrics (Section 40)
router.get('/kpis', getEmsKpis);

// 2. Trip Summary Reports (Section 39)
router.get('/trip-summary', getTripSummary);

// 3. Spatial Analytics & Density Heatmap (Section 23 MAP-7)
router.get('/spatial-density', getSpatialDensity);

export default router;
