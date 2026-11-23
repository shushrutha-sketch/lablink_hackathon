import { db } from '../db/connection.js';

export interface ExtractedRequirement {
  capability: string;
  label: string;
  priority: 'must' | 'nice';
  reason: string;
}

export interface RecommendedEquipmentItem {
  id: number;
  slug: string;
  name: string;
  category: string;
  family: string;
  departmentName: string;
  lab: string;
  location: string;
  imageUrl: string | null;
  imageAlt: string;
  matchPercentage: number;
  matchLevel: 'full' | 'partial';
  matchedCapabilities: string[];
  limitations: string[];
  quantity: number;
  availableQuantity: number;
  status: string;
  nextFreeAt: string | null;
  relevanceReason: string;
}

export interface PrototypePlan {
  projectSummary: string;
  requiredCapabilities: string[];
  mustHaveRequirements: ExtractedRequirement[];
  niceToHaveRequirements: ExtractedRequirement[];
  recommendedEquipment: RecommendedEquipmentItem[];
  coveragePercentage: number;
  unmetCapabilities: string[];
  partsToBring: string[];
  source: 'gemini' | 'deterministic_rules';
}

/**
 * Deterministic keyword scanner using SQLite capabilities table
 */
function extractCapabilitiesDeterministically(description: string): {
  projectSummary: string;
  mustHaves: ExtractedRequirement[];
  niceToHaves: ExtractedRequirement[];
  partsToBring: string[];
} {
  const lowerDesc = description.toLowerCase();
  const allCaps = db.prepare('SELECT name, label, description, keywords FROM capabilities').all() as Array<{
    name: string;
    label: string;
    description: string;
    keywords: string;
  }>;

  const matches: Array<{ name: string; label: string; score: number; desc: string }> = [];

  for (const cap of allCaps) {
    const keywords: string[] = JSON.parse(cap.keywords || '[]');
    let score = 0;

    // Check capability name and label
    if (lowerDesc.includes(cap.name.toLowerCase()) || lowerDesc.includes(cap.label.toLowerCase())) {
      score += 3;
    }

    // Check individual keywords
    for (const kw of keywords) {
      if (lowerDesc.includes(kw.toLowerCase())) {
        score += 1;
      }
    }

    if (score > 0) {
      matches.push({ name: cap.name, label: cap.label, score, desc: cap.description });
    }
  }

  // Sort matches by score descending
  matches.sort((a, b) => b.score - a.score);

  // If no keywords matched, supply sensible engineering defaults
  if (matches.length === 0) {
    matches.push(
      { name: 'microcontroller-programming', label: 'Microcontroller Programming', score: 2, desc: 'Embedded firmware' },
      { name: 'sensor-interfacing', label: 'Sensor Interfacing', score: 1, desc: 'Sensor integration' }
    );
  }

  const mustHaves: ExtractedRequirement[] = [];
  const niceToHaves: ExtractedRequirement[] = [];

  // Top 2 matches are must-haves, rest nice-to-haves
  matches.forEach((m, idx) => {
    if (idx < 2) {
      mustHaves.push({
        capability: m.name,
        label: m.label,
        priority: 'must',
        reason: `Core functionality required for ${m.label.toLowerCase()}`,
      });
    } else {
      niceToHaves.push({
        capability: m.name,
        label: m.label,
        priority: 'nice',
        reason: `Enhancement capability for testing or scaling ${m.label.toLowerCase()}`,
      });
    }
  });

  // Suggest typical hardware parts students bring themselves
  const partsToBring: string[] = ['Breadboard & jumper wire kit'];
  if (lowerDesc.includes('soil') || lowerDesc.includes('sensor') || lowerDesc.includes('moisture')) {
    partsToBring.push('Capacitive soil moisture sensor probe');
  }
  if (lowerDesc.includes('camera') || lowerDesc.includes('vision')) {
    partsToBring.push('USB web camera module or CSI camera ribbon');
  }
  if (lowerDesc.includes('battery') || lowerDesc.includes('solar') || lowerDesc.includes('mobile')) {
    partsToBring.push('3.7V LiPo battery pack / 5V power bank');
  }
  if (lowerDesc.includes('display') || lowerDesc.includes('oled') || lowerDesc.includes('lcd')) {
    partsToBring.push('I2C 0.96 inch OLED display module');
  }
  partsToBring.push('USB-C data / programming cable');

  const summary = description.length > 120
    ? `${description.slice(0, 117)}...`
    : description;

  return {
    projectSummary: summary,
    mustHaves,
    niceToHaves,
    partsToBring,
  };
}

