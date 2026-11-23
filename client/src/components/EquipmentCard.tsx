import React from 'react';
import { Link } from 'react-router-dom';
import { Equipment } from '../lib/types.js';
import { ImageWithFallback } from './ImageWithFallback.js';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Layers, MapPin, Sparkles } from 'lucide-react';

interface EquipmentCardProps {
  equipment: Equipment;
  highlightMatch?: boolean;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, highlightMatch = false }) => {
  const {
    id,
    slug,
    name,
    category,
    department,
    department_name,
    departmentCode,
    department_code,
    lab,
    location,
    description,
    specs = [],
    topSpecs = [],
    compatibleProjects = [],
    compatible_projects = [],
    status,
    nextFreeAt,
    imageUrl,
    imageAlt,
    isDemo,
    matchPercentage,
  } = equipment;

  const deptDisplay = department || department_name || departmentCode || department_code || 'Engineering';
  const targetId = slug || id;

  // Format top specs
  const displayedSpecs = Array.isArray(topSpecs) && topSpecs.length > 0
    ? topSpecs
    : Array.isArray(specs)
    ? specs.slice(0, 3)
    : typeof specs === 'object' && specs !== null
    ? Object.entries(specs).slice(0, 3).map(([name, value]) => ({ name, value: String(value) }))
    : [];

  const projects = (compatibleProjects.length > 0 ? compatibleProjects : compatible_projects).slice(0, 3);

  const renderStatusChip = () => {
    if (status === 'maintenance') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-500" />
          Maintenance
        </span>
      );
    }

    if (status === 'in_use') {
      let timeStr = '';
      if (nextFreeAt) {
        try {
          const date = new Date(nextFreeAt);
          timeStr = `until ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch {
          // ignore date parse error
        }
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-500" />
          In Use {timeStr}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        Available Now
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-electric-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group">
      <div>
        {/* Visual Equipment Photograph */}
        <div className="relative">
          <ImageWithFallback
            src={imageUrl}
            alt={imageAlt || name}
            category={category}
          />
          {/* Top Overlays */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-navy-950/80 backdrop-blur text-white px-2.5 py-0.5 rounded-full border border-white/10">
              {deptDisplay}
            </span>
            {isDemo && (
              <span className="text-[10px] font-semibold bg-electric-600/90 text-white px-2 py-0.5 rounded-full backdrop-blur shadow-sm">
                Verified
              </span>
            )}
          </div>

          <div className="absolute bottom-3 right-3">
            {renderStatusChip()}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3.5">
          {/* Category & Title */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-electric-600" />
                {category}
              </span>
              {matchPercentage !== undefined && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ai-700 bg-ai-50 px-2 py-0.5 rounded-full border border-ai-200">
                  <Sparkles className="w-3 h-3 text-ai-600" />
                  {matchPercentage}% Match
                </span>
              )}
            </div>
            <Link
              to={`/equipment/${targetId}`}
              className="block group-hover:text-electric-600 transition-colors"
            >
              <h3 className="font-heading font-bold text-slate-900 text-base leading-snug line-clamp-1">
                {name}
              </h3>
            </Link>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {description}
          </p>

          {/* Specifications Highlight Pills */}
          {displayedSpecs.length > 0 && (
            <div className="grid grid-cols-1 gap-1.5 py-1">
              {displayedSpecs.map((spec, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100"
                >
                  <span className="text-slate-500 font-medium truncate">{spec.name}</span>
                  <span className="font-semibold text-slate-800 shrink-0 ml-2">{spec.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Compatible Projects Tags */}
          {projects.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {projects.map((proj, i) => (
                <span
                  key={i}
                  className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                >
                  #{proj}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{lab || location}</span>
        </div>
        <Link
          to={`/equipment/${targetId}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-electric-600 hover:text-electric-700 shrink-0 group/btn"
        >
          Book
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
};
