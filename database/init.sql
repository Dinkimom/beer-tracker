SET search_path TO public;

-- -----------------------------------------------------------------------------
-- Функция для автообновления updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- Базовые мультиарендные сущности, на которые ссылаются ранние таблицы
-- -----------------------------------------------------------------------------
CREATE TABLE public.organizations (
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

-- -----------------------------------------------------------------------------
-- Спринты: позиции, связи, комментарии
-- -----------------------------------------------------------------------------
CREATE TABLE public.task_positions (
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
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

CREATE TABLE public.task_position_segments (
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
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
        REFERENCES public.task_positions(organization_id, sprint_id, task_id)
        ON DELETE CASCADE
);

-- Черновик раскладки до взятия в работу и замороженный якорь на момент перехода.
CREATE TABLE public.sprint_plan_captures (
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
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

COMMENT ON TABLE public.sprint_plan_captures IS 'Черновик плана до рабочего статуса и якорь на момент перехода в работу';

CREATE TABLE public.task_links (
    id VARCHAR(255) PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    from_task_id VARCHAR(255) NOT NULL,
    to_task_id VARCHAR(255) NOT NULL,
    from_anchor VARCHAR(10) CHECK (from_anchor IN ('left', 'right', 'top', 'bottom')),
    to_anchor VARCHAR(10) CHECK (to_anchor IN ('left', 'right', 'top', 'bottom')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_link UNIQUE (organization_id, sprint_id, from_task_id, to_task_id),
    CONSTRAINT no_self_link CHECK (from_task_id != to_task_id)
);

CREATE TABLE public.planner_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    content_type VARCHAR(64) NOT NULL,
    byte_size INTEGER NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
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
        CHECK (kind IN ('text', 'image', 'diagram')),
    parent JSONB,
    image_file_id UUID REFERENCES public.planner_files (id),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pending_approval BOOLEAN NOT NULL DEFAULT FALSE,
    pending_approval_expires_at TIMESTAMP WITH TIME ZONE,
    plan_patch_proposal_id VARCHAR(64)
);

CREATE INDEX idx_task_positions_sprint ON public.task_positions(sprint_id);
CREATE INDEX idx_task_positions_org_sprint ON public.task_positions(organization_id, sprint_id);
CREATE INDEX idx_task_positions_task ON public.task_positions(task_id);
CREATE INDEX idx_task_positions_assignee ON public.task_positions(assignee_id);
CREATE INDEX idx_task_positions_sprint_assignee ON public.task_positions(sprint_id, assignee_id);
CREATE INDEX idx_task_position_segments_position ON public.task_position_segments(organization_id, sprint_id, task_id);

CREATE INDEX idx_task_links_sprint ON public.task_links(sprint_id);
CREATE INDEX idx_task_links_org_sprint ON public.task_links(organization_id, sprint_id);
CREATE INDEX idx_task_links_from_task ON public.task_links(from_task_id);
CREATE INDEX idx_task_links_to_task ON public.task_links(to_task_id);
CREATE INDEX idx_task_links_sprint_from ON public.task_links(sprint_id, from_task_id);

CREATE INDEX idx_comments_sprint ON public.comments(sprint_id);
CREATE INDEX idx_comments_org_sprint ON public.comments(organization_id, sprint_id);
CREATE INDEX idx_comments_assignee ON public.comments(assignee_id);
CREATE INDEX idx_comments_sprint_assignee ON public.comments(sprint_id, assignee_id);
CREATE INDEX idx_planner_files_org ON public.planner_files(organization_id);
CREATE INDEX idx_comments_image_file ON public.comments(image_file_id)
    WHERE image_file_id IS NOT NULL;
CREATE INDEX idx_comments_pending_approval ON public.comments(sprint_id)
    WHERE pending_approval = TRUE;

CREATE TABLE public.comment_reactions (
    organization_id UUID NOT NULL
        REFERENCES public.organizations (id) ON DELETE CASCADE,
    comment_id UUID NOT NULL
        REFERENCES public.comments (id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    emoji VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id, user_id, emoji),
    CONSTRAINT comment_reactions_emoji_check
        CHECK (char_length(btrim(emoji)) > 0 AND char_length(emoji) <= 32)
);

CREATE INDEX idx_comment_reactions_org_comment
    ON public.comment_reactions (organization_id, comment_id);

COMMENT ON TABLE public.comment_reactions IS 'Реакции на заметки свимлейна: одна строка = голос пользователя за emoji';
COMMENT ON COLUMN public.comment_reactions.user_id IS 'id сессии продукта (UUID) или on-prem идентификатор';

CREATE TRIGGER update_task_positions_updated_at
    BEFORE UPDATE ON public.task_positions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.task_positions IS 'Позиции задач на свимлейнах спринтов';
COMMENT ON TABLE public.task_position_segments IS 'Отрезки фазы занятости (дробление плановой фазы на несколько отрезков)';
COMMENT ON TABLE public.task_links IS 'Связи между задачами (стрелки)';
COMMENT ON TABLE public.comments IS 'Комментарии на свимлейнах';
COMMENT ON COLUMN public.comments.height IS
    'Вертикальный span на свимлейне: число строк карточки (1:1 с width в частях таймлайна)';
COMMENT ON COLUMN public.comments.position_y IS
    'Сдвиг карточки вверх в строках свимлейна (layerShiftUp); 0 = без сдвига';
COMMENT ON COLUMN public.comments.created_by IS 'uuid сотрудника из public.registry_employees (автор заметки)';

CREATE TABLE public.sprint_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    team TEXT,
    text TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('delivery', 'discovery')),
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sprint_goals_sprint ON public.sprint_goals(sprint_id);
CREATE INDEX idx_sprint_goals_org_sprint ON public.sprint_goals(organization_id, sprint_id);
CREATE INDEX idx_sprint_goals_sprint_type ON public.sprint_goals(sprint_id, goal_type);

CREATE TRIGGER update_sprint_goals_updated_at
    BEFORE UPDATE ON public.sprint_goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.sprint_goals IS 'Цели спринта (Delivery и Discovery)';

-- Порядок стори и задач во вкладке «Занятость»
CREATE TABLE public.occupancy_task_order (
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    parent_ids JSONB NOT NULL DEFAULT '[]',
    task_orders JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id)
);

CREATE TRIGGER update_occupancy_task_order_updated_at
    BEFORE UPDATE ON public.occupancy_task_order
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.occupancy_task_order IS 'Порядок стори и задач во вкладке «Занятость»';

-- Локальные строки фич планера (не тикеты Трекера)
CREATE TABLE public.sprint_feature_lanes (
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    draft_rows JSONB NOT NULL DEFAULT '[]',
    order_ids JSONB NOT NULL DEFAULT '[]',
    hidden_ids JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id)
);

