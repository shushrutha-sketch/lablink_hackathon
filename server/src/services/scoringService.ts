import { ALLOCATION_WEIGHTS, FAIRNESS_BENCHMARK_HOURS } from '../domain/constants.js';
import { ScoreBreakdownResult } from '../domain/types.js';

export interface ScoringInputs {
  deadlineDays: number;
  requiredCapabilities: string[];
  equipmentTags: string[];
  pastAllocatedHours: number;
  durationMinutes: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
}

/**
 * Compute Urgency score (0 - 100)
 * Closer deadline = higher urgency score
 */
export function calculateUrgencyScore(deadlineDays: number): number {
  if (deadlineDays <= 1) return 100;
  if (deadlineDays <= 2) return 95;
  if (deadlineDays <= 4) return 85;
  if (deadlineDays <= 7) return 70;
  if (deadlineDays <= 14) return 50;
  if (deadlineDays <= 21) return 35;
  return 20;
}

/**
 * Compute Suitability score (0 - 100)
 * Tag overlap coefficient
 */
export function calculateSuitabilityScore(
  requiredCapabilities: string[],
  equipmentTags: string[]
): { score: number; matchedTags: string[] } {
  if (!requiredCapabilities || requiredCapabilities.length === 0) {
    return { score: 100, matchedTags: [] };
  }

  const normalizedEquipTags = equipmentTags.map(t => t.toLowerCase().trim());
  const matched = requiredCapabilities.filter(req => {
    const r = req.toLowerCase().trim();
    return normalizedEquipTags.some(eqTag => eqTag.includes(r) || r.includes(eqTag));
  });

  const ratio = matched.length / requiredCapabilities.length;
  const score = Math.min(100, Math.round(ratio * 100));

  return { score, matchedTags: matched };
}

/**
 * Compute Fairness score (0 - 100)
 * Gives highest priority to students who have had fewer allocated laboratory hours in the last 30 days.
 */
export function calculateFairnessScore(pastAllocatedHours: number): number {
  if (pastAllocatedHours <= 0) return 100;
  if (pastAllocatedHours <= 2) return 90;
  if (pastAllocatedHours <= 4) return 75;
  if (pastAllocatedHours <= 7) return 60;
  if (pastAllocatedHours <= 10) return 45;
  if (pastAllocatedHours <= 15) return 30;
  return 15;
}

/**
 * Compute Efficiency score (0 - 100)
 * Evaluates whether the requested session length respects equipment constraints
 * and avoids wasteful slot fragmentation.
 */
export function calculateEfficiencyScore(
  durationMinutes: number,
  minSessionMinutes: number,
  maxSessionMinutes: number
): number {
  if (durationMinutes < minSessionMinutes || durationMinutes > maxSessionMinutes) {
    return 30; // Out of bounds penalty
  }
  // Optimal durations are clean multiples of 60 or well-proportioned
  const span = maxSessionMinutes - minSessionMinutes;
  if (span <= 0) return 90;

  // Prefer requests that are reasonable without hoarding the whole day
  if (durationMinutes <= 180) return 95;
  return 80;
}

/**
 * Master scoring function combining all 4 pillars with published weights
 */
export function calculatePriorityScore(inputs: ScoringInputs): ScoreBreakdownResult {
  const urgency = calculateUrgencyScore(inputs.deadlineDays);
  const { score: suitability, matchedTags } = calculateSuitabilityScore(
    inputs.requiredCapabilities,
    inputs.equipmentTags
  );
  const fairness = calculateFairnessScore(inputs.pastAllocatedHours);
  const efficiency = calculateEfficiencyScore(
    inputs.durationMinutes,
    inputs.minSessionMinutes,
    inputs.maxSessionMinutes
  );

  const total = Number(
    (
      urgency * ALLOCATION_WEIGHTS.URGENCY +
      suitability * ALLOCATION_WEIGHTS.SUITABILITY +
      fairness * ALLOCATION_WEIGHTS.FAIRNESS +
      efficiency * ALLOCATION_WEIGHTS.EFFICIENCY
    ).toFixed(2)
  );

  return {
    urgency,
    suitability,
    fairness,
    efficiency,
    weights: {
      urgency: ALLOCATION_WEIGHTS.URGENCY,
      suitability: ALLOCATION_WEIGHTS.SUITABILITY,
      fairness: ALLOCATION_WEIGHTS.FAIRNESS,
      efficiency: ALLOCATION_WEIGHTS.EFFICIENCY,
    },
    total,
    factors: {
      deadlineDays: inputs.deadlineDays,
      matchedTagsCount: matchedTags.length,
      totalRequiredTags: inputs.requiredCapabilities.length,
      pastAllocatedHours: inputs.pastAllocatedHours,
      durationMinutes: inputs.durationMinutes,
    },
  };
}
