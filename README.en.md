<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/logo-button-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/logo-button-light.png" />
    <img src="./docs/media/logo-button-light.png" alt="Beer Tracker" height="44" />
  </picture>
</h1>

<p align="center">
  <a href="./README.md">Русский</a> · <strong>English</strong>
</p>

<p align="center">
  <strong>A sprint planner on top of Yandex Tracker and Jira</strong><br />
  Swimlanes by person and day, a backlog, goals, and burndown — issues stay in your tracker.
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" /></a>
  <a href="https://hub.docker.com/r/dinkimom/beer-tracker"><img alt="Docker Hub" src="https://img.shields.io/badge/docker-dinkimom%2Fbeer--tracker-2496ED?logo=docker&logoColor=white" /></a>
  <a href="./CHANGELOG.md"><img alt="Version" src="https://img.shields.io/badge/version-1.16.8-informational" /></a>
</p>

<p align="center">
  <a href="#planner">Planner</a> ·
  <a href="#backlog">Backlog</a> ·
  <a href="#fact">Fact</a> ·
  <a href="#retro">Retro</a> ·
  <a href="#collaboration">Collaboration</a> ·
  <a href="#used-by">Used by</a> ·
  <a href="#quick-start">Start</a> ·
  <a href="#mcp-for-agents">MCP</a>
</p>

## Planner

The grid is the working days between the sprint start and end in the tracker. A day splits into 2, 3, or 4 timeslots, three by default. One lane per developer and one per tester.

Task cards drag, and a resize changes the duration. Leave and tech sprints show on the same lanes. Drop notes during the sprint so nothing gets lost: they show links, checklists, and reactions. On the right are this sprint’s tasks.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/swimlane-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/swimlane-light.png" />
    <img src="./docs/media/swimlane-light.png" alt="Sprint planner swimlanes" width="900" />
  </picture>
</p>

## Backlog

Pick issues outside the sprint, filter by status and people, and move them into the active sprint.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/backlog-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/backlog-light.png" />
    <img src="./docs/media/backlog-light.png" alt="Backlog" width="900" />
  </picture>
</p>

## Burndown

Story points and test points by sprint day, with an ideal line and a today marker.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/burndown-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/burndown-light.png" />
    <img src="./docs/media/burndown-light.png" alt="Burndown SP/TP" width="900" />
  </picture>
</p>

## Fact

Sync pulls status history from the tracker. On the swimlane that is the **fact timeline**: when an issue was in progress, in review, and in test — next to the plan, not instead of it.

Exports run from `/admin/sync`. Scheduled incremental sync uses Redis and `pnpm sync-worker`; a full rescan can run inline. Details are in [INSTALL.md](./docs/INSTALL.md).

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/fact-timeline-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/fact-timeline-light.png" />
    <img src="./docs/media/fact-timeline-light.png" alt="Fact timeline on the swimlane" width="900" />
  </picture>
</p>

## Retro

Columns, notes, images, comments, and reactions. The **Facts** side panel shows what was closed, added, removed, and carried over, plus cycle time and changelog bottlenecks. Agreements from the retro move into the next sprint.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/retro-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/retro-light.png" />
    <img src="./docs/media/retro-light.png" alt="Sprint retro board" width="900" />
  </picture>
</p>

## Collaboration

On one sprint you can see who is on the board: avatars in the header and on cards, and what they are doing (viewing, moving, editing, resizing). Someone else’s gesture locks the card. Changes to positions, issues, links, comments, and the retro arrive without a reload. There is a shared sprint timer.

Several instances need Redis. Without it, realtime stays in the memory of one process.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./docs/media/collaboration-dark.png" />
    <source media="(prefers-color-scheme: light)" srcset="./docs/media/collaboration-light.png" />
    <img src="./docs/media/collaboration-light.png" alt="Collaboration: presence on the board" width="900" />
  </picture>
</p>

## Used by

