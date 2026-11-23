import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { BookingRequest } from '../../lib/types.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { formatDate, formatTimeRange } from '../../lib/format.js';
import { useAuth } from '../../auth/AuthContext.js';
import {
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  Filter,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

export const ReviewQueue: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchRequests = () => {
    setLoading(true);
    apiRequest<{ requests: BookingRequest[] }>(`/faculty/requests?status=${statusFilter}`)
      .then(res => setRequests(res.requests))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
            <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
            Faculty Review Queue • {user?.department_name || 'All Departments'}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Laboratory Access Decision Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review incoming research proposals, evaluate mathematical score breakdowns, and resolve competing resource demands.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl self-start sm:self-center">
          {['pending', 'approved', 'rejected', 'all'].map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table / Card List */}
      {loading ? (
        <div className="min-h-72 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="text-base font-bold text-slate-800">Review Queue Cleared</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            No requests matching filter "{statusFilter}".
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {requests.map(req => {
            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left meta */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {req.department_name || 'Department'}
                    </span>
                    <StatusBadge status={req.status} />
                    {req.priority_score !== null && (
                      <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                        Score: {req.priority_score}/100
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{req.project_title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <strong className="text-slate-700">{req.student_name}</strong> ({req.student_email})
                      <span>•</span>
                      <span className="font-semibold text-brand-700">{req.equipment_name}</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-1 max-w-2xl">
                    {req.project_description}
                  </p>
                </div>

                {/* Right timing & action */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-xs text-right">
                    <div className="font-bold text-slate-800">{formatDate(req.start_time)}</div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {formatTimeRange(req.start_time, req.end_time)}
                    </div>
                  </div>

                  <Link
                    to={`/review/${req.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
                  >
                    Review Cockpit
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
