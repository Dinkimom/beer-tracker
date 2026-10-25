-- Базовая схема beer-tracker.
--
-- Раннер (lib/dbMigrations/runDbMigrations.ts) выполняет файл в одной транзакции с search_path = BEER_TRACKER_SCHEMA,
-- поэтому имена таблиц здесь без схемы.
--
-- Файл идемпотентный: на пустой БД создаёт всю схему, на БД, созданной прежним database/init.sql
-- (любой версии) и runtime-DDL, догоняет недостающие таблицы, колонки, индексы и CHECK-и.
-- Таблицы удалённых фич (quarterly_*, story_*) остаются: см. docs/DATABASE.md.

-- -----------------------------------------------------------------------------
-- Функции
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Таблицы
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    tracker_org_id TEXT NOT NULL DEFAULT '',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    sync_next_run_at TIMESTAMP WITH TIME ZONE,
    initial_sync_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_positions (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    assignee_id VARCHAR(255) NOT NULL,
    -- day index: 0 .. MAX_PLANNER_DAY_INDEX (399); variable-length sprints
    start_day INTEGER NOT NULL CHECK (start_day >= 0 AND start_day < 400),
    start_part INTEGER NOT NULL CHECK (start_part >= 0 AND start_part < 4),
    duration INTEGER NOT NULL CHECK (duration > 0),
    planned_start_day INTEGER CHECK (planned_start_day >= 0 AND planned_start_day < 400),
    planned_start_part INTEGER CHECK (planned_start_part >= 0 AND planned_start_part < 4),
    planned_duration INTEGER CHECK (planned_duration > 0),
    is_qa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id, task_id)
);

