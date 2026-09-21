CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS beer_tracker;

-- public нужен для uuid_generate_v4() из uuid-ossp и других расширений
SET search_path TO beer_tracker, public;

-- -----------------------------------------------------------------------------
-- Функция для автообновления updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION beer_tracker.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Базовые мультиарендные сущности, на которые ссылаются ранние таблицы
-- -----------------------------------------------------------------------------
CREATE TABLE beer_tracker.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug CITEXT UNIQUE,
    tracker_org_id TEXT NOT NULL DEFAULT '',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    sync_next_run_at TIMESTAMP WITH TIME ZONE,
    initial_sync_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Спринты: позиции, связи, комментарии
-- -----------------------------------------------------------------------------
CREATE TABLE beer_tracker.task_positions (
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    assignee_id VARCHAR(255) NOT NULL,
    -- day index: 0 .. MAX_PLANNER_DAY_INDEX (399); variable-length sprints
    start_day INTEGER NOT NULL CHECK (start_day >= 0 AND start_day < 400),
    start_part INTEGER NOT NULL CHECK (start_part >= 0 AND start_part < 3),
    duration INTEGER NOT NULL CHECK (duration > 0),
    planned_start_day INTEGER CHECK (planned_start_day >= 0 AND planned_start_day < 400),
    planned_start_part INTEGER CHECK (planned_start_part >= 0 AND planned_start_part < 3),
    planned_duration INTEGER CHECK (planned_duration > 0),
    is_qa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id, task_id)
);

CREATE TABLE beer_tracker.task_position_segments (
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    task_id VARCHAR(255) NOT NULL,
    segment_index INTEGER NOT NULL CHECK (segment_index >= 0),
    start_day INTEGER NOT NULL CHECK (start_day >= 0 AND start_day < 400),
    start_part INTEGER NOT NULL CHECK (start_part >= 0 AND start_part < 3),
    duration INTEGER NOT NULL CHECK (duration > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id, task_id, segment_index),
    CONSTRAINT fk_task_position
        FOREIGN KEY (organization_id, sprint_id, task_id)
        REFERENCES beer_tracker.task_positions(organization_id, sprint_id, task_id)
        ON DELETE CASCADE
);

