import { Request, Response } from 'express';
import { pool } from '../db/connection';

/**
 * Helper to build RFC 7946 GeoJSON FeatureCollection
 */
function toFeatureCollection(features: any[]) {
  return {
    type: 'FeatureCollection',
    name: 'PDH_Smart_EMS_Geospatial_Data',
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
      },
    },
    features,
  };
}

export class GisController {
  /**
   * Get Ambulances as GeoJSON FeatureCollection
   */
  public static async getAmbulancesGeoJson(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query(`
        SELECT 
          a.id,
          a.vehicle_code,
          a.registration_no,
          a.vehicle_type,
          a.brand,
          a.model,
          a.status,
          a.current_latitude,
          a.current_longitude,
          a.current_heading,
          a.current_speed,
          a.last_gps_at,
          a.gps_quality,
          TIMESTAMPDIFF(SECOND, a.last_gps_at, NOW()) AS seconds_since_last_gps,
          m.id AS mission_id,
          m.mission_no,
          m.mission_type,
          m.status AS mission_status,
          d.display_name AS driver_name
        FROM ambulances a
        LEFT JOIN ems_missions m ON m.vehicle_id = a.id AND m.status NOT IN ('COMPLETED', 'CANCELLED')
        LEFT JOIN drivers d ON d.id = m.driver_id
        WHERE a.active = 1
        ORDER BY a.vehicle_code ASC
      `);

      const features = rows
        .filter((r: any) => r.current_latitude !== null && r.current_longitude !== null)
        .map((r: any) => {
          const sec = r.seconds_since_last_gps !== null ? Number(r.seconds_since_last_gps) : null;
          let telematicsHealth = 'TRACKING';
          if (sec === null || sec > 300) telematicsHealth = 'LOST';
          else if (sec > 120) telematicsHealth = 'DELAYED';

          return {
            type: 'Feature',
            id: `ambulance-${r.id}`,
            geometry: {
              type: 'Point',
              coordinates: [Number(r.current_longitude), Number(r.current_latitude)],
            },
            properties: {
              layer: 'Ambulances',
              id: r.id,
              vehicle_code: r.vehicle_code,
              registration_no: r.registration_no,
              vehicle_type: r.vehicle_type,
              brand: r.brand,
              model: r.model,
              status: r.status,
              heading: r.current_heading !== null ? Number(r.current_heading) : 0,
              speed_kmh: r.current_speed !== null ? Number(r.current_speed) : 0,
              last_gps_at: r.last_gps_at,
              gps_quality: r.gps_quality,
              telematics_health: telematicsHealth,
              driver_name: r.driver_name || 'ไม่ได้ระบุ',
              mission_no: r.mission_no || null,
              mission_type: r.mission_type || null,
              mission_status: r.mission_status || null,
            },
          };
        });

      const geojson = toFeatureCollection(features);

      if (req.query.download === 'true') {
        res.setHeader('Content-Disposition', 'attachment; filename="pdh_ambulances.geojson"');
      }
      res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
      res.json(geojson);
    } catch (err: any) {
      console.error('GIS Error fetching ambulances GeoJSON:', err);
      res.status(500).json({ success: false, message: 'Failed to generate GIS data' });
    }
  }

  /**
   * Get Facilities (Hospitals & Medical Centers) as GeoJSON FeatureCollection
   */
  public static async getFacilitiesGeoJson(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query(`
        SELECT id, facility_code, name, facility_type, latitude, longitude, geofence_radius, phone_optional, active
        FROM facilities
        WHERE active = 1
        ORDER BY name ASC
      `);

      const features = rows
        .filter((r: any) => r.latitude !== null && r.longitude !== null)
        .map((r: any) => ({
          type: 'Feature',
          id: `facility-${r.id}`,
          geometry: {
            type: 'Point',
            coordinates: [Number(r.longitude), Number(r.latitude)],
          },
          properties: {
            layer: 'Facilities',
            id: r.id,
            facility_code: r.facility_code,
            name: r.name,
            facility_type: r.facility_type,
            geofence_radius_meters: Number(r.geofence_radius || 200),
            phone: r.phone_optional || null,
          },
        }));

      const geojson = toFeatureCollection(features);

      if (req.query.download === 'true') {
        res.setHeader('Content-Disposition', 'attachment; filename="pdh_facilities.geojson"');
      }
      res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
      res.json(geojson);
    } catch (err: any) {
      console.error('GIS Error fetching facilities GeoJSON:', err);
      res.status(500).json({ success: false, message: 'Failed to generate GIS data' });
    }
  }

  /**
   * Get EMS Bases as GeoJSON FeatureCollection
   */
  public static async getBasesGeoJson(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query(`
        SELECT id, name, latitude, longitude, geofence_radius, active
        FROM ems_bases
        WHERE active = 1
        ORDER BY id ASC
      `);

      const features = rows
        .filter((r: any) => r.latitude !== null && r.longitude !== null)
        .map((r: any) => ({
          type: 'Feature',
          id: `base-${r.id}`,
          geometry: {
            type: 'Point',
            coordinates: [Number(r.longitude), Number(r.latitude)],
          },
          properties: {
            layer: 'Bases',
            id: r.id,
            name: r.name,
            geofence_radius_meters: Number(r.geofence_radius || 150),
          },
        }));

      const geojson = toFeatureCollection(features);

      if (req.query.download === 'true') {
        res.setHeader('Content-Disposition', 'attachment; filename="pdh_ems_bases.geojson"');
      }
      res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
      res.json(geojson);
    } catch (err: any) {
      console.error('GIS Error fetching bases GeoJSON:', err);
      res.status(500).json({ success: false, message: 'Failed to generate GIS data' });
    }
  }

  /**
   * Get Mission Track as GeoJSON LineString & Point Breadcrumbs
   */
  public static async getMissionTrackGeoJson(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const [missionRows]: any = await pool.query(
        `SELECT id, mission_no, mission_type, status, vehicle_id, driver_id FROM ems_missions WHERE id = ? OR mission_no = ? LIMIT 1`,
        [id, id]
      );

      if (missionRows.length === 0) {
        res.status(404).json({ success: false, message: 'Mission not found' });
        return;
      }

      const mission = missionRows[0];

      const [tracks]: any = await pool.query(
        `SELECT latitude, longitude, speed, heading, accuracy, gps_quality, recorded_at
         FROM gps_tracks
         WHERE mission_id = ?
         ORDER BY recorded_at ASC`,
        [mission.id]
      );

      const coordinates: [number, number][] = tracks.map((t: any) => [
        Number(t.longitude),
        Number(t.latitude),
      ]);

      const features: any[] = [];

      // LineString of the overall path
      if (coordinates.length > 1) {
        features.push({
          type: 'Feature',
          id: `mission-${mission.id}-path`,
          geometry: {
            type: 'LineString',
            coordinates,
          },
          properties: {
            layer: 'MissionTrackPath',
            mission_id: mission.id,
            mission_no: mission.mission_no,
            point_count: coordinates.length,
          },
        });
      }

      // Individual breadcrumb points
      tracks.forEach((t: any, idx: number) => {
        features.push({
          type: 'Feature',
          id: `mission-${mission.id}-pt-${idx}`,
          geometry: {
            type: 'Point',
            coordinates: [Number(t.longitude), Number(t.latitude)],
          },
          properties: {
            layer: 'MissionTrackBreadcrumbs',
            mission_id: mission.id,
            sequence: idx + 1,
            speed_kmh: Number(t.speed || 0),
            heading: t.heading !== null ? Number(t.heading) : null,
            recorded_at: t.recorded_at,
          },
        });
      });

      const geojson = toFeatureCollection(features);

      if (req.query.download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename="pdh_mission_${mission.mission_no}_track.geojson"`);
      }
      res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
      res.json(geojson);
    } catch (err: any) {
      console.error('GIS Error fetching mission track GeoJSON:', err);
      res.status(500).json({ success: false, message: 'Failed to generate GIS data' });
    }
  }

  /**
   * Combined GeoJSON feature collection (Fleet, Facilities, Bases)
   */
  public static async getAllLayersGeoJson(req: Request, res: Response): Promise<void> {
    try {
      // Ambulances
      const [ambulances]: any = await pool.query(`
        SELECT a.id, a.vehicle_code, a.registration_no, a.status, a.current_latitude, a.current_longitude, a.current_speed, a.current_heading, a.last_gps_at
        FROM ambulances a WHERE a.active = 1 AND a.current_latitude IS NOT NULL AND a.current_longitude IS NOT NULL
      `);

      // Facilities
      const [facilities]: any = await pool.query(`
        SELECT f.id, f.facility_code, f.name, f.facility_type, f.latitude, f.longitude, f.geofence_radius, f.phone_optional
        FROM facilities f WHERE f.active = 1 AND f.latitude IS NOT NULL AND f.longitude IS NOT NULL
      `);

      // Bases
      const [bases]: any = await pool.query(`
        SELECT b.id, b.name, b.latitude, b.longitude, b.geofence_radius
        FROM ems_bases b WHERE b.active = 1 AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
      `);

      const features: any[] = [];

      ambulances.forEach((a: any) => {
        features.push({
          type: 'Feature',
          id: `ambulance-${a.id}`,
          geometry: {
            type: 'Point',
            coordinates: [Number(a.current_longitude), Number(a.current_latitude)],
          },
          properties: {
            layer: 'Ambulances',
            name: `${a.vehicle_code} (${a.registration_no})`,
            status: a.status,
            speed_kmh: Number(a.current_speed || 0),
            heading: Number(a.current_heading || 0),
            last_gps_at: a.last_gps_at,
          },
        });
      });

      facilities.forEach((f: any) => {
        features.push({
          type: 'Feature',
          id: `facility-${f.id}`,
          geometry: {
            type: 'Point',
            coordinates: [Number(f.longitude), Number(f.latitude)],
          },
          properties: {
            layer: 'Facilities',
            name: f.name,
            code: f.facility_code,
            facility_type: f.facility_type,
            geofence_radius_m: Number(f.geofence_radius || 200),
            phone: f.phone_optional,
          },
        });
      });

      bases.forEach((b: any) => {
        features.push({
          type: 'Feature',
          id: `base-${b.id}`,
          geometry: {
            type: 'Point',
            coordinates: [Number(b.longitude), Number(b.latitude)],
          },
          properties: {
            layer: 'Bases',
            name: b.name,
            geofence_radius_m: Number(b.geofence_radius || 150),
          },
        });
      });

      const geojson = toFeatureCollection(features);

      if (req.query.download === 'true') {
        res.setHeader('Content-Disposition', 'attachment; filename="pdh_ems_all_layers.geojson"');
      }
      res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
      res.json(geojson);
    } catch (err: any) {
      console.error('GIS Error fetching all layers GeoJSON:', err);
      res.status(500).json({ success: false, message: 'Failed to generate combined GIS data' });
    }
  }

  /**
   * Export to KML (Keyhole Markup Language for Google Earth / QGIS)
   */
  public static async exportKml(req: Request, res: Response): Promise<void> {
    try {
      const [ambulances]: any = await pool.query(`
        SELECT a.id, a.vehicle_code, a.registration_no, a.status, a.current_latitude, a.current_longitude, a.current_speed
        FROM ambulances a WHERE a.active = 1 AND a.current_latitude IS NOT NULL AND a.current_longitude IS NOT NULL
      `);

      const [facilities]: any = await pool.query(`
        SELECT f.id, f.facility_code, f.name, f.facility_type, f.latitude, f.longitude
        FROM facilities f WHERE f.active = 1 AND f.latitude IS NOT NULL AND f.longitude IS NOT NULL
      `);

      const [bases]: any = await pool.query(`
        SELECT b.id, b.name, b.latitude, b.longitude
        FROM ems_bases b WHERE b.active = 1 AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL
      `);

      let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>PDH Smart EMS GIS Master</name>
    <description>โรงพยาบาลปลวกแดง - ระบบการแพทย์ฉุกเฉินและพิกัดภูมิสารสนเทศ (GIS)</description>

    <Folder>
      <name>🚑 กองยานพาหนะฉุกเฉิน (Ambulances)</name>
`;

      ambulances.forEach((a: any) => {
        kml += `      <Placemark>
        <name>${a.vehicle_code} (${a.registration_no})</name>
        <description>สถานะ: ${a.status} | ความเร็ว: ${a.current_speed || 0} km/h</description>
        <Point>
          <coordinates>${a.current_longitude},${a.current_latitude},0</coordinates>
        </Point>
      </Placemark>\n`;
      });

      kml += `    </Folder>
    <Folder>
      <name>🏥 โรงพยาบาลและสถานพยาบาล (Facilities)</name>
`;

      facilities.forEach((f: any) => {
        kml += `      <Placemark>
        <name>${f.name} [${f.facility_code}]</name>
        <description>ประเภท: ${f.facility_type}</description>
        <Point>
          <coordinates>${f.longitude},${f.latitude},0</coordinates>
        </Point>
      </Placemark>\n`;
      });

      kml += `    </Folder>
    <Folder>
      <name>📍 ฐานปฏิบัติการกู้ชีพ (EMS Bases)</name>
`;

      bases.forEach((b: any) => {
        kml += `      <Placemark>
        <name>${b.name}</name>
        <Point>
          <coordinates>${b.longitude},${b.latitude},0</coordinates>
        </Point>
      </Placemark>\n`;
      });

      kml += `    </Folder>
  </Document>
</kml>`;

      res.setHeader('Content-Disposition', 'attachment; filename="pdh_ems_geospatial.kml"');
      res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml; charset=utf-8');
      res.send(kml);
    } catch (err: any) {
      console.error('GIS Error generating KML:', err);
      res.status(500).json({ success: false, message: 'Failed to generate KML' });
    }
  }
}