CREATE TABLE IF NOT EXISTS task_position_segments (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    segment_index INTEGER NOT NULL CHECK (segment_index >= 0),
    start_day INTEGER NOT NULL CHECK (start_day >= 0 AND start_day < 400),
    start_part INTEGER NOT NULL CHECK (start_part >= 0 AND start_part < 4),
    duration INTEGER NOT NULL CHECK (duration > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id, task_id, segment_index),
    CONSTRAINT fk_task_position
        FOREIGN KEY (organization_id, sprint_id, task_id)
        REFERENCES task_positions(organization_id, sprint_id, task_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sprint_plan_captures (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('draft', 'anchor')),
    anchored_at TIMESTAMP WITH TIME ZONE,
    assignee_id VARCHAR(255) NOT NULL,
    start_day INTEGER NOT NULL CHECK (start_day >= 0 AND start_day < 400),
    start_part INTEGER NOT NULL CHECK (start_part >= 0 AND start_part < 4),
    duration INTEGER NOT NULL CHECK (duration > 0),
    segments JSONB,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id, task_id, kind),
    CONSTRAINT sprint_plan_captures_anchor_time CHECK (kind = 'draft' OR anchored_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS swimlane_card_layers (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    card_id VARCHAR(255) NOT NULL,
    layer INTEGER NOT NULL CHECK (layer >= 0 AND layer < 50),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id, card_id)
);

CREATE TABLE IF NOT EXISTS plan_patch_position_previews (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    proposal_id VARCHAR(64) NOT NULL,
    assignee_id VARCHAR(255) NOT NULL,
    start_day INTEGER NOT NULL CHECK (start_day >= 0 AND start_day < 400),
    start_part INTEGER NOT NULL CHECK (start_part >= 0 AND start_part < 4),
    duration INTEGER NOT NULL CHECK (duration > 0),
    remove BOOLEAN NOT NULL DEFAULT FALSE,
    changes TEXT NOT NULL DEFAULT '',
    client_brand VARCHAR(16) NOT NULL DEFAULT '',
    segments JSONB,
    sync_to_tracker BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    owner_id VARCHAR(255) NOT NULL DEFAULT '',
    PRIMARY KEY (organization_id, sprint_id, owner_id, task_id)
);

CREATE TABLE IF NOT EXISTS plan_patch_applied_tokens (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL,
    sprint_id INTEGER NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (organization_id, token_hash)
);

CREATE TABLE IF NOT EXISTS plan_patch_goal_previews (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    goal_id UUID NOT NULL,
    proposal_id VARCHAR(64) NOT NULL,
    goal_type VARCHAR(16) NOT NULL CHECK (goal_type IN ('delivery', 'discovery')),
    action VARCHAR(16) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    text TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    client_brand VARCHAR(16) NOT NULL DEFAULT '',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    owner_id VARCHAR(255) NOT NULL DEFAULT '',
    PRIMARY KEY (organization_id, sprint_id, owner_id, goal_id)
);

CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    owner_id VARCHAR(255) NOT NULL,
    task_id VARCHAR(255),
    title TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    origin VARCHAR(16) NOT NULL CHECK (origin IN ('planner', 'agent')),
    status VARCHAR(16) NOT NULL CHECK (status IN ('waiting_agent', 'waiting_user', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    agent_step VARCHAR(16),
    agent_step_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS agent_session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES agent_sessions (id) ON DELETE CASCADE,
    author_kind VARCHAR(8) NOT NULL CHECK (author_kind IN ('user', 'agent')),
    author_id VARCHAR(255),
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('request', 'comment', 'redo', 'message', 'draft', 'reply')),
    text TEXT NOT NULL,
    target_kind VARCHAR(16) CHECK (target_kind IN ('position', 'goal', 'note')),
    target_id VARCHAR(255),
    target_label TEXT,
    proposal_id VARCHAR(64),
    reply_to UUID REFERENCES agent_session_messages (id) ON DELETE CASCADE,
    resolution VARCHAR(16) CHECK (resolution IN ('addressed', 'declined')),
    mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
    client_brand VARCHAR(16),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_links (
    id VARCHAR(255) PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    from_task_id VARCHAR(255) NOT NULL,
    to_task_id VARCHAR(255) NOT NULL,
    from_anchor VARCHAR(10) CHECK (from_anchor IN ('left', 'right', 'top', 'bottom')),
    to_anchor VARCHAR(10) CHECK (to_anchor IN ('left', 'right', 'top', 'bottom')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_link UNIQUE (organization_id, sprint_id, from_task_id, to_task_id),
    CONSTRAINT no_self_link CHECK (from_task_id != to_task_id)
);

CREATE TABLE IF NOT EXISTS planner_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    content_type VARCHAR(64) NOT NULL,
    byte_size INTEGER NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    assignee_id VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    position_x FLOAT,
    position_y FLOAT,
    day INTEGER CHECK (day >= 0 AND day < 400),
    part INTEGER CHECK (part >= 0 AND part < 4),
    width INTEGER DEFAULT 200,
    height INTEGER DEFAULT 2
        CHECK (height >= 1 AND height <= 10),
    color VARCHAR(16) NOT NULL DEFAULT 'yellow'
        CHECK (color IN ('yellow', 'pink', 'green', 'blue', 'gray')),
    kind VARCHAR(16) NOT NULL DEFAULT 'text'
        CHECK (kind IN ('text', 'image', 'diagram', 'widget')),
    parent JSONB,
    image_file_id UUID REFERENCES planner_files (id),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pending_approval BOOLEAN NOT NULL DEFAULT FALSE,
    pending_approval_expires_at TIMESTAMP WITH TIME ZONE,
    plan_patch_proposal_id VARCHAR(64),
    client_brand VARCHAR(16) NOT NULL DEFAULT '',
    replaces_comment_id UUID,
    replace_action VARCHAR(8),
    updated_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID
);

CREATE TABLE IF NOT EXISTS comment_reactions (
    organization_id UUID NOT NULL
        REFERENCES organizations (id) ON DELETE CASCADE,
    comment_id UUID NOT NULL
        REFERENCES comments (id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    emoji VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id, user_id, emoji),
    CONSTRAINT comment_reactions_emoji_check
        CHECK (char_length(btrim(emoji)) > 0 AND char_length(emoji) <= 32)
);

CREATE TABLE IF NOT EXISTS sprint_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    team TEXT,
    text TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('delivery', 'discovery')),
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS occupancy_task_order (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    parent_ids JSONB NOT NULL DEFAULT '[]',
    task_orders JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id)
);

CREATE TABLE IF NOT EXISTS sprint_feature_lanes (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    draft_rows JSONB NOT NULL DEFAULT '[]',
    order_ids JSONB NOT NULL DEFAULT '[]',
    hidden_ids JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id)
);

CREATE TABLE IF NOT EXISTS retro_boards (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    board JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id)
);

CREATE TABLE IF NOT EXISTS sprint_metrics (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    board_id INTEGER NOT NULL,
    sprint_id INTEGER NOT NULL,
    sprint_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    open BOOLEAN NOT NULL,
    frozen BOOLEAN NOT NULL,
    formula_version INTEGER NOT NULL,
    facts JSONB NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, board_id, sprint_id)
);

CREATE TABLE IF NOT EXISTS retro_column_templates (
    organization_id UUID PRIMARY KEY REFERENCES organizations (id) ON DELETE CASCADE,
    columns JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon_name VARCHAR(50),
    editor_type VARCHAR(50),
    content_format VARCHAR(20) NOT NULL DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'in_progress', 'completed')),
    responsible_by_platform JSONB DEFAULT '{}',
    tasks JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id VARCHAR(255) NOT NULL,
    document_type_id INTEGER NOT NULL REFERENCES document_types(id),
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_grooming_diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id VARCHAR(255) NOT NULL UNIQUE,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_grooming_todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    deadline DATE,
    assignee VARCHAR(255),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES feature_documents(id) ON DELETE CASCADE,
    feature_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS story_task_positions (
    story_key VARCHAR(255) NOT NULL,
    task_key VARCHAR(255) NOT NULL,
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_key, task_key)
);

