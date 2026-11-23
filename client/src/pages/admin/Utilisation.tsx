import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client.js';
import { UtilisationData } from '../../lib/types.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Settings,
  Layers,
  Wrench,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface UtilisationResponse {
  summary: {
    totalEquipment: number;
    activeCount: number;
    maintenanceCount: number;
    averageUtilisation: number;
    underutilisedCount: number;
    oversubscribedCount: number;
  };
  equipment: UtilisationData[];
  underutilised: UtilisationData[];
  oversubscribed: UtilisationData[];
}

export const Utilisation: React.FC = () => {
  const [data, setData] = useState<UtilisationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchStats = () => {
    setLoading(true);
    apiRequest<UtilisationResponse>('/admin/utilisation?days=30')
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleToggleStatus = async (eq: UtilisationData) => {
    const nextStatus = eq.status === 'active' ? 'maintenance' : 'active';
    setUpdatingId(eq.equipmentId);
    try {
      await apiRequest(`/admin/equipment/${eq.equipmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Failed to update equipment status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { summary, equipment, underutilised, oversubscribed } = data;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          Campus Lab Administration & Resource Health
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Laboratory Utilisation & Equipment Governance
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          30-day empirical campus laboratory usage statistics, underutilised assets, and equipment status toggles.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Equipment
          </span>
          <div className="text-2xl font-black text-slate-900">{summary.totalEquipment}</div>
          <p className="text-[11px] text-slate-500">
            {summary.activeCount} active • {summary.maintenanceCount} in maintenance
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Avg 30-Day Utilisation
          </span>
          <div className="text-2xl font-black text-brand-600">{summary.averageUtilisation}%</div>
          <p className="text-[11px] text-slate-500">Across all open operating hours</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Underutilised (&lt;20%)
          </span>
          <div className="text-2xl font-black text-amber-600">{summary.underutilisedCount}</div>
          <p className="text-[11px] text-slate-500">Eligible for cross-dept sharing</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> High Contention
          </span>
          <div className="text-2xl font-black text-rose-600">{summary.oversubscribedCount}</div>
          <p className="text-[11px] text-slate-500">High conflicts / oversubscribed</p>
        </div>
      </div>

      {/* Alert Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Underutilised Alert Box */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-amber-900 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              Underutilised Resources (&lt;20% Usage)
            </h3>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              Sharing Opportunities
            </span>
          </div>

          <div className="space-y-3">
            {underutilised.map(u => (
              <div key={u.equipmentId} className="bg-white p-4 rounded-xl border border-amber-200/60 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{u.name}</h4>
                    <span className="text-[11px] text-slate-500">{u.department}</span>
                  </div>
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {u.utilisationPercent}% Utilisation
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  💡 <strong className="text-slate-800">Recommendation:</strong> {u.suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Oversubscribed Alert Box */}
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-rose-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              Over-Subscribed & Contested Equipment
            </h3>
            <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
              Bottlenecks
            </span>
          </div>

          <div className="space-y-3">
            {oversubscribed.map(o => (
              <div key={o.equipmentId} className="bg-white p-4 rounded-xl border border-rose-200/60 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{o.name}</h4>
                    <span className="text-[11px] text-slate-500">{o.department}</span>
                  </div>
                  <span className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {o.conflictedRequestsCount} Active Conflicts
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  ⚠️ <strong className="text-slate-800">Recommendation:</strong> {o.suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Equipment Governance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900">Laboratory Equipment Inventory & Status</h3>
            <p className="text-xs text-slate-500">
              Manage operating states and monitor 30-day booking volume.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Equipment</th>
                <th className="p-3">Department</th>
                <th className="p-3">Units</th>
                <th className="p-3">30-Day Utilisation</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipment.map(eq => {
                const isUpdating = updatingId === eq.equipmentId;
                return (
                  <tr key={eq.equipmentId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{eq.name}</div>
                      <div className="text-[11px] text-slate-400">{eq.category}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-700">{eq.department}</td>
                    <td className="p-3 font-semibold text-slate-700">{eq.quantity}</td>
                    <td className="p-3 w-48">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span>{eq.utilisationPercent}%</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {Math.round(eq.bookedMinutes / 60)} hrs booked
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            eq.utilisationPercent < 20
                              ? 'bg-amber-500'
                              : eq.utilisationPercent > 60
                              ? 'bg-rose-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, eq.utilisationPercent)}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={eq.status} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleStatus(eq)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          eq.status === 'active'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isUpdating
                          ? 'Updating...'
                          : eq.status === 'active'
                          ? 'Set Maintenance'
                          : 'Restore Active'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