Companies that run their sprints in Beer Tracker.

<!-- adopters: same order as docs/companies.md. Pair docs/media/companies/<id>-light.svg and <id>-dark.svg. -->
<p align="center">
  <a href="https://www.yclients.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./docs/media/companies/yclients-dark.svg" />
      <source media="(prefers-color-scheme: light)" srcset="./docs/media/companies/yclients-light.svg" />
      <img src="./docs/media/companies/yclients-light.svg" alt="YCLIENTS" height="40" />
    </picture>
  </a>
</p>

## Quick start

```bash
cp env.example .env
# POSTGRES_PASSWORD, AUTH_SESSION_SECRET (≥32), ORG_SECRETS_ENCRYPTION_KEY (64 hex)
docker compose -f docker-compose.yml -f docker-compose.hub.yml up -d
```

Open [http://localhost:3000](http://localhost:3000) and connect a tracker. Published images are [`dinkimom/beer-tracker`](https://hub.docker.com/r/dinkimom/beer-tracker), tag `1.16.7`.

Install, S3, sync, and developing from source: [docs/INSTALL.md](./docs/INSTALL.md). Per-organization provider: [docs/ISSUE_TRACKERS.md](./docs/ISSUE_TRACKERS.md).

## MCP for agents

Remote MCP runs on your instance. The client (Cursor, Claude Desktop / Code) opens a browser, login and consent, then receives a Bearer token. Scope: `mcp:tools`. Details: [SPRINT_CONTEXT.md](./docs/SPRINT_CONTEXT.md).

The agent reads the plan and proposes edits. A write into the sprint happens only after confirm.

- Find a sprint (`search_sprints`) and load the planning graph: positions, capacity, goals, notes, links (`get_sprint_context`, `get_sprint_capacity`)
- Find issues and people (`search_issues`, `resolve_person`), open an issue and a snapshot
- Propose edits (`propose_plan_patch`) and apply them (`apply_plan_patch`)
- Read and edit the retro board (`get_retro_board`, `apply_retro_board`)

| Case | What it looks like |
|------|--------------------|
| “What are the planning risks in sprint Demo 2615?” | Sprint → capacity and overlaps → a short overload read |
| Plan DEMO-101 onto Alice | Propose positions and notes → a person reviews the preview → apply |
| “Prepare the retro for Demo 2614” | A fact summary and draft cards on the retro board |

```json
{
  "mcpServers": {
    "beer-tracker-planning": {
      "url": "https://<your-bt-host>/api/mcp"
    }
  }
}
```

## Documentation

The guides below are in Russian.

| Document | What it covers |
|----------|----------------|
| [Install](./docs/INSTALL.md) | Docker, dev, env, sync |
| [Issue trackers](./docs/ISSUE_TRACKERS.md) | Yandex Tracker and Jira |
| [Capabilities](./docs/CAPABILITIES.md) | Full feature list |
| [Overview](./docs/PROJECT_OVERVIEW.md) | Who the product is for and which screens it has |
| [Sprint context / MCP](./docs/SPRINT_CONTEXT.md) | Planning graph and retro for agents |
| [Index](./docs/DOCUMENTATION_INDEX.md) | All documentation |

## Contributing

Commits with a [DCO](https://developercertificate.org/) sign-off (`git commit -s`) — [CONTRIBUTING.md](./CONTRIBUTING.md). Vulnerabilities — [SECURITY.md](./SECURITY.md).

The historical UI name is Sprint Manager. Stack and layers — [ARCHITECTURE.md](./ARCHITECTURE.md). Screenshot slots — [docs/media/README.md](./docs/media/README.md). Another company on the landing — [docs/companies.md](./docs/companies.md).

The epic planner and the quarterly plan have been removed from the product: [product steering](./docs/steering/product.md).

## License

[Apache License 2.0](./LICENSE). Attribution — [NOTICE](./NOTICE).