CREATE TABLE IF NOT EXISTS story_draft_tasks (
    id TEXT PRIMARY KEY,
    story_key TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    tags TEXT DEFAULT '[]',
    story_points INTEGER,
    test_points INTEGER,
    linked_task_ids TEXT DEFAULT '[]',
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS story_task_links (
    id VARCHAR(255) PRIMARY KEY,
    story_key VARCHAR(255) NOT NULL,
    from_task_id VARCHAR(255) NOT NULL,
    to_task_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_story_task_link UNIQUE (story_key, from_task_id, to_task_id),
    CONSTRAINT no_self_story_task_link CHECK (from_task_id != to_task_id)
);

CREATE TABLE IF NOT EXISTS quarterly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(board_id, year, quarter)
);

CREATE TABLE IF NOT EXISTS board_availability_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id INTEGER NOT NULL,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('vacation', 'tech_sprint', 'sick_leave', 'duty')),
    tech_sprint_type VARCHAR(10) CHECK (tech_sprint_type IS NULL OR tech_sprint_type IN ('web', 'back', 'qa')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date),
    CHECK (
        (event_type = 'tech_sprint' AND tech_sprint_type IS NOT NULL)
        OR (event_type <> 'tech_sprint' AND tech_sprint_type IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS admins (
    staff_uid UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_secrets (
    organization_id UUID PRIMARY KEY REFERENCES organizations (id) ON DELETE CASCADE,
    encrypted_tracker_token BYTEA NOT NULL,
    encryption_key_version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    tracker_user_id TEXT,
    display_name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    manual_override_flags JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    tracker_queue_key TEXT NOT NULL,
    tracker_board_id BIGINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, tracker_board_id)
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id UUID NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
    role_slug TEXT,
    PRIMARY KEY (team_id, staff_id)
);

CREATE TABLE IF NOT EXISTS system_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    domain_role TEXT NOT NULL DEFAULT 'other',
    platforms JSONB NOT NULL DEFAULT '[]',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_system_roles_slug UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS org_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    domain_role TEXT NOT NULL DEFAULT 'other',
    platforms JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, slug)
);

CREATE TABLE IF NOT EXISTS issue_snapshots (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    issue_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    tracker_updated_at TIMESTAMP WITH TIME ZONE,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, issue_key)
);

CREATE TABLE IF NOT EXISTS issue_changelog_events (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    issue_key TEXT NOT NULL,
    changelog JSONB NOT NULL DEFAULT '[]'::jsonb,
    comments JSONB NOT NULL DEFAULT '[]'::jsonb,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, issue_key)
);

CREATE TABLE IF NOT EXISTS sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    job_type TEXT CHECK (job_type IS NULL OR job_type IN ('incremental', 'initial_full', 'full_rescan')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_summary TEXT
);

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    user_id UUID,
    event_name TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL,
    actor_user_id UUID,
    kind TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_notifications_kind_check CHECK (
        kind IN (
            'assignee_changed',
            'availability_changed',
            'comment_mention',
            'sprint_started',
            'sprint_finished'
        )
    )
);

