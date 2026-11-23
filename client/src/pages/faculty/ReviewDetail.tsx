import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { AllocationDetail } from '../../lib/types.js';
import { ScoreBreakdownView } from '../../components/ScoreBreakdown.js';
import { AlternativesList } from '../../components/AlternativesList.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { formatDate, formatTimeRange } from '../../lib/format.js';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Sparkles,
  Users,
  Shield,
  Layers,
  Calendar,
  MessageSquare,
  Flame,
} from 'lucide-react';

export const ReviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [allocation, setAllocation] = useState<AllocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchAllocation = () => {
    if (!id) return;
    setLoading(true);
    apiRequest<AllocationDetail>(`/faculty/requests/${id}/allocation`)
      .then(res => setAllocation(res))
      .catch(err => setError(err.message || 'Failed to load allocation data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAllocation();
  }, [id]);

  const handleDecision = async (action: 'approve' | 'reject' | 'request_changes') => {
    const isOverride = action === 'approve' && primaryTarget && !primaryTarget.isWinner;

    if (isOverride && !comment.trim()) {
      alert('An override reason is mandatory when approving a request that is not the engine\'s top recommendation.');
      return;
    }

    if ((action === 'reject' || action === 'request_changes') && !comment.trim()) {
      alert('A comment explaining the decision or requested modifications is required.');
      return;
    }

    setActionLoading(true);
    try {
      await apiRequest(`/faculty/requests/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          comment: comment.trim() || undefined,
        }),
      });
      alert(`Request has been ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated with requested changes'}.`);
      navigate('/review');
    } catch (err: any) {
      alert(err.message || 'Failed to record decision');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !allocation) {
    return (
      <div className="p-8 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-base font-bold text-slate-800">Error loading request allocation</p>
        <p className="text-xs text-slate-500">{error || 'Request not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/review')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold"
        >
          Return to Queue
        </button>
      </div>
    );
  }

  const primaryTarget = allocation.competitors.find(c => c.request.id === Number(id)) || allocation.competitors[0];
  const req = primaryTarget?.request;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/review')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Review Queue
      </button>

      {/* Top Conflict Status Banner */}
      {allocation.conflicts ? (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Resource Contention Detected
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {allocation.totalCompetitors} students competing for the same laboratory slot
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              The Fair Allocation Engine has mathematically ranked submissions based on deadline urgency, suitability, past usage fairness, and session efficiency. Final approval remains under faculty control.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-800 font-medium">
            No overlapping requests detected. This slot has full available capacity for confirmed reservation.
          </p>
        </div>
      )}

      {/* Request Details Card */}
      {req && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {req.department_name}
                </span>
                <StatusBadge status={req.status} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {req.project_title}
              </h1>
              <p className="text-xs text-slate-600">
                Submitted by <strong className="text-slate-900">{req.student_name}</strong> ({req.student_email})
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right space-y-1 shrink-0">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Target Instrument</span>
              <div className="text-base font-bold text-brand-700">{req.equipment_name}</div>
              <div className="text-xs text-slate-500 font-mono">
                {formatDate(req.start_time)} • {formatTimeRange(req.start_time, req.end_time)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Research Objective & Proposal
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {req.project_description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-2">
            <div>
              <span className="text-slate-400 font-semibold mr-1.5">Project Deadline:</span>
              <span className="font-bold text-slate-800">{req.project_deadline}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold mr-1.5">Required Capabilities:</span>
              <span className="font-semibold text-slate-700">
                {req.required_capabilities?.join(', ') || 'General research'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Competing Requests Comparison Table (if multiple competitors) */}
      {allocation.competitors.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                Competing Applicants Fair-Share Scoring Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Side-by-side transparent formula evaluation for overlapping requests.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Published Weights (35% / 30% / 20% / 15%)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Rank / Applicant</th>
                  <th className="p-3">Urgency (35%)</th>
                  <th className="p-3">Suitability (30%)</th>
                  <th className="p-3">Fairness (20%)</th>
                  <th className="p-3">Efficiency (15%)</th>
                  <th className="p-3">Total Score</th>
                  <th className="p-3 text-right">Engine Rec</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocation.competitors.map((comp, idx) => (
                  <tr
                    key={comp.request.id}
                    className={`transition-colors ${
                      comp.isWinner
                        ? 'bg-amber-50/50 font-medium'
                        : comp.request.id === Number(id)
                        ? 'bg-brand-50/30'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        #{idx + 1} {comp.request.student_name}
                        {comp.request.id === Number(id) && (
                          <span className="text-[10px] text-brand-600 font-bold bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {comp.request.project_title}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800">{comp.breakdown.urgency}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        {comp.breakdown.factors.deadlineDays}d deadline
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800">{comp.breakdown.suitability}%</span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        {comp.breakdown.factors.matchedTagsCount} tags
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800">{comp.breakdown.fairness}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        {comp.breakdown.factors.pastAllocatedHours}h in 30d
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800">{comp.breakdown.efficiency}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        {comp.breakdown.factors.durationMinutes}m
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm font-black text-slate-900">{comp.score}</span>
                      <span className="text-[10px] text-slate-400">/100</span>
                    </td>
                    <td className="p-3 text-right">
                      {comp.isWinner ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <Award className="w-3.5 h-3.5" /> Recommended Winner
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">
                          Offer Alternative
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Primary Score Breakdown Card */}
      {primaryTarget && (
        <ScoreBreakdownView breakdown={primaryTarget.breakdown} />
      )}

      {/* Plain-Language Explanation Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            Explainable Allocation Narrative
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Source: {allocation.explanationSource === 'gemini' ? 'Gemini AI Explanation' : 'Deterministic Rule Engine'}
          </span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed font-medium">
          {allocation.explanation}
        </p>
      </div>

      {/* Recommended Alternatives */}
      {allocation.alternatives && (
        <AlternativesList alternatives={allocation.alternatives} />
      )}

      {/* Faculty Decision Cockpit Actions */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md space-y-5">
        <div className="space-y-1">
          <h3 className="text-base font-black tracking-tight">Faculty Review Decision</h3>
          <p className="text-xs text-slate-400">
            Select an action to record your decision. Approvals are executed inside an atomic transaction to guarantee zero double-booking.
          </p>
        </div>

        {primaryTarget && !primaryTarget.isWinner && (
          <div className="bg-amber-500/20 border border-amber-400 text-amber-200 p-4 rounded-xl text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Faculty Override Required
            </div>
            <p>
              This request was ranked #{primaryTarget.rank} and is not the engine's recommended winner. You may still approve it, but a mandatory justification reason must be written in the comment box below.
            </p>
          </div>
        )}

        {/* Comment textarea */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-brand-400" />
            Decision Comment / Instructions for Student
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="e.g. Approved. Please review cleanroom safety protocol before starting the session..."
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 placeholder:text-slate-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => handleDecision('request_changes')}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors"
          >
            Request Modifications
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={() => handleDecision('reject')}
            className="px-4 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs transition-colors"
          >
            Reject Request
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={() => handleDecision('approve')}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm & Approve Booking
          </button>
        </div>
      </div>
    </div>
  );
};