export async function analyzeProjectRequirements(projectDescription: string): Promise<PrototypePlan> {
  const trimmed = projectDescription.trim();
  if (!trimmed) {
    throw { statusCode: 400, code: 'EMPTY_DESCRIPTION', message: 'Project description cannot be empty' };
  }

  let projectSummary = '';
  let mustHaves: ExtractedRequirement[] = [];
  let niceToHaves: ExtractedRequirement[] = [];
  let partsToBring: string[] = [];
  let source: 'gemini' | 'deterministic_rules' = 'deterministic_rules';

  // Check if Gemini can be called
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const forceBasic = process.env.DEMO_FORCE_BASIC === 'true';

  if (hasGeminiKey && !forceBasic) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze this college engineering student's project description:
"${trimmed}"

Extract:
1. A concise 1-sentence project summary.
2. Controlled technical capabilities needed from this exact list: [microcontroller-programming, wifi-iot, bluetooth, sensor-interfacing, signal-analysis, digital-signal-capture, power-supply, soldering-prototyping, linux-computing, computer-vision, machine-learning, gpu-compute, robotics-actuation, mobile-robotics, 3d-printing].
Mark each as 'must' or 'nice' with a brief reason.
3. External components/parts student should bring themselves (e.g. specific sensors, breadboard, battery).

Return JSON only in this format:
{
  "projectSummary": "...",
  "mustHaves": [{"capability": "...", "label": "...", "priority": "must", "reason": "..."}],
  "niceToHaves": [{"capability": "...", "label": "...", "priority": "nice", "reason": "..."}],
  "partsToBring": ["..."]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        projectSummary = parsed.projectSummary || trimmed;
        mustHaves = parsed.mustHaves || [];
        niceToHaves = parsed.niceToHaves || [];
        partsToBring = parsed.partsToBring || [];
        source = 'gemini';
      }
    } catch {
      // Fallback to deterministic extraction
      source = 'deterministic_rules';
    }
  }

  // If Gemini wasn't used or failed, use deterministic extractor
  if (mustHaves.length === 0 && niceToHaves.length === 0) {
    const det = extractCapabilitiesDeterministically(trimmed);
    projectSummary = det.projectSummary;
    mustHaves = det.mustHaves;
    niceToHaves = det.niceToHaves;
    partsToBring = det.partsToBring;
    source = 'deterministic_rules';
  }

  const allRequiredCaps = [...mustHaves, ...niceToHaves].map(r => r.capability);

  // Now match against active equipment in database
  const equipmentRows = db.prepare(`
    SELECT e.*, d.name as department_name
    FROM equipment e
    JOIN departments d ON e.department_id = d.id
    WHERE e.status != 'retired'
  `).all() as any[];

  const nowIso = new Date().toISOString();
  const recommendedEquipment: RecommendedEquipmentItem[] = [];
  const coveredCapabilitiesSet = new Set<string>();

  for (const eq of equipmentRows) {
    const caps = db.prepare(`
      SELECT ec.capability, ec.level, ec.limitation
      FROM equipment_capabilities ec
      WHERE ec.equipment_id = ?
    `).all(eq.id) as Array<{ capability: string; level: string; limitation: string | null }>;

    const matchedCaps: string[] = [];
    const limitations: string[] = [];
    let hasFullMatch = true;

    for (const c of caps) {
      if (allRequiredCaps.includes(c.capability)) {
        matchedCaps.push(c.capability);
        coveredCapabilitiesSet.add(c.capability);
        if (c.level === 'partial') {
          hasFullMatch = false;
          if (c.limitation) limitations.push(c.limitation);
        }
      }
    }

    if (matchedCaps.length > 0) {
      const matchPercentage = Math.round((matchedCaps.length / allRequiredCaps.length) * 100);

      // Check live availability
      const activeBooking = db.prepare(`
        SELECT COUNT(*) as active_count, MIN(end_time) as next_end
        FROM booking_requests
        WHERE equipment_id = ?
          AND status IN ('approved', 'in_progress')
          AND start_time <= ? AND end_time > ?
      `).get(eq.id, nowIso, nowIso) as any;

      const activeCount = activeBooking ? activeBooking.active_count : 0;
      const availableQuantity = Math.max(0, eq.quantity - activeCount);

      let status = 'available';
      if (eq.status === 'maintenance') {
        status = 'maintenance';
      } else if (availableQuantity === 0) {
        status = 'in_use';
      }

      const imageUrl = eq.image_path
        ? (eq.image_path.startsWith('/') || eq.image_path.startsWith('http')
            ? eq.image_path
            : `/media/equipment/${eq.image_path}`)
        : null;

      recommendedEquipment.push({
        id: eq.id,
        slug: eq.slug,
        name: eq.name,
        category: eq.category,
        family: eq.family,
        departmentName: eq.department_name,
        lab: eq.lab,
        location: eq.location,
        imageUrl,
        imageAlt: eq.image_alt || eq.name,
        matchPercentage,
        matchLevel: hasFullMatch ? 'full' : 'partial',
        matchedCapabilities: matchedCaps,
        limitations,
        quantity: eq.quantity,
        availableQuantity,
        status,
        nextFreeAt: availableQuantity === 0 ? activeBooking.next_end : null,
        relevanceReason: `Provides ${matchedCaps.join(', ')} hardware capabilities required by the prototype plan.`,
      });
    }
  }

  // Sort recommendations by match percentage descending
  recommendedEquipment.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // Compute coverage percentage
  const coveragePercentage = allRequiredCaps.length > 0
    ? Math.round((coveredCapabilitiesSet.size / allRequiredCaps.length) * 100)
    : 100;

  const unmetCapabilities = allRequiredCaps.filter(c => !coveredCapabilitiesSet.has(c));

  return {
    projectSummary,
    requiredCapabilities: allRequiredCaps,
    mustHaveRequirements: mustHaves,
    niceToHaveRequirements: niceToHaves,
    recommendedEquipment,
    coveragePercentage,
    unmetCapabilities,
    partsToBring,
    source,
  };
}
