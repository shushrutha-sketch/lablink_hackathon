/**
 * LabLink Domain Constants
 */

export const LAB_HOURS = {
  START_HOUR: 9, // 09:00
  END_HOUR: 17,  // 17:00
  SLOT_INTERVAL_MINUTES: 30,
  DAYS_OPEN: [1, 2, 3, 4, 5, 6], // Monday (1) to Saturday (6)
};

export const ALLOCATION_WEIGHTS = {
  URGENCY: 0.35,     // 35% weight: deadline proximity
  SUITABILITY: 0.30, // 30% weight: capability tag overlap
  FAIRNESS: 0.20,    // 20% weight: inverse recent 30-day usage
  EFFICIENCY: 0.15,  // 15% weight: duration match to session guidance
};

export const FAIRNESS_BENCHMARK_HOURS = 20; // 20 hours in 30 days is max benchmark

export const UTILISATION_THRESHOLDS = {
  UNDERUTILISED_PERCENT: 20, // < 20% is flagged underutilised
  OVERSUBSCRIBED_PERCENT: 70, // > 70% or high conflicts is oversubscribed
};
