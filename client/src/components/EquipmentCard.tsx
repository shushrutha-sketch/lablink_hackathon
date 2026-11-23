import React from 'react';
import { Link } from 'react-router-dom';
import { Equipment } from '../lib/types.js';
import { StatusBadge } from './StatusBadge.js';
import { MapPin, Layers, Clock, Cpu, ArrowRight } from 'lucide-react';

interface EquipmentCardProps {
  equipment: Equipment;
  highlightMatch?: boolean;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, highlightMatch = false }) => {
  const {
    id,
    name,
    category,
    department_name,
    location,
    description,
    tags = [],
    specs = {},
    quantity,
    min_session_minutes,
    max_session_minutes,
    status,
    matchPercentage,
  } = equipment;

  const specKeys = Object.keys(specs).slice(0, 2);

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      <div className="p-5 space-y-3">
        {/* Top badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
            {department_name || 'Engineering'}
          </span>
          <div className="flex items-center gap-2">
            {matchPercentage !== undefined && (
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {matchPercentage}% Match
              </span>
            )}
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Title & Category */}
        <div>
          <h3 className="font-bold text-slate-900 text-base group-hover:text-brand-600 transition-colors line-clamp-2">
            {name}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-slate-400" />
            {category}
          </p>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Specs highlight */}
        {specKeys.length > 0 && (
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            {specKeys.map(k => (
              <div key={k} className="truncate">
                <span className="text-slate-400 font-medium">{k}: </span>
                <span className="font-semibold text-slate-700">{specs[k]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
            >
              #{tag}
            </span>
          ))}
          {tags.length > 4 && (
            <span className="text-[10px] text-slate-400 px-1 py-0.5">
              +{tags.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex flex-col gap-0.5 text-slate-500">
          <span className="flex items-center gap-1 text-[11px] truncate max-w-[150px]">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            {location}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            {min_session_minutes}-{max_session_minutes} min sessions • {quantity} unit(s)
          </span>
        </div>

        <Link
          to={`/equipment/${id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
        >
          View & Book
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
