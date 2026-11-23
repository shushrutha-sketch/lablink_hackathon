export type Role = 'student' | 'faculty' | 'admin';

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'cancelled';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  department_id: number | null;
  created_at: string;
}

export interface DepartmentRow {
  id: number;
  code: string;
  name: string;
}

export interface EquipmentRow {
  id: number;
  name: string;
  category: string;
  department_id: number;
  location: string;
  description: string;
  tags: string; // JSON string
  specs: string; // JSON string
  quantity: number;
  min_session_minutes: number;
  max_session_minutes: number;
  status: 'active' | 'maintenance' | 'retired';
}

export interface BookingRequestRow {
  id: number;
  student_id: number;
  equipment_id: number;
  project_title: string;
  project_description: string;
  project_deadline: string;
  start_time: string;
  end_time: string;
  status: RequestStatus;
  required_capabilities: string; // JSON string
  suitability: number;
  priority_score: number | null;
  score_breakdown: string | null; // JSON string
  reviewer_id: number | null;
  reviewer_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoreFactors {
  urgency: number;
  suitability: number;
  fairness: number;
  efficiency: number;
}

export interface ScoreBreakdownResult {
  urgency: number;
  suitability: number;
  fairness: number;
  efficiency: number;
  weights: {
    urgency: number;
    suitability: number;
    fairness: number;
    efficiency: number;
  };
  total: number;
  factors: {
    deadlineDays: number;
    matchedTagsCount: number;
    totalRequiredTags: number;
    pastAllocatedHours: number;
    durationMinutes: number;
  };
}
