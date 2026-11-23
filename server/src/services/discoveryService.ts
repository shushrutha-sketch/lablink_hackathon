import { db } from '../db/connection.js';
import { calculateSuitabilityScore } from './scoringService.js';

export interface SearchFilters {
  q?: string;
  category?: string;
  departmentId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}

export function searchEquipment(filters: SearchFilters) {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 12));
  const offset = (page - 1) * pageSize;

  let query = `
    SELECT e.*, d.name as department_name, d.code as department_code
    FROM equipment e
    JOIN departments d ON e.department_id = d.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.status) {
    query += ` AND e.status = ?`;
    params.push(filters.status);
  } else {
    // default to active only unless specified
    query += ` AND e.status != 'retired'`;
  }

  if (filters.departmentId) {
    query += ` AND e.department_id = ?`;
    params.push(filters.departmentId);
  }

  if (filters.category) {
    query += ` AND e.category = ?`;
    params.push(filters.category);
  }

  if (filters.q && filters.q.trim().length > 0) {
    const term = `%${filters.q.trim().toLowerCase()}%`;
    query += ` AND (LOWER(e.name) LIKE ? OR LOWER(e.description) LIKE ? OR LOWER(e.tags) LIKE ? OR LOWER(e.location) LIKE ?)`;
    params.push(term, term, term, term);
  }

  // Count total matching items
  const countQuery = `SELECT count(*) as total FROM (${query})`;
  const countResult = db.prepare(countQuery).get(...params) as { total: number };
  const total = countResult ? countResult.total : 0;

  query += ` ORDER BY e.id ASC LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);

  const rows = db.prepare(query).all(...params) as any[];

  const items = rows.map(r => ({
    ...r,
    tags: JSON.parse(r.tags || '[]'),
    specs: JSON.parse(r.specs || '{}'),
  }));

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export function recommendEquipmentByCapabilities(capabilities: string[], limit: number = 6) {
  const rows = db.prepare(`
    SELECT e.*, d.name as department_name, d.code as department_code
    FROM equipment e
    JOIN departments d ON e.department_id = d.id
    WHERE e.status = 'active'
  `).all() as any[];

  const scored = rows.map(r => {
    const tags: string[] = JSON.parse(r.tags || '[]');
    const { score, matchedTags } = calculateSuitabilityScore(capabilities, tags);
    return {
      ...r,
      tags,
      specs: JSON.parse(r.specs || '{}'),
      matchPercentage: score,
      matchedCapabilities: matchedTags,
    };
  });

  // Sort descending by match percentage, then by equipment id
  scored.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return scored.slice(0, limit);
}
