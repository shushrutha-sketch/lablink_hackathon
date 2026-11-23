CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student','faculty','admin')),
  department_id INTEGER REFERENCES departments(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT NOT NULL, -- JSON array, lowercase capability tags
  specs TEXT NOT NULL DEFAULT '{}', -- JSON object
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  min_session_minutes INTEGER NOT NULL DEFAULT 30,
  max_session_minutes INTEGER NOT NULL DEFAULT 240,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','retired'))
);

CREATE TABLE IF NOT EXISTS booking_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id),
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL,
  project_deadline TEXT NOT NULL, -- YYYY-MM-DD
  start_time TEXT NOT NULL, -- YYYY-MM-DDTHH:mm
  end_time TEXT NOT NULL, -- YYYY-MM-DDTHH:mm
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','changes_requested','cancelled')),
  required_capabilities TEXT NOT NULL DEFAULT '[]', -- JSON array
  suitability REAL NOT NULL DEFAULT 0, -- 0..1
  priority_score REAL, -- 0..100, last computed
  score_breakdown TEXT, -- JSON
  reviewer_id INTEGER REFERENCES users(id),
  reviewer_comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_req_equip_time ON booking_requests(equipment_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_req_status ON booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_req_student ON booking_requests(student_id, status);
CREATE INDEX IF NOT EXISTS idx_equip_dept_cat ON equipment(department_id, category);
