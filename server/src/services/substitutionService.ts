import { db } from '../db/connection.js';

export interface SpecDifference {
  spec: string;
  requested: string;
  substitute: string;
  difference: string;
}

export interface EquipmentSubstitute {
  id: number;
  slug: string;
  name: string;
  category: string;
  family: string;
  departmentId: number;
  departmentName: string;
  lab: string;
  location: string;
  imageUrl: string | null;
  imageAlt: string;
  compatibilityScore: number;
  familyMatch: boolean;
  specDifferences: SpecDifference[];
  limitations: string[];
  availableQuantity: number;
  status: string;
  nextFreeAt: string | null;
}

export interface SubstitutionResult {
  requestedEquipment: {
    id: number;
    slug: string;
    name: string;
    category: string;
    family: string;
    imageUrl: string | null;
  };
  substitutes: EquipmentSubstitute[];
}

export function findEquipmentSubstitutes(equipmentIdOrSlug: number | string): SubstitutionResult {
  const isNum = !isNaN(Number(equipmentIdOrSlug));
  const requested = db.prepare(`
    SELECT e.*, d.name as department_name
    FROM equipment e
    JOIN departments d ON e.department_id = d.id
    WHERE ${isNum ? 'e.id = ?' : 'e.slug = ?'}
  `).get(isNum ? Number(equipmentIdOrSlug) : String(equipmentIdOrSlug)) as any;

  if (!requested) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Requested equipment not found' };
  }

  // Fetch capabilities for requested equipment
  const requestedCaps = db.prepare(`
    SELECT ec.capability, ec.level, ec.limitation
    FROM equipment_capabilities ec
    WHERE ec.equipment_id = ?
  `).all(requested.id) as Array<{ capability: string; level: string; limitation: string | null }>;

  const requestedCapNames = requestedCaps.map(c => c.capability);
  const requestedSpecs = JSON.parse(requested.specs || '[]');

  // Fetch all other active equipment
  const candidates = db.prepare(`
    SELECT e.*, d.name as department_name
    FROM equipment e
    JOIN departments d ON e.department_id = d.id
    WHERE e.id != ? AND e.status != 'retired'
  `).all(requested.id) as any[];

  const nowIso = new Date().toISOString();
  const substitutes: EquipmentSubstitute[] = [];

  for (const cand of candidates) {
    // 1. Fetch candidate capabilities
    const candCaps = db.prepare(`
      SELECT ec.capability, ec.level, ec.limitation
      FROM equipment_capabilities ec
      WHERE ec.equipment_id = ?
    `).all(cand.id) as Array<{ capability: string; level: string; limitation: string | null }>;

    const candCapNames = candCaps.map(c => c.capability);

    // Calculate capability overlap C (0.0 to 1.0)
    let overlapCount = 0;
    for (const rc of requestedCapNames) {
      if (candCapNames.includes(rc)) {
        overlapCount++;
      }
    }
    const capOverlapRatio = requestedCapNames.length > 0 ? overlapCount / requestedCapNames.length : 0.5;

    // Check if candidate matches family or has significant capability overlap
    const isSameFamily = cand.family.toLowerCase().trim() === requested.family.toLowerCase().trim();
    if (!isSameFamily && capOverlapRatio < 0.40) {
      continue; // Not a compatible candidate
    }

    // 2. Spec performance ratio P (0.0 to 1.0) and differences
    const candSpecs = JSON.parse(cand.specs || '[]');
    const specDifferences: SpecDifference[] = [];
    const limitations: string[] = [];

    let perfSum = 0;
    let perfCount = 0;

    for (const rSpec of requestedSpecs) {
      const cSpec = candSpecs.find((cs: any) => cs.key === rSpec.key || cs.label === rSpec.label);
      if (cSpec) {
        const rVal = typeof rSpec.value === 'number' ? rSpec.value : parseFloat(rSpec.value);
        const cVal = typeof cSpec.value === 'number' ? cSpec.value : parseFloat(cSpec.value);

        if (!isNaN(rVal) && !isNaN(cVal) && rVal > 0) {
          const ratio = Math.min(1.0, cVal / rVal);
          perfSum += ratio;
          perfCount++;

          const unit = rSpec.unit ? ` ${rSpec.unit}` : '';
          const diffVal = cVal - rVal;
          const diffStr = diffVal > 0 ? `+${diffVal}${unit}` : diffVal < 0 ? `${diffVal}${unit}` : 'Identical';

          specDifferences.push({
            spec: rSpec.label || rSpec.key,
            requested: `${rVal}${unit}`,
            substitute: `${cVal}${unit}`,
            difference: diffStr,
          });

          if (cVal < rVal) {
            limitations.push(`Reduced ${rSpec.label || rSpec.key}: ${cVal}${unit} vs requested ${rVal}${unit}`);
          }
        }
      }
    }

    const perfRatio = perfCount > 0 ? perfSum / perfCount : isSameFamily ? 0.8 : 0.5;
    const familyScore = isSameFamily ? 1.0 : 0.0;

    // Formula: 60 * C + 25 * P + 15 * F
    const rawScore = 60 * capOverlapRatio + 25 * perfRatio + 15 * familyScore;
    const compatibilityScore = Math.min(100, Math.round(rawScore));

    // Check for candidate capability limitations
    for (const cc of candCaps) {
      if (cc.limitation && requestedCapNames.includes(cc.capability)) {
        limitations.push(cc.limitation);
      }
    }

    // Check availability
    const activeBooking = db.prepare(`
      SELECT COUNT(*) as active_count, MIN(end_time) as next_end
      FROM booking_requests
      WHERE equipment_id = ?
        AND status IN ('approved', 'in_progress')
        AND start_time <= ? AND end_time > ?
    `).get(cand.id, nowIso, nowIso) as any;

    const activeCount = activeBooking ? activeBooking.active_count : 0;
    const availableQuantity = Math.max(0, cand.quantity - activeCount);

    let status = 'available';
    if (cand.status === 'maintenance') {
      status = 'maintenance';
    } else if (availableQuantity === 0) {
      status = 'in_use';
    }

    const imageUrl = cand.image_path
      ? (cand.image_path.startsWith('/') || cand.image_path.startsWith('http')
          ? cand.image_path
          : `/media/equipment/${cand.image_path}`)
      : null;

    substitutes.push({
      id: cand.id,
      slug: cand.slug,
      name: cand.name,
      category: cand.category,
      family: cand.family,
      departmentId: cand.department_id,
      departmentName: cand.department_name,
      lab: cand.lab,
      location: cand.location,
      imageUrl,
      imageAlt: cand.image_alt || cand.name,
      compatibilityScore,
      familyMatch: isSameFamily,
      specDifferences,
      limitations,
      availableQuantity,
      status,
      nextFreeAt: availableQuantity === 0 ? activeBooking.next_end : null,
    });
  }

  // Sort substitutes by compatibility score descending
  substitutes.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  const reqImageUrl = requested.image_path
    ? (requested.image_path.startsWith('/') || requested.image_path.startsWith('http')
        ? requested.image_path
        : `/media/equipment/${requested.image_path}`)
    : null;

  return {
    requestedEquipment: {
      id: requested.id,
      slug: requested.slug,
      name: requested.name,
      category: requested.category,
      family: requested.family,
      imageUrl: reqImageUrl,
    },
    substitutes,
  };
}
