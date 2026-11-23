import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import { Equipment, Department } from '../../lib/types.js';
import { EquipmentCard } from '../../components/EquipmentCard.js';
import { Search, Filter, Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Discover: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [q, setQ] = useState('');
  const [selectedDept, setSelectedDept] = useState<number | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Load filter metadata
  useEffect(() => {
    apiRequest<{ departments: Department[]; categories: string[] }>('/meta/filters')
      .then(res => {
        setDepartments(res.departments);
        setCategories(res.categories);
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
    if (q) params.set('q', q);
    if (selectedDept) params.set('departmentId', String(selectedDept));
    if (selectedCategory) params.set('category', selectedCategory);

    apiRequest<{ items: Equipment[]; pagination: { totalPages: number; total: number } }>(
      `/equipment?${params.toString()}`
    )
      .then(res => {
        setEquipment(res.items);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEquipment();
  }, [page, selectedDept, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEquipment();
  };

  const clearFilters = () => {
    setQ('');
    setSelectedDept(undefined);
    setSelectedCategory('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white/90 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            Campus-Wide Equipment Sharing
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Laboratory Resource Catalog
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Search, discover, and reserve specialized scientific equipment, FPGA kits, GPU nodes, and 3D printers across all campus engineering departments.
          </p>
        </div>

        <Link
          to="/assistant"
          className="shrink-0 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 group"
        >
          <Sparkles className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
          Try AI Project Matcher
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search equipment by name, capability tag, or location (e.g. oscilloscope, pytorch, cleanroom)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
            >
              Search
            </button>
          </div>
        </form>

        {/* Department Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Dept:
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedDept(undefined);
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              selectedDept === undefined
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Departments
          </button>
          {departments.map(d => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setSelectedDept(d.id);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedDept === d.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d.code}
            </button>
          ))}

          {(q || selectedDept || selectedCategory) && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>
          Showing <span className="font-bold text-slate-800">{equipment.length}</span> of{' '}
          <span className="font-bold text-slate-800">{totalCount}</span> campus resources
        </span>
        {totalPages > 1 && (
          <span>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Equipment Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-xl bg-white border border-slate-200 p-5 animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-4/5" />
                <div className="h-16 bg-slate-100 rounded" />
              </div>
              <div className="h-8 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : equipment.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <p className="text-base font-bold text-slate-700">No laboratory resources found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords or switching departments to find available instruments.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {equipment.map(eq => (
            <EquipmentCard key={eq.id} equipment={eq} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-xs font-bold text-slate-700 px-3">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      )}
    </div>
  );
};
