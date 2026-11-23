import React from 'react';
import { Award, Zap, Shield, Target, Clock } from 'lucide-react';

interface ScoreBreakdownProps {
  breakdown: any;
  className?: string;
  showFormulaExplanation?: boolean;
}

export const ScoreBreakdownView: React.FC<ScoreBreakdownProps> = ({
  breakdown,
  className = '',
  showFormulaExplanation = true,
}) => {
  if (!breakdown) return null;

  const urgency = breakdown.urgency ?? 0;
  const suitability = breakdown.suitability ?? 0;
  const fairness = breakdown.fairness ?? 0;
  const efficiency = breakdown.efficiency ?? 0;
  const total = breakdown.total ?? Math.round(urgency + suitability + fairness + efficiency);
  const factors = breakdown.factors || {};

  const isPart3 = breakdown.weights?.urgency === 40 || urgency <= 40;

  const pillars = [
    {
      name: 'Deadline Urgency',
      score: urgency,
      maxPts: isPart3 ? 40 : 100,
      icon: Clock,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      detail: `${factors.deadlineDays ?? 0} days to deadline (${factors.deadlineDays <= 7 ? 'Urgent' : 'Scheduled'})`,
    },
    {
      name: 'Resource Suitability',
      score: suitability,
      maxPts: isPart3 ? 25 : 100,
      icon: Target,
      color: 'bg-electric-500',
      textColor: 'text-electric-700',
      bgColor: 'bg-electric-50',
      borderColor: 'border-electric-200',
      detail: factors.coveragePct !== undefined
        ? `${factors.coveragePct}% requirement coverage`
        : `${factors.matchedTagsCount ?? 0}/${factors.totalRequiredTags ?? 0} tags matched`,
    },
    {
      name: 'Equitable Fairness',
      score: fairness,
      maxPts: isPart3 ? 25 : 100,
      icon: Shield,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      detail: `${factors.approvedHoursLast30Days ?? factors.pastAllocatedHours ?? 0}h usage in 30d • ${factors.daysWaiting ?? 0}d waiting`,
    },
    {
      name: 'Session Efficiency',
      score: efficiency,
      maxPts: isPart3 ? 10 : 100,
      icon: Zap,
      color: 'bg-ai-500',
      textColor: 'text-ai-700',
      bgColor: 'bg-ai-50',
      borderColor: 'border-ai-200',
      detail: `${factors.durationMinutes ?? 120} min duration within limits`,
    },
  ];

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 ${className}`}>
      {/* Header with Composite Score */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-heading font-bold uppercase tracking-wider text-slate-500">
            <Award className="w-4 h-4 text-electric-600" />
            Deterministic Fair Allocation Score
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 mt-0.5">
            {total} <span className="text-sm font-medium text-slate-400">/ 100 pts</span>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-electric-50 text-electric-700 border border-electric-200">
            Objective Mathematical Ranking
          </span>
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {pillars.map(p => {
          const Icon = p.icon;
          const pct = Math.min(100, Math.round((p.score / p.maxPts) * 100));

          return (
            <div key={p.name} className={`p-4 rounded-xl border ${p.bgColor} ${p.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-4 h-4 ${p.textColor}`} />
                  <span className="text-xs font-heading font-bold text-slate-800">
                    {p.name}
                  </span>
                </div>
                <span className={`text-sm font-heading font-extrabold ${p.textColor}`}>
                  {p.score} <span className="text-[10px] font-normal text-slate-400">/ {p.maxPts}</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${p.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-600 mt-2 font-medium">{p.detail}</p>
            </div>
          );
        })}
      </div>

      {showFormulaExplanation && (
        <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-slate-600">
            Formula: 40·Urgency + 25·Suitability + 25·Fairness (20 use + 5 wait) + 10·Efficiency = 100 pts
          </span>
          <span className="text-emerald-700 font-semibold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
            Deterministic & Transparent
          </span>
        </div>
      )}
    </div>
  );
};
