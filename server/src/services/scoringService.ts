import { ALLOCATION_WEIGHTS, FAIR_ALLOCATION_WEIGHTS } from '../domain/constants.js';
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

export interface StructuredRequirementInput {
  capability: string;
  level: 'full' | 'partial' | 'none';
  priority?: 'must' | 'nice';
}

export interface FairAllocationInputs {
  deadlineDays: number;
  requirements?: StructuredRequirementInput[];
  requiredCapabilities?: string[];
  equipmentCapabilities?: string[];
  approvedHoursLast30Days: number;
  daysWaiting?: number;
  durationMinutes: number;
  minSessionMinutes?: number;
  maxSessionMinutes?: number;
}

export interface FairAllocationResult {
  urgency: number;     // 0 - 40
  suitability: number; // 0 - 25
  fairness: number;    // 0 - 25
  fairnessUsage: number; // 0 - 20
  fairnessWait: number;  // 0 - 5
  efficiency: number;  // 0 - 10
  total: number;       // 0 - 100
  factors: {
    deadlineDays: number;
    approvedHoursLast30Days: number;
    daysWaiting: number;
    durationMinutes: number;
    coveragePct: number;
  };
}

export interface CompetingRequestCandidate {
  id: number;
  studentId: number;
  studentName?: string;
  projectTitle: string;
  projectDeadline: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  approvedHoursLast30Days: number;
  createdAt: string;
  requirements?: StructuredRequirementInput[];
  requiredCapabilities?: string[];
  equipmentCapabilities?: string[];
  minSessionMinutes?: number;
  maxSessionMinutes?: number;
}

export interface RankedCompetingRequest extends CompetingRequestCandidate {
  score: FairAllocationResult;
  rank: number;
  recommendation: 'approve' | 'alternative';
  explanation: string;
}

// ==========================================
// Part III Revision 3 Formulas (Section 5.2 / Section 20)
// ==========================================

/**
 * Urgency Score: 0 to 40 points
 * 40 * max(0, 1 - min(daysToDeadline, 14) / 14)
 */
export function calculateUrgencyPart3(daysToDeadline: number): number {
  if (daysToDeadline <= 0) return 40;
  if (daysToDeadline >= 14) return 0;
  const score = 40 * (1 - daysToDeadline / 14);
  return Math.round(score * 100) / 100;
}

/**
 * Suitability Score: 0 to 25 points
 * Must weight = 2.0, Nice weight = 1.0
 * Full match = 1.0, Partial = 0.5, None = 0.0
 */
export function calculateSuitabilityPart3(
  requirements?: StructuredRequirementInput[],
  requiredCapabilities?: string[],
  equipmentCapabilities?: string[]
): { score: number; coveragePct: number } {
  if (requirements && requirements.length > 0) {
    let totalWeight = 0;
    let weightedMatch = 0;

    for (const req of requirements) {
      const weight = req.priority === 'nice' ? 1.0 : 2.0;
      totalWeight += weight;

      const levelScore = req.level === 'full' ? 1.0 : req.level === 'partial' ? 0.5 : 0.0;
      weightedMatch += weight * levelScore;
    }

    const ratio = totalWeight > 0 ? weightedMatch / totalWeight : 0.5;
    const score = Math.round(25 * ratio * 100) / 100;
    const coveragePct = Math.round(ratio * 100);
    return { score, coveragePct };
  }

  // Fallback if structured requirements not supplied
  if (requiredCapabilities && requiredCapabilities.length > 0) {
    const equip = (equipmentCapabilities || []).map(e => e.toLowerCase().trim());
    const matched = requiredCapabilities.filter(c =>
      equip.some(eq => eq.includes(c.toLowerCase().trim()) || c.toLowerCase().trim().includes(eq))
    );
    const ratio = matched.length / requiredCapabilities.length;
    const score = Math.round(25 * ratio * 100) / 100;
    const coveragePct = Math.round(ratio * 100);
    return { score, coveragePct };
  }

  // Default baseline when unconstrained
  return { score: 12.5, coveragePct: 50 };
}

/**
 * Fairness Score: 0 to 25 points
 * Usage: 20 * max(0, 1 - min(approvedHoursLast30Days, 12) / 12)
 * Wait: 5 * min(daysWaiting, 5) / 5
 */
export function calculateFairnessPart3(
  approvedHoursLast30Days: number,
  daysWaiting: number = 0
): { total: number; usageScore: number; waitScore: number } {
  const clampedHours = Math.max(0, Math.min(approvedHoursLast30Days, 12));
  const usageScore = Math.round(20 * (1 - clampedHours / 12) * 100) / 100;

  const clampedWait = Math.max(0, Math.min(daysWaiting, 5));
  const waitScore = Math.round(5 * (clampedWait / 5) * 100) / 100;

  const total = Math.round((usageScore + waitScore) * 100) / 100;
  return { total, usageScore, waitScore };
}

/**
 * Efficiency Score: 0 to 10 points
 * 10 * (1 - (durationMinutes - min) / (max - min))
 */
export function calculateEfficiencyPart3(
  durationMinutes: number,
  minMinutes: number = 30,
  maxMinutes: number = 240
): number {
  if (maxMinutes <= minMinutes) return 10;
  if (durationMinutes <= minMinutes) return 10;
  if (durationMinutes >= maxMinutes) return 0;

  const ratio = (durationMinutes - minMinutes) / (maxMinutes - minMinutes);
  const score = 10 * (1 - ratio);
  return Math.round(score * 100) / 100;
}

/**
 * Master Part III Scoring Function
 */
