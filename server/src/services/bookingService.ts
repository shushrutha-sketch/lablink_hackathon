import { db } from '../db/connection.js';
import { isWithinLabHours, getDurationMinutes, getDaysUntil } from '../domain/timeUtils.js';
import { calculateFairAllocationScore, rankCompetingRequests, CompetingRequestCandidate } from './scoringService.js';
import { BookingRequestRow } from '../domain/types.js';

export interface CreateRequestInput {
  equipmentId: number | string;
  projectTitle: string;
  projectDescription: string;
  projectDeadline: string; // YYYY-MM-DD
  startTime: string;      // YYYY-MM-DDTHH:mm
  endTime: string;        // YYYY-MM-DDTHH:mm
  requiredCapabilities?: string[];
  requirementsJson?: string;
  substitutedFromEquipmentId?: number | string;
  substitutionNote?: string;
  substitutionAcknowledged?: boolean | number;
}

export function createBookingRequest(studentId: number, input: CreateRequestInput) {
  const isNum = !isNaN(Number(input.equipmentId));
  const equip = db.prepare(`
    SELECT * FROM equipment WHERE ${isNum ? 'id = ?' : 'slug = ?'}
  `).get(isNum ? Number(input.equipmentId) : String(input.equipmentId)) as any;

  if (!equip) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Equipment not found' };
  }

  if (equip.status !== 'active') {
    throw { statusCode: 400, code: 'EQUIPMENT_UNAVAILABLE', message: `Equipment is currently ${equip.status}` };
  }

  const duration = getDurationMinutes(input.startTime, input.endTime);
  if (duration < equip.min_session_minutes || duration > equip.max_session_minutes) {
    throw {
      statusCode: 400,
      code: 'INVALID_DURATION',
      message: `Duration (${duration} mins) must be between ${equip.min_session_minutes} and ${equip.max_session_minutes} minutes`,
    };
  }

  if (!isWithinLabHours(input.startTime, input.endTime)) {
    throw {
      statusCode: 400,
      code: 'OUTSIDE_LAB_HOURS',
      message: 'Booking must be within lab operating hours (09:00 - 17:00, Monday to Saturday)',
    };
  }

  const deadlineDays = getDaysUntil(input.projectDeadline, input.startTime);
  if (deadlineDays < 0) {
    throw {
      statusCode: 400,
      code: 'INVALID_DEADLINE',
      message: 'Project deadline cannot be earlier than requested reservation date',
    };
  }

  // Check if slot is already 100% booked by confirmed sessions
  const confirmedOverlaps = db.prepare(`
    SELECT count(*) as count
    FROM booking_requests
    WHERE equipment_id = ?
      AND status = 'approved'
      AND start_time < ?
      AND end_time > ?
  `).get(equip.id, input.endTime, input.startTime) as { count: number };

  if (confirmedOverlaps.count >= equip.quantity) {
    throw {
      statusCode: 409,
      code: 'SLOT_UNAVAILABLE',
      message: 'This slot is already fully booked by confirmed reservations.',
    };
  }

  // Calculate past 30-day hours allocated for this student
  const pastBookings = db.prepare(`
    SELECT start_time, end_time
    FROM booking_requests
    WHERE student_id = ?
      AND status = 'approved'
      AND datetime(start_time) >= datetime('now', '-30 days')
  `).all(studentId) as Array<{ start_time: string; end_time: string }>;

  let pastAllocatedMinutes = 0;
  for (const b of pastBookings) {
    pastAllocatedMinutes += getDurationMinutes(b.start_time, b.end_time);
  }
  const pastAllocatedHours = Math.round((pastAllocatedMinutes / 60) * 10) / 10;

  // Equipment capabilities
  const equipCaps = db.prepare(`
    SELECT capability FROM equipment_capabilities WHERE equipment_id = ?
  `).all(equip.id).map((r: any) => r.capability);

  const requiredCaps = input.requiredCapabilities || [];
  let structuredReqs: any[] | undefined = undefined;
  if (input.requirementsJson) {
    try {
      structuredReqs = JSON.parse(input.requirementsJson);
    } catch {
      // ignore
    }
  }

  const scoreBreakdown = calculateFairAllocationScore({
    deadlineDays,
    requirements: structuredReqs,
    requiredCapabilities: requiredCaps,
    equipmentCapabilities: equipCaps,
    approvedHoursLast30Days: pastAllocatedHours,
    daysWaiting: 0,
    durationMinutes: duration,
    minSessionMinutes: equip.min_session_minutes,
    maxSessionMinutes: equip.max_session_minutes,
  });

  const insertStmt = db.prepare(`
    INSERT INTO booking_requests (
      student_id, equipment_id, project_title, project_description, project_deadline,
      start_time, end_time, status, origin, requirements_json,
      substituted_from_equipment_id, substitution_note, substitution_acknowledged,
      priority_score, score_breakdown
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'form', ?, ?, ?, ?, ?, ?)
  `);

  let subFromId: number | null = null;
  if (input.substitutedFromEquipmentId) {
    const isSubNum = !isNaN(Number(input.substitutedFromEquipmentId));
    const subEquip = db.prepare(`
      SELECT id FROM equipment WHERE ${isSubNum ? 'id = ?' : 'slug = ?'}
    `).get(isSubNum ? Number(input.substitutedFromEquipmentId) : String(input.substitutedFromEquipmentId)) as any;
    if (subEquip) subFromId = subEquip.id;
  }

  const reqJson = input.requirementsJson || JSON.stringify(requiredCaps);

  const result = insertStmt.run(
    studentId,
    equip.id,
    input.projectTitle,
    input.projectDescription,
    input.projectDeadline,
    input.startTime,
    input.endTime,
    reqJson,
    subFromId,
    input.substitutionNote || null,
    input.substitutionAcknowledged ? 1 : 0,
    scoreBreakdown.total,
    JSON.stringify(scoreBreakdown)
  );

  db.prepare(`
    INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (?, 'REQUEST_CREATED', 'BOOKING_REQUEST', ?, ?)
  `).run(studentId, result.lastInsertRowid, `Submitted request for ${equip.name}`);

  return {
    id: result.lastInsertRowid,
    priorityScore: scoreBreakdown.total,
    scoreBreakdown,
  };
}

