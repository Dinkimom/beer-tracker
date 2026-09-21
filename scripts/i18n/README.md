# i18n maintainer scripts

## Parity check

`pnpm check:i18n` — ensures `lib/i18n/messages/en.ts` and `ru.ts` expose the same dot-path leaf keys, then runs **English quality** checks on `en.ts` only:

- no empty or whitespace-only string leaves;
- no obvious placeholders: whole-line `TODO` / `TBD` / `FIXME`, or the same token followed by `:`, `.`, `-`, or an en/em dash (e.g. `TODO:`, `TBD — …`).

Legitimate exceptions (rare) can be listed in **`scripts/i18n/english-quality-allowlist.json`**:

- `allowEmptyKeys`: dot-paths allowed to be blank (discouraged; document why in PR).
- `allowPlaceholderKeys`: dot-paths where the heuristics above would false-positive.

The allowlist file is optional; if missing, both lists are treated as empty.

## Export (for offline translation / TMS)

```bash
pnpm i18n:export -- --out ./messages-i18n.export.json
```

Writes JSON `version: 1` with `locales.en` and `locales.ru` as **flat** maps (`"common.loading"` → string). Keys are sorted in each locale map for a stable diff.

## Import (merge back)

```bash
pnpm i18n:import -- --file ./messages-i18n.export.json
```

- Only keys present under `locales.en` / `locales.ru` are applied; missing locale or empty object skips that file.
- Unknown keys (not in the current catalog) fail the import.
- Leaf key sets must stay identical to the current tree (no structural edits via this tool).
- If no string values actually change for a locale, that `*.ts` file is not rewritten.

Dry run (no writes):

```bash
pnpm i18n:import -- --file ./messages-i18n.export.json --dry-run
```

## Suggested round-trip

1. `pnpm i18n:export -- --out ./messages-i18n.export.json`
2. Edit strings under `locales.en` and/or `locales.ru` (keep the same keys).
3. `pnpm i18n:import -- --file ./messages-i18n.export.json`
4. `pnpm check:i18n && pnpm typecheck && pnpm test`

Do not put secrets into export files; message catalogs are user-facing copy only.

## Manual QA checklist (English mode)

After substantive UI or i18n changes:

1. Set language to **English** in Settings (or a clean profile) and reload.
2. **Auth / entry:** `/login`, `/register`, `/auth-setup`, `/select-board` (with and without boards).
3. **Planner:** open a board sprint — sidebar tabs, backlog, board, burndown; create a planner **comment** (note tool) and confirm default label/tooltip follow English.
4. **Demo:** `/demo/planner` — with env unset, confirm unavailable copy; with env set, confirm loading overlay and no Russian-only chrome.
5. **Smoke:** browser tab title / root description (metadata) is acceptable; no obvious Cyrillic in visible labels on the above routes.

Remaining Russian in **code comments**, **API route handlers** (non-UI JSON errors), and **tests** is out of scope for this checklist. Third-party or Tracker-provided strings are not translated here.

## ESLint: no inline UI copy

`i18n/no-literal-ui-string` (`scripts/eslint/plugin-i18n.mjs`) flags Cyrillic string/template literals, JSX text, and user-facing attributes (`title`, `placeholder`, `aria-label`, …). Use `t()` / `translate()`.

- Scope: `app` (except `app/api/**`), `components`, `features`, `hooks`, `contexts`, `lib/holidays.ts`, `lib/comments/**`.
- Tests and Storybook files are ignored.
- Historical debt: `scripts/eslint/i18n-literal-allowlist.json`. After extracting a file, remove it from that list.

**Maintainer grep (optional):** search for Cyrillic in client bundles you care about, e.g.  
`rg '[А-Яа-яЁё]' app components features --glob '*.tsx' --glob '!**/*.test.*'`  
and triage hits (many will be comments).
