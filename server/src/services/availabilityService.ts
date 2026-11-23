import { db } from '../db/connection.js';
import { LAB_HOURS } from '../domain/constants.js';
import { formatLocalIso, parseLocalIso } from '../domain/timeUtils.js';

export type SlotState = 'free' | 'contested' | 'booked' | 'past' | 'closed';

export interface ComputedSlot {
  time: string;           // "09:00"
  isoString: string;      // "2026-11-23T09:00"
  status: SlotState;
  confirmedBookings: number;
  pendingRequests: number;
  totalCapacity: number;
}

export function getEquipmentAvailability(equipmentId: number | string, dateStr: string): {
  equipmentId: number | string;
  date: string;
  isOpen: boolean;
  slots: ComputedSlot[];
} {
  const isNum = !isNaN(Number(equipmentId));
  const equip = db.prepare(`
    SELECT id, quantity, status FROM equipment WHERE ${isNum ? 'id = ?' : 'slug = ?'}
  `).get(isNum ? Number(equipmentId) : String(equipmentId)) as any;
  if (!equip) {
    throw new Error(`Equipment ${equipmentId} not found`);
  }
  const actualId = equip.id;

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();

  // Closed on Sunday (0) or if equipment is maintenance/retired
  if (dayOfWeek === 0 || equip.status !== 'active') {
    const slots: ComputedSlot[] = [];
    for (let h = LAB_HOURS.START_HOUR; h < LAB_HOURS.END_HOUR; h++) {
      for (let min = 0; min < 60; min += LAB_HOURS.SLOT_INTERVAL_MINUTES) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        slots.push({
          time: timeStr,
          isoString: `${dateStr}T${timeStr}`,
          status: 'closed',
          confirmedBookings: 0,
          pendingRequests: 0,
          totalCapacity: equip.quantity,
        });
      }
    }
    return {
      equipmentId,
      date: dateStr,
      isOpen: false,
      slots,
    };
  }

  // Fetch all approved and pending requests for this equipment on this day
  const dayStart = `${dateStr}T00:00`;
  const dayEnd = `${dateStr}T23:59`;

  const requests = db.prepare(`
    SELECT id, start_time, end_time, status
    FROM booking_requests
    WHERE equipment_id = ?
      AND status IN ('approved', 'pending')
      AND start_time < ?
      AND end_time > ?
  `).all(actualId, dayEnd, dayStart) as Array<{
    id: number;
    start_time: string;
    end_time: string;
    status: string;
  }>;

  const nowIso = formatLocalIso(new Date());

  const slots: ComputedSlot[] = [];

  for (let h = LAB_HOURS.START_HOUR; h < LAB_HOURS.END_HOUR; h++) {
    for (let min = 0; min < 60; min += LAB_HOURS.SLOT_INTERVAL_MINUTES) {
      const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const slotStartIso = `${dateStr}T${timeStr}`;

      // Calculate slot end time (+30 min)
      let endH = h;
      let endMin = min + LAB_HOURS.SLOT_INTERVAL_MINUTES;
      if (endMin >= 60) {
        endH += 1;
        endMin -= 60;
      }
      const slotEndIso = `${dateStr}T${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

      // Overlap counts
      let confirmedCount = 0;
      let pendingCount = 0;

      for (const req of requests) {
        if (req.start_time < slotEndIso && req.end_time > slotStartIso) {
          if (req.status === 'approved') {
            confirmedCount++;
          } else if (req.status === 'pending') {
            pendingCount++;
          }
        }
      }

      let state: SlotState = 'free';

      if (slotEndIso <= nowIso) {
        state = 'past';
      } else if (confirmedCount >= equip.quantity) {
        state = 'booked';
      } else if (pendingCount > 0) {
        state = 'contested';
      } else {
        state = 'free';
      }

      slots.push({
        time: timeStr,
        isoString: slotStartIso,
        status: state,
        confirmedBookings: confirmedCount,
        pendingRequests: pendingCount,
        totalCapacity: equip.quantity,
      });
    }
  }

  return {
    equipmentId,
    date: dateStr,
    isOpen: true,
    slots,
  };
}
