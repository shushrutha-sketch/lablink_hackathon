import { Router } from 'express';
import { db } from '../db/connection.js';
import { searchEquipment } from '../services/discoveryService.js';
import { getEquipmentAvailability } from '../services/availabilityService.js';
import { formatLocalDate } from '../domain/timeUtils.js';

const router = Router();

// Metadata for filters
router.get('/meta/filters', (req, res) => {
  const departments = db.prepare('SELECT id, code, name FROM departments ORDER BY name ASC').all();
  const categories = db.prepare(`
    SELECT DISTINCT category FROM equipment ORDER BY category ASC
  `).all().map((r: any) => r.category);

  res.json({
    departments,
    categories,
  });
});

// Search and filter equipment list
router.get('/equipment', (req, res, next) => {
  try {
    const { q, category, departmentId, status, page, pageSize } = req.query;

    const result = searchEquipment({
      q: q as string,
      category: category as string,
      departmentId: departmentId ? Number(departmentId) : undefined,
      status: status as string,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 12,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Equipment detail
router.get('/equipment/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const item = db.prepare(`
      SELECT e.*, d.name as department_name, d.code as department_code
      FROM equipment e
      JOIN departments d ON e.department_id = d.id
      WHERE e.id = ?
    `).get(id) as any;

    if (!item) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Equipment not found' },
      });
    }

    res.json({
      equipment: {
        ...item,
        tags: JSON.parse(item.tags || '[]'),
        specs: JSON.parse(item.specs || '{}'),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Availability for a date
router.get('/equipment/:id/availability', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const dateStr = (req.query.date as string) || formatLocalDate(new Date());

    const result = getEquipmentAvailability(id, dateStr);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
