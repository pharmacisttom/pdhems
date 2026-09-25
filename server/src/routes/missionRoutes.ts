import { Router } from 'express';
import { missionController } from '../controllers/missionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All mission endpoints require authentication
router.use(authenticate);

// Query missions and available resources
router.get('/', missionController.listMissions);
router.get('/resources/available', missionController.getAvailableResources);
router.get('/:id', missionController.getMission);

// Creation & Assignment
router.post('/refer', missionController.createReferMission);
router.post('/:id/assign', missionController.assignMission);

// Readiness & Pre-trip Checklist (Section 5)
router.post('/:id/confirm-readiness', missionController.confirmReadiness);
router.post('/:id/pretrip', missionController.submitPretripChecklist);

// Departure with Policy & Emergency Override (Section 5 & 6)
router.post('/:id/depart', missionController.departMission);

// Refer Handover & Return Trip Workflow (Section 6, 12, 13)
router.post('/:id/arrived', missionController.markArrived);
router.post('/:id/handover', missionController.confirmHandover);
router.post('/:id/start-return', missionController.startReturnTrip);
router.post('/:id/complete', missionController.completeMission);

export default router;
