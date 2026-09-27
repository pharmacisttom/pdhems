import { Router } from 'express';
import { FleetController } from '../controllers/fleetController';
import { AmbulanceController } from '../controllers/ambulanceController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Fleet Summary
router.get('/summary', FleetController.getFleetSummary);

// Ambulances
router.get('/ambulances', AmbulanceController.getAll);
router.get('/ambulances/:id', AmbulanceController.getById);
router.post('/ambulances', FleetController.createAmbulance);
router.put('/ambulances/:id', FleetController.updateAmbulance);
router.delete('/ambulances/:id', FleetController.deleteAmbulance);
router.put('/ambulances/:id/location', AmbulanceController.updateLocation);

// Drivers
router.get('/drivers', FleetController.getDrivers);
router.post('/drivers', FleetController.createDriver);
router.put('/drivers/:id', FleetController.updateDriver);
router.delete('/drivers/:id', FleetController.deleteDriver);

// Staff
router.get('/staff', FleetController.getStaff);
router.post('/staff', FleetController.createStaff);
router.put('/staff/:id', FleetController.updateStaff);
router.delete('/staff/:id', FleetController.deleteStaff);

export default router;
