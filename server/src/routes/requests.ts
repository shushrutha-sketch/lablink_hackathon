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
    } = req.body;

    if (!equipmentId || !projectTitle || !projectDescription || !projectDeadline || !startTime || !endTime) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'All booking fields are required' },
      });
    }

    const result = createBookingRequest(req.user!.id, {
      equipmentId: Number(equipmentId),
      projectTitle,
      projectDescription,
      projectDeadline,
      startTime,
      endTime,
      requiredCapabilities: Array.isArray(requiredCapabilities) ? requiredCapabilities : [],
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
             e.location as equipment_location, d.name as department_name,
             u.name as reviewer_name
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
        } catch (e) {
          // ignore
        }
      }

      return {
        ...r,
        required_capabilities: JSON.parse(r.required_capabilities || '[]'),
        score_breakdown: r.score_breakdown ? JSON.parse(r.score_breakdown) : null,
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

// Student cancels own request
router.post('/requests/:id/cancel', authenticate, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = cancelBookingRequest(id, req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
