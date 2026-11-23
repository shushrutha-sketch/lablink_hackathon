import { Router } from 'express';
import { db } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { get30DayUtilisationStats } from '../services/utilisationService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure safe image upload
const baseDir = process.cwd().endsWith('server') ? process.cwd() : path.join(process.cwd(), 'server');
const mediaDir = path.join(baseDir, 'media', 'equipment');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mediaDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 }, // 1 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Only PNG, JPEG, and WebP are allowed.'));
    }
  },
});

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

    const equipment = rows.map(r => {
      let specs = [];
      try {
        specs = JSON.parse(r.specs || '[]');
      } catch {
        specs = [];
      }

      const imageUrl = r.image_path
        ? (r.image_path.startsWith('/') || r.image_path.startsWith('http')
            ? r.image_path
            : `/media/equipment/${r.image_path}`)
        : null;

      return {
        ...r,
        imageUrl,
        specs,
      };
    });

    res.json({ equipment });
  } catch (err) {
    next(err);
  }
});

// Admin creates new equipment item (with optional image)
router.post('/admin/equipment', authenticate, requireRole('admin'), upload.single('image'), (req, res, next) => {
  try {
    const {
      name,
      slug,
      category,
      family,
      departmentId,
      lab,
      location,
      description,
      quantity,
      minSessionMinutes,
      maxSessionMinutes,
      imageAlt,
      imageCredit,
      specs,
      capabilities,
    } = req.body;

    if (!name || !category || !family || !departmentId || !lab || !location) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Name, category, family, department, lab, and location are required' },
      });
    }

    const genSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const filename = req.file ? req.file.filename : null;
    const altText = imageAlt || (filename ? `${name} laboratory hardware item` : null);
    const credit = imageCredit || 'Campus Equipment Archive';

    const insertStmt = db.prepare(`
      INSERT INTO equipment (
        slug, name, category, family, department_id, lab, location, description,
        specs, compatible_projects, quantity, min_session_minutes, max_session_minutes,
        status, image_path, image_alt, image_credit, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, 'active', ?, ?, ?, 0)
    `);

    const specsJson = specs ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : '[]';

    const result = insertStmt.run(
      genSlug,
      name,
      category,
      family,
      Number(departmentId),
      lab,
      location,
      description || `${name} for campus research and student laboratory projects.`,
      specsJson,
      Number(quantity) || 1,
      Number(minSessionMinutes) || 30,
      Number(maxSessionMinutes) || 240,
      filename,
      altText,
      credit
    );

    const newId = result.lastInsertRowid;

    // Attach capabilities if passed
    if (capabilities) {
      try {
        const capsArray = typeof capabilities === 'string' ? JSON.parse(capabilities) : capabilities;
        if (Array.isArray(capsArray)) {
          const insertCap = db.prepare(`
            INSERT OR IGNORE INTO equipment_capabilities (equipment_id, capability, level, limitation)
            VALUES (?, ?, ?, ?)
          `);
          for (const c of capsArray) {
            const capName = typeof c === 'string' ? c : c.name || c.capability;
            const level = typeof c === 'object' && c.level ? c.level : 'full';
            const limit = typeof c === 'object' && c.limitation ? c.limitation : null;
            insertCap.run(newId, capName, level, limit);
          }
        }
      } catch {
        // ignore capability parse error
      }
    }

    db.prepare(`
      INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
      VALUES (?, 'ADMIN_EQUIPMENT_CREATE', 'EQUIPMENT', ?, ?)
    `).run(req.user!.id, newId, `Added equipment item ${name} (id=${newId})`);

    res.status(201).json({
      success: true,
      equipmentId: newId,
      message: 'Equipment successfully added to inventory',
    });
  } catch (err) {
    next(err);
  }
});

// Admin updates equipment status or session limits
router.patch('/admin/equipment/:id', authenticate, requireRole('admin'), (req, res, next) => {
  try {
    const param = req.params.id;
    const isNum = !isNaN(Number(param));

    const equip = db.prepare(`SELECT * FROM equipment WHERE ${isNum ? 'id = ?' : 'slug = ?'}`).get(isNum ? Number(param) : param) as any;
    if (!equip) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Equipment not found' },
      });
    }

    const { status, min_session_minutes, max_session_minutes, quantity, location } = req.body;

    const newStatus = status ?? equip.status;
    const newMin = min_session_minutes ?? equip.min_session_minutes;
    const newMax = max_session_minutes ?? equip.max_session_minutes;
    const newQty = quantity ?? equip.quantity;
    const newLoc = location ?? equip.location;

    db.prepare(`
      UPDATE equipment
      SET status = ?, min_session_minutes = ?, max_session_minutes = ?, quantity = ?, location = ?
      WHERE id = ?
    `).run(newStatus, newMin, newMax, newQty, newLoc, equip.id);

    db.prepare(`
      INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
      VALUES (?, 'ADMIN_EQUIPMENT_UPDATE', 'EQUIPMENT', ?, ?)
    `).run(req.user!.id, equip.id, `Updated status to ${newStatus}, quantity=${newQty}`);

    res.json({
      success: true,
      message: 'Equipment successfully updated',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
