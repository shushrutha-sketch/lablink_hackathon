import { Router } from 'express';
import { db } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { createBookingRequest, editBookingRequest, cancelBookingRequest } from '../services/bookingService.js';
import { analyzeRequestAllocation } from '../services/allocationService.js';

const router = Router();

// Student creates booking request
router.post('/requests', authenticate, requireRole('student', 'faculty', 'admin'), (req, res, next) => {
  try {
    const {
      equipmentId,
      projectTitle,
      projectDescription,
      projectDeadline,
      startTime,
      endTime,
      requiredCapabilities,
      requirementsJson,
      substitutedFromEquipmentId,
      substitutionNote,
      substitutionAcknowledged,
    } = req.body;

    if (!equipmentId || !projectTitle || !projectDescription || !projectDeadline || !startTime || !endTime) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'All booking fields are required' },
      });
    }

    const result = createBookingRequest(req.user!.id, {
      equipmentId,
      projectTitle,
      projectDescription,
      projectDeadline,
      startTime,
      endTime,
      requiredCapabilities: Array.isArray(requiredCapabilities) ? requiredCapabilities : [],
      requirementsJson,
      substitutedFromEquipmentId,
      substitutionNote,
      substitutionAcknowledged,
    });

    res.status(201).json({
      success: true,
      request: result,
    });
  } catch (err) {
    next(err);
  }
});

// Student gets own requests
router.get('/requests/mine', authenticate, requireRole('student', 'faculty', 'admin'), (req, res, next) => {
  try {
    const studentId = req.user!.id;

    const rows = db.prepare(`
      SELECT r.*, e.name as equipment_name, e.category as equipment_category,
             e.location as equipment_location, e.image_path, e.image_alt,
             d.name as department_name, u.name as reviewer_name
      FROM booking_requests r
      JOIN equipment e ON r.equipment_id = e.id
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.student_id = ?
      ORDER BY r.created_at DESC
    `).all(studentId) as any[];

    // Parse JSON fields and attach alternatives for any conflicted pending requests
    const requests = rows.map(r => {
      let alternatives: any = null;
      if (r.status === 'pending') {
        try {
          const allocation = analyzeRequestAllocation(r.id);
          if (allocation.conflicts && allocation.winnerRequestId !== r.id) {
            alternatives = allocation.alternatives;
          }
        } catch {
          // ignore
        }
      }

      const imageUrl = r.image_path
        ? (r.image_path.startsWith('/') || r.image_path.startsWith('http')
            ? r.image_path
            : `/media/equipment/${r.image_path}`)
        : null;

      let parsedReqs: any[] = [];
      if (r.requirements_json) {
        try {
          parsedReqs = typeof r.requirements_json === 'string'
            ? JSON.parse(r.requirements_json)
            : r.requirements_json;
        } catch {
          parsedReqs = [];
        }
      }

      const required_capabilities = Array.isArray(parsedReqs)
        ? parsedReqs.map((item: any) =>
            typeof item === 'string'
              ? item
              : item.capability || item.name || item.tag || String(item)
          )
        : [];

      let parsedBreakdown: any = null;
      if (r.score_breakdown) {
        try {
          parsedBreakdown = typeof r.score_breakdown === 'string'
            ? JSON.parse(r.score_breakdown)
            : r.score_breakdown;
        } catch {
          parsedBreakdown = null;
        }
      }

      return {
        ...r,
        imageUrl,
        requirements_json: parsedReqs,
        required_capabilities,
        score_breakdown: parsedBreakdown,
        alternatives,
      };
    });

    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// Student edits own request
router.patch('/requests/:id', authenticate, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = editBookingRequest(id, req.user!.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Student cancels own request (supports both DELETE /requests/:id and POST /requests/:id/cancel)
router.post('/requests/:id/cancel', authenticate, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = cancelBookingRequest(id, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/requests/:id', authenticate, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = cancelBookingRequest(id, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
