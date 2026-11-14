-- Таблицы прежнего квартального плана: его код удалён 2026-10-25, данные никто не читает.
-- Новый квартальный план (docs/QUARTERLY_PLAN_RULES.md) — на организацию и получит свои таблицы,
-- эти ему не подходят (ключ — board_id). quarterly_plan_v2_* есть только на старых инсталляциях,
-- поэтому IF EXISTS. Одной командой: связи между самими таблицами порядка не требуют.
DROP TABLE IF EXISTS
  quarterly_plan_v2_story_events,
  quarterly_plan_v2_story_phases,
  quarterly_plan_v2_excluded_stories,
  quarterly_plan_v2_epics,
  quarterly_plans;
