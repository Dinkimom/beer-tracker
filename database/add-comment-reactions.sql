-- Schema from psql -v schema=… (BEER_TRACKER_SCHEMA). Default: public (= init.sql).
-- Prefer: ./scripts/db/psql-with-schema.sh -f database/<this-file>.sql
\if :{?schema}
\else
\set schema public
\endif
CREATE SCHEMA IF NOT EXISTS :"schema";
SET search_path TO :"schema", public;

-- Реакции на sticky-note (голос пользователя × emoji × заметка).
-- Для уже существующей БД: psql ... -f database/add-comment-reactions.sql

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

CREATE INDEX IF NOT EXISTS idx_comment_reactions_org_comment
    ON comment_reactions (organization_id, comment_id);

COMMENT ON TABLE comment_reactions IS 'Реакции на заметки свимлейна: одна строка = голос пользователя за emoji';
COMMENT ON COLUMN comment_reactions.user_id IS 'id сессии продукта (UUID) или on-prem идентификатор';