CREATE TABLE beer_tracker.task_links (
    id VARCHAR(255) PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    from_task_id VARCHAR(255) NOT NULL,
    to_task_id VARCHAR(255) NOT NULL,
    from_anchor VARCHAR(10) CHECK (from_anchor IN ('left', 'right', 'top', 'bottom')),
    to_anchor VARCHAR(10) CHECK (to_anchor IN ('left', 'right', 'top', 'bottom')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_link UNIQUE (organization_id, sprint_id, from_task_id, to_task_id),
    CONSTRAINT no_self_link CHECK (from_task_id != to_task_id)
);

CREATE TABLE beer_tracker.planner_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    content_type VARCHAR(64) NOT NULL,
    byte_size INTEGER NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beer_tracker.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    assignee_id VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    position_x FLOAT,
    position_y FLOAT,
    day INTEGER CHECK (day >= 0 AND day < 400),
    part INTEGER CHECK (part >= 0 AND part < 3),
    width INTEGER DEFAULT 200,
    height INTEGER DEFAULT 2
        CHECK (height >= 1 AND height <= 10),
    color VARCHAR(16) NOT NULL DEFAULT 'yellow'
        CHECK (color IN ('yellow', 'pink', 'green', 'blue', 'gray')),
    kind VARCHAR(16) NOT NULL DEFAULT 'text'
        CHECK (kind IN ('text', 'image', 'diagram')),
    parent JSONB,
    image_file_id UUID REFERENCES beer_tracker.planner_files (id),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_positions_sprint ON beer_tracker.task_positions(sprint_id);
CREATE INDEX idx_task_positions_org_sprint ON beer_tracker.task_positions(organization_id, sprint_id);
CREATE INDEX idx_task_positions_task ON beer_tracker.task_positions(task_id);
CREATE INDEX idx_task_positions_assignee ON beer_tracker.task_positions(assignee_id);
CREATE INDEX idx_task_positions_sprint_assignee ON beer_tracker.task_positions(sprint_id, assignee_id);
CREATE INDEX idx_task_position_segments_position ON beer_tracker.task_position_segments(organization_id, sprint_id, task_id);

CREATE INDEX idx_task_links_sprint ON beer_tracker.task_links(sprint_id);
CREATE INDEX idx_task_links_org_sprint ON beer_tracker.task_links(organization_id, sprint_id);
CREATE INDEX idx_task_links_from_task ON beer_tracker.task_links(from_task_id);
CREATE INDEX idx_task_links_to_task ON beer_tracker.task_links(to_task_id);
CREATE INDEX idx_task_links_sprint_from ON beer_tracker.task_links(sprint_id, from_task_id);

CREATE INDEX idx_comments_sprint ON beer_tracker.comments(sprint_id);
CREATE INDEX idx_comments_org_sprint ON beer_tracker.comments(organization_id, sprint_id);
CREATE INDEX idx_comments_assignee ON beer_tracker.comments(assignee_id);
CREATE INDEX idx_comments_sprint_assignee ON beer_tracker.comments(sprint_id, assignee_id);
CREATE INDEX idx_planner_files_org ON beer_tracker.planner_files(organization_id);
CREATE INDEX idx_comments_image_file ON beer_tracker.comments(image_file_id)
    WHERE image_file_id IS NOT NULL;

CREATE TABLE beer_tracker.comment_reactions (
    organization_id UUID NOT NULL
        REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    comment_id UUID NOT NULL
        REFERENCES beer_tracker.comments (id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    emoji VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id, user_id, emoji),
    CONSTRAINT comment_reactions_emoji_check
        CHECK (char_length(btrim(emoji)) > 0 AND char_length(emoji) <= 32)
);

CREATE INDEX idx_comment_reactions_org_comment
    ON beer_tracker.comment_reactions (organization_id, comment_id);

COMMENT ON TABLE beer_tracker.comment_reactions IS 'Реакции на заметки свимлейна: одна строка = голос пользователя за emoji';
COMMENT ON COLUMN beer_tracker.comment_reactions.user_id IS 'id сессии продукта (UUID) или on-prem идентификатор';

CREATE TRIGGER update_task_positions_updated_at
    BEFORE UPDATE ON beer_tracker.task_positions
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON beer_tracker.comments
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.task_positions IS 'Позиции задач на свимлейнах спринтов';
COMMENT ON TABLE beer_tracker.task_position_segments IS 'Отрезки фазы занятости (дробление плановой фазы на несколько отрезков)';
COMMENT ON TABLE beer_tracker.task_links IS 'Связи между задачами (стрелки)';
COMMENT ON TABLE beer_tracker.comments IS 'Комментарии на свимлейнах';
COMMENT ON COLUMN beer_tracker.comments.height IS
    'Вертикальный span на свимлейне: число строк карточки (1:1 с width в частях таймлайна)';
COMMENT ON COLUMN beer_tracker.comments.position_y IS
    'Сдвиг карточки вверх в строках свимлейна (layerShiftUp); 0 = без сдвига';
COMMENT ON COLUMN beer_tracker.comments.created_by IS 'uuid сотрудника из public.registry_employees (автор заметки)';

CREATE TABLE beer_tracker.sprint_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    team TEXT,
    text TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('delivery', 'discovery')),
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sprint_goals_sprint ON beer_tracker.sprint_goals(sprint_id);
CREATE INDEX idx_sprint_goals_org_sprint ON beer_tracker.sprint_goals(organization_id, sprint_id);
CREATE INDEX idx_sprint_goals_sprint_type ON beer_tracker.sprint_goals(sprint_id, goal_type);

CREATE TRIGGER update_sprint_goals_updated_at
    BEFORE UPDATE ON beer_tracker.sprint_goals
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.sprint_goals IS 'Цели спринта (Delivery и Discovery)';

-- Порядок стори и задач во вкладке «Занятость»
CREATE TABLE beer_tracker.occupancy_task_order (
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    parent_ids JSONB NOT NULL DEFAULT '[]',
    task_orders JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id)
);

CREATE TRIGGER update_occupancy_task_order_updated_at
    BEFORE UPDATE ON beer_tracker.occupancy_task_order
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.occupancy_task_order IS 'Порядок стори и задач во вкладке «Занятость»';

