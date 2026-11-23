import { describe, it, expect } from 'vitest';
import {
  calculateUrgencyScore,
  calculateSuitabilityScore,
  calculateFairnessScore,
  calculateEfficiencyScore,
  calculatePriorityScore,
  calculateUrgencyPart3,
  calculateSuitabilityPart3,
  calculateFairnessPart3,
  calculateEfficiencyPart3,
  calculateFairAllocationScore,
  rankCompetingRequests,
  CompetingRequestCandidate,
} from '../scoringService.js';

describe('Fair Allocation Engine: Legacy & Part III Specifications', () => {
  describe('Part III Revision 3 Exact Formulas', () => {
    it('Urgency: 40 points scale with 14-day benchmark', () => {
      // 0 days (immediate) -> 40 pts
      expect(calculateUrgencyPart3(0)).toBe(40);
      expect(calculateUrgencyPart3(-1)).toBe(40);
      // 7 days -> 20 pts (halfway)
      expect(calculateUrgencyPart3(7)).toBe(20);
      // 14 days or more -> 0 pts
      expect(calculateUrgencyPart3(14)).toBe(0);
      expect(calculateUrgencyPart3(21)).toBe(0);
    });

    it('Suitability: 25 points scale with Must (2x) and Nice (1x) weighting', () => {
      // Full match on must + nice -> 25 pts
      const full = calculateSuitabilityPart3([
        { capability: 'signal-analysis', level: 'full', priority: 'must' },
        { capability: 'sensor-interfacing', level: 'full', priority: 'nice' },
      ]);
      expect(full.score).toBe(25);
      expect(full.coveragePct).toBe(100);

      // Must full (2*1.0), Nice partial (1*0.5) => (2 + 0.5) / 3 = 2.5/3 = 83.33%
      const mixed = calculateSuitabilityPart3([
        { capability: 'signal-analysis', level: 'full', priority: 'must' },
        { capability: 'sensor-interfacing', level: 'partial', priority: 'nice' },
      ]);
      expect(mixed.score).toBeCloseTo(20.83, 1);

      // Must partial (2*0.5), Nice none (1*0.0) => 1.0 / 3 = 33.33%
      const partial = calculateSuitabilityPart3([
        { capability: 'signal-analysis', level: 'partial', priority: 'must' },
        { capability: 'sensor-interfacing', level: 'none', priority: 'nice' },
      ]);
      expect(partial.score).toBeCloseTo(8.33, 1);
    });

    it('Fairness: 20 pts usage (12h benchmark) + 5 pts waiting (5d benchmark)', () => {
      // 0 past hours, 0 waiting days -> 20 usage, 0 wait -> 20 total
      const f1 = calculateFairnessPart3(0, 0);
      expect(f1.usageScore).toBe(20);
      expect(f1.waitScore).toBe(0);
      expect(f1.total).toBe(20);

      // 6 past hours, 3 waiting days -> 10 usage, 3 wait -> 13 total
      const f2 = calculateFairnessPart3(6, 3);
      expect(f2.usageScore).toBe(10);
      expect(f2.waitScore).toBe(3);
      expect(f2.total).toBe(13);

      // 12 past hours (max usage reached), 5 waiting days (max wait) -> 0 usage, 5 wait -> 5 total
      const f3 = calculateFairnessPart3(12, 5);
      expect(f3.usageScore).toBe(0);
      expect(f3.waitScore).toBe(5);
      expect(f3.total).toBe(5);
    });

    it('Efficiency: 10 points scale linear interpolation', () => {
      // Min duration (30 min) -> 10 pts
      expect(calculateEfficiencyPart3(30, 30, 240)).toBe(10);
      // Max duration (240 min) -> 0 pts
      expect(calculateEfficiencyPart3(240, 30, 240)).toBe(0);
      // Mid duration (135 min) -> 5 pts
      expect(calculateEfficiencyPart3(135, 30, 240)).toBe(5);
    });

    it('Total 100-point master score calculation', () => {
      const result = calculateFairAllocationScore({
        deadlineDays: 7, // 20 pts
        requirements: [
          { capability: 'signal-analysis', level: 'full', priority: 'must' },
        ], // 25 pts
        approvedHoursLast30Days: 0, // 20 pts usage
        daysWaiting: 0, // 0 pts wait
        durationMinutes: 135, // 5 pts efficiency
        minSessionMinutes: 30,
        maxSessionMinutes: 240,
      });

      expect(result.urgency).toBe(20);
      expect(result.suitability).toBe(25);
      expect(result.fairness).toBe(20);
      expect(result.efficiency).toBe(5);
      expect(result.total).toBe(70);
    });
  });

  describe('Conflict Ranking & Tie-Breaker Logic', () => {
    it('Ranks competing requests for DSO-100MHz-4CH: Asha > Ravi > Meera', () => {
      const candidates: CompetingRequestCandidate[] = [
        {
          id: 101,
          studentId: 1,
          studentName: 'Asha Sharma',
          projectTitle: 'Smart Pulse Monitor',
          projectDeadline: new Date(Date.now() + 2 * 86400000).toISOString(), // 2 days away
          startTime: new Date(Date.now() + 1 * 86400000).toISOString(),
          endTime: new Date(Date.now() + 1 * 86400000 + 7200000).toISOString(),
          durationMinutes: 120,
          approvedHoursLast30Days: 0,
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          requirements: [{ capability: 'signal-analysis', level: 'full', priority: 'must' }],
        },
        {
          id: 102,
          studentId: 2,
          studentName: 'Ravi Patel',
          projectTitle: 'Audio Pre-Amp Testing',
          projectDeadline: new Date(Date.now() + 6 * 86400000).toISOString(), // 6 days away
          startTime: new Date(Date.now() + 1 * 86400000).toISOString(),
          endTime: new Date(Date.now() + 1 * 86400000 + 7200000).toISOString(),
          durationMinutes: 120,
          approvedHoursLast30Days: 4,
          createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          requirements: [{ capability: 'signal-analysis', level: 'full', priority: 'must' }],
        },
        {
          id: 103,
          studentId: 3,
          studentName: 'Meera Reddy',
          projectTitle: 'IoT Signal Logger',
          projectDeadline: new Date(Date.now() + 12 * 86400000).toISOString(), // 12 days away
          startTime: new Date(Date.now() + 1 * 86400000).toISOString(),
          endTime: new Date(Date.now() + 1 * 86400000 + 7200000).toISOString(),
          durationMinutes: 120,
          approvedHoursLast30Days: 8,
          createdAt: new Date(Date.now() - 0.5 * 86400000).toISOString(),
          requirements: [{ capability: 'signal-analysis', level: 'full', priority: 'must' }],
        },
      ];

      const ranked = rankCompetingRequests(candidates, 1);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].studentName).toBe('Asha Sharma');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].recommendation).toBe('approve');

      expect(ranked[1].studentName).toBe('Ravi Patel');
      expect(ranked[1].rank).toBe(2);
      expect(ranked[1].recommendation).toBe('alternative');

      expect(ranked[2].studentName).toBe('Meera Reddy');
      expect(ranked[2].rank).toBe(3);
      expect(ranked[2].recommendation).toBe('alternative');
    });

    it('Applies deterministic tie-breakers when total scores are equal', () => {
      // Two candidates with identical scores: one has earlier createdAt
      const candidates: CompetingRequestCandidate[] = [
        {
          id: 201,
          studentId: 4,
          projectTitle: 'Project B',
          projectDeadline: '2026-12-01',
          startTime: '2026-11-25T10:00:00Z',
          endTime: '2026-11-25T12:00:00Z',
          durationMinutes: 120,
          approvedHoursLast30Days: 2,
          createdAt: '2026-11-20T12:00:00Z', // Later
        },
        {
          id: 202,
          studentId: 5,
          projectTitle: 'Project A',
          projectDeadline: '2026-12-01',
          startTime: '2026-11-25T10:00:00Z',
          endTime: '2026-11-25T12:00:00Z',
          durationMinutes: 120,
          approvedHoursLast30Days: 2,
          createdAt: '2026-11-20T09:00:00Z', // Earlier
        },
      ];

      const ranked = rankCompetingRequests(candidates, 1);
      expect(ranked[0].id).toBe(202); // Earlier created_at wins
    });
  });

  describe('Legacy V1 Functions (Preserved)', () => {
    it('calculateUrgencyScore legacy table', () => {
      expect(calculateUrgencyScore(1)).toBe(100);
      expect(calculateUrgencyScore(2)).toBe(95);
      expect(calculateUrgencyScore(10)).toBe(50);
      expect(calculateUrgencyScore(30)).toBe(20);
    });

    it('calculateSuitabilityScore legacy tag overlap', () => {
      const required = ['gpu', 'pytorch', 'cuda'];
      const equipTags = ['gpu', 'cuda', 'h100', 'deep-learning', 'pytorch'];
      const result = calculateSuitabilityScore(required, equipTags);
      expect(result.score).toBe(100);
      expect(result.matchedTags).toHaveLength(3);
    });

    it('calculateFairnessScore legacy', () => {
      expect(calculateFairnessScore(0)).toBe(100);
      expect(calculateFairnessScore(2)).toBe(90);
    });

    it('calculatePriorityScore legacy weights', () => {
      const maya = calculatePriorityScore({
        deadlineDays: 2,
        requiredCapabilities: ['gpu', 'cuda'],
        equipmentTags: ['gpu', 'cuda', 'h100'],
        pastAllocatedHours: 2,
        durationMinutes: 180,
        minSessionMinutes: 60,
        maxSessionMinutes: 240,
      });
      expect(maya.weights.urgency).toBe(0.35);
      expect(maya.weights.suitability).toBe(0.30);
      expect(maya.weights.fairness).toBe(0.20);
      expect(maya.weights.efficiency).toBe(0.15);
    });
  });
});
