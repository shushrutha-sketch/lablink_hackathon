import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { analyzeProjectRequirements } from '../services/matchmakerService.js';

const router = Router();

// Project-to-Prototype Matchmaker
router.post('/analyze', authenticate, async (req, res, next) => {
  try {
    const { projectDescription } = req.body;
    if (!projectDescription || typeof projectDescription !== 'string') {
      return res.status(400).json({
        error: { code: 'EMPTY_DESCRIPTION', message: 'Project description is required' },
      });
    }

    const plan = await analyzeProjectRequirements(projectDescription);
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

export default router;
