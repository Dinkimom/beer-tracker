---
name: landing-docs
description: >-
  Refreshes the Beer Tracker landing page (README.md + README.en.md): retakes the
  screenshots and re-records the animations in docs/media from /demo/planner, brings the section text in line with
  the current product, then runs both languages through humanizer. Use when the user
  runs /landing-docs or asks to update the landing, README screenshots, animations or README text.
argument-hint: "[screens|text|all] [slot,slot…]"
---

# Refresh the landing page

Arguments: `$ARGUMENTS`. Empty or `all` — screens, animations and text. `screens` / `clips` / `text` — only
that part. A comma list of slots or clips (`backlog,link`) limits the media to those.

Landing = [`README.md`](../../../README.md) (Russian, primary) and [`README.en.md`](../../../README.en.md)
(same structure in English). Screenshot slots and shooting rules: [`docs/media/README.md`](../../../docs/media/README.md).

## 1. Screens

Shots come from `/demo/planner` (fixtures, frozen clock, no login), English UI,
1680×1050 at @2x, light and dark. [`capture.cjs`](./capture.cjs) does it: sets
language/theme/sidebar/onboarding in localStorage, hides the Next.js Dev Tools badge,
clicks the header tab and writes `docs/media/<slot>-<theme>.png`.

1. Dev server must answer: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/demo/planner` → `200`.
   If not, ask the user to start it (`pnpm docker:dev` or `pnpm dev`); do not start a second one.
2. Run (Playwright comes from npx, it is not a project dependency):

   ```bash
   NM="$(dirname "$(dirname "$(npx -y -p playwright@1.63.0 -c 'which playwright')")")"
   NODE_PATH="$NM" node .claude/skills/landing-docs/capture.cjs            # all slots
   NODE_PATH="$NM" node .claude/skills/landing-docs/capture.cjs --only backlog,metrics
   ```

   `Executable doesn't exist` → once: `npx -y -p playwright@1.63.0 playwright install chromium`.
   Other flags: `--base <url>`, `--out <dir>`, `--themes light`.
3. **Look at every new PNG** (Read) before keeping it: no toasts, spinners, empty states,
   onboarding popovers, cut-off menus; dark and light show the same scene. Retake a broken slot
   with `--only`. If the demo itself looks wrong, report it — don't patch around it in the script.
4. `git diff --stat docs/media` — if a slot didn't change visually but the PNG did (antialiasing noise),
   `git checkout` it so the diff only carries real changes.
5. New screen or setting in the planner header that the landing doesn't show (e.g. a new tab)?
   Don't add a slot silently: propose it to the user with a test shot. When agreed — add an entry to
   `SHOTS` in `capture.cjs`, a row to the table in `docs/media/README.md`, and a section in both READMEs.

`logo-button-*.png` is not a demo screen (Lottie rest frame) — leave it alone.

## 1b. Animations

Sections that show a gesture use an animated WebP instead of a still: `drag-resize`, `link`, `note` (Planner)
and `retro` (Retro). [`record.cjs`](./record.cjs) plays each scenario in `CLIPS` with a drawn cursor
(headless Chromium has none) and builds `docs/media/<clip>-<theme>.webp` (2880×1800, @2x like the stills)
with `img2webp` (Homebrew `webp`). GitHub renders animated WebP in README; GIF also works there but has
256 colours (banding on UI gradients) and is several times heavier.

CDP screencast only gives CSS-pixel frames, and a true @2x screenshot takes ~200 ms. So the scenario runs
`SLOWDOWN`× slower (mouse, pauses, typing, CSS animations via `Animation.setPlaybackRate`) while a screenshot
loop captures it, and frame durations are divided back: ~16–18 fps at normal speed. A full run of all clips
takes ~10 minutes; run it in the background. Pointer/typing timing in scenarios is in playback milliseconds:
use `p.glide`, `p.drag`, `p.click`, `p.type`, `p.pause`, never raw `page.waitForTimeout` or `keyboard.type`.
Don't pass durations to `p.glide` / `p.drag`: the duration comes from the distance (`MOVE_SPEED`, `DRAG_SPEED`),
so every move in every clip runs at the same pace. Fixed durations made short moves crawl and long ones fly.