-- Локальные строки фич планера (не тикеты Трекера)
CREATE TABLE beer_tracker.sprint_feature_lanes (
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    draft_rows JSONB NOT NULL DEFAULT '[]',
    order_ids JSONB NOT NULL DEFAULT '[]',
    hidden_ids JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id)
);

CREATE TRIGGER update_sprint_feature_lanes_updated_at
    BEFORE UPDATE ON beer_tracker.sprint_feature_lanes
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.sprint_feature_lanes IS 'Черновые строки фич и порядок/видимость доски «по фичам»';

-- -----------------------------------------------------------------------------
-- Справочник типов документов
-- -----------------------------------------------------------------------------
CREATE TABLE beer_tracker.document_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon_name VARCHAR(50),
    editor_type VARCHAR(50),
    content_format VARCHAR(20) NOT NULL DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO beer_tracker.document_types (code, name, icon_name, editor_type, content_format)
VALUES
    ('markdown', 'Markdown документ', 'file-text', 'mdx', 'text'),
    ('diagram', 'Диаграмма', 'diagram', 'excalidraw', 'jsonb'),
    ('test-plan', 'Тест план', 'test-plan', 'test-plan-editor', 'text');

COMMENT ON TABLE beer_tracker.document_types IS 'Справочник типов документов';

-- -----------------------------------------------------------------------------
-- Фичи (эпики/стори), документы и диаграммы
-- -----------------------------------------------------------------------------
CREATE TABLE beer_tracker.features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'in_progress', 'completed')),
    responsible_by_platform JSONB DEFAULT '{}',
    tasks JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beer_tracker.feature_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_id VARCHAR(255) NOT NULL,
    document_type_id INTEGER NOT NULL REFERENCES beer_tracker.document_types(id),
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beer_tracker.feature_diagrams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beer_tracker.feature_grooming_diagrams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_id VARCHAR(255) NOT NULL UNIQUE,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beer_tracker.feature_grooming_todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_id VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    deadline DATE,
    assignee VARCHAR(255),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_features_board_id ON beer_tracker.features(board_id);
CREATE INDEX idx_features_status ON beer_tracker.features(status);
CREATE INDEX idx_features_created_at ON beer_tracker.features(created_at);
CREATE INDEX idx_features_updated_at ON beer_tracker.features(updated_at);
CREATE INDEX idx_features_board_status ON beer_tracker.features(board_id, status);

CREATE INDEX idx_feature_documents_feature_id ON beer_tracker.feature_documents(feature_id);
CREATE INDEX idx_feature_documents_type_id ON beer_tracker.feature_documents(document_type_id);
CREATE INDEX idx_feature_documents_feature_order ON beer_tracker.feature_documents(feature_id, display_order);

CREATE INDEX idx_feature_diagrams_feature_id ON beer_tracker.feature_diagrams(feature_id);
CREATE INDEX idx_feature_diagrams_feature_order ON beer_tracker.feature_diagrams(feature_id, display_order);

CREATE INDEX idx_feature_grooming_diagrams_feature_id ON beer_tracker.feature_grooming_diagrams(feature_id);
CREATE INDEX idx_feature_grooming_todos_feature_id ON beer_tracker.feature_grooming_todos(feature_id);
CREATE INDEX idx_feature_grooming_todos_feature_order ON beer_tracker.feature_grooming_todos(feature_id, display_order);
CREATE INDEX idx_feature_grooming_todos_completed ON beer_tracker.feature_grooming_todos(feature_id, completed);

CREATE TRIGGER update_features_updated_at
    BEFORE UPDATE ON beer_tracker.features FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();
CREATE TRIGGER update_feature_documents_updated_at
    BEFORE UPDATE ON beer_tracker.feature_documents FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();
CREATE TRIGGER update_feature_diagrams_updated_at
    BEFORE UPDATE ON beer_tracker.feature_diagrams FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();
CREATE TRIGGER update_feature_grooming_diagrams_updated_at
    BEFORE UPDATE ON beer_tracker.feature_grooming_diagrams FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();
CREATE TRIGGER update_feature_grooming_todos_updated_at
    BEFORE UPDATE ON beer_tracker.feature_grooming_todos FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.features IS 'Фичи проекта, привязанные к доскам';
