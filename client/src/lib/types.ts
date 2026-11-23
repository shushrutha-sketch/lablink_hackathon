export type Role = 'student' | 'faculty' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  department_id: number | null;
  department_name?: string;
  department_code?: string;
}

export interface Department {
  id: number;
  code: string;
  name: string;
}

export interface EquipmentSpec {
  name: string;
  value: string;
  raw?: any;
}

export interface EquipmentCapability {
  name: string;
  label: string;
  description: string;
  level: 'full' | 'partial';
  limitation?: string | null;
}

export interface Equipment {
  id: number | string;
  slug?: string;
  name: string;
  category: string;
  family?: string;
  department_id?: number | string;
  departmentId?: number | string;
  department_name?: string;
  department?: string;
  department_code?: string;
  departmentCode?: string;
  lab?: string;
  location: string;
  description: string;
  tags?: string[];
  specs?: EquipmentSpec[] | Record<string, string>;
  topSpecs?: EquipmentSpec[];
  compatible_projects?: string[];
  compatibleProjects?: string[];
  quantity: number;
  availableQuantity?: number;
  min_session_minutes?: number;
  max_session_minutes?: number;
  status: 'available' | 'in_use' | 'active' | 'maintenance' | 'retired';
  nextFreeAt?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  imageCredit?: string;
  capabilities?: EquipmentCapability[];
  isDemo?: boolean;
  matchPercentage?: number;
  matchedCapabilities?: string[];
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'cancelled';

export interface ScoreBreakdown {
  urgency: number; // 0-100
  suitability: number; // 0-100
  fairness: number; // 0-100
  efficiency: number; // 0-100
  weights: {
    urgency: number;
    suitability: number;
    fairness: number;
    efficiency: number;
  };
  total: number; // 0-100
  factors: {
    deadlineDays: number;
    matchedTagsCount: number;
    totalRequiredTags: number;
    pastAllocatedHours: number;
    durationMinutes: number;
  };
}

export interface BookingRequest {
  id: number;
  student_id: number;
  student_name?: string;
  student_email?: string;
  equipment_id: number;
  equipment_name?: string;
  equipment_category?: string;
  department_name?: string;
  project_title: string;
  project_description: string;
  project_deadline: string; // YYYY-MM-DD
  start_time: string; // YYYY-MM-DDTHH:mm
  end_time: string; // YYYY-MM-DDTHH:mm
  status: RequestStatus;
  required_capabilities: string[];
  suitability: number;
  priority_score: number | null;
  score_breakdown: ScoreBreakdown | null;
  reviewer_id: number | null;
  reviewer_name?: string | null;
  reviewer_comment: string | null;
  created_at: string;
  updated_at: string;
  alternatives?: {
    alternativeSlots: Array<{ date: string; start_time: string; end_time: string }>;
    alternativeEquipment: Array<{ id: number; name: string; category: string; department_name: string; location: string; matchPercentage: number }>;
  } | null;
}

export type SlotStatus = 'free' | 'contested' | 'booked' | 'past' | 'closed';

export interface TimeSlot {
  time: string; // "09:00"
  isoString: string; // "2026-11-23T09:00"
  status: SlotStatus;
  confirmedBookings: number;
  pendingRequests: number;
  totalCapacity: number;
}

export interface ProjectAnalysis {
  summary: string;
  requiredCapabilities: string[];
  suggestedCategories: string[];
  estimatedSessionHours: number;
  notes: string;
  source: 'ai' | 'fallback';
}

export interface AllocationAlternative {
  slot?: {
    date: string;
    start_time: string;
    end_time: string;
  };
  equipment?: {
    id: number;
    name: string;
    category: string;
    department_name: string;
    location: string;
    matchPercentage: number;
  };
  reason: string;
}

export interface AllocationDetail {
  conflicts: boolean;
  totalCompetitors: number;
  winnerRequestId: number | null;
  competitors: Array<{
    request: BookingRequest;
    score: number;
    breakdown: ScoreBreakdown;
    rank?: number;
    recommendation?: 'approve' | 'alternative';
    isWinner: boolean;
  }>;
  alternatives: {
    alternativeSlots: Array<{ date: string; start_time: string; end_time: string }>;
    alternativeEquipment: Array<{
      id: number;
      name: string;
      category: string;
      department_name: string;
      location: string;
      matchPercentage: number;
    }>;
  };
  explanation: string;
  explanationSource: 'gemini' | 'rule_based';
}

export interface UtilisationData {
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