export function editBookingRequest(requestId: number, studentId: number, input: Partial<CreateRequestInput>) {
  const req = db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(requestId) as any;
  if (!req) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Request not found' };
  }

  if (req.student_id !== studentId) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'You can only edit your own requests' };
  }

  if (req.status !== 'pending' && req.status !== 'changes_requested') {
    throw { statusCode: 400, code: 'CANNOT_EDIT', message: `Cannot edit request with status ${req.status}` };
  }

  const newTitle = input.projectTitle ?? req.project_title;
  const newDesc = input.projectDescription ?? req.project_description;
  const newDeadline = input.projectDeadline ?? req.project_deadline;
  const newStart = input.startTime ?? req.start_time;
  const newEnd = input.endTime ?? req.end_time;
  const equipId = input.equipmentId ?? req.equipment_id;

  const isNum = !isNaN(Number(equipId));
  const equip = db.prepare(`SELECT * FROM equipment WHERE ${isNum ? 'id = ?' : 'slug = ?'}`).get(isNum ? Number(equipId) : String(equipId)) as any;
  if (!equip) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Equipment not found' };

  if (input.startTime || input.endTime) {
    const duration = getDurationMinutes(newStart, newEnd);
    if (duration < equip.min_session_minutes || duration > equip.max_session_minutes) {
      throw { statusCode: 400, code: 'INVALID_DURATION', message: `Duration must be between ${equip.min_session_minutes} and ${equip.max_session_minutes} mins` };
    }
    if (!isWithinLabHours(newStart, newEnd)) {
      throw { statusCode: 400, code: 'OUTSIDE_LAB_HOURS', message: 'Booking must be within lab operating hours' };
    }
  }

  db.prepare(`
    UPDATE booking_requests
    SET project_title = ?, project_description = ?, project_deadline = ?,
        start_time = ?, end_time = ?, equipment_id = ?, status = 'pending',
        updated_at = datetime('now')
    WHERE id = ?
  `).run(newTitle, newDesc, newDeadline, newStart, newEnd, equip.id, requestId);

  db.prepare(`
    INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (?, 'REQUEST_EDITED', 'BOOKING_REQUEST', ?, 'Updated request details and reset to pending')
  `).run(studentId, requestId);

  return { success: true, message: 'Request updated' };
}

export function cancelBookingRequest(requestId: number, studentId: number) {
  const req = db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(requestId) as any;
  if (!req) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Request not found' };
  }

  if (req.student_id !== studentId) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'You can only cancel your own requests' };
  }

  if (req.status === 'cancelled' || req.status === 'rejected') {
    throw { statusCode: 400, code: 'ALREADY_TERMINATED', message: `Request is already ${req.status}` };
  }

  db.prepare(`
    UPDATE booking_requests
    SET status = 'cancelled', updated_at = datetime('now')
    WHERE id = ?
  `).run(requestId);

  db.prepare(`
    INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (?, 'REQUEST_CANCELLED', 'BOOKING_REQUEST', ?, 'Student cancelled reservation')
  `).run(studentId, requestId);

  return { success: true, message: 'Reservation cancelled' };
}

