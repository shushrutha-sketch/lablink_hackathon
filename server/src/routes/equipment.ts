import { Router } from 'express';
import { db } from '../db/connection.js';

const router = Router();

function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

// Metadata for filters
router.get('/meta/filters', (req, res, next) => {
  try {
    const departments = db.prepare('SELECT id, code, name FROM departments ORDER BY name ASC').all();
    const categories = db.prepare(`
      SELECT DISTINCT category FROM equipment WHERE status != 'retired' ORDER BY category ASC
    `).all().map((r: any) => r.category);

    res.json({
      departments,
      categories,
    });
  } catch (err) {
    next(err);
  }
});

// Search and filter equipment list
router.get('/equipment', (req, res, next) => {
  try {
    const { q, category, departmentId, availableNow, at, page, pageSize } = req.query;

    const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(pageSize || '20'), 10) || 20));
    const offset = (pageNum - 1) * limit;

    const evalTime = typeof at === 'string' && at ? at : new Date().toISOString();

    let sql = `
      SELECT 
        e.id,
        e.slug,
        e.name,
        e.category,
        e.family,
        e.department_id,
        d.name as department_name,
        d.code as department_code,
        e.lab,
        e.location,
        e.description,
        e.specs,
        e.compatible_projects,
        e.image_path,
        e.image_alt,
        e.image_credit,
        e.quantity,
        e.min_session_minutes,
        e.max_session_minutes,
        e.status as base_status,
        e.is_demo,
        COALESCE(b.active_count, 0) as active_bookings,
        b.next_end
      FROM equipment e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN (
        SELECT equipment_id, COUNT(*) as active_count, MIN(end_time) as next_end
        FROM booking_requests
        WHERE status IN ('approved', 'in_progress')
          AND start_time <= ? AND end_time > ?
        GROUP BY equipment_id
      ) b ON e.id = b.equipment_id
      WHERE e.status != 'retired'
    `;

    const params: any[] = [evalTime, evalTime];

    if (departmentId && String(departmentId).trim()) {
      const deptStr = String(departmentId).trim();
      if (!isNaN(Number(deptStr))) {
        sql += ` AND e.department_id = ?`;
        params.push(Number(deptStr));
      } else {
        sql += ` AND (d.code = ? OR LOWER(d.name) = ?)`;
        params.push(deptStr.toUpperCase(), deptStr.toLowerCase());
      }
    }

    if (category && String(category).trim()) {
      sql += ` AND LOWER(e.category) = ?`;
      params.push(String(category).trim().toLowerCase());
    }

    if (q && String(q).trim()) {
      const escaped = escapeLike(String(q).trim().toLowerCase());
      const term = `%${escaped}%`;
      sql += ` AND (
        LOWER(e.name) LIKE ? ESCAPE '\\' OR 
        LOWER(e.category) LIKE ? ESCAPE '\\' OR 
        LOWER(e.slug) LIKE ? ESCAPE '\\' OR 
        LOWER(e.description) LIKE ? ESCAPE '\\' OR 
        LOWER(e.location) LIKE ? ESCAPE '\\' OR
        LOWER(e.lab) LIKE ? ESCAPE '\\' OR
        LOWER(e.specs) LIKE ? ESCAPE '\\' OR
        LOWER(e.compatible_projects) LIKE ? ESCAPE '\\'
      )`;
      params.push(term, term, term, term, term, term, term, term);
    }

    // Availability filter condition
    if (availableNow === 'true' || String(availableNow) === 'true') {
      sql += ` AND e.status = 'active' AND (e.quantity - COALESCE(b.active_count, 0)) > 0`;
    }

    // Total count query
    const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
    const countRow = db.prepare(countSql).get(...params) as { total: number };
    const total = countRow ? countRow.total : 0;

    // Order and pagination
    sql += ` ORDER BY e.id ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = db.prepare(sql).all(...params) as any[];

    const items = rows.map((r: any) => {
      let rawSpecs = [];
      try {
        rawSpecs = JSON.parse(r.specs || '[]');
      } catch {
        rawSpecs = [];
      }

      const formattedSpecs = Array.isArray(rawSpecs)
        ? rawSpecs.map((s: any) => ({
            name: s.label || s.name || s.key || '',
            value: s.unit ? `${s.value} ${s.unit}` : String(s.value ?? ''),
            raw: s,
          }))
        : [];

      let compatibleProjects = [];
      try {
        compatibleProjects = JSON.parse(r.compatible_projects || '[]');
      } catch {
        compatibleProjects = [];
      }

      const availableQuantity = Math.max(0, r.quantity - r.active_bookings);

      let status = 'available';
      if (r.base_status === 'maintenance') {
        status = 'maintenance';
      } else if (availableQuantity === 0) {
        status = 'in_use';
      }

      const imageUrl = r.image_path
        ? (r.image_path.startsWith('/') || r.image_path.startsWith('http')
            ? r.image_path
            : `/media/equipment/${r.image_path}`)
        : null;

      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        category: r.category,
        family: r.family,
        departmentId: r.department_id,
        department: r.department_name,
        departmentCode: r.department_code,
        lab: r.lab,
        location: r.location,
        description: r.description,
        quantity: r.quantity,
        availableQuantity,
        status,
        nextFreeAt: availableQuantity === 0 ? r.next_end : null,
        imageUrl,
        imageAlt: r.image_alt || r.name,
        imageCredit: r.image_credit,
        topSpecs: formattedSpecs.slice(0, 3),
        specs: formattedSpecs,
        compatibleProjects,
        isDemo: Boolean(r.is_demo),
      };
    });

    res.json({
      items,
      total,
      page: pageNum,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// Equipment detail by ID or Slug
router.get('/equipment/:id', (req, res, next) => {
  try {
    const param = req.params.id;
    const isNum = !isNaN(Number(param));

    const item = db.prepare(`
      SELECT e.*, d.name as department_name, d.code as department_code
      FROM equipment e
      JOIN departments d ON e.department_id = d.id
      WHERE ${isNum ? 'e.id = ?' : 'e.slug = ?'}
    `).get(isNum ? Number(param) : param) as any;

    if (!item) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Equipment not found' },
      });
    }

    // Fetch capabilities
    const capabilities = db.prepare(`
      SELECT 
        c.name,
        c.label,
        c.description,
        ec.level,
        ec.limitation
      FROM equipment_capabilities ec
      JOIN capabilities c ON ec.capability = c.name
      WHERE ec.equipment_id = ?
      ORDER BY c.name ASC
    `).all(item.id) as any[];

    // Fetch active bookings count for availability
    const nowIso = new Date().toISOString();
    const activeBooking = db.prepare(`
      SELECT COUNT(*) as active_count, MIN(end_time) as next_end
      FROM booking_requests
      WHERE equipment_id = ?
        AND status IN ('approved', 'in_progress')
        AND start_time <= ? AND end_time > ?
    `).get(item.id, nowIso, nowIso) as any;

    const activeCount = activeBooking ? activeBooking.active_count : 0;
    const availableQuantity = Math.max(0, item.quantity - activeCount);

    let status = 'available';
    if (item.status === 'maintenance') {
      status = 'maintenance';
    } else if (availableQuantity === 0) {
      status = 'in_use';
    }

    let rawSpecs = [];
    try {
      rawSpecs = JSON.parse(item.specs || '[]');
    } catch {
      rawSpecs = [];
    }

    const formattedSpecs = Array.isArray(rawSpecs)
      ? rawSpecs.map((s: any) => ({
          name: s.label || s.name || s.key || '',
          value: s.unit ? `${s.value} ${s.unit}` : String(s.value ?? ''),
          raw: s,
        }))
      : [];

    let compatibleProjects = [];
    try {
      compatibleProjects = JSON.parse(item.compatible_projects || '[]');
    } catch {
      compatibleProjects = [];
    }

    const imageUrl = item.image_path
      ? (item.image_path.startsWith('/') || item.image_path.startsWith('http')
          ? item.image_path
          : `/media/equipment/${item.image_path}`)
      : null;

    res.json({
      equipment: {
        id: item.id,
        slug: item.slug,
        name: item.name,
        category: item.category,
        family: item.family,
        departmentId: item.department_id,
        department: item.department_name,
        departmentCode: item.department_code,
        lab: item.lab,
        location: item.location,
        description: item.description,
        quantity: item.quantity,
        availableQuantity,
        status,
        nextFreeAt: availableQuantity === 0 ? activeBooking.next_end : null,
        imageUrl,
        imageAlt: item.image_alt || item.name,
        imageCredit: item.image_credit,
        min_session_minutes: item.min_session_minutes,
        max_session_minutes: item.max_session_minutes,
        specs: formattedSpecs,
        compatibleProjects,
        capabilities,
        isDemo: Boolean(item.is_demo),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Availability for a date
router.get('/equipment/:id/availability', async (req, res, next) => {
  try {
    const id = req.params.id;
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const { getEquipmentAvailability } = await import('../services/availabilityService.js');
    const result = getEquipmentAvailability(id, dateStr);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
