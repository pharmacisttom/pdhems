import { Router } from 'express';
import { MapController } from '../controllers/mapController';
import { FacilityController } from '../controllers/facilityController';
import { BaseController } from '../controllers/baseController';

const router = Router();

// Fleet & Telematics
router.get('/vehicles', MapController.getVehicles);
router.get('/active-missions', MapController.getActiveMissions);
router.get('/facilities', FacilityController.getAll);
router.get('/bases', BaseController.getAll);
router.get('/config', MapController.getMapConfig);

// Phase MAP-2: GPS Tracks & Tracking Health
router.get('/mission/:id/track', MapController.getMissionTrack);
router.get('/vehicles/:id/track', MapController.getVehicleTrack);
router.post('/gps/batch', MapController.syncGpsBatch);
router.get('/tracking-health', MapController.getTrackingHealth);

export default router;
