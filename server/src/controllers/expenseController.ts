import { Request, Response } from 'express';
import { pool } from '../db/connection';

async function logAudit(
  conn: any,
  req: Request,
  action: string,
  entityId: string | null,
  details: Record<string, any>
) {
  try {
    const user = (req as any).user;
    await conn.query(
      `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, 'system_expenses', ?, ?, ?, ?)`,
      [
        user?.id ?? null,
        user?.username ?? 'SYSTEM',
        action,
        entityId,
        JSON.stringify(details),
        req.ip ?? '127.0.0.1',
        (req.get('user-agent') ?? '').slice(0, 255),
      ]
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

export class ExpenseController {
  /**
   * Get all expenses with filters and summary totals
   */
  static async getExpenses(req: Request, res: Response): Promise<void> {
    try {
      const { category, vehicle_id, mission_id, search, startDate, endDate } = req.query;

      let whereConditions: string[] = ['1=1'];
      let queryParams: any[] = [];

      if (category && category !== 'ALL') {
        whereConditions.push('e.category = ?');
        queryParams.push(category);
      }
      if (vehicle_id && vehicle_id !== 'ALL') {
        whereConditions.push('e.vehicle_id = ?');
        queryParams.push(Number(vehicle_id));
      }
      if (mission_id) {
        whereConditions.push('e.mission_id = ?');
        queryParams.push(Number(mission_id));
      }
      if (startDate) {
        whereConditions.push('e.expense_date >= ?');
        queryParams.push(startDate);
      }
      if (endDate) {
        whereConditions.push('e.expense_date <= ?');
        queryParams.push(endDate);
      }
      if (search) {
        whereConditions.push('(e.title LIKE ? OR e.expense_no LIKE ? OR e.invoice_no LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = whereConditions.join(' AND ');

      // Query detailed rows
      const [rows]: any = await pool.query(
        `SELECT 
          e.id,
          e.expense_no,
          e.category,
          e.amount,
          e.title,
          e.expense_date,
          e.invoice_no,
          e.notes,
          e.created_at,
          e.mission_id,
          m.mission_no,
          m.mission_type,
          e.vehicle_id,
          v.vehicle_code,
          v.registration_no,
          e.facility_id,
          f.name AS facility_name,
          u.full_name AS creator_name,
          u.username AS creator_username
        FROM system_expenses e
        LEFT JOIN ems_missions m ON m.id = e.mission_id
        LEFT JOIN ambulances v ON v.id = e.vehicle_id
        LEFT JOIN facilities f ON f.id = e.facility_id
        LEFT JOIN users u ON u.id = e.created_by
        WHERE ${whereClause}
        ORDER BY e.expense_date DESC, e.id DESC`,
        queryParams
      );

      // Query KPIs & Category Breakdown
      const [kpiRows]: any = await pool.query(
        `SELECT 
          COUNT(*) as total_count,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN category = 'FUEL' THEN amount ELSE 0 END), 0) as fuel_total,
          COALESCE(SUM(CASE WHEN category = 'MAINTENANCE' THEN amount ELSE 0 END), 0) as maintenance_total,
          COALESCE(SUM(CASE WHEN category = 'MEDICAL_SUPPLIES' THEN amount ELSE 0 END), 0) as supplies_total,
          COALESCE(SUM(CASE WHEN category = 'OT_ALLOWANCE' THEN amount ELSE 0 END), 0) as allowance_total,
          COALESCE(SUM(CASE WHEN category = 'REFER_FEE' THEN amount ELSE 0 END), 0) as refer_fee_total
        FROM system_expenses e
        WHERE ${whereClause}`,
        queryParams
      );

      const summary = {
        total_count: Number(kpiRows[0]?.total_count || 0),
        total_amount: Number(kpiRows[0]?.total_amount || 0),
        fuel_total: Number(kpiRows[0]?.fuel_total || 0),
        maintenance_total: Number(kpiRows[0]?.maintenance_total || 0),
        supplies_total: Number(kpiRows[0]?.supplies_total || 0),
        allowance_total: Number(kpiRows[0]?.allowance_total || 0),
        refer_fee_total: Number(kpiRows[0]?.refer_fee_total || 0),
      };

      res.json({
        success: true,
        summary,
        count: rows.length,
        data: rows,
      });
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Create an Expense Entry and write to Audit Log
   */
  static async createExpense(req: Request, res: Response): Promise<void> {
    const {
      category,
      amount,
      title,
      mission_id,
      vehicle_id,
      facility_id,
      invoice_no,
      expense_date = new Date().toISOString().slice(0, 10),
      notes,
    } = req.body;

    if (!category || amount === undefined || amount === null || !title) {
      res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน: หมวดหมู่ค่าใช้จ่าย, จำนวนเงิน (บาท), และรายละเอียดรายการ',
      });
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      res.status(400).json({ success: false, message: 'จำนวนเงินต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0' });
      return;
    }

    let conn: any;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // Generate Expense No: EXP-YYYY-XXXX
      const year = new Date().getFullYear();
      const [latest]: any = await conn.query(
        "SELECT expense_no FROM system_expenses WHERE expense_no LIKE ? ORDER BY id DESC LIMIT 1",
        [`EXP-${year}-%`]
      );

      let nextIndex = 1;
      if (latest.length > 0) {
        const parts = latest[0].expense_no.split('-');
        if (parts.length === 3) {
          nextIndex = parseInt(parts[2], 10) + 1;
        }
      }
      const expenseNo = `EXP-${year}-${String(nextIndex).padStart(4, '0')}`;
      const creatorId = (req as any).user?.id || 1;

      const [result]: any = await conn.query(
        `INSERT INTO system_expenses (
          expense_no, category, amount, title, mission_id, vehicle_id, facility_id,
          invoice_no, expense_date, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          expenseNo,
          category,
          numAmount,
          title,
          mission_id || null,
          vehicle_id || null,
          facility_id || null,
          invoice_no || null,
          expense_date,
          notes || null,
          creatorId,
        ]
      );

      const newExpenseId = result.insertId;

      // Automatically Write to Audit Log
      await logAudit(conn, req, 'CREATE_EXPENSE', String(newExpenseId), {
        expense_no: expenseNo,
        category,
        amount: numAmount,
        title,
        invoice_no,
        expense_date,
        mission_id,
        vehicle_id,
        created_by_user: (req as any).user?.username || 'SYSTEM',
      });

      await conn.commit();

      res.status(201).json({
        success: true,
        message: `บันทึกค่าใช้จ่ายสำเร็จ (${expenseNo}) บันทึกประวัติ Audit Log เรียบร้อยแล้ว`,
        data: {
          id: newExpenseId,
          expense_no: expenseNo,
          category,
          amount: numAmount,
          title,
          invoice_no,
          expense_date,
        },
      });
    } catch (error: any) {
      if (conn) await conn.rollback();
      console.error('Error creating expense:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      if (conn) conn.release();
    }
  }

  /**
   * Update Expense Entry and write to Audit Log
   */
  static async updateExpense(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { category, amount, title, mission_id, vehicle_id, facility_id, invoice_no, expense_date, notes } = req.body;

    let conn: any;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [existing]: any = await conn.query('SELECT * FROM system_expenses WHERE id = ?', [id]);
      if (existing.length === 0) {
        await conn.rollback();
        res.status(404).json({ success: false, message: 'ไม่พบรายการค่าใช้จ่ายที่ต้องการแก้ไข' });
        return;
      }
      const prev = existing[0];

      await conn.query(
        `UPDATE system_expenses SET
          category = COALESCE(?, category),
          amount = COALESCE(?, amount),
          title = COALESCE(?, title),
          mission_id = ?,
          vehicle_id = ?,
          facility_id = ?,
          invoice_no = ?,
          expense_date = COALESCE(?, expense_date),
          notes = ?
        WHERE id = ?`,
        [
          category,
          amount !== undefined ? Number(amount) : null,
          title,
          mission_id || null,
          vehicle_id || null,
          facility_id || null,
          invoice_no || null,
          expense_date,
          notes || null,
          id,
        ]
      );

      // Log Update in Audit Log
      await logAudit(conn, req, 'UPDATE_EXPENSE', String(id), {
        expense_no: prev.expense_no,
        previous_amount: prev.amount,
        updated_amount: amount !== undefined ? Number(amount) : prev.amount,
        previous_category: prev.category,
        updated_category: category || prev.category,
        title: title || prev.title,
        updated_by: (req as any).user?.username || 'SYSTEM',
      });

      await conn.commit();
      res.json({ success: true, message: 'แก้ไขรายการค่าใช้จ่ายและบันทึกประวัติ Audit Log สำเร็จ' });
    } catch (error: any) {
      if (conn) await conn.rollback();
      console.error('Error updating expense:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      if (conn) conn.release();
    }
  }

  /**
   * Delete Expense Entry and write to Audit Log
   */
  static async deleteExpense(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    let conn: any;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [existing]: any = await conn.query('SELECT * FROM system_expenses WHERE id = ?', [id]);
      if (existing.length === 0) {
        await conn.rollback();
        res.status(404).json({ success: false, message: 'ไม่พบรายการค่าใช้จ่าย' });
        return;
      }
      const exp = existing[0];

      await conn.query('DELETE FROM system_expenses WHERE id = ?', [id]);

      // Log Deletion in Audit Log
      await logAudit(conn, req, 'DELETE_EXPENSE', String(id), {
        deleted_expense_no: exp.expense_no,
        amount: exp.amount,
        category: exp.category,
        title: exp.title,
        deleted_by: (req as any).user?.username || 'SYSTEM',
      });

      await conn.commit();
      res.json({ success: true, message: `ลบรายการค่าใช้จ่าย ${exp.expense_no} และบันทึกประวัติแล้ว` });
    } catch (error: any) {
      if (conn) await conn.rollback();
      console.error('Error deleting expense:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      if (conn) conn.release();
    }
  }

  /**
   * Get Audit Logs (Access, Expense, User Events)
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { entity, action, search, limit = 100 } = req.query;

      let whereConditions: string[] = ['1=1'];
      let queryParams: any[] = [];

      if (entity && entity !== 'ALL') {
        whereConditions.push('entity = ?');
        queryParams.push(entity);
      }
      if (action && action !== 'ALL') {
        whereConditions.push('action = ?');
        queryParams.push(action);
      }
      if (search) {
        whereConditions.push('(user_name LIKE ? OR action LIKE ? OR details LIKE ? OR entity_id LIKE ?)');
        const p = `%${search}%`;
        queryParams.push(p, p, p, p);
      }

      const whereClause = whereConditions.join(' AND ');
      queryParams.push(Number(limit));

      const [rows]: any = await pool.query(
        `SELECT 
          id,
          user_id,
          user_name,
          action,
          entity,
          entity_id,
          details,
          ip_address,
          user_agent,
          created_at
        FROM audit_logs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ?`,
        queryParams
      );

      res.json({
        success: true,
        count: rows.length,
        data: rows,
      });
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
