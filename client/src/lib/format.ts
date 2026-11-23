/**
 * Formatting and helper functions for LabLink
 */

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return formatLocalDate(date);
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('T')[0].split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const [datePart, timePart] = isoString.split('T');
  const [year, month, day] = datePart.split('-');
  const [hour, minute] = timePart.split(':');
  
  const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timePart}`;
}

export function formatTimeRange(startIso: string, endIso: string): string {
  if (!startIso || !endIso) return '';
  const [, startTime] = startIso.split('T');
  const [, endTime] = endIso.split('T');
  return `${startTime} - ${endTime}`;
}

export function getStatusColor(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'approved':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'pending':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'rejected':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    case 'changes_requested':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    case 'cancelled':
      return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
    case 'active':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'maintenance':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'retired':
      return { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
  }
}

export function formatStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending Review';
    case 'approved':
      return 'Confirmed / Approved';
    case 'rejected':
      return 'Rejected';
    case 'changes_requested':
      return 'Changes Requested';
    case 'cancelled':
      return 'Cancelled';
    case 'active':
      return 'Active';
    case 'maintenance':
      return 'Maintenance';
    case 'retired':
      return 'Retired';
    default:
      return status;
  }
}
