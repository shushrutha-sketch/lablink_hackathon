import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { Equipment, TimeSlot } from '../../lib/types.js';
import { SlotGrid } from '../../components/SlotGrid.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { formatLocalDate, addDays } from '../../lib/format.js';
import {
  MapPin,
  Clock,
  Layers,
  Calendar,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';

export const EquipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
  });

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(120);

  // Load equipment detail
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiRequest<{ equipment: Equipment }>(`/equipment/${id}`)
      .then(res => {
        setEquipment(res.equipment);
        setDurationMinutes(Math.min(res.equipment.max_session_minutes, Math.max(res.equipment.min_session_minutes, 120)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Load availability slots for selected date
  useEffect(() => {
    if (!id || !selectedDate) return;
    setSlotsLoading(true);
    apiRequest<{ slots: TimeSlot[] }>(`/equipment/${id}/availability?date=${selectedDate}`)
      .then(res => {
        setSlots(res.slots);
        setSelectedSlot(null);
      })
      .catch(console.error)
      .finally(() => setSlotsLoading(false));
  }, [id, selectedDate]);

  const handleProceedToRequest = () => {
    if (!selectedSlot || !equipment) return;

    const startIso = selectedSlot.isoString;
    const [datePart, timePart] = startIso.split('T');
    const [sh, sm] = timePart.split(':').map(Number);
    const endTotalMin = sh * 60 + sm + durationMinutes;
    const eh = Math.floor(endTotalMin / 60);
    const em = endTotalMin % 60;
    const endIso = `${datePart}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

    navigate('/requests/new', {
      state: {
        prefillEquipmentId: equipment.id,
        prefillStartTime: startIso,
        prefillEndTime: endIso,
        prefillDurationMinutes: durationMinutes,
      },
    });
  };

  if (loading || !equipment) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const specKeys = Object.keys(equipment.specs || {});

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Catalog
      </button>

      {/* Equipment Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                {equipment.department_name}
              </span>
              <StatusBadge status={equipment.status} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {equipment.name}
            </h1>
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              {equipment.category}
              <span className="text-slate-300">•</span>
              <MapPin className="w-4 h-4 text-slate-400" />
              {equipment.location}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0 text-right space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Campus Capacity
            </span>
            <div className="text-xl font-black text-slate-900">
              {equipment.quantity} <span className="text-xs font-medium text-slate-500">unit(s)</span>
            </div>
            <span className="text-[11px] text-slate-500 block">
              {equipment.min_session_minutes} - {equipment.max_session_minutes} min limit
            </span>
          </div>
        </div>

        {/* Description & Specs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Instrument Description & Research Scope
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {equipment.description}
              </p>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Supported Technical Capabilities
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {equipment.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-brand-600" />
              Verified Laboratory Specs
            </h3>
            {specKeys.length > 0 ? (
              <dl className="space-y-2 text-xs">
                {specKeys.map(k => (
                  <div key={k} className="flex justify-between pb-1.5 border-b border-slate-200">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-bold text-slate-800 text-right">{equipment.specs[k]}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-slate-500">Standard specifications apply.</p>
            )}
          </div>
        </div>
      </div>

      {/* Intelligent Booking & Slot Grid Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              Equipment Operating Schedule & Time Slots
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lab hours: 09:00 to 17:00, Monday to Saturday. Slots in 30-minute steps.
            </p>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              min={formatLocalDate(new Date())}
              max={addDays(formatLocalDate(new Date()), 21)}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Slot Grid Component */}
        {slotsLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <SlotGrid
            slots={slots}
            selectedSlotTime={selectedSlot?.isoString || null}
            onSelectSlot={slot => setSelectedSlot(slot)}
          />
        )}

        {/* Selected Slot Action Box */}
        {selectedSlot && (
          <div className="bg-brand-50/70 border border-brand-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-800">
                Selected Starting Slot
              </span>
              <div className="text-lg font-black text-brand-950">
                {selectedDate} at {selectedSlot.time}
              </div>
              <p className="text-xs text-brand-700">
                {selectedSlot.status === 'contested'
                  ? '⚠️ Contested slot: competing requests exist. The Fair Allocation engine will rank submissions.'
                  : '✅ Clean open slot. High likelihood of rapid faculty confirmation.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span>Duration:</span>
                <select
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-800"
                >
                  <option value={30}>30 mins</option>
                  <option value={60}>1 hour (60 min)</option>
                  <option value={90}>1.5 hours (90 min)</option>
                  <option value={120}>2 hours (120 min)</option>
                  <option value={180}>3 hours (180 min)</option>
                  <option value={240}>4 hours (240 min)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleProceedToRequest}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors shrink-0"
              >
                Proceed to Request Form
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
