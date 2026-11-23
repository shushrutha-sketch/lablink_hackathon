import { z } from 'zod';
import { db } from '../db/connection.js';
import { getEquipmentAvailability } from '../services/availabilityService.js';
import { analyzeProjectRequirements } from '../services/matchmakerService.js';
import { findEquipmentSubstitutes } from '../services/substitutionService.js';
import { get30DayUtilisationStats } from '../services/utilisationService.js';
import { analyzeRequestAllocation } from '../services/allocationService.js';
import { getDurationMinutes } from '../domain/timeUtils.js';

export interface CopilotUserContext {
  userId: number;
  userName: string;
  role: 'student' | 'faculty' | 'admin';
  departmentId: number | null;
}

export interface CopilotTool {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  allowedRoles: Array<'student' | 'faculty' | 'admin'>;
  execute: (args: any, context: CopilotUserContext) => Promise<any> | any;
}

export const COPILOT_TOOLS: Record<string, CopilotTool> = {
  // Tool 1: search_equipment
  search_equipment: {
    name: 'search_equipment',
    description: 'Search the campus equipment catalogue by keyword, category, or department.',
    allowedRoles: ['student', 'faculty', 'admin'],
    parameters: z.object({
      query: z.string().optional().describe('Search query keyword (e.g. oscilloscope, ESP32, 3D printer)'),
      category: z.string().optional().describe('Category (Electronics, IoT, Robotics, Computing)'),
    }),
    execute: (args) => {
      let sql = `
        SELECT e.id, e.slug, e.name, e.category, e.family, e.quantity, e.status, e.image_path, e.image_alt,
               d.name as department_name, e.location, e.lab
        FROM equipment e
        JOIN departments d ON e.department_id = d.id
        WHERE e.status != 'retired'
      `;
      const params: any[] = [];
      if (args.category) {
        sql += ` AND LOWER(e.category) = ?`;
        params.push(args.category.toLowerCase().trim());
      }
      if (args.query && args.query.trim()) {
        const term = `%${args.query.trim().toLowerCase()}%`;
        sql += ` AND (LOWER(e.name) LIKE ? OR LOWER(e.description) LIKE ? OR LOWER(e.slug) LIKE ?)`;
        params.push(term, term, term);
      }
      sql += ` LIMIT 8`;

      const rows = db.prepare(sql).all(...params) as any[];
      return rows.map(r => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        category: r.category,
        department: r.department_name,
        lab: r.lab || r.location,
        status: r.status,
        quantity: r.quantity,
        imageUrl: r.image_path ? `/media/equipment/${r.image_path}` : null,
      }));
    },
  },

  // Tool 2: get_equipment_details
  get_equipment_details: {
    name: 'get_equipment_details',
    description: 'Get full technical specifications, location, and verified capabilities of an equipment item by id or slug.',
    allowedRoles: ['student', 'faculty', 'admin'],
    parameters: z.object({
      equipmentId: z.union([z.number(), z.string()]).describe('Equipment ID or slug'),
    }),
    execute: (args) => {
      const isNum = !isNaN(Number(args.equipmentId));
      const equip = db.prepare(`
        SELECT e.*, d.name as department_name
        FROM equipment e
        JOIN departments d ON e.department_id = d.id
        WHERE ${isNum ? 'e.id = ?' : 'e.slug = ?'}
      `).get(isNum ? Number(args.equipmentId) : String(args.equipmentId)) as any;

      if (!equip) return { error: 'Equipment not found' };

      const caps = db.prepare(`
        SELECT c.name, c.label, ec.level, ec.limitation
        FROM equipment_capabilities ec
        JOIN capabilities c ON ec.capability = c.name
        WHERE ec.equipment_id = ?
      `).all(equip.id) as any[];

      return {
        id: equip.id,
        slug: equip.slug,
        name: equip.name,
        category: equip.category,
        department: equip.department_name,
        location: equip.location,
        lab: equip.lab,
        description: equip.description,
        specs: JSON.parse(equip.specs || '[]'),
        capabilities: caps,
        quantity: equip.quantity,
        status: equip.status,
        minSessionMinutes: equip.min_session_minutes,
        maxSessionMinutes: equip.max_session_minutes,
        imageUrl: equip.image_path ? `/media/equipment/${equip.image_path}` : null,
      };
    },
  },

  // Tool 3: check_availability
  check_availability: {
    name: 'check_availability',
    description: 'Check operating schedule and 30-minute availability time slots for an equipment item on a specific date.',
    allowedRoles: ['student', 'faculty', 'admin'],
    parameters: z.object({
      equipmentId: z.union([z.number(), z.string()]).describe('Equipment ID or slug'),
      date: z.string().describe('Date in YYYY-MM-DD format (defaults to tomorrow if omitted)'),
    }),
    execute: (args) => {
      const dateStr = args.date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      try {
        const result = getEquipmentAvailability(args.equipmentId, dateStr);
        const freeSlots = result.slots.filter(s => s.status === 'free').map(s => s.time);
        const contestedSlots = result.slots.filter(s => s.status === 'contested').map(s => s.time);
        return {
          equipmentId: result.equipmentId,
          date: result.date,
          isOpen: result.isOpen,
          totalFreeSlots: freeSlots.length,
          availableTimes: freeSlots.slice(0, 8),
          contestedTimes: contestedSlots,
        };
      } catch (e: any) {
        return { error: e.message || 'Failed to check availability' };
      }
    },
  },

  // Tool 4: match_project_requirements
  match_project_requirements: {
    name: 'match_project_requirements',
    description: 'Analyze a natural language project description and convert it into a structured Prototype Plan with matching equipment.',
    allowedRoles: ['student', 'faculty', 'admin'],
    parameters: z.object({
      projectDescription: z.string().describe('Natural language description of student project'),
    }),
    execute: async (args) => {
      return await analyzeProjectRequirements(args.projectDescription);
    },
  },

  // Tool 5: find_substitutes
  find_substitutes: {
    name: 'find_substitutes',
    description: 'Find technically compatible substitute equipment when an item is unavailable or contested, with compatibility scores.',
    allowedRoles: ['student', 'faculty', 'admin'],
    parameters: z.object({
      equipmentId: z.union([z.number(), z.string()]).describe('Equipment ID or slug to substitute'),
    }),
    execute: (args) => {
      try {
        return findEquipmentSubstitutes(args.equipmentId);
      } catch (e: any) {
        return { error: e.message || 'Failed to find substitutes' };
      }
    },
  },

  // Tool 6: prepare_booking_proposal (READ-ONLY PROPOSAL - NEVER DIRECTLY COMMITS BOOKING)
  prepare_booking_proposal: {
    name: 'prepare_booking_proposal',
    description: 'Prepare an explicit booking reservation proposal card for student confirmation. Does NOT book directly; requires manual student confirmation.',
    allowedRoles: ['student', 'faculty', 'admin'],
    parameters: z.object({
      equipmentId: z.union([z.number(), z.string()]).describe('Equipment ID or slug'),
      date: z.string().describe('Reservation date (YYYY-MM-DD)'),
      startTime: z.string().describe('Start time in HH:mm format (e.g. 10:00)'),
      durationMinutes: z.number().describe('Duration in minutes (e.g. 60, 120, 180)'),
      projectTitle: z.string().describe('Project title'),
      projectDescription: z.string().describe('Brief project description'),
      projectDeadline: z.string().optional().describe('Project deadline date (YYYY-MM-DD)'),
    }),
    execute: (args, context) => {
      const isNum = !isNaN(Number(args.equipmentId));
      const equip = db.prepare(`SELECT * FROM equipment WHERE ${isNum ? 'id = ?' : 'slug = ?'}`).get(isNum ? Number(args.equipmentId) : String(args.equipmentId)) as any;
      if (!equip) return { error: 'Equipment not found' };

      const [sh, sm] = args.startTime.split(':').map(Number);
      const totalEnd = sh * 60 + sm + args.durationMinutes;
      const eh = Math.floor(totalEnd / 60);
      const em = totalEnd % 60;
      const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

      const defaultDeadline = args.projectDeadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

      return {
        proposalType: 'booking_proposal',
        requiresConfirmation: true,
        proposal: {
          equipmentId: equip.id,
          equipmentSlug: equip.slug,
          equipmentName: equip.name,
          category: equip.category,
          imageUrl: equip.image_path ? `/media/equipment/${equip.image_path}` : null,
          date: args.date,
          startTime: `${args.date}T${args.startTime}`,
          endTime: `${args.date}T${endTime}`,
          durationMinutes: args.durationMinutes,
          projectTitle: args.projectTitle,
          projectDescription: args.projectDescription,
          projectDeadline: defaultDeadline,
          studentName: context.userName,
        },
      };
    },
  },

  // Tool 7: get_my_requests
  get_my_requests: {
    name: 'get_my_requests',
    description: 'Get the current user requests and their status (pending, approved, rejected, changes_requested).',
    allowedRoles: ['student', 'faculty', 'admin'],
    parameters: z.object({}),
    execute: (args, context) => {
      const rows = db.prepare(`
        SELECT r.id, r.project_title, r.start_time, r.end_time, r.status, r.priority_score,
               e.name as equipment_name, e.location, e.image_path
        FROM booking_requests r
        JOIN equipment e ON r.equipment_id = e.id
        WHERE r.student_id = ?
        ORDER BY r.created_at DESC
        LIMIT 5
      `).all(context.userId) as any[];

      return rows.map(r => ({
        id: r.id,
        projectTitle: r.project_title,
        equipmentName: r.equipment_name,
        startTime: r.start_time,
        status: r.status,
        score: r.priority_score,
        imageUrl: r.image_path ? `/media/equipment/${r.image_path}` : null,
      }));
    },
  },

  // Tool 8: get_competing_requests (Role-gated: faculty & admin only)
  get_competing_requests: {
    name: 'get_competing_requests',
    description: 'Get pending competing requests and fair allocation score ranking for faculty review.',
    allowedRoles: ['faculty', 'admin'],
    parameters: z.object({
      requestId: z.number().optional().describe('Specific request ID to analyze allocation for'),
    }),
    execute: (args) => {
      if (args.requestId) {
        return analyzeRequestAllocation(args.requestId);
      }
      const pending = db.prepare(`
        SELECT r.id, r.project_title, r.start_time, r.end_time, r.priority_score,
               u.name as student_name, e.name as equipment_name
        FROM booking_requests r
        JOIN users u ON r.student_id = u.id
        JOIN equipment e ON r.equipment_id = e.id
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC
        LIMIT 6
      `).all() as any[];
      return { pendingRequests: pending };
    },
  },

  // Tool 9: get_utilisation_stats (Role-gated: admin only)
  get_utilisation_stats: {
    name: 'get_utilisation_stats',
    description: 'Get 30-day campus laboratory utilisation metrics and underutilised/oversubscribed equipment.',
    allowedRoles: ['admin'],
    parameters: z.object({}),
    execute: () => {
      return get30DayUtilisationStats();
    },
  },
};