COMMENT ON TABLE beer_tracker.feature_documents IS 'Документы стори (привязаны к ключу стори из трекера)';
COMMENT ON TABLE beer_tracker.feature_diagrams IS 'Excalidraw диаграммы стори';
COMMENT ON TABLE beer_tracker.feature_grooming_diagrams IS 'Диаграммы груминга стори';
COMMENT ON TABLE beer_tracker.feature_grooming_todos IS 'TODO элементы груминга стори';

-- -----------------------------------------------------------------------------
-- Версии документов
-- -----------------------------------------------------------------------------
CREATE TABLE beer_tracker.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES beer_tracker.feature_documents(id) ON DELETE CASCADE,
    feature_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_document_versions_document_id ON beer_tracker.document_versions(document_id);
CREATE INDEX idx_document_versions_feature_id ON beer_tracker.document_versions(feature_id);
CREATE INDEX idx_document_versions_document_version ON beer_tracker.document_versions(document_id, version_number DESC);
CREATE INDEX idx_document_versions_created_at ON beer_tracker.document_versions(created_at DESC);

COMMENT ON TABLE beer_tracker.document_versions IS 'История версий документов (changelog)';

-- -----------------------------------------------------------------------------
-- Стори: позиции задач, драфт-задачи, связи
-- -----------------------------------------------------------------------------
CREATE TABLE beer_tracker.story_task_positions (
    story_key VARCHAR(255) NOT NULL,
    task_key VARCHAR(255) NOT NULL,
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_key, task_key)
);

CREATE TABLE beer_tracker.story_draft_tasks (
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

CREATE TABLE beer_tracker.story_task_links (
    id VARCHAR(255) PRIMARY KEY,
    story_key VARCHAR(255) NOT NULL,
    from_task_id VARCHAR(255) NOT NULL,
    to_task_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_story_task_link UNIQUE (story_key, from_task_id, to_task_id),
    CONSTRAINT no_self_story_task_link CHECK (from_task_id != to_task_id)
);

CREATE INDEX idx_story_task_positions_story_key ON beer_tracker.story_task_positions(story_key);
CREATE INDEX idx_story_task_positions_task_key ON beer_tracker.story_task_positions(task_key);
CREATE INDEX idx_story_draft_tasks_story_key ON beer_tracker.story_draft_tasks(story_key);
CREATE INDEX idx_story_task_links_story_key ON beer_tracker.story_task_links(story_key);
CREATE INDEX idx_story_task_links_from_task ON beer_tracker.story_task_links(from_task_id);
CREATE INDEX idx_story_task_links_to_task ON beer_tracker.story_task_links(to_task_id);
CREATE INDEX idx_story_task_links_story_from ON beer_tracker.story_task_links(story_key, from_task_id);

CREATE TRIGGER update_story_task_positions_updated_at
    BEFORE UPDATE ON beer_tracker.story_task_positions FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.story_task_positions IS 'Позиции задач на доске планирования стори';
COMMENT ON TABLE beer_tracker.story_draft_tasks IS 'Драфт-задачи стори';
COMMENT ON TABLE beer_tracker.story_task_links IS 'Связи между задачами стори (стрелки)';

-- -----------------------------------------------------------------------------
-- Квартальное планирование
-- -----------------------------------------------------------------------------
CREATE TABLE beer_tracker.quarterly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(board_id, year, quarter)
);

