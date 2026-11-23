import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import { BookingRequest } from '../../lib/types.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { ScoreBreakdownView } from '../../components/ScoreBreakdown.js';
import { AlternativesList } from '../../components/AlternativesList.js';
import { formatDate, formatTimeRange } from '../../lib/format.js';
import { Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  XCircle,
  Plus,
  MessageSquare,
  Award,
} from 'lucide-react';

export const MyRequests: React.FC = () => {
  const location = useLocation();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBreakdown, setActiveBreakdown] = useState<number | null>(null);

  const fetchRequests = () => {
    setLoading(true);
    apiRequest<{ requests: BookingRequest[] }>('/requests/mine')
      .then(res => setRequests(res.requests))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel this reservation request?')) return;
    try {
      await apiRequest(`/requests/${id}/cancel`, { method: 'POST' });
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel reservation');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            My Laboratory Reservations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track status, faculty approvals, and review conflict alternatives.
          </p>
        </div>

        <Link
          to="/requests/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Reservation Request
        </Link>
      </div>

      {loading ? (
        <div className="min-h-72 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No active reservation requests</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            You haven't requested any laboratory resources yet. Browse equipment or use the AI matcher.
          </p>
          <Link
            to="/discover"
            className="inline-block px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-bold"
          >
            Browse Equipment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const hasBreakdown = req.score_breakdown !== null;
            const isBreakdownOpen = activeBreakdown === req.id;

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                        {req.department_name || 'Engineering'}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{req.equipment_name}</h3>
                    <p className="text-xs font-semibold text-slate-700">{req.project_title}</p>
                  </div>

                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                    <div className="text-xs text-slate-500">
                      <span className="font-bold text-slate-800">{formatDate(req.start_time)}</span>
                      <div className="font-mono text-[11px] text-slate-500">
                        {formatTimeRange(req.start_time, req.end_time)}
                      </div>
                    </div>
                    {req.priority_score !== null && (
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        Score: {req.priority_score}/100
                      </span>
                    )}
                  </div>
                </div>

                {/* Description & Capabilities */}
                <div className="space-y-2 text-xs">
                  <p className="text-slate-600 leading-relaxed">{req.project_description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-slate-400 font-semibold">Required:</span>
                    {req.required_capabilities.map(c => (
                      <span
                        key={c}
                        className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px]"
                      >
                        #{c}
                      </span>
                    ))}
                    <span className="text-slate-400 ml-2">
                      Deadline: <strong className="text-slate-700">{req.project_deadline}</strong>
                    </span>
                  </div>
                </div>

                {/* Reviewer Feedback Comment */}
                {req.reviewer_comment && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="font-bold text-slate-700 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
                      Faculty Reviewer Feedback ({req.reviewer_name || 'Department Reviewer'}):
                    </div>
                    <p className="text-slate-600 italic">"{req.reviewer_comment}"</p>
                  </div>
                )}

                {/* Conflict Alternatives if provided */}
                {req.alternatives && (
                  <AlternativesList alternatives={req.alternatives} />
                )}

                {/* Expandable Score Breakdown */}
                {isBreakdownOpen && req.score_breakdown && (
                  <div className="pt-2">
                    <ScoreBreakdownView breakdown={req.score_breakdown} />
                  </div>
                )}

                {/* Actions row */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {hasBreakdown ? (
                    <button
                      type="button"
                      onClick={() => setActiveBreakdown(isBreakdownOpen ? null : req.id)}
                      className="text-brand-600 hover:text-brand-800 font-bold flex items-center gap-1"
                    >
                      <Award className="w-3.5 h-3.5" />
                      {isBreakdownOpen ? 'Hide Score Breakdown' : 'View Priority Breakdown'}
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    {req.status === 'pending' || req.status === 'approved' ? (
                      <button
                        type="button"
                        onClick={() => handleCancel(req.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 font-bold transition-colors"
                      >
                        Cancel Reservation
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
