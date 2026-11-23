import { Router } from 'express';
import { db } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { get30DayUtilisationStats } from '../services/utilisationService.js';

const router = Router();

// 30-day utilisation stats & flags
router.get('/admin/utilisation', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const stats = get30DayUtilisationStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// All equipment for admin management
router.get('/admin/equipment', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT e.*, d.name as department_name, d.code as department_code
      FROM equipment e
      JOIN departments d ON e.department_id = d.id
      ORDER BY e.id ASC
    `).all() as any[];

    const equipment = rows.map(r => ({
      ...r,
      tags: JSON.parse(r.tags || '[]'),
      specs: JSON.parse(r.specs || '{}'),
    }));

    res.json({ equipment });
  } catch (err) {
    next(err);
  }
});

// Admin updates equipment status or session limits
router.patch('/admin/equipment/:id', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status, min_session_minutes, max_session_minutes, quantity, location } = req.body;

    const equip = db.prepare('SELECT * FROM equipment WHERE id = ?').get(id) as any;
    if (!equip) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Equipment not found' },
      });
    }

    const newStatus = status ?? equip.status;
    const newMin = min_session_minutes ?? equip.min_session_minutes;
    const newMax = max_session_minutes ?? equip.max_session_minutes;
    const newQty = quantity ?? equip.quantity;
    const newLoc = location ?? equip.location;

    db.prepare(`
      UPDATE equipment
      SET status = ?, min_session_minutes = ?, max_session_minutes = ?, quantity = ?, location = ?
      WHERE id = ?
    `).run(newStatus, newMin, newMax, newQty, newLoc, id);

    db.prepare(`
      INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
      VALUES (?, 'ADMIN_EQUIPMENT_UPDATE', 'EQUIPMENT', ?, ?)
    `).run(req.user!.id, id, `Updated status to ${newStatus}, quantity=${newQty}`);

    res.json({
      success: true,
      message: 'Equipment successfully updated',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
