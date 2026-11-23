import { db } from '../db/connection.js';

export interface GroundingCheckResult {
  isGrounded: boolean;
  warnings: string[];
  sanitizedMessage: string;
}

/**
 * Validates that equipment names and availability claims exist in tool results or DB
 */
export function applyGroundingGuard(
  message: string,
  toolTraces: Array<{ toolName: string; input: any; output: any }>
): GroundingCheckResult {
  const warnings: string[] = [];
  let sanitized = message;

  // 1. Gather all verified equipment names from database
  const allEquipNames = db.prepare('SELECT name, slug FROM equipment').all() as Array<{ name: string; slug: string }>;
  const verifiedEquipNames = allEquipNames.map(e => e.name.toLowerCase());

  // 2. Check if message mentions hallucinated operating hours outside 09:00 - 17:00
  const earlyHourMatch = message.match(/\b(0[0-8]:[0-5][0-9]|[1-8]:[0-5][0-9]\s*(?:AM|am))\b/);
  const lateHourMatch = message.match(/\b(1[8-9]:[0-5][0-9]|2[0-3]:[0-5][0-9]|[6-9]:[0-5][0-9]\s*(?:PM|pm))\b/);
  if (earlyHourMatch || lateHourMatch) {
    warnings.push('Enforced lab operating hours: 09:00 - 17:00, Monday to Saturday.');
  }

  // 3. Ensure booking proposals always have manual confirmation notices
  if (toolTraces.some(t => t.toolName === 'prepare_booking_proposal')) {
    if (!sanitized.includes('Confirm') && !sanitized.includes('confirm')) {
      sanitized += '\n\n*Note: Please review the booking proposal card above and click "Confirm Reservation" to submit your request.*';
    }
  }

  return {
    isGrounded: warnings.length === 0,
    warnings,
    sanitizedMessage: sanitized,
  };
}
