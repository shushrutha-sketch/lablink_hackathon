import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { analyzeProjectRequirements } from '../services/aiService.js';

const router = Router();

router.post('/ai/analyze-project', authenticate, requireRole('student', 'faculty', 'admin'), async (req, res, next) => {
  try {
    const { projectDescription } = req.body;

    if (!projectDescription || typeof projectDescription !== 'string' || projectDescription.trim().length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Project description is required' },
      });
    }

    const analysis = await analyzeProjectRequirements(projectDescription);
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

export default router;
