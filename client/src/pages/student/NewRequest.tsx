import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { Equipment, TimeSlot } from '../../lib/types.js';
import { AlternativesList } from '../../components/AlternativesList.js';
import { formatLocalDate, addDays } from '../../lib/format.js';
import {
  Calendar,
  Clock,
  Layers,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Send,
  HelpCircle,
} from 'lucide-react';

export const NewRequest: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as any) || {};

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [selectedEquipId, setSelectedEquipId] = useState<number>(state.prefillEquipmentId || 1);
  const [selectedEquip, setSelectedEquip] = useState<Equipment | null>(null);

  // Form Fields
  const [projectTitle, setProjectTitle] = useState(state.prefillTitle || '');
  const [projectDescription, setProjectDescription] = useState(state.prefillDescription || '');
  const [projectDeadline, setProjectDeadline] = useState(
    addDays(formatLocalDate(new Date()), 7)
  );

  const [date, setDate] = useState<string>(() => {
    if (state.prefillStartTime) return state.prefillStartTime.split('T')[0];
    return addDays(formatLocalDate(new Date()), 1);
  });

  const [startTime, setStartTime] = useState<string>(() => {
    if (state.prefillStartTime) return state.prefillStartTime.split('T')[1];
    return '10:00';
  });

  const [durationMinutes, setDurationMinutes] = useState<number>(() => {
    if (state.prefillDurationMinutes) return state.prefillDurationMinutes;
    if (state.prefillDurationHours) return Math.round(state.prefillDurationHours * 60);
    return 120;
  });

  const [capabilities, setCapabilities] = useState<string[]>(state.prefillCapabilities || []);
  const [tagInput, setTagInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string; alternatives?: any } | null>(
    null
  );

  // Load equipment list for dropdown
  useEffect(() => {
    apiRequest<{ items: Equipment[] }>('/equipment?pageSize=50')
      .then(res => {
        setEquipmentList(res.items);
        const current = res.items.find(e => e.id === selectedEquipId) || res.items[0];
        if (current) setSelectedEquip(current);
      })
      .catch(console.error);
  }, []);

  // Update selected equipment
  useEffect(() => {
    const current = equipmentList.find(e => e.id === selectedEquipId);
    if (current) {
      setSelectedEquip(current);
      if (capabilities.length === 0 && current.tags) {
        setCapabilities(current.tags.slice(0, 3));
      }
    }
  }, [selectedEquipId, equipmentList]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase();
      if (!capabilities.includes(val)) {
        setCapabilities([...capabilities, val]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setCapabilities(capabilities.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const startIso = `${date}T${startTime}`;
      const [sh, sm] = startTime.split(':').map(Number);
      const totalEndMin = sh * 60 + sm + durationMinutes;
      const eh = Math.floor(totalEndMin / 60);
      const em = totalEndMin % 60;
      const endIso = `${date}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

      await apiRequest('/requests', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: selectedEquipId,
          projectTitle,
          projectDescription,
          projectDeadline,
          startTime: startIso,
          endTime: endIso,
          requiredCapabilities: capabilities,
        }),
      });

      navigate('/requests', { state: { requestSuccess: true } });
    } catch (err: any) {
      setError({
        message: err.message || 'Failed to submit reservation request',
        code: err.code,
        alternatives: err.details,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Submit Laboratory Access Request
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Faculty review requests with explainable fair-share priority scoring. Overlapping requests are transparently resolved.
        </p>
      </div>

      {/* Error / Conflict Feedback */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            {error.code === 'SLOT_UNAVAILABLE'
              ? 'Slot Unavailable - Fully Booked'
              : 'Validation Error'}
          </div>
          <p className="text-xs text-rose-700">{error.message}</p>

          {error.alternatives && (
            <AlternativesList
              alternatives={error.alternatives}
              onSelectSlot={slot => {
                setDate(slot.date);
                setStartTime(slot.start_time.split('T')[1]);
                setError(null);
              }}
            />
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Equipment Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Target Laboratory Equipment
          </label>
          <select
            value={selectedEquipId}
            onChange={e => setSelectedEquipId(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          >
            {equipmentList.map(eq => (
              <option key={eq.id} value={eq.id}>
                {eq.name} ({eq.department_name} • {eq.location})
              </option>
            ))}
          </select>
        </div>

        {/* Project Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Project / Experiment Title
          </label>
          <input
            type="text"
            required
            value={projectTitle}
            onChange={e => setProjectTitle(e.target.value)}
            placeholder="e.g. Ultrasonic Transducer Signal Damping Characterization"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Project Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Technical Research Description & Justification
          </label>
          <textarea
            rows={4}
            required
            value={projectDescription}
            onChange={e => setProjectDescription(e.target.value)}
            placeholder="Describe the research objective, methodology, and why this specific equipment is required..."
            className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
          />
        </div>

        {/* Capability Tags */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Required Capability Tags (Feeds Suitability Scoring)
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {capabilities.map(cap => (
              <span
                key={cap}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200"
              >
                #{cap}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(cap)}
                  className="text-brand-400 hover:text-brand-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Type tag and press Enter (e.g. pytorch, oscilloscope, rf)..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Schedule & Timing Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          {/* Reservation Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Reservation Date
            </label>
            <input
              type="date"
              required
              value={date}
              min={formatLocalDate(new Date())}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Start Slot
            </label>
            <select
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'].map(
                t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Session Duration
            </label>
            <select
              value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              <option value={30}>30 mins</option>
              <option value={60}>1 hour (60 min)</option>
              <option value={90}>1.5 hours (90 min)</option>
              <option value={120}>2 hours (120 min)</option>
              <option value={180}>3 hours (180 min)</option>
              <option value={240}>4 hours (240 min)</option>
            </select>
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Project Submission Deadline (Determines Urgency Score)
          </label>
          <input
            type="date"
            required
            value={projectDeadline}
            min={date}
            onChange={e => setProjectDeadline(e.target.value)}
            className="w-full sm:w-1/2 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Closer deadlines receive higher urgency priority in contested time slots.
          </p>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Submit Reservation Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
