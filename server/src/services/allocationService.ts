import { db } from '../db/connection.js';
import { BookingRequestRow, EquipmentRow } from '../domain/types.js';
import { calculatePriorityScore } from './scoringService.js';
import { getDurationMinutes, getDaysUntil, addDays } from '../domain/timeUtils.js';
import { getEquipmentAvailability } from './availabilityService.js';

export interface AlternativeSlot {
  date: string;
  start_time: string;
  end_time: string;
}

export interface AlternativeEquipment {
  id: number;
  name: string;
  category: string;
  department_name: string;
  location: string;
  matchPercentage: number;
}

export interface AllocationAnalysis {
  conflicts: boolean;
  totalCompetitors: number;
  winnerRequestId: number | null;
  competitors: Array<{
    request: any;
    score: number;
    breakdown: any;
    isWinner: boolean;
  }>;
  alternatives: {
    alternativeSlots: AlternativeSlot[];
    alternativeEquipment: AlternativeEquipment[];
  };
  explanation: string;
  explanationSource: 'gemini' | 'rule_based';
}

export function analyzeRequestAllocation(requestId: number): AllocationAnalysis {
  const req = db.prepare(`
    SELECT r.*, u.name as student_name, u.email as student_email, e.name as equipment_name,
           e.category as equipment_category, e.tags as equipment_tags, e.quantity as equipment_quantity,
           e.min_session_minutes, e.max_session_minutes, d.name as department_name
    FROM booking_requests r
    JOIN users u ON r.student_id = u.id
    JOIN equipment e ON r.equipment_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE r.id = ?
  `).get(requestId) as any;

  if (!req) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Request not found' };
  }

  // Find all competing pending requests for this equipment that overlap in time
  const competingRows = db.prepare(`
    SELECT r.*, u.name as student_name, u.email as student_email, e.name as equipment_name,
           e.category as equipment_category, e.tags as equipment_tags, e.quantity as equipment_quantity,
           e.min_session_minutes, e.max_session_minutes, d.name as department_name
    FROM booking_requests r
    JOIN users u ON r.student_id = u.id
    JOIN equipment e ON r.equipment_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE r.equipment_id = ?
      AND r.status = 'pending'
      AND r.start_time < ?
      AND r.end_time > ?
    ORDER BY r.created_at ASC
  `).all(req.equipment_id, req.end_time, req.start_time) as any[];

  // Also include the primary request if not in list
  if (!competingRows.some(r => r.id === req.id)) {
    competingRows.push(req);
  }

  // Score each competitor dynamically
  const scoredCompetitors = competingRows.map(c => {
    // calculate past hours
    const pastBookings = db.prepare(`
      SELECT start_time, end_time
      FROM booking_requests
      WHERE student_id = ?
        AND status = 'approved'
        AND datetime(start_time) >= datetime('now', '-30 days')
    `).all(c.student_id) as Array<{ start_time: string; end_time: string }>;

    let pastMinutes = 0;
    for (const b of pastBookings) {
      pastMinutes += getDurationMinutes(b.start_time, b.end_time);
    }
    const pastHours = Math.round((pastMinutes / 60) * 10) / 10;
    const deadlineDays = getDaysUntil(c.project_deadline, c.start_time);
    const duration = getDurationMinutes(c.start_time, c.end_time);

    const equipTags: string[] = JSON.parse(c.equipment_tags || '[]');
    const requiredCaps: string[] = JSON.parse(c.required_capabilities || '[]');

    const breakdown = calculatePriorityScore({
      deadlineDays,
      requiredCapabilities: requiredCaps,
      equipmentTags: equipTags,
      pastAllocatedHours: pastHours,
      durationMinutes: duration,
      minSessionMinutes: c.min_session_minutes,
      maxSessionMinutes: c.max_session_minutes,
    });

    return {
      request: {
        ...c,
        required_capabilities: requiredCaps,
      },
      score: breakdown.total,
      breakdown,
      isWinner: false,
    };
  });

  // Rank competitors descending by priority score
  scoredCompetitors.sort((a, b) => b.score - a.score);

  const hasConflict = scoredCompetitors.length > req.equipment_quantity;
  const winner = scoredCompetitors[0];
  if (winner) {
    winner.isWinner = true;
  }

  // Generate alternative slots on this equipment
  const alternativeSlots: AlternativeSlot[] = [];
  const reqDuration = getDurationMinutes(req.start_time, req.end_time);
  const startDateStr = req.start_time.split('T')[0];

  // Look ahead 3 days for open slots
  for (let dayOffset = 0; dayOffset <= 3; dayOffset++) {
    const checkDate = addDays(startDateStr, dayOffset);
    try {
      const avail = getEquipmentAvailability(req.equipment_id, checkDate);
      if (avail.isOpen) {
        for (const slot of avail.slots) {
          if (slot.status === 'free') {
            const slotStartIso = slot.isoString;
            const slotStartHour = Number(slot.time.split(':')[0]);
            const slotStartMin = Number(slot.time.split(':')[1]);
            const endTotalMin = slotStartHour * 60 + slotStartMin + reqDuration;
            const endH = Math.floor(endTotalMin / 60);
            const endM = endTotalMin % 60;
            if (endH <= 17) {
              const endIso = `${checkDate}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
              // Make sure it doesn't match the conflicted slot exactly
              if (slotStartIso !== req.start_time) {
                alternativeSlots.push({
                  date: checkDate,
                  start_time: slotStartIso,
                  end_time: endIso,
                });
                if (alternativeSlots.length >= 3) break;
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
    if (alternativeSlots.length >= 3) break;
  }

  // Generate alternative equipment cross-departmentally
  const targetTags: string[] = JSON.parse(req.equipment_tags || '[]');
  const otherEquip = db.prepare(`
    SELECT e.id, e.name, e.category, e.location, e.tags, d.name as department_name
    FROM equipment e
    JOIN departments d ON e.department_id = d.id
    WHERE e.id != ? AND e.status = 'active'
  `).all(req.equipment_id) as Array<{
    id: number;
    name: string;
    category: string;
    location: string;
    tags: string;
    department_name: string;
  }>;

  const alternativeEquipment: AlternativeEquipment[] = [];
  for (const eq of otherEquip) {
    const tags: string[] = JSON.parse(eq.tags || '[]');
    const overlap = targetTags.filter(t => tags.includes(t));
    if (overlap.length > 0) {
      const matchPct = Math.round((overlap.length / Math.max(1, targetTags.length)) * 100);
      alternativeEquipment.push({
        id: eq.id,
        name: eq.name,
        category: eq.category,
        department_name: eq.department_name,
        location: eq.location,
        matchPercentage: matchPct,
      });
    }
  }

  alternativeEquipment.sort((a, b) => b.matchPercentage - a.matchPercentage);
  const topAltEquip = alternativeEquipment.slice(0, 3);

  // Build rule-based transparent explanation
  let explanation = '';
  if (!hasConflict) {
    explanation = `There is currently no competing request for this equipment during the requested time slot. The request satisfies all laboratory constraints with a suitability score of ${winner.breakdown.suitability}% and fairness score of ${winner.breakdown.fairness}%.`;
  } else {
    const second = scoredCompetitors[1];
    explanation = `Conflict detected: ${scoredCompetitors.length} students requested overlapping access to ${req.equipment_name} (capacity: ${req.equipment_quantity}). ` +
      `Request by ${winner.request.student_name} ranks #1 with total score ${winner.score}/100. ` +
      `Breakdown: Urgency=${winner.breakdown.urgency}/100 (deadline in ${winner.breakdown.factors.deadlineDays} days), ` +
      `Fairness=${winner.breakdown.fairness}/100 (${winner.breakdown.factors.pastAllocatedHours} hrs past usage in 30 days), ` +
      `Suitability=${winner.breakdown.suitability}%, Efficiency=${winner.breakdown.efficiency}%. ` +
      (second
        ? `In comparison, ${second.request.student_name} scored ${second.score}/100 (Urgency: ${second.breakdown.urgency}, Fairness: ${second.breakdown.fairness} with ${second.breakdown.factors.pastAllocatedHours} hrs usage). `
        : '') +
      `Recommended action: Approve ${winner.request.student_name}. Alternative slots on the same machine and compatible cross-departmental equipment have been identified for competing applicants.`;
  }

  return {
    conflicts: hasConflict,
    totalCompetitors: scoredCompetitors.length,
    winnerRequestId: winner ? winner.request.id : null,
    competitors: scoredCompetitors,
    alternatives: {
      alternativeSlots,
      alternativeEquipment: topAltEquip,
    },
    explanation,
    explanationSource: 'rule_based',
  };
}