```bash
NODE_PATH="$NM" node .claude/skills/landing-docs/record.cjs --frames "$SCRATCH/frames"          # all clips
NODE_PATH="$NM" node .claude/skills/landing-docs/record.cjs --only note --frames "$SCRATCH/frames"
```

1. `--frames` writes full JPEG frames to `<dir>/<clip>-<theme>/` (WebP stores deltas, single frames can't be
   pulled from it). Keep them in the scratchpad. **Read the last frame of every clip and a few in the middle**:
   the gesture landed (card moved, arrow visible, note text readable, retro cards added), nothing is covered
   by the cursor, no toasts or stray hover chrome.
2. Scenarios find elements by visible text of demo fixtures (`Mobile: Apple Pay button`, `Receipt email template`).
   Fixture text changed → fix the scenario, not the fixtures. A gesture that does nothing on fixtures (a demo
   router that doesn't answer like the real API) is a demo bug: report or fix it in `lib/demo/` with a test.
3. Size: each file ≲ 3 MB. Longer typing or idle frames grow it; trim pauses in the scenario.
4. A new clip follows the same rule as a new slot: propose it with a test recording first, then add it to
   `CLIPS`, the table in `docs/media/README.md` and both READMEs.

## 2. Text

Sources of truth, in this order: code and the demo itself → [`docs/CAPABILITIES.md`](../../../docs/CAPABILITIES.md)
→ `CHANGELOG.md` entries since the README last changed (`git log -1 --format=%cs -- README.md`) →
[`docs/steering/product.md`](../../../docs/steering/product.md) (what was cut and why).

For each section of `README.md`:

- Check every claim against the sources and the fresh screenshot. Removed feature → drop the sentence.
  Renamed thing → new name as it appears in the UI. New user-visible behaviour of that screen → one short
  sentence, not a list of everything.
- Keep the landing short: a section is 1–3 short paragraphs about what a team gets, not a changelog.
  Ops details (Redis, sync worker) stay one sentence with a link to `docs/INSTALL.md`.
- Don't touch: the version badge and image tag (the `release-publish` skill owns them), the
  "Где используется" block (`docs/companies.md` owns it), the MCP tool list unless the tools changed
  (`apps/mcp-sprint-context/`).
- Anchors in the top nav must match headings; `alt` texts must match the section.

Then bring `README.en.md` to the same structure and meaning. It is a parallel text, not a word-for-word
translation; the two must not disagree on facts.

## 3. Humanizer

Every paragraph changed in step 2 goes through a humanizer, in its language:

| File | Skill | Where it lives if the plugin isn't installed |
|---|---|---|
| `README.md` | `humanizer-ru` | `~/.claude/plugins/marketplaces/ilyautov-plugins/skills/humanizer-ru/SKILL.md` |
| `README.en.md` | `humanizer` | `~/.claude/plugins/marketplaces/humanizer/SKILL.md` |

Invoke the skill if it is listed; otherwise Read its SKILL.md and follow it. Mode — editing, local fixes,
no rewrite from scratch. Constraints on top of the humanizer:

- facts, numbers, names of UI elements, API/tool names, paths and links stay exactly as they are;
- HTML blocks (`<picture>`, `<p align>`), code blocks and tables are not text — don't feed them in;
- nothing new is added "for liveliness".

For Russian, measure before/after with the scanner on the changed prose (needs `uv`):

```bash
uvx ru-humanizer /path/to/changed-prose.txt
```

Put the extracted prose in the scratchpad, not in the repo. Report "было N, стало M".

## 4. Finish

1. `pnpm check:i18n` is not needed (README isn't i18n), but run `pnpm lint` if `capture.cjs` changed.
2. Show the user: list of retaken slots (and which were reverted as noise), text diff of both READMEs,
   humanizer score. Don't commit without being asked. If asked: one `docs:` commit, Russian summary,
   message style as in `git log`.
