import { Router } from 'express';
import { GisController } from '../controllers/gisController';

const router = Router();

// GeoJSON endpoints (RFC 7946 compliant)
router.get('/ambulances.geojson', GisController.getAmbulancesGeoJson);
router.get('/facilities.geojson', GisController.getFacilitiesGeoJson);
router.get('/bases.geojson', GisController.getBasesGeoJson);
router.get('/tracks/:id.geojson', GisController.getMissionTrackGeoJson);
router.get('/all.geojson', GisController.getAllLayersGeoJson);

// KML export (Google Earth & Desktop GIS)
router.get('/export/kml', GisController.exportKml);

export default router;