-- События доступности по доске (не привязаны к квартальному плану):
-- отпуск, техспринт, больничный, дежурство — могут пересекать границы кварталов.
CREATE TABLE beer_tracker.board_availability_events (
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

CREATE INDEX idx_quarterly_plans_board ON beer_tracker.quarterly_plans(board_id);
CREATE INDEX idx_quarterly_plans_year_quarter ON beer_tracker.quarterly_plans(year, quarter);
CREATE INDEX idx_board_availability_events_board ON beer_tracker.board_availability_events(board_id);
CREATE INDEX idx_board_availability_events_member ON beer_tracker.board_availability_events(member_id);
CREATE INDEX idx_board_availability_events_dates ON beer_tracker.board_availability_events(start_date, end_date);
CREATE INDEX idx_board_availability_events_type ON beer_tracker.board_availability_events(event_type);

COMMENT ON TABLE beer_tracker.quarterly_plans IS 'Квартальные планы для досок';
COMMENT ON TABLE beer_tracker.board_availability_events IS 'События доступности участников доски (отпуск, техспринт, больничный, дежурство)';

-- -----------------------------------------------------------------------------
-- Мультиарендность и данные экспортёра (no-vendor-lock): чистая БД через init.sql
-- -----------------------------------------------------------------------------

CREATE TABLE beer_tracker.admins (
    staff_uid UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE beer_tracker.admins IS 'Админы продукта: staff_uid = beer_tracker.staff.id; полный доступ в админке ко всем организациям';
COMMENT ON COLUMN beer_tracker.admins.staff_uid IS 'uuid сотрудника из beer_tracker.staff';

CREATE TABLE IF NOT EXISTS beer_tracker.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug CITEXT UNIQUE,
    tracker_org_id TEXT NOT NULL DEFAULT '',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    sync_next_run_at TIMESTAMP WITH TIME ZONE,
    initial_sync_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_sync_next_run_at ON beer_tracker.organizations (sync_next_run_at)
    WHERE initial_sync_completed_at IS NOT NULL AND sync_next_run_at IS NOT NULL;

COMMENT ON TABLE beer_tracker.organizations IS 'Клиентские организации (tenant); settings.sync — интервал, overlap и т.д.';
COMMENT ON COLUMN beer_tracker.organizations.initial_sync_completed_at IS 'NULL пока не завершена первая полная синхронизация после подключения трекера';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON beer_tracker.organizations
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

CREATE TABLE beer_tracker.organization_secrets (
    organization_id UUID PRIMARY KEY REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    encrypted_tracker_token BYTEA NOT NULL,
    encryption_key_version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_organization_secrets_updated_at
    BEFORE UPDATE ON beer_tracker.organization_secrets
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.organization_secrets IS 'Серверный OAuth-токен трекера (ciphertext); версия ключа для ротации';

CREATE TABLE beer_tracker.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    tracker_user_id TEXT,
    display_name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    manual_override_flags JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_organization ON beer_tracker.staff (organization_id);
CREATE UNIQUE INDEX uq_staff_org_tracker_user ON beer_tracker.staff (organization_id, tracker_user_id)
    WHERE tracker_user_id IS NOT NULL;

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON beer_tracker.staff
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.staff IS 'Сотрудники организации; связь с трекером через tracker_user_id';
COMMENT ON COLUMN beer_tracker.staff.avatar_url IS 'URL изображения аватара сотрудника';

CREATE TABLE beer_tracker.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    tracker_queue_key TEXT NOT NULL,
    tracker_board_id BIGINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, tracker_board_id)
);

CREATE INDEX idx_teams_organization ON beer_tracker.teams (organization_id);
CREATE INDEX idx_teams_org_board ON beer_tracker.teams (organization_id, tracker_board_id);

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON beer_tracker.teams
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.teams IS 'Команда с привязкой к очереди и доске трекера (резолв по boardId)';

CREATE TABLE beer_tracker.team_members (
    team_id UUID NOT NULL REFERENCES beer_tracker.teams (id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES beer_tracker.staff (id) ON DELETE CASCADE,
    role_slug TEXT,
    PRIMARY KEY (team_id, staff_id)
);

CREATE INDEX idx_team_members_staff ON beer_tracker.team_members (staff_id);

CREATE TABLE beer_tracker.system_roles (
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

CREATE INDEX idx_system_roles_sort ON beer_tracker.system_roles (sort_order);

CREATE TRIGGER update_system_roles_updated_at
    BEFORE UPDATE ON beer_tracker.system_roles
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.system_roles IS 'Глобальные системные роли (сид при инициализации); не удалять через org_admin UI';

INSERT INTO beer_tracker.system_roles (slug, title, domain_role, platforms, sort_order) VALUES
    ('frontend', 'Фронтенд', 'developer', '["web"]', 10),
    ('backend', 'Бэкенд', 'developer', '["back"]', 20),
    ('qa', 'QA', 'tester', '[]', 30),
    ('teamlead', 'Тимлид', 'developer', '["web","back"]', 40);

CREATE TABLE beer_tracker.org_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    domain_role TEXT NOT NULL DEFAULT 'other',
    platforms JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, slug)
);

CREATE INDEX idx_org_roles_org ON beer_tracker.org_roles (organization_id);

CREATE TRIGGER update_org_roles_updated_at
    BEFORE UPDATE ON beer_tracker.org_roles
    FOR EACH ROW EXECUTE FUNCTION beer_tracker.update_updated_at_column();

COMMENT ON TABLE beer_tracker.org_roles IS 'Пользовательские роли организации';

CREATE TABLE beer_tracker.issue_snapshots (
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    issue_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    tracker_updated_at TIMESTAMP WITH TIME ZONE,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, issue_key)
);

