import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { processCopilotMessage, getCopilotChatHistory } from '../copilot/copilotService.js';
import { createBookingRequest } from '../services/bookingService.js';

const router = Router();

// Send message to Copilot
router.post('/message', authenticate, async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: { code: 'EMPTY_MESSAGE', message: 'Message content is required' },
      });
    }

    const sid = sessionId || `sess-${req.user!.id}-${new Date().toISOString().split('T')[0]}`;

    const result = await processCopilotMessage({
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      departmentId: req.user!.department_id,
      sessionId: sid,
      message,
    });

    res.json({
      success: true,
      sessionId: sid,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// Get session chat history
router.get('/history', authenticate, (req, res, next) => {
  try {
    const sid = (req.query.sessionId as string) || `sess-${req.user!.id}-${new Date().toISOString().split('T')[0]}`;
    const history = getCopilotChatHistory(req.user!.id, sid);
    res.json({ sessionId: sid, history });
  } catch (err) {
    next(err);
  }
});

// Explicit confirmation endpoint for booking proposals (Safety Invariant)
router.post('/confirm-booking', authenticate, (req, res, next) => {
  try {
    const { proposal } = req.body;
    if (!proposal || !proposal.equipmentId || !proposal.startTime || !proposal.endTime) {
      return res.status(400).json({
        error: { code: 'INVALID_PROPOSAL', message: 'Valid booking proposal object is required' },
      });
    }

    const bookingResult = createBookingRequest(req.user!.id, {
      equipmentId: proposal.equipmentId,
      projectTitle: proposal.projectTitle || 'LabLink Research Project',
      projectDescription: proposal.projectDescription || 'Requested via LabLink Copilot',
      projectDeadline: proposal.projectDeadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      startTime: proposal.startTime,
      endTime: proposal.endTime,
    });

    res.status(201).json({
      success: true,
      message: 'Booking reservation confirmed and submitted for review',
      booking: bookingResult,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
