import { describe, it, expect } from 'vitest';
import {
  calculateUrgencyScore,
  calculateSuitabilityScore,
  calculateFairnessScore,
  calculateEfficiencyScore,
  calculatePriorityScore,
} from '../scoringService.js';

describe('Fair Allocation Scoring Engine', () => {
  it('should award maximum urgency score for immediate deadlines', () => {
    expect(calculateUrgencyScore(1)).toBe(100);
    expect(calculateUrgencyScore(2)).toBe(95);
    expect(calculateUrgencyScore(10)).toBe(50);
    expect(calculateUrgencyScore(30)).toBe(20);
  });

  it('should calculate suitability based on matching capability tags', () => {
    const required = ['gpu', 'pytorch', 'cuda'];
    const equipTags = ['gpu', 'cuda', 'h100', 'deep-learning', 'pytorch'];
    const result = calculateSuitabilityScore(required, equipTags);
    expect(result.score).toBe(100);
    expect(result.matchedTags).toHaveLength(3);

    const partialEquip = ['gpu', 'cuda'];
    const partialResult = calculateSuitabilityScore(required, partialEquip);
    expect(partialResult.score).toBe(67);
  });

  it('should prioritize students with fewer recent allocated hours for fairness', () => {
    // 0 hours allocated = highest fairness score
    expect(calculateFairnessScore(0)).toBe(100);
    // Student with 2 hours
    expect(calculateFairnessScore(2)).toBe(90);
    // Student with 8 hours
    expect(calculateFairnessScore(8)).toBe(45);
    // Student with 18 hours
    expect(calculateFairnessScore(18)).toBe(15);
  });

  it('should calculate efficiency within equipment bounds', () => {
    expect(calculateEfficiencyScore(120, 30, 240)).toBe(95);
    expect(calculateEfficiencyScore(15, 30, 240)).toBe(30); // Below min penalty
    expect(calculateEfficiencyScore(300, 30, 240)).toBe(30); // Above max penalty
  });

  it('should compute combined weighted priority score deterministically', () => {
    // Maya: Urgent deadline (2 days), 100% suitability, high fairness (2 past hours)
    const mayaBreakdown = calculatePriorityScore({
      deadlineDays: 2,
      requiredCapabilities: ['gpu', 'cuda'],
      equipmentTags: ['gpu', 'cuda', 'h100'],
      pastAllocatedHours: 2,
      durationMinutes: 180,
      minSessionMinutes: 60,
      maxSessionMinutes: 240,
    });

    // Alex: Distant deadline (10 days), 100% suitability, low fairness (8 past hours)
    const alexBreakdown = calculatePriorityScore({
      deadlineDays: 10,
      requiredCapabilities: ['gpu', 'cuda'],
      equipmentTags: ['gpu', 'cuda', 'h100'],
      pastAllocatedHours: 8,
      durationMinutes: 180,
      minSessionMinutes: 60,
      maxSessionMinutes: 240,
    });

    expect(mayaBreakdown.total).toBeGreaterThan(alexBreakdown.total);
    expect(mayaBreakdown.weights.urgency).toBe(0.35);
    expect(mayaBreakdown.weights.suitability).toBe(0.30);
    expect(mayaBreakdown.weights.fairness).toBe(0.20);
    expect(mayaBreakdown.weights.efficiency).toBe(0.15);
  });
});
