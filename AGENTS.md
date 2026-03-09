# AGENTS.md

## Branching Policy

- Treat `main` as deployable. Do not develop features, refactors, or fixes directly on `main`.
- Create a branch as soon as you move from exploration into code changes.
- Use the required branch prefix: `codex/<purpose>`.
- Keep each branch focused on one reviewable outcome.

## When To Branch

- Any change in `src/` that affects dashboard behavior or UI
- Any change in `api/` that affects analytics fetching, snapshot reads/writes, or cron behavior
- Any change in `prisma/schema.prisma` or `prisma/migrations/`
- Any change in `vercel.json`, environment-variable handling, or deployment/runtime behavior

## How To Split Scope

- Keep `prisma/` and the API code that depends on that schema together when they are part of the same feature.
- Keep visual/UI cleanup separate from database, cron, or deployment changes.
- If a task would be awkward to describe as one PR title, split it into multiple branches.

## Naming Examples

- `codex/ui-kpi-cards`
- `codex/fix-timeseries-window`
- `codex/persist-snapshot-metadata`
- `codex/cron-auth-hardening`
