import React from 'react';
import { TimeSlot } from '../lib/types.js';
import { Clock, AlertCircle, Check, X, ShieldAlert } from 'lucide-react';

interface SlotGridProps {
  slots: TimeSlot[];
  selectedSlotTime?: string | null;
  onSelectSlot: (slot: TimeSlot) => void;
  disabled?: boolean;
}

export const SlotGrid: React.FC<SlotGridProps> = ({
  slots,
  selectedSlotTime,
  onSelectSlot,
  disabled = false,
}) => {
  // Group slots by hour (e.g. "09:00", "10:00" etc.)
  const groupedSlots = slots.reduce<Record<string, TimeSlot[]>>((acc, slot) => {
    const hour = slot.time.split(':')[0] + ':00';
    if (!acc[hour]) acc[hour] = [];
    acc[hour].push(slot);
    return acc;
  }, {});

  const getSlotStyle = (slot: TimeSlot, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-brand-600 text-white border-brand-600 ring-2 ring-brand-300 ring-offset-1 font-semibold shadow-sm';
    }

    switch (slot.status) {
      case 'free':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 cursor-pointer';
      case 'contested':
        return 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 cursor-pointer ring-1 ring-amber-400/40';
      case 'booked':
        return 'bg-rose-50 text-rose-500 border-rose-200 opacity-70 cursor-not-allowed line-through';
      case 'past':
        return 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed';
      case 'closed':
        return 'bg-slate-100 text-slate-400 border-dashed border-slate-300 cursor-not-allowed';
      default:
        return 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
    }
  };

  const getStatusBadge = (slot: TimeSlot) => {
    switch (slot.status) {
      case 'free':
        return <span className="text-[10px] font-medium text-emerald-700">Available</span>;
      case 'contested':
        return (
          <span className="text-[10px] font-semibold text-amber-700 flex items-center gap-0.5">
            <AlertCircle className="w-2.5 h-2.5" /> Contested ({slot.pendingRequests})
          </span>
        );
      case 'booked':
        return <span className="text-[10px] font-medium text-rose-600">Full</span>;
      case 'past':
        return <span className="text-[10px] text-slate-400">Past</span>;
      case 'closed':
        return <span className="text-[10px] text-slate-400">Closed</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
          <span className="text-slate-600 font-medium">Free (Open slot)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400 ring-1 ring-amber-400/50" />
          <span className="text-slate-600 font-medium">Contested (Pending requests exist)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />
          <span className="text-slate-600 font-medium">Booked (Units full)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-200 border border-slate-300" />
          <span className="text-slate-600 font-medium">Past / Closed</span>
        </div>
      </div>

      {/* Grid by hour */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-2.5">
        {slots.map(slot => {
          const isSelected = selectedSlotTime === slot.isoString;
          const isClickable = !disabled && (slot.status === 'free' || slot.status === 'contested');

          return (
            <button
              key={slot.isoString}
              type="button"
              disabled={!isClickable}
              onClick={() => onSelectSlot(slot)}
              aria-label={`Slot at ${slot.time}, Status: ${slot.status}`}
              className={`p-2.5 rounded-lg border transition-all text-left flex flex-col justify-between h-18 ${getSlotStyle(
                slot,
                isSelected
              )}`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-bold tracking-tight">{slot.time}</span>
                {isSelected ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <Clock className="w-3 h-3 opacity-40" />
                )}
              </div>
              <div className="mt-1">
                {isSelected ? (
                  <span className="text-[11px] font-semibold text-white/90">Selected</span>
                ) : (
                  getStatusBadge(slot)
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
