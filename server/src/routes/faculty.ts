import { Router } from 'express';
import { db } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { approveBookingRequest, rejectBookingRequest, requestChanges } from '../services/bookingService.js';
import { analyzeRequestAllocation } from '../services/allocationService.js';
import { generateAllocationNarrative } from '../services/aiService.js';

const router = Router();

// Faculty review queue
router.get('/faculty/requests', authenticate, requireRole('faculty', 'admin'), (req, res, next) => {
  try {
    const statusFilter = (req.query.status as string) || 'pending';
    const facultyUser = req.user!;

    let query = `
      SELECT r.*, u.name as student_name, u.email as student_email,
             e.name as equipment_name, e.category as equipment_category, e.location as equipment_location,
             e.quantity as equipment_quantity, e.image_path, e.image_alt,
             d.name as department_name, d.code as department_code
      FROM booking_requests r
      JOIN users u ON r.student_id = u.id
      JOIN equipment e ON r.equipment_id = e.id
      JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter to faculty department unless user is admin
    if (facultyUser.role !== 'admin' && facultyUser.department_id) {
      query += ` AND e.department_id = ?`;
      params.push(facultyUser.department_id);
    }

    if (statusFilter !== 'all') {
      query += ` AND r.status = ?`;
      params.push(statusFilter);
    }

    query += ` ORDER BY r.start_time ASC, r.created_at ASC`;

    const rows = db.prepare(query).all(...params) as any[];

    const requests = rows.map(r => {
      const imageUrl = r.image_path
        ? (r.image_path.startsWith('/') || r.image_path.startsWith('http')
            ? r.image_path
            : `/media/equipment/${r.image_path}`)
        : null;

      return {
        ...r,
        imageUrl,
        requirements_json: r.requirements_json ? JSON.parse(r.requirements_json) : [],
        score_breakdown: r.score_breakdown ? JSON.parse(r.score_breakdown) : null,
      };
    });

    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// Request allocation detail (with competitors ranked, alternatives, and AI/rule explanation)
router.get('/faculty/requests/:id/allocation', authenticate, requireRole('faculty', 'admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const analysis = analyzeRequestAllocation(id);

    // If Gemini API is configured and there's a conflict, optionally generate an AI explanation
    if (analysis.conflicts && process.env.GEMINI_API_KEY && process.env.DEMO_FORCE_BASIC !== 'true') {
      try {
        const aiNarrative = await generateAllocationNarrative(analysis);
        if (aiNarrative) {
          analysis.explanation = aiNarrative;
          analysis.explanationSource = 'gemini';
        }
      } catch {
        // preserve rule-based explanation
      }
    }

    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

// Faculty decision (Approve, Reject, Request Changes)
router.post('/faculty/requests/:id/decision', authenticate, requireRole('faculty', 'admin'), (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { action, comment } = req.body;
    const reviewerId = req.user!.id;

    if (!action) {
      return res.status(400).json({
        error: { code: 'MISSING_ACTION', message: 'Action (approve, reject, or request_changes) is required' },
      });
    }

    if (action === 'approve') {
      const result = approveBookingRequest(id, reviewerId, comment);
      return res.json(result);
    } else if (action === 'reject') {
      const result = rejectBookingRequest(id, reviewerId, comment);
      return res.json(result);
    } else if (action === 'request_changes') {
      const result = requestChanges(id, reviewerId, comment);
      return res.json(result);
    } else {
      return res.status(400).json({
        error: { code: 'INVALID_ACTION', message: 'Invalid action specified' },
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
