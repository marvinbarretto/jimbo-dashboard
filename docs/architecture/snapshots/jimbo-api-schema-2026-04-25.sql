CREATE TABLE context_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE context_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL REFERENCES context_files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'list',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE context_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES context_sections(id) ON DELETE CASCADE,
  label TEXT,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, timeframe TEXT, status TEXT CHECK(status IN ('active', 'paused', 'completed', 'deferred')), category TEXT CHECK(category IN ('project', 'life-area', 'habit', 'one-off')), expires_at TEXT);
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  outcome TEXT,
  rationale TEXT,
  model_used TEXT,
  cost_id TEXT,
  satisfaction INTEGER,
  notes TEXT
);
CREATE INDEX idx_activities_ts ON activities(timestamp);
CREATE INDEX idx_activities_type ON activities(task_type);
CREATE TABLE vault_notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'task',
  status TEXT NOT NULL DEFAULT 'active',
  body TEXT,
  ai_priority INTEGER,
  ai_rationale TEXT,
  manual_priority INTEGER,
  sort_position INTEGER,
  actionability TEXT,
  tags TEXT,
  created_at TEXT,
  updated_at TEXT,
  completed_at TEXT,
  raw_frontmatter TEXT
, assigned_to TEXT DEFAULT 'unassigned', blocked_by TEXT, parent_id TEXT, source_signal TEXT, last_nudged_at TEXT, nudge_count INTEGER DEFAULT 0, route TEXT DEFAULT 'unrouted', agent_type TEXT, acceptance_criteria TEXT, seq INTEGER, suggested_agent_type TEXT, suggested_route TEXT, suggested_ac TEXT, ready INTEGER DEFAULT 0, grooming_status TEXT DEFAULT 'ungroomed', suggested_skills TEXT, executor TEXT, is_epic INTEGER DEFAULT 0, epic_started_at TEXT, blocked_reason TEXT, blocked_at TEXT, grooming_started_at TEXT, priority_confidence REAL, retry_count INTEGER NOT NULL DEFAULT 0, ai_rationale_model TEXT, suggested_parent_id TEXT, cited_lesson_ids TEXT, due_at TEXT, source_kind TEXT, source_ref TEXT, source_url TEXT, definition_of_done TEXT);
CREATE INDEX idx_vault_type_status ON vault_notes(type, status);
CREATE INDEX idx_vault_ai_priority ON vault_notes(ai_priority DESC);
CREATE INDEX idx_vault_manual_priority ON vault_notes(manual_priority DESC);
CREATE TABLE costs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    task_type TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    estimated_cost REAL NOT NULL,
    notes TEXT
);
CREATE INDEX idx_costs_ts ON costs(timestamp);
CREATE INDEX idx_costs_model ON costs(model);
CREATE INDEX idx_costs_task ON costs(task_type);
CREATE TABLE runs (
    run_id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    parent_run_id TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    model TEXT NOT NULL,
    config_hash TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd REAL,
    duration_ms INTEGER,
    input_summary TEXT,
    output_summary TEXT,
    quality_scores TEXT,
    conductor_rating INTEGER,
    user_rating INTEGER,
    user_notes TEXT,
    conductor_reasoning TEXT,
    session TEXT
);
CREATE INDEX idx_runs_ts ON runs(timestamp);
CREATE INDEX idx_runs_task ON runs(task_id);
CREATE INDEX idx_runs_model ON runs(model);
CREATE TABLE email_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gmail_id TEXT NOT NULL UNIQUE,
    thread_id TEXT NOT NULL DEFAULT '',
    processed_at TEXT NOT NULL,
    from_name TEXT NOT NULL DEFAULT '',
    from_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_analysis TEXT NOT NULL,
    links TEXT NOT NULL DEFAULT '[]',
    model TEXT NOT NULL DEFAULT '',
    processing_time_seconds REAL DEFAULT 0,
    decided INTEGER NOT NULL DEFAULT 0,
    decided_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