-- -----------------------------------------------------------------------------
-- Таблицы, которых не было в init.sql (раньше их создавал только runtime-DDL)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mcp_oauth_clients (
    client_id TEXT PRIMARY KEY,
    client_id_issued_at BIGINT NOT NULL,
    client_secret TEXT,
    client_secret_expires_at BIGINT,
    redirect_uris JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mcp_oauth_codes (
    code_hash TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES mcp_oauth_clients (client_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    organization_id UUID NOT NULL,
    code_challenge TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    resource TEXT,
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mcp_oauth_tokens (
    token_hash TEXT PRIMARY KEY,
    token_type TEXT NOT NULL CHECK (token_type IN ('access', 'refresh')),
    client_id TEXT NOT NULL REFERENCES mcp_oauth_clients (client_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    organization_id UUID NOT NULL,
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    resource TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Догоняющие правки для БД, созданных старым init.sql или runtime-DDL.
-- На свежей БД ничего не меняют.
-- -----------------------------------------------------------------------------

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'text',
    ADD COLUMN IF NOT EXISTS image_file_id UUID REFERENCES planner_files (id),
    ADD COLUMN IF NOT EXISTS parent JSONB,
    ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pending_approval_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS plan_patch_proposal_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS client_brand VARCHAR(16) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS replaces_comment_id UUID,
    ADD COLUMN IF NOT EXISTS replace_action VARCHAR(8),
    ADD COLUMN IF NOT EXISTS updated_by UUID,
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS deleted_by UUID;

ALTER TABLE agent_sessions
    ADD COLUMN IF NOT EXISTS agent_step VARCHAR(16),
    ADD COLUMN IF NOT EXISTS agent_step_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE agent_session_messages
    ADD COLUMN IF NOT EXISTS mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS client_brand VARCHAR(16),
    ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS skill_id VARCHAR(32),
    ADD COLUMN IF NOT EXISTS skill_params JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE plan_patch_position_previews
    ADD COLUMN IF NOT EXISTS client_brand VARCHAR(16) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS segments JSONB,
    ADD COLUMN IF NOT EXISTS sync_to_tracker BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE plan_patch_goal_previews
    ADD COLUMN IF NOT EXISTS client_brand VARCHAR(16) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS owner_id VARCHAR(255) NOT NULL DEFAULT '';

-- Приватные драфты: owner_id входит в первичный ключ превью. Строки старой схемы
-- (owner_id = '') никому не показываются, их снимает TTL.
DO $$
DECLARE
    t record;
    pk record;
BEGIN
    FOR t IN
        SELECT * FROM (VALUES
            ('plan_patch_position_previews', 'task_id'),
            ('plan_patch_goal_previews', 'goal_id')
        ) AS v(table_name, key_column)
    LOOP
        SELECT c.conname,
               ARRAY(SELECT a.attname::text
                       FROM unnest(c.conkey) AS k(attnum)
                       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS columns
          INTO pk
          FROM pg_constraint c
         WHERE c.conrelid = format('%I.%I', current_schema(), t.table_name)::regclass
           AND c.contype = 'p';
        IF pk.conname IS NOT NULL AND 'owner_id' = ANY (pk.columns) THEN
            CONTINUE;
        END IF;
        IF pk.conname IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', t.table_name, pk.conname);
        END IF;
        EXECUTE format(
            'ALTER TABLE %I ADD PRIMARY KEY (organization_id, sprint_id, owner_id, %I)',
            t.table_name, t.key_column
        );
    END LOOP;
END $$;

-- Файлы планера переехали из BYTEA в S3 (storage_key). Байты из старой колонки data
-- в S3 не переносятся: фото и схемы, ссылавшиеся на них, удаляются (так делал runtime-DDL).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'planner_files' AND column_name = 'data'
    ) THEN
        DELETE FROM comments WHERE kind = 'image' OR text LIKE '<!--bt-excalidraw-v1-->%';
        DELETE FROM planner_files;
        ALTER TABLE planner_files DROP COLUMN data;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'planner_files' AND column_name = 'storage_key'
    ) THEN
        ALTER TABLE planner_files ADD COLUMN storage_key TEXT;
        UPDATE planner_files SET storage_key = id::text WHERE storage_key IS NULL;
        ALTER TABLE planner_files ALTER COLUMN storage_key SET NOT NULL;
        ALTER TABLE planner_files ADD CONSTRAINT planner_files_storage_key_key UNIQUE (storage_key);
    END IF;
END $$;

-- Аналитика пишет события и без строки пользователя.
ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS analytics_events_user_id_fkey;

-- Старые CHECK части дня (< 3) могли называться не по умолчанию: снимаются по выражению.
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT c.relname AS table_name, con.conname
          FROM pg_constraint con
          JOIN pg_class c ON c.oid = con.conrelid
         WHERE c.relnamespace = current_schema()::regnamespace
           AND c.relname IN ('task_positions', 'task_position_segments', 'comments')
           AND con.contype = 'c'
           AND pg_get_constraintdef(con.oid) LIKE '%part%'
           AND pg_get_constraintdef(con.oid) LIKE '%< 3%'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.conname);
    END LOOP;
END $$;

-- CHECK-и, которые расширялись со временем: день 0..399, часть дня 0..3, новые виды заметок
-- и уведомлений. Выражения те же, что в CREATE TABLE выше.
ALTER TABLE task_positions
    DROP CONSTRAINT IF EXISTS task_positions_start_day_check,
    DROP CONSTRAINT IF EXISTS task_positions_start_part_check,
    DROP CONSTRAINT IF EXISTS task_positions_planned_start_day_check,
    DROP CONSTRAINT IF EXISTS task_positions_planned_start_part_check,
    ADD CONSTRAINT task_positions_start_day_check CHECK (start_day >= 0 AND start_day < 400),
    ADD CONSTRAINT task_positions_start_part_check CHECK (start_part >= 0 AND start_part < 4),
    ADD CONSTRAINT task_positions_planned_start_day_check
        CHECK (planned_start_day >= 0 AND planned_start_day < 400),
    ADD CONSTRAINT task_positions_planned_start_part_check
        CHECK (planned_start_part >= 0 AND planned_start_part < 4);

ALTER TABLE task_position_segments
    DROP CONSTRAINT IF EXISTS task_position_segments_start_day_check,
    DROP CONSTRAINT IF EXISTS task_position_segments_start_part_check,
    ADD CONSTRAINT task_position_segments_start_day_check CHECK (start_day >= 0 AND start_day < 400),
    ADD CONSTRAINT task_position_segments_start_part_check CHECK (start_part >= 0 AND start_part < 4);

-- Старые пиксельные сдвиги карточек сбрасываются в 0 (как в add-comment-card-row-height.sql).
UPDATE comments SET position_y = 0 WHERE position_y < 0 OR position_y > 9;

ALTER TABLE comments
    DROP CONSTRAINT IF EXISTS comments_day_check,
    DROP CONSTRAINT IF EXISTS comments_part_check,
    DROP CONSTRAINT IF EXISTS comments_kind_check,
    DROP CONSTRAINT IF EXISTS comments_position_y_layer_shift_check,
    ADD CONSTRAINT comments_day_check CHECK (day >= 0 AND day < 400),
    ADD CONSTRAINT comments_part_check CHECK (part >= 0 AND part < 4),
    ADD CONSTRAINT comments_kind_check CHECK (kind IN ('text', 'image', 'diagram', 'widget')),
    ADD CONSTRAINT comments_position_y_layer_shift_check
        CHECK (position_y IS NULL OR (position_y >= 0 AND position_y <= 9));

ALTER TABLE user_notifications
    DROP CONSTRAINT IF EXISTS user_notifications_kind_check,
    ADD CONSTRAINT user_notifications_kind_check CHECK (
        kind IN (
            'assignee_changed',
            'availability_changed',
            'comment_mention',
            'sprint_started',
            'sprint_finished'
        )
    );

-- Регистронезависимая уникальность slug организации (было только в init.master-tenant-addon.sql).
CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_slug_lower
    ON organizations (LOWER(TRIM(slug)))
    WHERE slug IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Индексы
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_plan_patch_position_previews_sprint
    ON plan_patch_position_previews (organization_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_plan_patch_goal_previews_sprint
    ON plan_patch_goal_previews (organization_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_owner ON agent_sessions (organization_id, owner_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_sprint ON agent_sessions (organization_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_agent_session_messages_session ON agent_session_messages (session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_comments_sprint_active
    ON comments (sprint_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_task_positions_sprint ON task_positions(sprint_id);

CREATE INDEX IF NOT EXISTS idx_task_positions_org_sprint ON task_positions(organization_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_task_positions_task ON task_positions(task_id);

CREATE INDEX IF NOT EXISTS idx_task_positions_assignee ON task_positions(assignee_id);

CREATE INDEX IF NOT EXISTS idx_task_positions_sprint_assignee ON task_positions(sprint_id, assignee_id);

CREATE INDEX IF NOT EXISTS idx_task_position_segments_position ON task_position_segments(organization_id, sprint_id, task_id);

CREATE INDEX IF NOT EXISTS idx_task_links_sprint ON task_links(sprint_id);

CREATE INDEX IF NOT EXISTS idx_task_links_org_sprint ON task_links(organization_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_task_links_from_task ON task_links(from_task_id);

CREATE INDEX IF NOT EXISTS idx_task_links_to_task ON task_links(to_task_id);

CREATE INDEX IF NOT EXISTS idx_task_links_sprint_from ON task_links(sprint_id, from_task_id);

CREATE INDEX IF NOT EXISTS idx_comments_sprint ON comments(sprint_id);

CREATE INDEX IF NOT EXISTS idx_comments_org_sprint ON comments(organization_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_comments_assignee ON comments(assignee_id);

CREATE INDEX IF NOT EXISTS idx_comments_sprint_assignee ON comments(sprint_id, assignee_id);

CREATE INDEX IF NOT EXISTS idx_planner_files_org ON planner_files(organization_id);

CREATE INDEX IF NOT EXISTS idx_comments_image_file ON comments(image_file_id)
    WHERE image_file_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_pending_approval ON comments(sprint_id)
    WHERE pending_approval = TRUE;

CREATE INDEX IF NOT EXISTS idx_comment_reactions_org_comment
    ON comment_reactions (organization_id, comment_id);

CREATE INDEX IF NOT EXISTS idx_sprint_goals_sprint ON sprint_goals(sprint_id);

CREATE INDEX IF NOT EXISTS idx_sprint_goals_org_sprint ON sprint_goals(organization_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_sprint_goals_sprint_type ON sprint_goals(sprint_id, goal_type);

CREATE INDEX IF NOT EXISTS idx_features_board_id ON features(board_id);

CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);

CREATE INDEX IF NOT EXISTS idx_features_created_at ON features(created_at);

CREATE INDEX IF NOT EXISTS idx_features_updated_at ON features(updated_at);

CREATE INDEX IF NOT EXISTS idx_features_board_status ON features(board_id, status);

CREATE INDEX IF NOT EXISTS idx_feature_documents_feature_id ON feature_documents(feature_id);

CREATE INDEX IF NOT EXISTS idx_feature_documents_type_id ON feature_documents(document_type_id);

CREATE INDEX IF NOT EXISTS idx_feature_documents_feature_order ON feature_documents(feature_id, display_order);

CREATE INDEX IF NOT EXISTS idx_feature_diagrams_feature_id ON feature_diagrams(feature_id);

CREATE INDEX IF NOT EXISTS idx_feature_diagrams_feature_order ON feature_diagrams(feature_id, display_order);

CREATE INDEX IF NOT EXISTS idx_feature_grooming_diagrams_feature_id ON feature_grooming_diagrams(feature_id);

CREATE INDEX IF NOT EXISTS idx_feature_grooming_todos_feature_id ON feature_grooming_todos(feature_id);

CREATE INDEX IF NOT EXISTS idx_feature_grooming_todos_feature_order ON feature_grooming_todos(feature_id, display_order);

CREATE INDEX IF NOT EXISTS idx_feature_grooming_todos_completed ON feature_grooming_todos(feature_id, completed);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);

CREATE INDEX IF NOT EXISTS idx_document_versions_feature_id ON document_versions(feature_id);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_version ON document_versions(document_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_task_positions_story_key ON story_task_positions(story_key);

CREATE INDEX IF NOT EXISTS idx_story_task_positions_task_key ON story_task_positions(task_key);

CREATE INDEX IF NOT EXISTS idx_story_draft_tasks_story_key ON story_draft_tasks(story_key);

CREATE INDEX IF NOT EXISTS idx_story_task_links_story_key ON story_task_links(story_key);

CREATE INDEX IF NOT EXISTS idx_story_task_links_from_task ON story_task_links(from_task_id);

CREATE INDEX IF NOT EXISTS idx_story_task_links_to_task ON story_task_links(to_task_id);

CREATE INDEX IF NOT EXISTS idx_story_task_links_story_from ON story_task_links(story_key, from_task_id);

CREATE INDEX IF NOT EXISTS idx_quarterly_plans_board ON quarterly_plans(board_id);

CREATE INDEX IF NOT EXISTS idx_quarterly_plans_year_quarter ON quarterly_plans(year, quarter);

CREATE INDEX IF NOT EXISTS idx_board_availability_events_board ON board_availability_events(board_id);

CREATE INDEX IF NOT EXISTS idx_board_availability_events_member ON board_availability_events(member_id);

CREATE INDEX IF NOT EXISTS idx_board_availability_events_dates ON board_availability_events(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_board_availability_events_type ON board_availability_events(event_type);

CREATE INDEX IF NOT EXISTS idx_organizations_sync_next_run_at ON organizations (sync_next_run_at)
    WHERE initial_sync_completed_at IS NOT NULL AND sync_next_run_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_organization ON staff (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_org_tracker_user ON staff (organization_id, tracker_user_id)
    WHERE tracker_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams (organization_id);

CREATE INDEX IF NOT EXISTS idx_teams_org_board ON teams (organization_id, tracker_board_id);

CREATE INDEX IF NOT EXISTS idx_team_members_staff ON team_members (staff_id);

CREATE INDEX IF NOT EXISTS idx_system_roles_sort ON system_roles (sort_order);

CREATE INDEX IF NOT EXISTS idx_org_roles_org ON org_roles (organization_id);

CREATE INDEX IF NOT EXISTS idx_issue_snapshots_org_synced ON issue_snapshots (organization_id, synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_issue_changelog_org_synced ON issue_changelog_events (organization_id, synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_runs_org_started ON sync_runs (organization_id, started_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_runs_one_running_per_org ON sync_runs (organization_id)
    WHERE status = 'running';

CREATE INDEX IF NOT EXISTS idx_analytics_events_org_name_time
    ON analytics_events (organization_id, event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_name_time
    ON analytics_events (user_id, event_name, occurred_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time_identified
    ON analytics_events (event_name, occurred_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_created
    ON user_notifications (organization_id, recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_unread
    ON user_notifications (organization_id, recipient_user_id, created_at DESC)
    WHERE read_at IS NULL;

-- -----------------------------------------------------------------------------
-- Триггеры updated_at
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_task_positions_updated_at ON task_positions;
CREATE TRIGGER update_task_positions_updated_at
    BEFORE UPDATE ON task_positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sprint_goals_updated_at ON sprint_goals;
CREATE TRIGGER update_sprint_goals_updated_at
    BEFORE UPDATE ON sprint_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_occupancy_task_order_updated_at ON occupancy_task_order;
CREATE TRIGGER update_occupancy_task_order_updated_at
    BEFORE UPDATE ON occupancy_task_order
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sprint_feature_lanes_updated_at ON sprint_feature_lanes;
CREATE TRIGGER update_sprint_feature_lanes_updated_at
    BEFORE UPDATE ON sprint_feature_lanes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_retro_boards_updated_at ON retro_boards;
CREATE TRIGGER update_retro_boards_updated_at
    BEFORE UPDATE ON retro_boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_retro_column_templates_updated_at ON retro_column_templates;
CREATE TRIGGER update_retro_column_templates_updated_at
    BEFORE UPDATE ON retro_column_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_features_updated_at ON features;
CREATE TRIGGER update_features_updated_at
    BEFORE UPDATE ON features FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_documents_updated_at ON feature_documents;
CREATE TRIGGER update_feature_documents_updated_at
    BEFORE UPDATE ON feature_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_diagrams_updated_at ON feature_diagrams;
CREATE TRIGGER update_feature_diagrams_updated_at
    BEFORE UPDATE ON feature_diagrams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_grooming_diagrams_updated_at ON feature_grooming_diagrams;
CREATE TRIGGER update_feature_grooming_diagrams_updated_at
    BEFORE UPDATE ON feature_grooming_diagrams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_grooming_todos_updated_at ON feature_grooming_todos;
CREATE TRIGGER update_feature_grooming_todos_updated_at
    BEFORE UPDATE ON feature_grooming_todos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_story_task_positions_updated_at ON story_task_positions;
CREATE TRIGGER update_story_task_positions_updated_at
    BEFORE UPDATE ON story_task_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_secrets_updated_at ON organization_secrets;
CREATE TRIGGER update_organization_secrets_updated_at
    BEFORE UPDATE ON organization_secrets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_roles_updated_at ON system_roles;
CREATE TRIGGER update_system_roles_updated_at
    BEFORE UPDATE ON system_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_roles_updated_at ON org_roles;
CREATE TRIGGER update_org_roles_updated_at
    BEFORE UPDATE ON org_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Справочники
-- -----------------------------------------------------------------------------

INSERT INTO document_types (code, name, icon_name, editor_type, content_format)
VALUES
    ('markdown', 'Markdown документ', 'file-text', 'mdx', 'text'),
    ('diagram', 'Диаграмма', 'diagram', 'excalidraw', 'jsonb'),
    ('test-plan', 'Тест план', 'test-plan', 'test-plan-editor', 'text')
ON CONFLICT (code) DO NOTHING;

INSERT INTO system_roles (slug, title, domain_role, platforms, sort_order) VALUES
    ('frontend', 'Фронтенд', 'developer', '["web"]', 10),
    ('backend', 'Бэкенд', 'developer', '["back"]', 20),
    ('qa', 'QA', 'tester', '[]', 30),
    ('teamlead', 'Тимлид', 'developer', '["web","back"]', 40)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Описания
-- -----------------------------------------------------------------------------

COMMENT ON TABLE sprint_plan_captures IS 'Черновик плана до рабочего статуса и якорь на момент перехода в работу';

COMMENT ON TABLE swimlane_card_layers IS 'Слой карточки в строке свимлейна, заданный вручную';

COMMENT ON TABLE plan_patch_position_previews IS 'Полупрозрачные карточки propose_plan_patch до apply';

COMMENT ON TABLE plan_patch_applied_tokens IS 'Применённые токены apply_plan_patch (sha256 токена); строки старше expires_at удаляются при следующем применении';

COMMENT ON TABLE plan_patch_goal_previews IS 'Предложения propose_plan_patch по целям спринта до apply';

COMMENT ON TABLE agent_sessions IS 'Сессии работы с агентом: просьба из планера или чата, драфты и переписка; приватны владельцу';

COMMENT ON TABLE comment_reactions IS 'Реакции на заметки свимлейна: одна строка = голос пользователя за emoji';

COMMENT ON COLUMN comment_reactions.user_id IS 'id сессии продукта (UUID) или on-prem идентификатор';

COMMENT ON TABLE task_positions IS 'Позиции задач на свимлейнах спринтов';

COMMENT ON TABLE task_position_segments IS 'Отрезки фазы занятости (дробление плановой фазы на несколько отрезков)';

COMMENT ON TABLE task_links IS 'Связи между задачами (стрелки)';

COMMENT ON TABLE comments IS 'Комментарии на свимлейнах';

COMMENT ON COLUMN comments.height IS
    'Вертикальный span на свимлейне: число строк карточки (1:1 с width в частях таймлайна)';

COMMENT ON COLUMN comments.position_y IS
    'Сдвиг карточки вверх в строках свимлейна (layerShiftUp); 0 = без сдвига';

COMMENT ON COLUMN comments.created_by IS 'uuid сотрудника из public.registry_employees (автор заметки)';

COMMENT ON TABLE sprint_goals IS 'Цели спринта (Delivery и Discovery)';

COMMENT ON TABLE occupancy_task_order IS 'Порядок стори и задач во вкладке «Занятость»';

COMMENT ON TABLE sprint_feature_lanes IS 'Черновые строки фич и порядок/видимость доски «по фичам»';

COMMENT ON TABLE retro_boards IS 'Доска ретро спринта: колонки и карточки';

COMMENT ON TABLE sprint_metrics IS 'Факты по задачам спринта для дашборда метрик; закончившиеся спринты заморожены';

COMMENT ON TABLE retro_column_templates IS 'Шаблон колонок ретро организации. Не переписывает сохранённые доски спринтов';

COMMENT ON TABLE document_types IS 'Справочник типов документов';

COMMENT ON TABLE features IS 'Фичи проекта, привязанные к доскам';

COMMENT ON TABLE feature_documents IS 'Документы стори (привязаны к ключу стори из трекера)';

COMMENT ON TABLE feature_diagrams IS 'Excalidraw диаграммы стори';

COMMENT ON TABLE feature_grooming_diagrams IS 'Диаграммы груминга стори';

COMMENT ON TABLE feature_grooming_todos IS 'TODO элементы груминга стори';

COMMENT ON TABLE document_versions IS 'История версий документов (changelog)';

COMMENT ON TABLE story_task_positions IS 'Позиции задач на доске планирования стори';

COMMENT ON TABLE story_draft_tasks IS 'Драфт-задачи стори';

COMMENT ON TABLE story_task_links IS 'Связи между задачами стори (стрелки)';

COMMENT ON TABLE quarterly_plans IS 'Квартальные планы для досок';

COMMENT ON TABLE board_availability_events IS 'События доступности участников доски (отпуск, техспринт, больничный, дежурство)';

COMMENT ON TABLE admins IS 'Админы продукта: staff_uid = public.staff.id; полный доступ в админке ко всем организациям';

COMMENT ON COLUMN admins.staff_uid IS 'uuid сотрудника из public.staff';

COMMENT ON TABLE organizations IS 'Клиентские организации (tenant); settings.sync — интервал, overlap и т.д.';

COMMENT ON COLUMN organizations.initial_sync_completed_at IS 'NULL пока не завершена первая полная синхронизация после подключения трекера';

COMMENT ON TABLE organization_secrets IS 'Серверный OAuth-токен трекера (ciphertext); версия ключа для ротации';

COMMENT ON TABLE staff IS 'Сотрудники организации; связь с трекером через tracker_user_id';

COMMENT ON COLUMN staff.avatar_url IS 'URL изображения аватара сотрудника';

COMMENT ON TABLE teams IS 'Команда с привязкой к очереди и доске трекера (резолв по boardId)';

COMMENT ON TABLE system_roles IS 'Глобальные системные роли (сид при инициализации); не удалять через org_admin UI';

COMMENT ON TABLE org_roles IS 'Пользовательские роли организации';

COMMENT ON TABLE issue_snapshots IS 'Нормализованный снимок issue для UI/бэклога';

COMMENT ON TABLE issue_changelog_events IS 'Кеш ответа Tracker: changelog + comments по задаче (синк и API)';

COMMENT ON TABLE sync_runs IS 'Аудит прогонов экспортёра; stats — watermark, cursor, requested_since и т.д.';

COMMENT ON TABLE analytics_events IS 'Append-only продуктовая аналитика; формат события в payload JSONB';

COMMENT ON COLUMN analytics_events.event_name IS 'client_settings, page_view, ui_click, … — список на уровне приложения';

COMMENT ON COLUMN analytics_events.occurred_at IS 'Время на клиенте; ingested_at — когда строка попала в БД';

COMMENT ON COLUMN analytics_events.user_id IS 'uuid сотрудника из public.registry_employees (сессия продукта); без FK';

COMMENT ON TABLE user_notifications IS 'In-app уведомления: assignee, availability, sprint start/finish';
