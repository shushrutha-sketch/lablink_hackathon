import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { analyzeProjectRequirements } from '../services/aiService.js';
import { recommendEquipmentByCapabilities } from '../services/discoveryService.js';

const router = Router();

router.post('/discovery/recommend', authenticate, requireRole('student', 'faculty', 'admin'), async (req, res, next) => {
  try {
    const { projectDescription, capabilities } = req.body;

    let targetCapabilities: string[] = [];

    if (Array.isArray(capabilities) && capabilities.length > 0) {
      targetCapabilities = capabilities;
    } else if (projectDescription && typeof projectDescription === 'string') {
      const analysis = await analyzeProjectRequirements(projectDescription);
      targetCapabilities = analysis.requiredCapabilities;
    } else {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Either projectDescription or capabilities array must be provided' },
      });
    }

    const recommendations = recommendEquipmentByCapabilities(targetCapabilities, 6);

    res.json({
      targetCapabilities,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
