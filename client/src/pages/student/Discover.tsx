import React, { useState, useEffect, useTransition } from 'react';
import { apiRequest } from '../../api/client.js';
import { Equipment, Department } from '../../lib/types.js';
import { EquipmentCard } from '../../components/EquipmentCard.js';
import { Search, Sparkles, X, SlidersHorizontal, CheckCircle2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Discover: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [availableNowOnly, setAvailableNowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load filter metadata
  useEffect(() => {
    apiRequest<{ departments: Department[]; categories: string[] }>('/meta/filters')
      .then(res => {
        setDepartments(res.departments || []);
        setCategories(res.categories || ['Electronics', 'IoT', 'Robotics', 'Computing']);
      })
      .catch(console.error);
  }, []);

  // Fetch equipment list
  const fetchEquipment = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '12',
    });
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (selectedDept) params.set('departmentId', selectedDept);
    if (selectedCategory) params.set('category', selectedCategory);
    if (availableNowOnly) params.set('availableNow', 'true');

    apiRequest<{ items: Equipment[]; totalPages?: number; total: number }>(
      `/equipment?${params.toString()}`
    )
      .then(res => {
        setEquipment(res.items || []);
        setTotalPages(res.totalPages || 1);
        setTotalCount(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEquipment();
  }, [page, debouncedSearch, selectedDept, selectedCategory, availableNowOnly]);

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedDept('');
    setSelectedCategory('');
    setAvailableNowOnly(false);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() || selectedDept || selectedCategory || availableNowOnly
  );

  return (
    <div className="space-y-6">
      {/* Circuit-Trace Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border border-navy-800 text-white p-6 sm:p-8 shadow-xl">
        {/* Subtle Circuit SVG Pattern Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <pattern id="circuit-pattern" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M10 10 L40 10 L50 20 L90 20 M50 20 L50 60 L60 70 L90 70 M20 90 L20 50 L30 40 L80 40" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="3" fill="currentColor" />
              <circle cx="90" cy="20" r="3" fill="currentColor" />
              <circle cx="90" cy="70" r="3" fill="currentColor" />
              <circle cx="20" cy="90" r="3" fill="currentColor" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#circuit-pattern)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-electric-600/30 text-electric-300 border border-electric-500/30 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-electric-400" />
              Verified Campus Hardware Inventory
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-white">
              Visual Equipment Explorer
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Explore 14 verified university laboratory resources across ECE, Mechanical, and Computer Science. View real hardware photographs, live instrument availability, and book verified time slots.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              to="/assistant"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-ai-600 to-indigo-600 hover:from-ai-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-ai-900/30 transition-all flex items-center justify-center gap-2 group"
            >
              <Sparkles className="w-4 h-4 text-ai-200 group-hover:rotate-12 transition-transform" />
              AI Project Matchmaker
            </Link>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Top Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by instrument name, specs, keywords (e.g. oscilloscope, 100MHz, ESP32, FPGA)..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Available Now Toggle Switch */}
          <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 transition-colors select-none">
            <input
              type="checkbox"
              checked={availableNowOnly}
              onChange={e => {
                setAvailableNowOnly(e.target.checked);
                setPage(1);
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className={`w-3.5 h-3.5 ${availableNowOnly ? 'text-emerald-600' : 'text-slate-400'}`} />
              Available Now Only
            </span>
          </label>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
          {/* Department Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Department:</span>
            <button
              onClick={() => { setSelectedDept(''); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedDept === ''
                  ? 'bg-navy-950 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {departments.map(d => (
              <button
                key={d.id}
                onClick={() => { setSelectedDept(d.code); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedDept === d.code
                    ? 'bg-electric-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d.code}
              </button>
            ))}
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Category:</span>
            <button
              onClick={() => { setSelectedCategory(''); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === ''
                  ? 'bg-navy-950 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => { setSelectedCategory(c); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedCategory.toLowerCase() === c.toLowerCase()
                    ? 'bg-navy-900 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-900">{equipment.length}</strong> of{' '}
          <strong className="text-slate-900">{totalCount}</strong> laboratory resources
        </span>
        {hasActiveFilters && (
          <span className="text-electric-600 font-medium">Filtered results</span>
        )}
      </div>

      {/* Equipment Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-pulse">
              <div className="aspect-[4/3] bg-slate-200 rounded-xl" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="space-y-2 pt-2">
                <div className="h-2.5 bg-slate-100 rounded" />
                <div className="h-2.5 bg-slate-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : equipment.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <SlidersHorizontal className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-bold text-slate-800 text-lg">No equipment found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            We couldn't find any laboratory resources matching your current search and filter criteria.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map(item => (
            <EquipmentCard key={item.id} equipment={item} />
          ))}
        </div>
      )}
    </div>
  );
};