CREATE TRIGGER update_sprint_feature_lanes_updated_at
    BEFORE UPDATE ON public.sprint_feature_lanes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.sprint_feature_lanes IS 'Черновые строки фич и порядок/видимость доски «по фичам»';

CREATE TABLE public.retro_boards (
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    sprint_id INTEGER NOT NULL,
    board JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, sprint_id)
);

CREATE TRIGGER update_retro_boards_updated_at
    BEFORE UPDATE ON public.retro_boards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.retro_boards IS 'Доска ретро спринта: колонки и карточки';

CREATE TABLE public.retro_column_templates (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations (id) ON DELETE CASCADE,
    columns JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_retro_column_templates_updated_at
    BEFORE UPDATE ON public.retro_column_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.retro_column_templates IS 'Шаблон колонок ретро организации. Не переписывает сохранённые доски спринтов';

-- -----------------------------------------------------------------------------
-- Справочник типов документов
-- -----------------------------------------------------------------------------
CREATE TABLE public.document_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon_name VARCHAR(50),
    editor_type VARCHAR(50),
    content_format VARCHAR(20) NOT NULL DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.document_types (code, name, icon_name, editor_type, content_format)
VALUES
    ('markdown', 'Markdown документ', 'file-text', 'mdx', 'text'),
    ('diagram', 'Диаграмма', 'diagram', 'excalidraw', 'jsonb'),
    ('test-plan', 'Тест план', 'test-plan', 'test-plan-editor', 'text');

COMMENT ON TABLE public.document_types IS 'Справочник типов документов';

-- -----------------------------------------------------------------------------
-- Фичи (эпики/стори), документы и диаграммы
-- -----------------------------------------------------------------------------
CREATE TABLE public.features (
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

CREATE TABLE public.feature_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id VARCHAR(255) NOT NULL,
    document_type_id INTEGER NOT NULL REFERENCES public.document_types(id),
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.feature_diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.feature_grooming_diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id VARCHAR(255) NOT NULL UNIQUE,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.feature_grooming_todos (
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

CREATE INDEX idx_features_board_id ON public.features(board_id);
CREATE INDEX idx_features_status ON public.features(status);
CREATE INDEX idx_features_created_at ON public.features(created_at);
CREATE INDEX idx_features_updated_at ON public.features(updated_at);
CREATE INDEX idx_features_board_status ON public.features(board_id, status);

CREATE INDEX idx_feature_documents_feature_id ON public.feature_documents(feature_id);
CREATE INDEX idx_feature_documents_type_id ON public.feature_documents(document_type_id);
CREATE INDEX idx_feature_documents_feature_order ON public.feature_documents(feature_id, display_order);

CREATE INDEX idx_feature_diagrams_feature_id ON public.feature_diagrams(feature_id);
CREATE INDEX idx_feature_diagrams_feature_order ON public.feature_diagrams(feature_id, display_order);

CREATE INDEX idx_feature_grooming_diagrams_feature_id ON public.feature_grooming_diagrams(feature_id);
CREATE INDEX idx_feature_grooming_todos_feature_id ON public.feature_grooming_todos(feature_id);
CREATE INDEX idx_feature_grooming_todos_feature_order ON public.feature_grooming_todos(feature_id, display_order);
CREATE INDEX idx_feature_grooming_todos_completed ON public.feature_grooming_todos(feature_id, completed);

CREATE TRIGGER update_features_updated_at
    BEFORE UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feature_documents_updated_at
    BEFORE UPDATE ON public.feature_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feature_diagrams_updated_at
    BEFORE UPDATE ON public.feature_diagrams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feature_grooming_diagrams_updated_at
    BEFORE UPDATE ON public.feature_grooming_diagrams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feature_grooming_todos_updated_at
    BEFORE UPDATE ON public.feature_grooming_todos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.features IS 'Фичи проекта, привязанные к доскам';
COMMENT ON TABLE public.feature_documents IS 'Документы стори (привязаны к ключу стори из трекера)';
COMMENT ON TABLE public.feature_diagrams IS 'Excalidraw диаграммы стори';
COMMENT ON TABLE public.feature_grooming_diagrams IS 'Диаграммы груминга стори';
COMMENT ON TABLE public.feature_grooming_todos IS 'TODO элементы груминга стори';

-- -----------------------------------------------------------------------------
-- Версии документов
-- -----------------------------------------------------------------------------
CREATE TABLE public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.feature_documents(id) ON DELETE CASCADE,
    feature_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX idx_document_versions_feature_id ON public.document_versions(feature_id);
CREATE INDEX idx_document_versions_document_version ON public.document_versions(document_id, version_number DESC);
CREATE INDEX idx_document_versions_created_at ON public.document_versions(created_at DESC);

COMMENT ON TABLE public.document_versions IS 'История версий документов (changelog)';

-- -----------------------------------------------------------------------------
-- Стори: позиции задач, драфт-задачи, связи
-- -----------------------------------------------------------------------------
CREATE TABLE public.story_task_positions (
    story_key VARCHAR(255) NOT NULL,
    task_key VARCHAR(255) NOT NULL,
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (story_key, task_key)
);

CREATE TABLE public.story_draft_tasks (
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

CREATE TABLE public.story_task_links (
    id VARCHAR(255) PRIMARY KEY,
    story_key VARCHAR(255) NOT NULL,
    from_task_id VARCHAR(255) NOT NULL,
    to_task_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_story_task_link UNIQUE (story_key, from_task_id, to_task_id),
    CONSTRAINT no_self_story_task_link CHECK (from_task_id != to_task_id)
);

CREATE INDEX idx_story_task_positions_story_key ON public.story_task_positions(story_key);
CREATE INDEX idx_story_task_positions_task_key ON public.story_task_positions(task_key);
CREATE INDEX idx_story_draft_tasks_story_key ON public.story_draft_tasks(story_key);
CREATE INDEX idx_story_task_links_story_key ON public.story_task_links(story_key);
CREATE INDEX idx_story_task_links_from_task ON public.story_task_links(from_task_id);
CREATE INDEX idx_story_task_links_to_task ON public.story_task_links(to_task_id);
CREATE INDEX idx_story_task_links_story_from ON public.story_task_links(story_key, from_task_id);

CREATE TRIGGER update_story_task_positions_updated_at
    BEFORE UPDATE ON public.story_task_positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.story_task_positions IS 'Позиции задач на доске планирования стори';
COMMENT ON TABLE public.story_draft_tasks IS 'Драфт-задачи стори';
COMMENT ON TABLE public.story_task_links IS 'Связи между задачами стори (стрелки)';

-- -----------------------------------------------------------------------------
-- Квартальное планирование
-- -----------------------------------------------------------------------------
CREATE TABLE public.quarterly_plans (
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
CREATE TABLE public.board_availability_events (
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

CREATE INDEX idx_quarterly_plans_board ON public.quarterly_plans(board_id);
CREATE INDEX idx_quarterly_plans_year_quarter ON public.quarterly_plans(year, quarter);
CREATE INDEX idx_board_availability_events_board ON public.board_availability_events(board_id);
CREATE INDEX idx_board_availability_events_member ON public.board_availability_events(member_id);
CREATE INDEX idx_board_availability_events_dates ON public.board_availability_events(start_date, end_date);
CREATE INDEX idx_board_availability_events_type ON public.board_availability_events(event_type);

COMMENT ON TABLE public.quarterly_plans IS 'Квартальные планы для досок';
COMMENT ON TABLE public.board_availability_events IS 'События доступности участников доски (отпуск, техспринт, больничный, дежурство)';

-- -----------------------------------------------------------------------------
-- Мультиарендность и данные экспортёра (no-vendor-lock): чистая БД через init.sql
-- -----------------------------------------------------------------------------

CREATE TABLE public.admins (
    staff_uid UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.admins IS 'Админы продукта: staff_uid = public.staff.id; полный доступ в админке ко всем организациям';
COMMENT ON COLUMN public.admins.staff_uid IS 'uuid сотрудника из public.staff';

CREATE TABLE IF NOT EXISTS public.organizations (
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

CREATE INDEX idx_organizations_sync_next_run_at ON public.organizations (sync_next_run_at)
    WHERE initial_sync_completed_at IS NOT NULL AND sync_next_run_at IS NOT NULL;

COMMENT ON TABLE public.organizations IS 'Клиентские организации (tenant); settings.sync — интервал, overlap и т.д.';
COMMENT ON COLUMN public.organizations.initial_sync_completed_at IS 'NULL пока не завершена первая полная синхронизация после подключения трекера';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.organization_secrets (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations (id) ON DELETE CASCADE,
    encrypted_tracker_token BYTEA NOT NULL,
    encryption_key_version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_organization_secrets_updated_at
    BEFORE UPDATE ON public.organization_secrets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.organization_secrets IS 'Серверный OAuth-токен трекера (ciphertext); версия ключа для ротации';

CREATE TABLE public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    tracker_user_id TEXT,
    display_name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    manual_override_flags JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staff_organization ON public.staff (organization_id);
CREATE UNIQUE INDEX uq_staff_org_tracker_user ON public.staff (organization_id, tracker_user_id)
    WHERE tracker_user_id IS NOT NULL;

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON public.staff
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.staff IS 'Сотрудники организации; связь с трекером через tracker_user_id';
COMMENT ON COLUMN public.staff.avatar_url IS 'URL изображения аватара сотрудника';

CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    tracker_queue_key TEXT NOT NULL,
    tracker_board_id BIGINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, tracker_board_id)
);

CREATE INDEX idx_teams_organization ON public.teams (organization_id);
CREATE INDEX idx_teams_org_board ON public.teams (organization_id, tracker_board_id);

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.teams IS 'Команда с привязкой к очереди и доске трекера (резолв по boardId)';

CREATE TABLE public.team_members (
    team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff (id) ON DELETE CASCADE,
    role_slug TEXT,
    PRIMARY KEY (team_id, staff_id)
);

CREATE INDEX idx_team_members_staff ON public.team_members (staff_id);

CREATE TABLE public.system_roles (
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

CREATE INDEX idx_system_roles_sort ON public.system_roles (sort_order);

CREATE TRIGGER update_system_roles_updated_at
    BEFORE UPDATE ON public.system_roles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.system_roles IS 'Глобальные системные роли (сид при инициализации); не удалять через org_admin UI';

INSERT INTO public.system_roles (slug, title, domain_role, platforms, sort_order) VALUES
    ('frontend', 'Фронтенд', 'developer', '["web"]', 10),
    ('backend', 'Бэкенд', 'developer', '["back"]', 20),
    ('qa', 'QA', 'tester', '[]', 30),
    ('teamlead', 'Тимлид', 'developer', '["web","back"]', 40);

CREATE TABLE public.org_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    domain_role TEXT NOT NULL DEFAULT 'other',
    platforms JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (organization_id, slug)
);

CREATE INDEX idx_org_roles_org ON public.org_roles (organization_id);

CREATE TRIGGER update_org_roles_updated_at
    BEFORE UPDATE ON public.org_roles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.org_roles IS 'Пользовательские роли организации';

CREATE TABLE public.issue_snapshots (
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    issue_key TEXT NOT NULL,
    payload JSONB NOT NULL,
    tracker_updated_at TIMESTAMP WITH TIME ZONE,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, issue_key)
);

CREATE INDEX idx_issue_snapshots_org_synced ON public.issue_snapshots (organization_id, synced_at DESC);

COMMENT ON TABLE public.issue_snapshots IS 'Нормализованный снимок issue для UI/бэклога';

CREATE TABLE public.issue_changelog_events (
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    issue_key TEXT NOT NULL,
    changelog JSONB NOT NULL DEFAULT '[]'::jsonb,
    comments JSONB NOT NULL DEFAULT '[]'::jsonb,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, issue_key)
);

CREATE INDEX idx_issue_changelog_org_synced ON public.issue_changelog_events (organization_id, synced_at DESC);

COMMENT ON TABLE public.issue_changelog_events IS 'Кеш ответа Tracker: changelog + comments по задаче (синк и API)';

CREATE TABLE public.issue_links (
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    issue_key TEXT NOT NULL,
    tracker_link_id TEXT NOT NULL,
    linked_issue_key TEXT NOT NULL,
    relationship TEXT NOT NULL
        CHECK (relationship IN (
            'relates',
            'blocks',
            'blocked_by',
            'duplicates',
            'duplicated_by'
        )),
    direction TEXT NOT NULL
        CHECK (direction IN ('outward', 'inward')),
    linked_summary TEXT,
    linked_status TEXT,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, issue_key, tracker_link_id)
);

CREATE INDEX idx_issue_links_org_linked
    ON public.issue_links (organization_id, linked_issue_key);

CREATE INDEX idx_issue_links_org_issue_rel
    ON public.issue_links (organization_id, issue_key, relationship);

COMMENT ON TABLE public.issue_links IS
    'Кэш связей issue из Tracker (write-through; источник правды — Tracker API)';

CREATE TABLE public.sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    job_type TEXT CHECK (job_type IS NULL OR job_type IN ('incremental', 'initial_full', 'full_rescan')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_summary TEXT
);

CREATE INDEX idx_sync_runs_org_started ON public.sync_runs (organization_id, started_at DESC);

CREATE UNIQUE INDEX uq_sync_runs_one_running_per_org ON public.sync_runs (organization_id)
    WHERE status = 'running';

COMMENT ON TABLE public.sync_runs IS 'Аудит прогонов экспортёра; stats — watermark, cursor, requested_since и т.д.';

-- -----------------------------------------------------------------------------
-- Продуктовая аналитика (снимки настроек, просмотры, клики — payload JSONB)
-- -----------------------------------------------------------------------------
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
    user_id UUID,
    event_name TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_events_org_name_time
    ON public.analytics_events (organization_id, event_name, occurred_at DESC);

CREATE INDEX idx_analytics_events_user_name_time
    ON public.analytics_events (user_id, event_name, occurred_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_analytics_events_name_time_identified
    ON public.analytics_events (event_name, occurred_at DESC)
    WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.analytics_events IS 'Append-only продуктовая аналитика; формат события в payload JSONB';
COMMENT ON COLUMN public.analytics_events.event_name IS 'client_settings, page_view, ui_click, … — список на уровне приложения';
COMMENT ON COLUMN public.analytics_events.occurred_at IS 'Время на клиенте; ingested_at — когда строка попала в БД';
COMMENT ON COLUMN public.analytics_events.user_id IS 'uuid сотрудника из public.registry_employees (сессия продукта); без FK';

CREATE TABLE public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
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
    ON public.user_notifications (organization_id, recipient_user_id, created_at DESC);

CREATE INDEX idx_user_notifications_recipient_unread
    ON public.user_notifications (organization_id, recipient_user_id, created_at DESC)
    WHERE read_at IS NULL;

COMMENT ON TABLE public.user_notifications IS 'In-app уведомления: assignee, availability, sprint start/finish';
