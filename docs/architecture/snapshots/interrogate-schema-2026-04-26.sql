CREATE TABLE interrogate_values(
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  rank INTEGER,
  confidence REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','archived','superseded')),
  source TEXT NOT NULL DEFAULT 'self',
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX idx_interrogate_values_status ON interrogate_values(status);
CREATE TABLE interrogate_interests(
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  intensity TEXT NOT NULL DEFAULT 'medium' CHECK(intensity IN('low','medium','high')),
  confidence REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','archived','superseded')),
  source TEXT NOT NULL DEFAULT 'self',
  last_engaged_at TEXT,
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX idx_interrogate_interests_status ON interrogate_interests(status);
CREATE TABLE interrogate_sessions(
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  energy TEXT NOT NULL DEFAULT 'light' CHECK(energy IN('light','deep')),
  started_at TEXT NOT NULL DEFAULT(datetime('now')),
  ended_at TEXT,
  transcript_path TEXT,
  raw_log_path TEXT
  ,
  transcript_text TEXT
);
CREATE INDEX idx_interrogate_sessions_started ON interrogate_sessions(
  started_at DESC
);
CREATE TABLE interrogate_answers(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES interrogate_sessions(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX idx_interrogate_answers_session ON interrogate_answers(
  session_id,
  ordinal
);
CREATE TABLE interrogate_priorities(
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  rank INTEGER,
  serves_value_id TEXT REFERENCES interrogate_values(id) ON DELETE SET NULL,
  timeframe TEXT,
  verdict TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','archived','superseded')),
  source TEXT NOT NULL DEFAULT 'self',
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX idx_interrogate_priorities_status ON interrogate_priorities(
  status
);
CREATE INDEX idx_interrogate_priorities_serves ON interrogate_priorities(
  serves_value_id
);
CREATE TABLE interrogate_goals(
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  priority_id TEXT REFERENCES interrogate_priorities(id) ON DELETE SET NULL,
  success_criteria TEXT,
  deadline TEXT,
  goal_status TEXT NOT NULL DEFAULT 'active' CHECK(goal_status IN('active','hit','missed','abandoned')),
  confidence REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','archived','superseded')),
  source TEXT NOT NULL DEFAULT 'self',
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX idx_interrogate_goals_status ON interrogate_goals(status);
CREATE INDEX idx_interrogate_goals_priority ON interrogate_goals(priority_id);
CREATE INDEX idx_interrogate_goals_goal_status ON interrogate_goals(
  goal_status
);
CREATE TABLE interrogate_experiments(
  id TEXT PRIMARY KEY,
  hypothesis TEXT NOT NULL,
  window_start TEXT,
  window_end TEXT,
  review_at TEXT,
  verdict TEXT,
  spawned_from_type TEXT CHECK(spawned_from_type IN('value','interest','priority','goal','tension','open_question')),
  spawned_from_id TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','archived','superseded')),
  source TEXT NOT NULL DEFAULT 'self',
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX idx_interrogate_experiments_status ON interrogate_experiments(
  status
);
CREATE INDEX idx_interrogate_experiments_review ON interrogate_experiments(
  review_at
);
CREATE TABLE interrogate_nogos(
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  reason TEXT,
  declared_at TEXT NOT NULL DEFAULT(datetime('now')),
  confidence REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','archived','superseded')),
  source TEXT NOT NULL DEFAULT 'self',
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX idx_interrogate_nogos_status ON interrogate_nogos(status);
CREATE TABLE interrogate_tensions(
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  resolving_how TEXT,
  between_a_type TEXT CHECK(between_a_type IN('value','interest','priority','goal','nogo','open_question')),
  between_a_id TEXT,
  between_b_type TEXT CHECK(between_b_type IN('value','interest','priority','goal','nogo','open_question')),
  between_b_id TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','archived','superseded')),
  source TEXT NOT NULL DEFAULT 'self',
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX idx_interrogate_tensions_status ON interrogate_tensions(status);
CREATE TABLE interrogate_open_questions(
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  raised_at TEXT NOT NULL DEFAULT(datetime('now')),
  resolved_at TEXT,
  resolution TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','archived','superseded')),
  source TEXT NOT NULL DEFAULT 'self',
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now')),
  updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX idx_interrogate_open_questions_status ON interrogate_open_questions(
  status
);
CREATE TABLE interrogate_evidence(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK(entity_type IN('value','interest','priority','goal','experiment','nogo','tension','open_question')),
  entity_id TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK(source_kind IN('journal','vault','task','calendar','answer','manual')),
  source_id TEXT,
  stance TEXT NOT NULL CHECK(stance IN('supports','contradicts')),
  weight REAL NOT NULL DEFAULT 1.0 CHECK(weight >= 0),
  snippet TEXT,
  discovered_at TEXT NOT NULL DEFAULT(datetime('now')),
  discovered_via_session_id TEXT REFERENCES interrogate_sessions(id) ON DELETE SET NULL
);
CREATE INDEX idx_interrogate_evidence_entity ON interrogate_evidence(
  entity_type,
  entity_id
);
CREATE INDEX idx_interrogate_evidence_source ON interrogate_evidence(
  source_kind,
  source_id
);
CREATE INDEX idx_interrogate_evidence_session ON interrogate_evidence(
  discovered_via_session_id
);
CREATE TABLE IF NOT EXISTS "interrogate_proposals"(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES interrogate_sessions(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK(entity_type IN('value','interest','priority','goal','experiment','nogo','tension','open_question')),
  entity_id TEXT,
  action TEXT NOT NULL CHECK(action IN('create','update','archive','adjust_confidence')),
  payload TEXT NOT NULL,
  confidence REAL NOT NULL,
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','accepted','rejected','edited')),
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX idx_interrogate_proposals_session ON interrogate_proposals(
  session_id
);
CREATE INDEX idx_interrogate_proposals_status ON interrogate_proposals(status);

CREATE TABLE IF NOT EXISTS "interrogate_proposals" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES interrogate_sessions(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('value','interest','priority','goal','experiment','nogo','tension','open_question')),
  entity_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('create','update','archive','adjust_confidence')),
  payload TEXT NOT NULL,
  confidence REAL NOT NULL,
  rationale TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','edited')),
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_interrogate_proposals_session ON interrogate_proposals(session_id);
CREATE INDEX idx_interrogate_proposals_status ON interrogate_proposals(status);
