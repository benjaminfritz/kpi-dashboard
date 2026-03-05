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

The frontend now tries to persist each fresh dashboard load and falls back to the latest stored snapshot when live API fetches fail.
