import { db } from '../db/connection.js';
import { getDurationMinutes } from '../domain/timeUtils.js';
import { UTILISATION_THRESHOLDS } from '../domain/constants.js';

export interface EquipmentUtilisationReport {
  equipmentId: number;
  name: string;
  category: string;
  department: string;
  quantity: number;
  status: 'active' | 'maintenance' | 'retired';
  totalOpenMinutes: number;
  bookedMinutes: number;
  utilisationPercent: number;
  totalBookings: number;
  conflictedRequestsCount: number;
  isUnderutilised: boolean;
  isOversubscribed: boolean;
  suggestion: string;
}

export function get30DayUtilisationStats(): {
  summary: {
    totalEquipment: number;
    activeCount: number;
    maintenanceCount: number;
    averageUtilisation: number;
    underutilisedCount: number;
    oversubscribedCount: number;
  };
  equipment: EquipmentUtilisationReport[];
  underutilised: EquipmentUtilisationReport[];
  oversubscribed: EquipmentUtilisationReport[];
} {
  const equips = db.prepare(`
    SELECT e.id, e.name, e.category, e.quantity, e.status, d.name as department_name
    FROM equipment e
    JOIN departments d ON e.department_id = d.id
    ORDER BY e.id ASC
  `).all() as any[];

  // 30 days = 26 open days * 8 hours/day * 60 mins = 12,480 mins per unit
  const OPEN_MINUTES_PER_UNIT_30_DAYS = 26 * 8 * 60; // 12,480 minutes

  // Fetch all approved requests in the past 30 days
  const approvedRequests = db.prepare(`
    SELECT equipment_id, start_time, end_time
    FROM booking_requests
    WHERE status = 'approved'
      AND datetime(start_time) >= datetime('now', '-30 days')
  `).all() as Array<{ equipment_id: number; start_time: string; end_time: string }>;

  // Fetch all pending requests to evaluate conflict volume
  const pendingRequests = db.prepare(`
    SELECT r1.equipment_id
    FROM booking_requests r1
    JOIN booking_requests r2 ON r1.equipment_id = r2.equipment_id AND r1.id != r2.id
    WHERE r1.status = 'pending'
      AND r1.start_time < r2.end_time AND r1.end_time > r2.start_time
  `).all() as Array<{ equipment_id: number }>;

  const bookedMinutesMap: Record<number, number> = {};
  const bookingCountMap: Record<number, number> = {};
  for (const req of approvedRequests) {
    const mins = getDurationMinutes(req.start_time, req.end_time);
    bookedMinutesMap[req.equipment_id] = (bookedMinutesMap[req.equipment_id] || 0) + mins;
    bookingCountMap[req.equipment_id] = (bookingCountMap[req.equipment_id] || 0) + 1;
  }

  const conflictCountMap: Record<number, number> = {};
  for (const c of pendingRequests) {
    conflictCountMap[c.equipment_id] = (conflictCountMap[c.equipment_id] || 0) + 1;
  }

  const reports: EquipmentUtilisationReport[] = [];
  let sumUtilisation = 0;

  for (const eq of equips) {
    const totalOpenMinutes = eq.quantity * OPEN_MINUTES_PER_UNIT_30_DAYS;
    const bookedMinutes = bookedMinutesMap[eq.id] || 0;
    const bookings = bookingCountMap[eq.id] || 0;
    const conflicts = conflictCountMap[eq.id] || 0;

    const utilisationPercent = Math.min(100, Math.round((bookedMinutes / totalOpenMinutes) * 100));
    sumUtilisation += utilisationPercent;

    const isUnderutilised = eq.status === 'active' && utilisationPercent < UTILISATION_THRESHOLDS.UNDERUTILISED_PERCENT;
    const isOversubscribed = utilisationPercent >= UTILISATION_THRESHOLDS.OVERSUBSCRIBED_PERCENT || conflicts >= 2;

    let suggestion = 'Operating at steady campus capacity.';
    if (eq.status === 'maintenance') {
      suggestion = 'Scheduled maintenance in progress. Monitor repair ticket turnaround.';
    } else if (isUnderutilised) {
      suggestion = `Underutilized (${utilisationPercent}%). Recommend organizing a cross-departmental workshop or advertising availability to ECE & Bio students.`;
    } else if (isOversubscribed) {
      suggestion = `High demand contention (${conflicts} pending conflict(s), ${utilisationPercent}% usage). Consider purchasing an additional unit or tightening maximum session duration.`;
    }

    reports.push({
      equipmentId: eq.id,
      name: eq.name,
      category: eq.category,
      department: eq.department_name,
      quantity: eq.quantity,
      status: eq.status,
      totalOpenMinutes,
      bookedMinutes,
      utilisationPercent,
      totalBookings: bookings,
      conflictedRequestsCount: conflicts,
      isUnderutilised,
      isOversubscribed,
      suggestion,
    });
  }

  const underutilised = reports.filter(r => r.isUnderutilised);
  const oversubscribed = reports.filter(r => r.isOversubscribed);

  return {
    summary: {
      totalEquipment: equips.length,
      activeCount: equips.filter(e => e.status === 'active').length,
      maintenanceCount: equips.filter(e => e.status === 'maintenance').length,
      averageUtilisation: equips.length > 0 ? Math.round(sumUtilisation / equips.length) : 0,
      underutilisedCount: underutilised.length,
      oversubscribedCount: oversubscribed.length,
    },
    equipment: reports,
    underutilised,
    oversubscribed,
  };
}
