import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.js';
import { Equipment, BookingRequest } from '../../lib/types.js';
import { ImageWithFallback } from '../../components/ImageWithFallback.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import {
  Compass,
  Sparkles,
  CalendarCheck,
  Clock,
  ArrowRight,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Plus,
  Send,
  Zap,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [featuredEquipment, setFeaturedEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickPrompt, setQuickPrompt] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiRequest<{ requests: BookingRequest[] }>('/requests/mine').catch(() => ({ requests: [] })),
      apiRequest<{ items: Equipment[] }>('/equipment?pageSize=4').catch(() => ({ items: [] })),
    ])
      .then(([reqRes, eqRes]) => {
        setRequests(reqRes.requests || []);
        setFeaturedEquipment(eqRes.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const approvedRequests = requests.filter(r => r.status === 'approved');
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const changesRequests = requests.filter(r => r.status === 'changes_requested');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const handleQuickAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    navigate('/assistant', { state: { prefillPrompt: quickPrompt } });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border border-navy-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-electric-600/30 text-electric-300 border border-electric-500/30 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-electric-400" />
              Welcome back, {user?.name || 'Student'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-white">
              Student Laboratory Dashboard
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Explore 14 verified university laboratory instruments, match research requirements using AI, and manage your access reservations with transparent fair allocation tracking.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              to="/discover"
              className="px-4 py-2.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-heading font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4" />
              Browse Equipment
            </Link>
            <Link
              to="/requests/new"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-heading font-semibold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Reservation
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-slate-400">
            Approved Bookings
          </span>
          <div className="text-2xl font-heading font-black text-slate-900">{approvedRequests.length}</div>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Confirmed laboratory access
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-slate-400">
            Pending Queue
          </span>
          <div className="text-2xl font-heading font-black text-slate-900">{pendingRequests.length}</div>
          <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Under faculty fair review
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-slate-400">
            Modifications Needed
          </span>
          <div className="text-2xl font-heading font-black text-slate-900">{changesRequests.length}</div>
          <p className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Instructions from faculty
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-slate-400">
            Rejected / Terminated
          </span>
          <div className="text-2xl font-heading font-black text-slate-900">{rejectedRequests.length}</div>
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> With substitute options
          </p>
        </div>
      </div>

      {/* AI Project Matchmaker Quick Input */}
      <div className="bg-gradient-to-r from-ai-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-ai-300" />
          <h2 className="font-heading font-bold text-base text-white">
            What are you prototyping today?
          </h2>
        </div>
        <form onSubmit={handleQuickAssistant} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={quickPrompt}
            onChange={e => setQuickPrompt(e.target.value)}
            placeholder="e.g. Smart agriculture IoT sensor node with ESP32 and cloud dashboard..."
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-ai-400 focus:bg-white/20 transition-all"
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-ai-500 hover:bg-ai-400 text-white font-heading font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
          >
            Match Equipment
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Recent Requests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading font-bold text-slate-900 tracking-tight">
            Your Active Reservations & Requests
          </h3>
          <Link
            to="/requests"
            className="text-xs font-semibold text-electric-600 hover:text-electric-700 flex items-center gap-1"
          >
            View All ({requests.length})
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <div className="w-6 h-6 border-3 border-electric-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
            <CalendarCheck className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No active reservation requests</p>
            <p className="text-xs text-slate-500">Search the equipment catalogue to submit your first laboratory access request.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.slice(0, 4).map(req => (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-electric-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {req.department_name || 'Engineering'}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <h4 className="font-heading font-bold text-slate-900 text-sm line-clamp-1">
                    {req.project_title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Instrument: <strong className="text-slate-800">{req.equipment_name}</strong>
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {req.start_time.replace('T', ' ')}
                  </p>
                </div>

                {/* Faculty review comment if present */}
                {req.reviewer_comment && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Faculty Feedback ({req.reviewer_name || 'Reviewer'}):
                    </span>
                    <p className="text-slate-700 text-[11px] italic">"{req.reviewer_comment}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Equipment Discovery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-heading font-bold text-slate-900 tracking-tight">
              Featured Campus Hardware
            </h3>
            <p className="text-xs text-slate-500">Verified laboratory instruments available for student research</p>
          </div>
          <Link
            to="/discover"
            className="text-xs font-semibold text-electric-600 hover:text-electric-700 flex items-center gap-1"
          >
            Explore All 14
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredEquipment.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:border-electric-300 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <ImageWithFallback
                  src={item.imageUrl}
                  alt={item.imageAlt || item.name}
                  category={item.category}
                  containerClassName="aspect-[4/3]"
                />
                <div className="p-4 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-electric-700 bg-electric-50 px-2 py-0.5 rounded-full border border-electric-200">
                    {item.category}
                  </span>
                  <h4 className="font-heading font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-electric-600 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {item.location}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <Link
                  to={`/equipment/${item.slug || item.id}`}
                  className="text-xs font-semibold text-electric-600 hover:text-electric-700 flex items-center gap-1"
                >
                  Book Slot
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
