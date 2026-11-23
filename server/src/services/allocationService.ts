import { db } from '../db/connection.js';
import { rankCompetingRequests, CompetingRequestCandidate, RankedCompetingRequest } from './scoringService.js';
import { getDurationMinutes, addDays } from '../domain/timeUtils.js';
import { getEquipmentAvailability } from './availabilityService.js';
import { findEquipmentSubstitutes } from './substitutionService.js';

export interface AlternativeSlot {
  date: string;
  start_time: string;
  end_time: string;
}

export interface AllocationAnalysis {
  conflicts: boolean;
  totalCompetitors: number;
  winnerRequestId: number | null;
  ranking: RankedCompetingRequest[];
  competitors: Array<{
    request: any;
    score: any;
    rank: number;
    recommendation: 'approve' | 'alternative';
    isWinner: boolean;
  }>;
  alternatives: {
    alternativeSlots: AlternativeSlot[];
    alternativeEquipment: any[];
  };
  explanation: string;
  explanationSource: 'gemini' | 'rule_based';
}

export function analyzeRequestAllocation(requestId: number): AllocationAnalysis {
  const req = db.prepare(`
    SELECT r.*, u.name as student_name, u.email as student_email, e.name as equipment_name,
           e.category as equipment_category, e.quantity as equipment_quantity,
           e.min_session_minutes, e.max_session_minutes, e.family, d.name as department_name
    FROM booking_requests r
    JOIN users u ON r.student_id = u.id
    JOIN equipment e ON r.equipment_id = e.id
    JOIN departments d ON e.department_id = d.id
    WHERE r.id = ?
  `).get(requestId) as any;

  if (!req) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Request not found' };
  }

  // Find all competing pending requests on this equipment that overlap in time
  const competingRows = db.prepare(`
    SELECT r.*, u.name as student_name, u.email as student_email, e.name as equipment_name,
           e.category as equipment_category, e.quantity as equipment_quantity,
           e.min_session_minutes, e.max_session_minutes, e.family, d.name as department_name
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

  // Ensure current request is in the candidate list if not already
  if (!competingRows.some(r => r.id === req.id)) {
    competingRows.push(req);
  }

  // Build candidates list
  const candidates: CompetingRequestCandidate[] = competingRows.map(c => {
    const pastBookings = db.prepare(`
      SELECT start_time, end_time
      FROM booking_requests
      WHERE student_id = ? AND status = 'approved'
        AND datetime(start_time) >= datetime('now', '-30 days')
    `).all(c.student_id) as any[];

    let pastMinutes = 0;
    for (const b of pastBookings) {
      pastMinutes += getDurationMinutes(b.start_time, b.end_time);
    }

    let structuredReqs: any[] | undefined = undefined;
    if (c.requirements_json) {
      try {
        const parsed = JSON.parse(c.requirements_json);
        if (Array.isArray(parsed)) {
          if (typeof parsed[0] === 'string') {
            structuredReqs = parsed.map((cap: string) => ({ capability: cap, level: 'full', priority: 'must' }));
          } else {
            structuredReqs = parsed;
          }
        }
      } catch {
        // ignore
      }
    }

    return {
      id: c.id,
      studentId: c.student_id,
      studentName: c.student_name,
      projectTitle: c.project_title,
      projectDeadline: c.project_deadline,
      startTime: c.start_time,
      endTime: c.end_time,
      durationMinutes: getDurationMinutes(c.start_time, c.end_time),
      approvedHoursLast30Days: Math.round((pastMinutes / 60) * 10) / 10,
      createdAt: c.created_at,
      requirements: structuredReqs,
      minSessionMinutes: c.min_session_minutes,
      maxSessionMinutes: c.max_session_minutes,
    };
  });

  const ranking = rankCompetingRequests(candidates, req.equipment_quantity || 1);
  const conflicts = candidates.length > (req.equipment_quantity || 1);
  const winnerRequestId = ranking.length > 0 && ranking[0].recommendation === 'approve' ? ranking[0].id : null;

  const competitors = ranking.map(r => {
    const rawReq = competingRows.find(c => c.id === r.id);
    return {
      request: rawReq,
      score: r.score.total,
      breakdown: r.score,
      rank: r.rank,
      recommendation: r.recommendation,
      isWinner: r.recommendation === 'approve',
    };
  });

  // Alternative slots (within next 7 days)
  const alternativeSlots: AlternativeSlot[] = [];
  try {
    const reqStartDate = req.start_time.split('T')[0];
    const duration = getDurationMinutes(req.start_time, req.end_time);

    for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
      if (alternativeSlots.length >= 3) break;
      const targetDate = addDays(reqStartDate, dayOffset);
      const avail = getEquipmentAvailability(req.equipment_id, targetDate);

      if (avail.isOpen) {
        for (const slot of avail.slots) {
          if (slot.status === 'free') {
            const [sh, sm] = slot.time.split(':').map(Number);
            const endTotal = sh * 60 + sm + duration;
            if (endTotal <= 17 * 60) {
              const eh = Math.floor(endTotal / 60);
              const em = endTotal % 60;
              const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

              alternativeSlots.push({
                date: targetDate,
                start_time: `${targetDate}T${slot.time}`,
                end_time: `${targetDate}T${endTime}`,
              });
              if (alternativeSlots.length >= 3) break;
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // Alternative equipment from substitution engine
  let alternativeEquipment: any[] = [];
  try {
    const subResult = findEquipmentSubstitutes(req.equipment_id);
    alternativeEquipment = subResult.substitutes.slice(0, 3).map(s => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      category: s.category,
      department_name: s.departmentName,
      location: s.location,
      imageUrl: s.imageUrl,
      matchPercentage: s.compatibilityScore,
      limitations: s.limitations,
      availableQuantity: s.availableQuantity,
    }));
  } catch {
    // ignore
  }

  // Primary explanation
  let explanation = '';
  if (!conflicts) {
    explanation = `Single request on this equipment with no competing bookings. Scored ${ranking[0]?.score.total || 0}/100. Recommended for approval.`;
  } else {
    const top = ranking[0];
    explanation = `Contested slot: ${ranking.length} students competing for ${req.equipment_quantity || 1} workstation(s). ${top.studentName} is recommended for approval with highest fair allocation score (${top.score.total}/100) due to deadline urgency and equitable resource allocation. Other candidates are recommended for alternative slots or substitute equipment.`;
  }

  return {
    conflicts,
    totalCompetitors: candidates.length,
    winnerRequestId,
    ranking,
    competitors,
    alternatives: {
      alternativeSlots,
      alternativeEquipment,
    },
    explanation,
    explanationSource: 'rule_based',
  };
}
