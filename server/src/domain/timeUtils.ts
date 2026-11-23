/**
 * Campus-local ISO time utilities
 * All times stored as campus-local ISO strings (YYYY-MM-DDTHH:mm)
 */

export function parseLocalIso(isoString: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dateStr: string;
  timeStr: string;
} {
  const [dateStr, timeStr = '00:00'] = isoString.split('T');
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return { year, month, day, hour, minute, dateStr, timeStr };
}

export function formatLocalIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

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

export function getDurationMinutes(startTimeIso: string, endTimeIso: string): number {
  const start = new Date(startTimeIso.replace('T', ' '));
  const end = new Date(endTimeIso.replace('T', ' '));
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60)));
}

export function getDaysUntil(targetDateStr: string, fromDateStr?: string): number {
  const from = fromDateStr ? new Date(fromDateStr.split('T')[0]) : new Date();
  const target = new Date(targetDateStr.split('T')[0]);
  const diffTime = target.getTime() - from.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isWithinLabHours(startIso: string, endIso: string): boolean {
  const { hour: startHour, minute: startMin, dateStr } = parseLocalIso(startIso);
  const { hour: endHour, minute: endMin } = parseLocalIso(endIso);

  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday

  // Sunday is closed
  if (dayOfWeek === 0) return false;

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const openMinutes = 9 * 60;   // 09:00
  const closeMinutes = 17 * 60; // 17:00

  return startMinutes >= openMinutes && endMinutes <= closeMinutes && endMinutes > startMinutes;
}
