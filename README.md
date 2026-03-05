# KPI Dashboard

Small dashboard that aggregates design-system KPIs from Figma, GitHub, and Contentful.

## Persistence Layer (Prisma + Postgres)

This branch adds snapshot persistence so dashboard states can be stored over time.

### Prerequisites

- Node.js `22.12.0` or newer
- A Postgres database

### Environment variables

Add these to your local `.env` and to Vercel project settings:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
CRON_SECRET="replace-with-a-long-random-string"
```

### Install and migrate

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
```

### API routes

- `POST /api/dashboard-snapshots`: store a dashboard snapshot
- `GET /api/dashboard-snapshots`: list recent snapshot metadata
- `GET /api/dashboard-snapshots-latest`: load latest full snapshot
- `GET /api/dashboard-timeseries?span=7d|30d|90d|365d&month_offset=N`: load daily trend series for charting (N=0 current window, 1 previous month window, etc.)
- `GET /api/cron-dashboard-snapshot`: protected scheduled snapshot writer for Vercel Cron

The frontend now reads live analytics directly and falls back to the latest stored snapshot when live API fetches fail.

## Scheduled snapshots

`vercel.json` schedules `/api/cron-dashboard-snapshot` once per day at `06:00` UTC. Vercel should call that route with `Authorization: Bearer $CRON_SECRET`, and the handler will reject unauthenticated requests in production.