, decision TEXT, relevance_score INTEGER, source TEXT NOT NULL DEFAULT 'email', body_text TEXT NOT NULL DEFAULT '', forwarded_to_localshout TEXT, enrichment_prompt_id TEXT, enrichment_prompt_version INTEGER, enrichment_model TEXT, enrichment_reasoning TEXT, enrichment_cost_cents REAL, enrichment_tokens_input INTEGER, enrichment_tokens_output INTEGER, enriched_at TEXT);
CREATE INDEX idx_email_reports_decided ON email_reports(decided);
CREATE INDEX idx_email_reports_thread ON email_reports(thread_id);
CREATE INDEX idx_email_reports_created ON email_reports(created_at);
CREATE INDEX idx_email_reports_relevance ON email_reports(relevance_score);
CREATE TABLE briefing_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session TEXT NOT NULL,
  model TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  analysis TEXT NOT NULL,
  user_rating INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_briefing_analyses_created ON briefing_analyses(created_at);
CREATE INDEX idx_briefing_analyses_session ON briefing_analyses(session);
CREATE TABLE health_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          overall TEXT NOT NULL,
          issues TEXT NOT NULL DEFAULT '[]',
          snapshot TEXT NOT NULL,
          pipeline_morning_ran INTEGER,
          pipeline_afternoon_ran INTEGER,
          vault_reader_status TEXT,
          vault_roulette_status TEXT,
          gem_count INTEGER,
          activity_count INTEGER,
          cost_today REAL,
          vault_active INTEGER,
          vault_velocity_7d REAL
        );
CREATE INDEX idx_health_ts ON health_snapshots(timestamp);
CREATE INDEX idx_vault_parent_id ON vault_notes(parent_id);
CREATE INDEX idx_vault_route ON vault_notes(status, route);
CREATE TABLE fitness_records (
  id TEXT PRIMARY KEY,
  record_type TEXT NOT NULL,
  value REAL,
  unit TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  source_app TEXT,
  metadata TEXT,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  device_id TEXT
);
CREATE INDEX idx_fitness_start ON fitness_records(start_time);
CREATE INDEX idx_fitness_type ON fitness_records(record_type);
CREATE UNIQUE INDEX idx_fitness_dedup
  ON fitness_records(start_time, end_time, record_type, source_app);
CREATE TABLE dispatch_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id TEXT NOT NULL,
          task_source TEXT NOT NULL DEFAULT 'vault',
          agent_type TEXT NOT NULL,
          batch_id TEXT,
          status TEXT NOT NULL DEFAULT 'proposed',
          dispatch_prompt TEXT,
          dispatch_repo TEXT,
          result_summary TEXT,
          result_artifacts TEXT,
          error_message TEXT,
          retry_count INTEGER DEFAULT 0,
          proposed_at TEXT,
          approved_at TEXT,
          rejected_at TEXT,
          started_at TEXT,
          completed_at TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        , pr_url TEXT, pr_state TEXT, rejection_reason TEXT, flow TEXT NOT NULL DEFAULT 'commission', issue_number INTEGER, issue_repo TEXT, issue_title TEXT, issue_body TEXT, executor TEXT, skill TEXT, skill_context TEXT, completed_model TEXT);
CREATE INDEX idx_dispatch_status ON dispatch_queue(status);
CREATE INDEX idx_dispatch_task_id ON dispatch_queue(task_id);
CREATE INDEX idx_dispatch_batch_id ON dispatch_queue(batch_id);
CREATE UNIQUE INDEX idx_vault_seq ON vault_notes(seq);
CREATE INDEX idx_dispatch_pr_url ON dispatch_queue(pr_url);
CREATE TABLE product_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product TEXT NOT NULL,
  app TEXT NOT NULL,
  environment TEXT NOT NULL,
  summary_type TEXT NOT NULL,
  window TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product, app, environment, summary_type, window)
);
CREATE INDEX idx_product_summaries_lookup
  ON product_summaries(product, app, environment, summary_type, window);
CREATE INDEX idx_product_summaries_generated_at
  ON product_summaries(generated_at DESC);
CREATE INDEX idx_email_reports_forwarded ON email_reports(forwarded_to_localshout);
CREATE INDEX idx_vault_assigned_to ON vault_notes(assigned_to);
CREATE INDEX idx_vault_status_assigned_to ON vault_notes(status, assigned_to);
CREATE INDEX idx_vault_ready ON vault_notes(ready);
CREATE INDEX idx_vault_grooming_status ON vault_notes(grooming_status);
CREATE INDEX idx_vault_executor ON vault_notes(executor);
CREATE TABLE grooming_proposals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_note_id TEXT NOT NULL REFERENCES vault_notes(id) ON DELETE CASCADE,
          proposed_by TEXT NOT NULL,
          proposal TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          feedback TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
