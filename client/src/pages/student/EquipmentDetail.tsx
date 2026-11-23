import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../../api/client.js';
import { Equipment, TimeSlot, EquipmentSpec, EquipmentCapability } from '../../lib/types.js';
import { SlotGrid } from '../../components/SlotGrid.js';
import { ImageWithFallback } from '../../components/ImageWithFallback.js';
import {
  MapPin,
  Clock,
  Layers,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export const EquipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    // Default to today or next weekday if Sunday
    if (today.getDay() === 0) {
      today.setDate(today.getDate() + 1);
    }
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
        const minM = res.equipment.min_session_minutes || 30;
        const maxM = res.equipment.max_session_minutes || 240;
        setDurationMinutes(Math.min(maxM, Math.max(minM, 120)));
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
        setSlots(res.slots || []);
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
      <div className="min-h-96 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-electric-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-slate-500">Loading instrument specifications...</span>
      </div>
    );
  }

  // Parse specifications
  const specsList: EquipmentSpec[] = Array.isArray(equipment.specs)
    ? equipment.specs
    : typeof equipment.specs === 'object' && equipment.specs !== null
    ? Object.entries(equipment.specs).map(([name, value]) => ({ name, value: String(value) }))
    : [];

  const capabilitiesList: EquipmentCapability[] = equipment.capabilities || [];
  const compatibleProjectsList = equipment.compatibleProjects || equipment.compatible_projects || [];
  const deptDisplay = equipment.department || equipment.department_name || equipment.departmentCode || 'Engineering';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link to="/discover" className="hover:text-electric-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Catalog
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-600">{equipment.category}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-semibold truncate max-w-xs">{equipment.name}</span>
      </nav>

      {/* Main Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Photograph & Visual Details (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white">
            <ImageWithFallback
              src={equipment.imageUrl}
              alt={equipment.imageAlt || equipment.name}
              category={equipment.category}
              containerClassName="aspect-[4/3]"
            />
            {equipment.imageCredit && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 italic">
                Photo credit: {equipment.imageCredit}
              </div>
            )}
          </div>

          {/* Location & Department Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-electric-600" />
              Laboratory & Facility
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 block">
                    {equipment.lab || 'Engineering Laboratory'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {equipment.location}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Department</span>
                <span className="font-semibold text-slate-800">{deptDisplay}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Active Capacity</span>
                <span className="font-semibold text-slate-800">{equipment.quantity} workstation(s)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Session Limits</span>
                <span className="font-semibold text-slate-800">
                  {equipment.min_session_minutes || 30} – {equipment.max_session_minutes || 240} mins
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Instrument Specifications & Info (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Title & Badges */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-electric-700 bg-electric-50 px-2.5 py-0.5 rounded-full border border-electric-200">
                {deptDisplay}
              </span>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                {equipment.category}
              </span>
              {equipment.isDemo && (
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Demo Equipment
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              {equipment.name}
            </h1>

            <p className="text-sm text-slate-700 leading-relaxed">
              {equipment.description}
            </p>
          </div>

          {/* Technical Specifications Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-electric-600" />
              Verified Technical Specifications
            </h3>
            {specsList.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {specsList.map((spec, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between gap-4">
                    <span className="text-slate-500 font-medium">{spec.name}</span>
                    <span className="font-semibold text-slate-900 text-right">{spec.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Standard specifications apply.</p>
            )}
          </div>

          {/* Supported Capabilities */}
          {capabilitiesList.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-ai-600" />
                Supported Hardware Capabilities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {capabilitiesList.map((cap, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">{cap.label || cap.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          cap.level === 'full'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {cap.level === 'full' ? 'Full Match' : 'Partial'}
                      </span>
                    </div>
                    {cap.limitation && (
                      <p className="text-[11px] text-amber-700 leading-snug">
                        Note: {cap.limitation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compatible Projects */}
          {compatibleProjectsList.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-slate-400">
                Recommended For Projects
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {compatibleProjectsList.map((proj, i) => (
                  <span
                    key={i}
                    className="text-xs font-medium bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200"
                  >
                    #{proj}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reservation & Time Slot Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-heading font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-electric-600" />
              Equipment Operating Schedule & Time Slots
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an available 30-minute start time. Operating hours: Monday to Saturday, 09:00 – 17:00.
            </p>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-3">
            <label htmlFor="slot-date" className="text-xs font-semibold text-slate-600">
              Reservation Date:
            </label>
            <input
              id="slot-date"
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-electric-500"
            />
          </div>
        </div>

        {/* Duration Selection */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-electric-600" />
            Requested Duration:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {[60, 120, 180, 240]
              .filter(
                m =>
                  m >= (equipment.min_session_minutes || 30) &&
                  m <= (equipment.max_session_minutes || 240)
              )
              .map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    durationMinutes === mins
                      ? 'bg-electric-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mins / 60} hr{mins > 60 ? 's' : ''} ({mins} mins)
                </button>
              ))}
          </div>
        </div>

        {/* Slot Grid Container */}
        {slotsLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-electric-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <SlotGrid
            slots={slots}
            selectedSlotTime={selectedSlot?.isoString}
            onSelectSlot={slot => setSelectedSlot(slot)}
            disabled={equipment.status === 'maintenance'}
          />
        )}

        {/* Action Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            {selectedSlot ? (
              <span className="font-semibold text-slate-900">
                Selected Start: {selectedDate} at {selectedSlot.time} ({durationMinutes} minutes)
              </span>
            ) : (
              <span>Please click on an available (green or amber) slot above to proceed.</span>
            )}
          </div>

          <button
            type="button"
            disabled={!selectedSlot || equipment.status === 'maintenance'}
            onClick={handleProceedToRequest}
            className={`px-6 py-2.5 rounded-xl font-heading font-semibold text-xs flex items-center gap-2 shadow-sm transition-all ${
              selectedSlot && equipment.status !== 'maintenance'
                ? 'bg-electric-600 hover:bg-electric-500 text-white shadow-electric-600/20 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Request Reservation
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
