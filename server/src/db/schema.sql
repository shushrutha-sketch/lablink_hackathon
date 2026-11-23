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

CREATE TABLE IF NOT EXISTS capabilities (
  name TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  keywords TEXT NOT NULL -- JSON array for the no-AI fallback
);

CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Electronics','IoT','Robotics','Computing')),
  family TEXT NOT NULL, -- substitution grouping
  department_id INTEGER NOT NULL REFERENCES departments(id),
  lab TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  specs TEXT NOT NULL, -- JSON [{key,label,value,unit,higherIsBetter}]
  compatible_projects TEXT NOT NULL DEFAULT '[]', -- JSON array of short strings
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  min_session_minutes INTEGER NOT NULL DEFAULT 30,
  max_session_minutes INTEGER NOT NULL DEFAULT 240,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','retired')),
  image_path TEXT, -- file name only, e.g. esp32-devkit-kit.jpg
  image_alt TEXT, -- required whenever image_path is set
  image_credit TEXT, -- attribution text and licence
  is_demo INTEGER NOT NULL DEFAULT 1, -- 1 = demonstration inventory
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equipment_capabilities (
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  capability TEXT NOT NULL REFERENCES capabilities(name),
  level TEXT NOT NULL CHECK (level IN ('full','partial')),
  limitation TEXT, -- required when level = 'partial'
  PRIMARY KEY (equipment_id, capability)
);

CREATE TABLE IF NOT EXISTS booking_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id),
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL,
  project_deadline TEXT NOT NULL, -- YYYY-MM-DD
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','changes_requested','cancelled')),
  origin TEXT NOT NULL DEFAULT 'form' CHECK (origin IN ('form','copilot')),
  requirements_json TEXT,
  substituted_from_equipment_id INTEGER REFERENCES equipment(id),
  substitution_note TEXT,
  substitution_acknowledged INTEGER NOT NULL DEFAULT 0,
  priority_score REAL,
  score_breakdown TEXT,
  reviewer_id INTEGER REFERENCES users(id),
  reviewer_comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT,
  CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  cards_json TEXT,
  tool_trace_json TEXT,
  source TEXT CHECK (source IN ('ai','rules')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
CREATE INDEX IF NOT EXISTS idx_eqcap_capability ON equipment_capabilities(capability);
CREATE INDEX IF NOT EXISTS idx_chat_user_session ON chat_messages(user_id, session_id, id);