CREATE INDEX idx_grooming_proposals_parent ON grooming_proposals(parent_note_id);
CREATE INDEX idx_grooming_proposals_status ON grooming_proposals(status);
CREATE INDEX idx_vault_is_epic ON vault_notes(is_epic);
CREATE TABLE pipeline_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        duration_ms INTEGER,
        steps TEXT NOT NULL DEFAULT '{}',
        opus_status TEXT,
        opus_error TEXT,
        opus_posted_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_pipeline_runs_created ON pipeline_runs(created_at);
CREATE INDEX idx_pipeline_runs_session ON pipeline_runs(session);
CREATE TABLE grooming_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id TEXT NOT NULL REFERENCES vault_notes(id) ON DELETE CASCADE,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        actor TEXT NOT NULL,
        reason TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_grooming_audit_note ON grooming_audit(note_id);
CREATE INDEX idx_grooming_audit_created ON grooming_audit(created_at);
CREATE TABLE note_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_note_id TEXT NOT NULL REFERENCES vault_notes(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL CHECK (target_type IN ('vault_note', 'context_item')),
        target_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (source_note_id, target_type, target_id),
        CHECK (NOT (target_type = 'vault_note' AND target_id = source_note_id))
      );
CREATE INDEX idx_note_links_source ON note_links(source_note_id);
CREATE INDEX idx_note_links_target ON note_links(target_type, target_id);
CREATE TABLE grooming_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id TEXT NOT NULL REFERENCES vault_notes(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        delegable INTEGER NOT NULL DEFAULT 0,
        answer TEXT,
        answered_by TEXT,
        dispatch_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT
      );
CREATE INDEX idx_grooming_questions_note ON grooming_questions(note_id);
CREATE INDEX idx_grooming_questions_pending ON grooming_questions(note_id) WHERE resolved_at IS NULL;
CREATE TABLE grooming_corrections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id TEXT NOT NULL REFERENCES vault_notes(id) ON DELETE CASCADE,
        stage TEXT NOT NULL,
        field TEXT NOT NULL,
        ai_value TEXT NOT NULL,
        corrected_value TEXT NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_corrections_field ON grooming_corrections(field);
CREATE INDEX idx_corrections_stage ON grooming_corrections(stage, created_at);
CREATE INDEX idx_dispatch_executor_status ON dispatch_queue(executor, status);
CREATE TABLE note_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id TEXT NOT NULL REFERENCES vault_notes(id) ON DELETE CASCADE,
        ts TEXT NOT NULL DEFAULT (datetime('now')),
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        from_value TEXT,
        to_value TEXT,
        reason TEXT,
        context TEXT
      );
CREATE INDEX idx_note_activity_note ON note_activity(note_id, ts DESC);
CREATE INDEX idx_note_activity_actor_action ON note_activity(actor, action, ts DESC);
CREATE INDEX idx_note_activity_action_ts ON note_activity(action, ts DESC);
CREATE TABLE coach_supplements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('protein','creatine','vitamin','other')),
  dose_amount REAL NOT NULL,
  dose_unit TEXT NOT NULL,
  conditions TEXT NOT NULL DEFAULT '{}',
  timing_tags TEXT NOT NULL DEFAULT '[]',
  rationale_short TEXT NOT NULL,
  rationale_long TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  remaining_amount REAL,
  loading_started_at TEXT,
  loading_daily_dose REAL,
  loading_duration_days INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE coach_nudges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nudge_key TEXT NOT NULL UNIQUE,
  anchor TEXT NOT NULL,
  supplements TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  pushed_at TEXT,
  delivered_via TEXT,
  state TEXT CHECK (state IN ('pending','logged','skipped','expired')) NOT NULL DEFAULT 'pending',
  action_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE coach_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplement_id TEXT NOT NULL REFERENCES coach_supplements(id) ON DELETE CASCADE,
  taken_at TEXT NOT NULL DEFAULT (datetime('now')),
  dosage REAL NOT NULL,
  source TEXT CHECK (source IN ('in_app','telegram_deeplink','manual')) NOT NULL,
  nudge_id INTEGER REFERENCES coach_nudges(id) ON DELETE SET NULL,
  notes TEXT
);
CREATE INDEX idx_coach_nudges_state_scheduled ON coach_nudges(state, scheduled_for);
CREATE INDEX idx_coach_logs_supplement_time ON coach_logs(supplement_id, taken_at DESC);
CREATE TABLE grooming_lessons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          kind TEXT NOT NULL,
          trigger TEXT NOT NULL,
          guidance TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 0,
          hit_count INTEGER NOT NULL DEFAULT 0,
          miss_count INTEGER NOT NULL DEFAULT 0,
          supersedes_id INTEGER,
          created_by TEXT NOT NULL,
          source_correction_ids TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          activated_at TEXT,
          last_cited_at TEXT,
          deprecated_at TEXT,
          deprecated_reason TEXT
        );