/**
 * Approve booking atomically inside database transaction with mandatory override reason check
 */
export function approveBookingRequest(requestId: number, reviewerId: number, comment?: string) {
  const req = db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(requestId) as any;
  if (!req) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Request not found' };
  }

  if (req.status === 'approved') {
    return { success: true, message: 'Request is already approved' };
  }

  const equip = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.equipment_id) as any;
  if (!equip) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Equipment not found' };

  // Check competing pending requests that overlap in time
  const competingRows = db.prepare(`
    SELECT r.*, u.name as student_name
    FROM booking_requests r
    JOIN users u ON r.student_id = u.id
    WHERE r.equipment_id = ?
      AND r.status = 'pending'
      AND r.start_time < ?
      AND r.end_time > ?
    ORDER BY r.created_at ASC
  `).all(req.equipment_id, req.end_time, req.start_time) as any[];

  if (competingRows.length > 0) {
    const candidates: CompetingRequestCandidate[] = competingRows.map(c => {
      // past hours
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
        minSessionMinutes: equip.min_session_minutes,
        maxSessionMinutes: equip.max_session_minutes,
      };
    });

    const ranked = rankCompetingRequests(candidates, equip.quantity);
    const thisItem = ranked.find(r => r.id === requestId);

    if (thisItem && thisItem.recommendation !== 'approve') {
      // Faculty is approving a request that was NOT recommended for approval by the allocation engine!
      if (!comment || comment.trim().length === 0) {
        throw {
          statusCode: 400,
          code: 'OVERRIDE_REASON_REQUIRED',
          message: 'An override reason is mandatory when approving a request that is not the engine\'s top recommendation.',
        };
      }
    }
  }

  // Atomic SQLite transaction
  return db.transaction(() => {
    // Double-booking check inside transaction
    const confirmed = db.prepare(`
      SELECT count(*) as count
      FROM booking_requests
      WHERE equipment_id = ?
        AND status = 'approved'
        AND start_time < ?
        AND end_time > ?
        AND id != ?
    `).get(req.equipment_id, req.end_time, req.start_time, req.id) as { count: number };

    if (confirmed.count >= equip.quantity) {
      throw {
        statusCode: 409,
        code: 'SLOT_UNAVAILABLE',
        message: `Cannot approve request: all ${equip.quantity} unit(s) are already booked for this timeframe.`,
      };
    }

    db.prepare(`
      UPDATE booking_requests
      SET status = 'approved',
          reviewer_id = ?,
          reviewer_comment = ?,
          decided_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(reviewerId, comment || 'Approved by faculty reviewer', requestId);

    db.prepare(`
      INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
      VALUES (?, 'REQUEST_APPROVED', 'BOOKING_REQUEST', ?, ?)
    `).run(reviewerId, requestId, comment || 'Approved by faculty reviewer');

    return { success: true, message: 'Request approved successfully' };
  })();
}

export function rejectBookingRequest(requestId: number, reviewerId: number, comment: string) {
  if (!comment || comment.trim().length === 0) {
    throw { statusCode: 400, code: 'COMMENT_REQUIRED', message: 'A reason must be provided when rejecting a request.' };
  }

  const req = db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(requestId) as any;
  if (!req) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Request not found' };

  db.prepare(`
    UPDATE booking_requests
    SET status = 'rejected',
        reviewer_id = ?,
        reviewer_comment = ?,
        decided_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(reviewerId, comment, requestId);

  db.prepare(`
    INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (?, 'REQUEST_REJECTED', 'BOOKING_REQUEST', ?, ?)
  `).run(reviewerId, requestId, comment);

  return { success: true, message: 'Request rejected' };
}

export function requestChanges(requestId: number, reviewerId: number, comment: string) {
  if (!comment || comment.trim().length === 0) {
    throw { statusCode: 400, code: 'COMMENT_REQUIRED', message: 'Instructions for requested changes must be provided.' };
  }

  const req = db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(requestId) as any;
  if (!req) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Request not found' };

  db.prepare(`
    UPDATE booking_requests
    SET status = 'changes_requested',
        reviewer_id = ?,
        reviewer_comment = ?,
        decided_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(reviewerId, comment, requestId);

  db.prepare(`
    INSERT INTO audit_log (actor_id, action, entity, entity_id, detail)
    VALUES (?, 'CHANGES_REQUESTED', 'BOOKING_REQUEST', ?, ?)
  `).run(reviewerId, requestId, comment);

  return { success: true, message: 'Changes requested' };
}
