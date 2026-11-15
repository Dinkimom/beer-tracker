-- Привязка цели спринта к строке квартального плана (docs/QUARTERLY_PLAN_RULES.md, QG5).
--
-- Строка — эпик или направление плана квартала: год, квартал и id строки в документе плана.
-- Привязка необязательна (цель без неё — влёт) и может остаться висячей, если строку удалили:
-- план про цели спринта не знает, поэтому внешнего ключа нет.
ALTER TABLE sprint_goals
    ADD COLUMN plan_year INTEGER CHECK (plan_year BETWEEN 2000 AND 2100),
    ADD COLUMN plan_quarter SMALLINT CHECK (plan_quarter BETWEEN 1 AND 4),
    ADD COLUMN plan_row_id TEXT;

ALTER TABLE sprint_goals
    ADD CONSTRAINT sprint_goals_plan_row_check CHECK (
        (plan_year IS NULL AND plan_quarter IS NULL AND plan_row_id IS NULL)
        OR (plan_year IS NOT NULL AND plan_quarter IS NOT NULL AND plan_row_id IS NOT NULL)
    );

-- Цели квартала по строкам плана: лента спринтов и план/факт на доске квартала.
CREATE INDEX idx_sprint_goals_plan_quarter
    ON sprint_goals (organization_id, plan_year, plan_quarter)
    WHERE plan_row_id IS NOT NULL;
