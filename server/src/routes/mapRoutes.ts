import { Router } from 'express';
import { MapController } from '../controllers/mapController';
import { FacilityController } from '../controllers/facilityController';
import { BaseController } from '../controllers/baseController';

const router = Router();

// Public / Telematics endpoints for Command Center Map
router.get('/vehicles', MapController.getVehicles);
router.get('/active-missions', MapController.getActiveMissions);
router.get('/facilities', FacilityController.getAll);
router.get('/bases', BaseController.getAll);
router.get('/config', MapController.getMapConfig);

export default router;