export function calculateFairAllocationScore(inputs: FairAllocationInputs): FairAllocationResult {
  const urgency = calculateUrgencyPart3(inputs.deadlineDays);
  const { score: suitability, coveragePct } = calculateSuitabilityPart3(
    inputs.requirements,
    inputs.requiredCapabilities,
    inputs.equipmentCapabilities
  );
  const { total: fairness, usageScore, waitScore } = calculateFairnessPart3(
    inputs.approvedHoursLast30Days,
    inputs.daysWaiting || 0
  );
  const efficiency = calculateEfficiencyPart3(
    inputs.durationMinutes,
    inputs.minSessionMinutes ?? 30,
    inputs.maxSessionMinutes ?? 240
  );

  const total = Math.round((urgency + suitability + fairness + efficiency) * 100) / 100;

  return {
    urgency,
    suitability,
    fairness,
    fairnessUsage: usageScore,
    fairnessWait: waitScore,
    efficiency,
    total,
    factors: {
      deadlineDays: inputs.deadlineDays,
      approvedHoursLast30Days: inputs.approvedHoursLast30Days,
      daysWaiting: inputs.daysWaiting || 0,
      durationMinutes: inputs.durationMinutes,
      coveragePct,
    },
  };
}

/**
 * Deterministic Ranking and Advisory Recommendation Engine
 */
export function rankCompetingRequests(
  candidates: CompetingRequestCandidate[],
  availableCapacity: number = 1
): RankedCompetingRequest[] {
  const now = new Date();

  // 1. Compute scores for all candidates
  const scored = candidates.map(c => {
    // Calculate daysToDeadline
    const deadlineDate = new Date(c.projectDeadline);
    const bookingDate = new Date(c.startTime);
    const diffMs = deadlineDate.getTime() - bookingDate.getTime();
    const deadlineDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Calculate daysWaiting
    const createdDate = new Date(c.createdAt);
    const waitDiffMs = now.getTime() - createdDate.getTime();
    const daysWaiting = Math.max(0, Math.floor(waitDiffMs / (1000 * 60 * 60 * 24)));

    const score = calculateFairAllocationScore({
      deadlineDays,
      requirements: c.requirements,
      requiredCapabilities: c.requiredCapabilities,
      equipmentCapabilities: c.equipmentCapabilities,
      approvedHoursLast30Days: c.approvedHoursLast30Days,
      daysWaiting,
      durationMinutes: c.durationMinutes,
      minSessionMinutes: c.minSessionMinutes,
      maxSessionMinutes: c.maxSessionMinutes,
    });

    return {
      ...c,
      score,
    };
  });

  // 2. Sort by strict deterministic tie-breaker rules
  scored.sort((a, b) => {
    // Tie-breaker 1: Total score descending
    if (Math.abs(b.score.total - a.score.total) > 0.001) {
      return b.score.total - a.score.total;
    }
    // Tie-breaker 2: Urgency score descending
    if (Math.abs(b.score.urgency - a.score.urgency) > 0.001) {
      return b.score.urgency - a.score.urgency;
    }
    // Tie-breaker 3: Lower approved hours last 30 days ascending
    if (Math.abs(a.approvedHoursLast30Days - b.approvedHoursLast30Days) > 0.001) {
      return a.approvedHoursLast30Days - b.approvedHoursLast30Days;
    }
    // Tie-breaker 4: Earlier created_at timestamp ascending
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    // Tie-breaker 5: Lower request ID ascending
    return a.id - b.id;
  });

  // 3. Assign rank and advisory recommendations
  return scored.map((item, index) => {
    const rank = index + 1;
    const isApproved = rank <= availableCapacity;

    let explanation = '';
    if (isApproved) {
      explanation = `Ranked #${rank} (Score ${item.score.total}/100). Recommended for approval based on high deadline urgency (${item.score.urgency} pts) and equitable resource fairness (${item.score.fairness} pts).`;
    } else {
      explanation = `Ranked #${rank} (Score ${item.score.total}/100). Recommended for alternative time slot or compatible equipment due to competing higher-priority reservation in this time window.`;
    }

    return {
      ...item,
      rank,
      recommendation: isApproved ? 'approve' : 'alternative',
      explanation,
    };
  });
}

// ==========================================
// Legacy V1 Compatibility Exports
// ==========================================

export function calculateUrgencyScore(deadlineDays: number): number {
  if (deadlineDays <= 1) return 100;
  if (deadlineDays <= 2) return 95;
  if (deadlineDays <= 4) return 85;
  if (deadlineDays <= 7) return 70;
  if (deadlineDays <= 14) return 50;
  if (deadlineDays <= 21) return 35;
  return 20;
}

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

export function calculateFairnessScore(pastAllocatedHours: number): number {
  if (pastAllocatedHours <= 0) return 100;
  if (pastAllocatedHours <= 2) return 90;
  if (pastAllocatedHours <= 4) return 75;
  if (pastAllocatedHours <= 7) return 60;
  if (pastAllocatedHours <= 10) return 45;
  if (pastAllocatedHours <= 15) return 30;
  return 15;
}

export function calculateEfficiencyScore(
  durationMinutes: number,
  minSessionMinutes: number,
  maxSessionMinutes: number
): number {
  if (durationMinutes < minSessionMinutes || durationMinutes > maxSessionMinutes) {
    return 30;
  }
  const span = maxSessionMinutes - minSessionMinutes;
  if (span <= 0) return 90;

  if (durationMinutes <= 180) return 95;
  return 80;
}

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

  const total = Math.round(
    urgency * ALLOCATION_WEIGHTS.URGENCY +
      suitability * ALLOCATION_WEIGHTS.SUITABILITY +
      fairness * ALLOCATION_WEIGHTS.FAIRNESS +
      efficiency * ALLOCATION_WEIGHTS.EFFICIENCY
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
