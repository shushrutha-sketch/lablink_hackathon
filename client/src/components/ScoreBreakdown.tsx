import React from 'react';
import { ScoreBreakdown } from '../lib/types.js';
import { Award, Zap, Shield, Target, Clock } from 'lucide-react';

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdown;
  className?: string;
  showFormulaExplanation?: boolean;
}

export const ScoreBreakdownView: React.FC<ScoreBreakdownProps> = ({
  breakdown,
  className = '',
  showFormulaExplanation = true,
}) => {
  const { urgency, suitability, fairness, efficiency, weights, total, factors } = breakdown;

  const pillars = [
    {
      name: 'Urgency',
      score: urgency,
      weight: weights.urgency * 100,
      icon: Clock,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      detail: `${factors.deadlineDays} days to deadline`,
    },
    {
      name: 'Suitability',
      score: suitability,
      weight: weights.suitability * 100,
      icon: Target,
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      detail: `${factors.matchedTagsCount}/${factors.totalRequiredTags} tags matched`,
    },
    {
      name: 'Fairness',
      score: fairness,
      weight: weights.fairness * 100,
      icon: Shield,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      detail: `${factors.pastAllocatedHours} hrs usage in 30d (undreserved priority)`,
    },
    {
      name: 'Efficiency',
      score: efficiency,
      weight: weights.efficiency * 100,
      icon: Zap,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      detail: `${factors.durationMinutes} min session`,
    },
  ];

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 ${className}`}>
      {/* Header with Composite Score */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Award className="w-4 h-4 text-brand-600" />
            Fair-Share Priority Score
          </div>
          <div className="text-2xl font-black text-slate-900 mt-0.5">
            {total} <span className="text-sm font-medium text-slate-400">/ 100</span>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
            Deterministic Ranking
          </span>
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pillars.map(p => {
          const Icon = p.icon;
          return (
            <div key={p.name} className={`p-3 rounded-lg border ${p.bgColor} ${p.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-4 h-4 ${p.textColor}`} />
                  <span className="text-xs font-bold text-slate-800">
                    {p.name} ({p.weight}%)
                  </span>
                </div>
                <span className={`text-sm font-black ${p.textColor}`}>{p.score}</span>
              </div>

              {/* Bar */}
              <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${p.color}`}
                  style={{ width: `${Math.min(100, p.score)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 mt-1 font-medium">{p.detail}</p>
            </div>
          );
        })}
      </div>

      {showFormulaExplanation && (
        <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-600">
            Formula: 0.35·Urgency + 0.30·Suitability + 0.20·Fairness + 0.15·Efficiency
          </span>
          <span className="text-emerald-600 font-semibold text-[10px]">100% Explainable</span>
        </div>
      )}
    </div>
  );
};
