import { Request } from 'express';
import { pool } from '../db/connection';

export interface AuditParams {
  req?: Request;
  userId?: number;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string | number;
  details?: Record<string, any>;
}

export async function logAudit({
  req,
  userId,
  userName,
  action,
  entity,
  entityId,
  details
}: AuditParams): Promise<void> {
  try {
    const finalUserId = userId ?? req?.user?.id ?? null;
    const finalUserName = userName ?? req?.user?.username ?? 'SYSTEM';
    const ip = req?.ip || req?.socket.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers['user-agent'] || 'UNKNOWN';

    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalUserId,
        finalUserName,
        action,
        entity,
        entityId ? String(entityId) : null,
        details ? JSON.stringify(details) : null,
        ip,
        userAgent
      ]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