CREATE INDEX idx_issue_snapshots_org_synced ON beer_tracker.issue_snapshots (organization_id, synced_at DESC);

COMMENT ON TABLE beer_tracker.issue_snapshots IS 'Нормализованный снимок issue для UI/бэклога';

CREATE TABLE beer_tracker.issue_changelog_events (
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    issue_key TEXT NOT NULL,
    changelog JSONB NOT NULL DEFAULT '[]'::jsonb,
    comments JSONB NOT NULL DEFAULT '[]'::jsonb,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, issue_key)
);

CREATE INDEX idx_issue_changelog_org_synced ON beer_tracker.issue_changelog_events (organization_id, synced_at DESC);

COMMENT ON TABLE beer_tracker.issue_changelog_events IS 'Кеш ответа Tracker: changelog + comments по задаче (синк и API)';

CREATE TABLE beer_tracker.sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    job_type TEXT CHECK (job_type IS NULL OR job_type IN ('incremental', 'initial_full', 'full_rescan')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_summary TEXT
);

CREATE INDEX idx_sync_runs_org_started ON beer_tracker.sync_runs (organization_id, started_at DESC);

CREATE UNIQUE INDEX uq_sync_runs_one_running_per_org ON beer_tracker.sync_runs (organization_id)
    WHERE status = 'running';

COMMENT ON TABLE beer_tracker.sync_runs IS 'Аудит прогонов экспортёра; stats — watermark, cursor, requested_since и т.д.';

-- -----------------------------------------------------------------------------
-- Продуктовая аналитика (снимки настроек, просмотры, клики — payload JSONB)
-- -----------------------------------------------------------------------------
CREATE TABLE beer_tracker.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
    user_id UUID,
    event_name TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_events_org_name_time
    ON beer_tracker.analytics_events (organization_id, event_name, occurred_at DESC);

CREATE INDEX idx_analytics_events_user_name_time
    ON beer_tracker.analytics_events (user_id, event_name, occurred_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_analytics_events_name_time_identified
    ON beer_tracker.analytics_events (event_name, occurred_at DESC)
    WHERE user_id IS NOT NULL;

COMMENT ON TABLE beer_tracker.analytics_events IS 'Append-only продуктовая аналитика; формат события в payload JSONB';
COMMENT ON COLUMN beer_tracker.analytics_events.event_name IS 'client_settings, page_view, ui_click, … — список на уровне приложения';
COMMENT ON COLUMN beer_tracker.analytics_events.occurred_at IS 'Время на клиенте; ingested_at — когда строка попала в БД';
COMMENT ON COLUMN beer_tracker.analytics_events.user_id IS 'uuid сотрудника из public.registry_employees (сессия продукта); без FK';

CREATE TABLE beer_tracker.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES beer_tracker.organizations (id) ON DELETE CASCADE,
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

CREATE INDEX idx_user_notifications_recipient_created
    ON beer_tracker.user_notifications (organization_id, recipient_user_id, created_at DESC);

CREATE INDEX idx_user_notifications_recipient_unread
    ON beer_tracker.user_notifications (organization_id, recipient_user_id, created_at DESC)
    WHERE read_at IS NULL;

COMMENT ON TABLE beer_tracker.user_notifications IS 'In-app уведомления: assignee, availability, sprint start/finish';

-- Системная организация для /demo/planner.
-- При APP_DEPLOYMENT_MODE=onprem приложение удаляет эту строку при старте Node (см. lib/onPrem/removeDemoSystemOrganization.ts).
INSERT INTO beer_tracker.organizations (id, name, slug, tracker_org_id, settings)
VALUES (
    'f0000000-0000-4000-8000-000000000001',
    'Demo (Beer Tracker)',
    '__beer_tracker_system_demo__',
    '',
    '{}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
