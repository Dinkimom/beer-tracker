-- Реакции на sticky-note (голос пользователя × emoji × заметка).
-- Для уже существующей БД: psql ... -f database/add-comment-reactions.sql

CREATE TABLE IF NOT EXISTS beer_tracker.comment_reactions (
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

CREATE INDEX IF NOT EXISTS idx_comment_reactions_org_comment
    ON beer_tracker.comment_reactions (organization_id, comment_id);

COMMENT ON TABLE beer_tracker.comment_reactions IS 'Реакции на заметки свимлейна: одна строка = голос пользователя за emoji';
COMMENT ON COLUMN beer_tracker.comment_reactions.user_id IS 'id сессии продукта (UUID) или on-prem идентификатор';
