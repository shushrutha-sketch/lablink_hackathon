import React from 'react';
import { Calendar, Laptop, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatTimeRange, formatDate } from '../lib/format.js';

interface AlternativeSlot {
  date: string;
  start_time: string;
  end_time: string;
}

interface AlternativeEquipment {
  id: number;
  name: string;
  category: string;
  department_name: string;
  location: string;
  matchPercentage: number;
}

interface AlternativesListProps {
  alternatives: {
    alternativeSlots?: AlternativeSlot[];
    alternativeEquipment?: AlternativeEquipment[];
  };
  onSelectSlot?: (slot: AlternativeSlot) => void;
  className?: string;
}

export const AlternativesList: React.FC<AlternativesListProps> = ({
  alternatives,
  onSelectSlot,
  className = '',
}) => {
  const { alternativeSlots = [], alternativeEquipment = [] } = alternatives;

  if (alternativeSlots.length === 0 && alternativeEquipment.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-br from-indigo-50/60 to-brand-50/60 rounded-xl border border-indigo-100 p-5 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brand-600" />
          Recommended Scheduling & Resource Alternatives
        </h4>
        <span className="text-xs font-semibold text-brand-700 bg-brand-100/60 px-2 py-0.5 rounded-full">
          Conflict Resolution
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Alternative Time Slots */}
        {alternativeSlots.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Open Time Slots (Same Equipment)
            </span>
            <div className="space-y-1.5">
              {alternativeSlots.map((slot, idx) => (
                <div
                  key={idx}
                  className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-brand-300 transition-colors shadow-2xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{formatDate(slot.date)}</div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {formatTimeRange(slot.start_time, slot.end_time)}
                    </div>
                  </div>
                  {onSelectSlot && (
                    <button
                      type="button"
                      onClick={() => onSelectSlot(slot)}
                      className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded text-xs transition-colors"
                    >
                      Use Slot
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternative Equipment */}
        {alternativeEquipment.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-brand-600" />
              Compatible Campus Equipment
            </span>
            <div className="space-y-1.5">
              {alternativeEquipment.map((eq, idx) => (
                <div
                  key={idx}
                  className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-brand-300 transition-colors shadow-2xs"
                >
                  <div className="max-w-[70%]">
                    <div className="font-semibold text-slate-800 truncate">{eq.name}</div>
                    <div className="text-slate-500 text-[11px] truncate">
                      {eq.department_name} • {eq.location}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {eq.matchPercentage}% match
                    </span>
                    <Link
                      to={`/equipment/${eq.id}`}
                      className="p-1 text-slate-400 hover:text-brand-600 rounded transition-colors"
                      title="View Equipment"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