CREATE INDEX idx_lessons_active ON grooming_lessons(active);
CREATE INDEX idx_lessons_kind ON grooming_lessons(kind);
CREATE TABLE grooming_corrections_ingested (
      correction_id INTEGER PRIMARY KEY REFERENCES grooming_corrections(id) ON DELETE CASCADE,
      ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
CREATE TABLE _migrations (name TEXT PRIMARY KEY, run_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX idx_email_reports_enriched_at ON email_reports(enriched_at);
CREATE TABLE vault_candidates (
        id TEXT PRIMARY KEY,
        email_id INTEGER NOT NULL REFERENCES email_reports(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        proposed_priority INTEGER,
        confidence REAL NOT NULL,
        rationale TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')),
        decided_at TEXT,
        created_vault_note_id TEXT REFERENCES vault_notes(id) ON DELETE SET NULL,
        last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_vault_candidates_email ON vault_candidates(email_id);
CREATE INDEX idx_vault_candidates_status ON vault_candidates(status);
CREATE VIRTUAL TABLE search_index USING fts5(
      source UNINDEXED,
      source_id UNINDEXED,
      title,
      body,
      tags,
      updated_at UNINDEXED,
      tokenize='porter unicode61'
    )
/* search_index(source,source_id,title,body,tags,updated_at) */;
CREATE TABLE IF NOT EXISTS 'search_index_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'search_index_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'search_index_content'(id INTEGER PRIMARY KEY, c0, c1, c2, c3, c4, c5);
CREATE TABLE IF NOT EXISTS 'search_index_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'search_index_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TABLE system_events (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        ts             TEXT NOT NULL,
        source         TEXT NOT NULL,
        kind           TEXT NOT NULL,
        actor          TEXT,
        title          TEXT NOT NULL,
        detail         TEXT,
        ref_type       TEXT,
        ref_id         TEXT,
        correlation_id TEXT,
        level          TEXT NOT NULL DEFAULT 'info'
      );
CREATE INDEX idx_system_events_ts          ON system_events(ts DESC);
CREATE INDEX idx_system_events_ref         ON system_events(ref_type, ref_id);
CREATE INDEX idx_system_events_correlation ON system_events(correlation_id);
CREATE INDEX idx_system_events_source      ON system_events(source, ts DESC);
CREATE INDEX idx_system_events_kind        ON system_events(kind, ts DESC);
CREATE TABLE bakeoff_runs (
  id           TEXT PRIMARY KEY,
  timestamp    TEXT NOT NULL DEFAULT (datetime('now')),
  capability   TEXT NOT NULL,
  model        TEXT NOT NULL,
  score        REAL NOT NULL,
  cost_usd     REAL NOT NULL,
  flags        TEXT,
  sample_n     INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE interrogate_values (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        rank INTEGER,
        confidence REAL NOT NULL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','superseded')),
        source TEXT NOT NULL DEFAULT 'self',
        last_reviewed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_interrogate_values_status ON interrogate_values(status);
CREATE TABLE interrogate_interests (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        intensity TEXT NOT NULL DEFAULT 'medium' CHECK (intensity IN ('low','medium','high')),
        confidence REAL NOT NULL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','superseded')),
        source TEXT NOT NULL DEFAULT 'self',
        last_engaged_at TEXT,
        last_reviewed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_interrogate_interests_status ON interrogate_interests(status);
CREATE TABLE interrogate_sessions (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        energy TEXT NOT NULL DEFAULT 'light' CHECK (energy IN ('light','deep')),
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        ended_at TEXT,
        transcript_path TEXT,
        raw_log_path TEXT
      , transcript_text TEXT);
CREATE INDEX idx_interrogate_sessions_started ON interrogate_sessions(started_at DESC);
CREATE TABLE interrogate_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL REFERENCES interrogate_sessions(id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL,
        prompt_text TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_interrogate_answers_session ON interrogate_answers(session_id, ordinal);
CREATE TABLE thread_messages (
        id             TEXT PRIMARY KEY,
        vault_item_id  TEXT NOT NULL REFERENCES vault_notes(id),
        author_actor_id TEXT NOT NULL,
        kind           TEXT NOT NULL,
        body           TEXT NOT NULL,
        in_reply_to    TEXT REFERENCES thread_messages(id),
        answered_by    TEXT REFERENCES thread_messages(id),
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_thread_messages_vault ON thread_messages(vault_item_id);
CREATE TABLE attachments (
        id                TEXT PRIMARY KEY,
        thread_message_id TEXT NOT NULL REFERENCES thread_messages(id),
        kind              TEXT NOT NULL,
        filename          TEXT NOT NULL,
        mime_type         TEXT NOT NULL,
        size_bytes        INTEGER NOT NULL,
        url               TEXT NOT NULL,
        caption           TEXT,
        created_at        TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_attachments_message ON attachments(thread_message_id);
CREATE TABLE vault_item_dependencies (
        blocker_id TEXT NOT NULL REFERENCES vault_notes(id),
        blocked_id TEXT NOT NULL REFERENCES vault_notes(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (blocker_id, blocked_id)
      );
CREATE INDEX idx_dependencies_blocked  ON vault_item_dependencies(blocked_id);
CREATE INDEX idx_dependencies_blocker  ON vault_item_dependencies(blocker_id);
CREATE TABLE actors (
        id           TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        kind         TEXT NOT NULL,
        runtime      TEXT,
        description  TEXT,
        is_active    INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE TABLE projects (
        id             TEXT PRIMARY KEY,
        display_name   TEXT NOT NULL,
        description    TEXT,
        status         TEXT NOT NULL DEFAULT 'active',
        owner_actor_id TEXT NOT NULL,
        criteria       TEXT,
        repo_url       TEXT,
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE TABLE vault_item_projects (
        vault_item_id TEXT NOT NULL REFERENCES vault_notes(id),
        project_id    TEXT NOT NULL REFERENCES projects(id),
        PRIMARY KEY (vault_item_id, project_id)
      );
CREATE INDEX idx_vault_item_projects_project ON vault_item_projects(project_id);
CREATE TABLE interrogate_priorities (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        rank INTEGER,
        serves_value_id TEXT REFERENCES interrogate_values(id) ON DELETE SET NULL,
        timeframe TEXT,
        verdict TEXT,
        confidence REAL NOT NULL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','superseded')),
        source TEXT NOT NULL DEFAULT 'self',
        last_reviewed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_interrogate_priorities_status ON interrogate_priorities(status);
CREATE INDEX idx_interrogate_priorities_serves ON interrogate_priorities(serves_value_id);
CREATE TABLE interrogate_goals (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        priority_id TEXT REFERENCES interrogate_priorities(id) ON DELETE SET NULL,
        success_criteria TEXT,
        deadline TEXT,
        goal_status TEXT NOT NULL DEFAULT 'active' CHECK (goal_status IN ('active','hit','missed','abandoned')),
        confidence REAL NOT NULL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','superseded')),
        source TEXT NOT NULL DEFAULT 'self',
        last_reviewed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_interrogate_goals_status ON interrogate_goals(status);
CREATE INDEX idx_interrogate_goals_priority ON interrogate_goals(priority_id);
CREATE INDEX idx_interrogate_goals_goal_status ON interrogate_goals(goal_status);
CREATE TABLE interrogate_experiments (
        id TEXT PRIMARY KEY,
        hypothesis TEXT NOT NULL,
        window_start TEXT,
        window_end TEXT,
        review_at TEXT,
        verdict TEXT,
        spawned_from_type TEXT CHECK (spawned_from_type IN ('value','interest','priority','goal','tension','open_question')),
        spawned_from_id TEXT,
        confidence REAL NOT NULL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','superseded')),
        source TEXT NOT NULL DEFAULT 'self',
        last_reviewed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_interrogate_experiments_status ON interrogate_experiments(status);
CREATE INDEX idx_interrogate_experiments_review ON interrogate_experiments(review_at);
CREATE TABLE interrogate_nogos (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        reason TEXT,
        declared_at TEXT NOT NULL DEFAULT (datetime('now')),
        confidence REAL NOT NULL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','superseded')),
        source TEXT NOT NULL DEFAULT 'self',
        last_reviewed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_interrogate_nogos_status ON interrogate_nogos(status);
CREATE TABLE interrogate_tensions (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        resolving_how TEXT,
        between_a_type TEXT CHECK (between_a_type IN ('value','interest','priority','goal','nogo','open_question')),
        between_a_id TEXT,
        between_b_type TEXT CHECK (between_b_type IN ('value','interest','priority','goal','nogo','open_question')),
        between_b_id TEXT,
        confidence REAL NOT NULL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','superseded')),
        source TEXT NOT NULL DEFAULT 'self',
        last_reviewed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_interrogate_tensions_status ON interrogate_tensions(status);
CREATE TABLE interrogate_open_questions (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        raised_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT,
        resolution TEXT,
        confidence REAL NOT NULL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','superseded')),
        source TEXT NOT NULL DEFAULT 'self',
        last_reviewed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_interrogate_open_questions_status ON interrogate_open_questions(status);
CREATE TABLE interrogate_evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('value','interest','priority','goal','experiment','nogo','tension','open_question')),
        entity_id TEXT NOT NULL,
        source_kind TEXT NOT NULL CHECK (source_kind IN ('journal','vault','task','calendar','answer','manual')),
        source_id TEXT,
        stance TEXT NOT NULL CHECK (stance IN ('supports','contradicts')),
        weight REAL NOT NULL DEFAULT 1.0 CHECK (weight >= 0),
        snippet TEXT,
        discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
        discovered_via_session_id TEXT REFERENCES interrogate_sessions(id) ON DELETE SET NULL
      );
CREATE INDEX idx_interrogate_evidence_entity ON interrogate_evidence(entity_type, entity_id);
CREATE INDEX idx_interrogate_evidence_source ON interrogate_evidence(source_kind, source_id);
CREATE INDEX idx_interrogate_evidence_session ON interrogate_evidence(discovered_via_session_id);
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
CREATE INDEX idx_vault_due_at ON vault_notes(due_at);
CREATE TABLE note_thread (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id     TEXT    NOT NULL REFERENCES vault_notes(id) ON DELETE CASCADE,
        author      TEXT    NOT NULL,
        content     TEXT    NOT NULL,
        reply_to_id INTEGER REFERENCES note_thread(id) ON DELETE SET NULL,
        is_correction INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      );
CREATE INDEX idx_note_thread_note ON note_thread(note_id, created_at ASC);
CREATE TRIGGER search_vault_notes_ai AFTER INSERT ON vault_notes BEGIN
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('vault_notes', NEW.id, NEW.title, substr(COALESCE(NEW.body, ''), 1, 4000), NEW.tags, COALESCE(NEW.updated_at, NEW.created_at));
    END;
CREATE TRIGGER search_vault_notes_au AFTER UPDATE ON vault_notes BEGIN
      DELETE FROM search_index WHERE source = 'vault_notes' AND source_id = OLD.id;
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('vault_notes', NEW.id, NEW.title, substr(COALESCE(NEW.body, ''), 1, 4000), NEW.tags, COALESCE(NEW.updated_at, NEW.created_at));
    END;
CREATE TRIGGER search_vault_notes_ad AFTER DELETE ON vault_notes BEGIN
      DELETE FROM search_index WHERE source = 'vault_notes' AND source_id = OLD.id;
    END;
CREATE TRIGGER search_dispatch_ai AFTER INSERT ON dispatch_queue BEGIN
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('dispatch', NEW.id, NEW.task_id, substr(COALESCE(COALESCE(NEW.result_summary, NEW.error_message, ''), ''), 1, 4000), NEW.agent_type, COALESCE(NEW.completed_at, NEW.started_at, NEW.proposed_at, NEW.created_at));
    END;
CREATE TRIGGER search_dispatch_au AFTER UPDATE ON dispatch_queue BEGIN
      DELETE FROM search_index WHERE source = 'dispatch' AND source_id = OLD.id;
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('dispatch', NEW.id, NEW.task_id, substr(COALESCE(COALESCE(NEW.result_summary, NEW.error_message, ''), ''), 1, 4000), NEW.agent_type, COALESCE(NEW.completed_at, NEW.started_at, NEW.proposed_at, NEW.created_at));
    END;
CREATE TRIGGER search_dispatch_ad AFTER DELETE ON dispatch_queue BEGIN
      DELETE FROM search_index WHERE source = 'dispatch' AND source_id = OLD.id;
    END;
CREATE TRIGGER search_email_ai AFTER INSERT ON email_reports BEGIN
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('email', NEW.id, NEW.subject, substr(COALESCE(NEW.body_text, ''), 1, 4000), NEW.from_name, NEW.created_at);
    END;
CREATE TRIGGER search_email_au AFTER UPDATE ON email_reports BEGIN
      DELETE FROM search_index WHERE source = 'email' AND source_id = OLD.id;
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('email', NEW.id, NEW.subject, substr(COALESCE(NEW.body_text, ''), 1, 4000), NEW.from_name, NEW.created_at);
    END;
CREATE TRIGGER search_email_ad AFTER DELETE ON email_reports BEGIN
      DELETE FROM search_index WHERE source = 'email' AND source_id = OLD.id;
    END;
CREATE TRIGGER search_briefing_ai AFTER INSERT ON briefing_analyses BEGIN
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('briefing', NEW.id, NEW.session, substr(COALESCE(NEW.analysis, ''), 1, 4000), NULL, NEW.generated_at);
    END;
CREATE TRIGGER search_briefing_au AFTER UPDATE ON briefing_analyses BEGIN
      DELETE FROM search_index WHERE source = 'briefing' AND source_id = OLD.id;
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('briefing', NEW.id, NEW.session, substr(COALESCE(NEW.analysis, ''), 1, 4000), NULL, NEW.generated_at);
    END;
CREATE TRIGGER search_briefing_ad AFTER DELETE ON briefing_analyses BEGIN
      DELETE FROM search_index WHERE source = 'briefing' AND source_id = OLD.id;
    END;
CREATE TRIGGER search_grooming_ai AFTER INSERT ON grooming_proposals BEGIN
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('grooming', NEW.id, NEW.proposed_by, substr(COALESCE(NEW.proposal, ''), 1, 4000), NEW.status, NEW.updated_at);
    END;
CREATE TRIGGER search_grooming_au AFTER UPDATE ON grooming_proposals BEGIN
      DELETE FROM search_index WHERE source = 'grooming' AND source_id = OLD.id;
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('grooming', NEW.id, NEW.proposed_by, substr(COALESCE(NEW.proposal, ''), 1, 4000), NEW.status, NEW.updated_at);
    END;
CREATE TRIGGER search_grooming_ad AFTER DELETE ON grooming_proposals BEGIN
      DELETE FROM search_index WHERE source = 'grooming' AND source_id = OLD.id;
    END;
CREATE TRIGGER search_context_ai AFTER INSERT ON context_items BEGIN
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('context', NEW.id, COALESCE(NEW.label, substr(NEW.content, 1, 40)), substr(COALESCE(NEW.content, ''), 1, 4000), NEW.category, NEW.updated_at);
    END;
CREATE TRIGGER search_context_au AFTER UPDATE ON context_items BEGIN
      DELETE FROM search_index WHERE source = 'context' AND source_id = OLD.id;
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('context', NEW.id, COALESCE(NEW.label, substr(NEW.content, 1, 40)), substr(COALESCE(NEW.content, ''), 1, 4000), NEW.category, NEW.updated_at);
    END;
CREATE TRIGGER search_context_ad AFTER DELETE ON context_items BEGIN
      DELETE FROM search_index WHERE source = 'context' AND source_id = OLD.id;
    END;
CREATE TRIGGER search_activity_ai AFTER INSERT ON activities BEGIN
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('activity', NEW.id, NEW.description, substr(COALESCE(COALESCE(NEW.rationale, NEW.notes, ''), ''), 1, 4000), NEW.task_type, NEW.timestamp);
    END;
CREATE TRIGGER search_activity_au AFTER UPDATE ON activities BEGIN
      DELETE FROM search_index WHERE source = 'activity' AND source_id = OLD.id;
      INSERT INTO search_index (source, source_id, title, body, tags, updated_at)
    VALUES ('activity', NEW.id, NEW.description, substr(COALESCE(COALESCE(NEW.rationale, NEW.notes, ''), ''), 1, 4000), NEW.task_type, NEW.timestamp);
    END;
CREATE TRIGGER search_activity_ad AFTER DELETE ON activities BEGIN
      DELETE FROM search_index WHERE source = 'activity' AND source_id = OLD.id;
    END;
