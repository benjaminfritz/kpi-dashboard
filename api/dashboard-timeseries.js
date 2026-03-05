import { prisma } from './_lib/prisma.js';
import { isPrismaSetupError } from './_lib/dashboard-snapshot.js';

const SUPPORTED_SPANS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const toIsoDay = (date) => date.toISOString().slice(0, 10);

const resolveSpan = (rawValue) => {
  if (typeof rawValue !== 'string') return '7d';
  const normalized = rawValue.trim().toLowerCase();
  return Object.hasOwn(SUPPORTED_SPANS, normalized) ? normalized : '7d';
};

const resolveMonthOffset = (rawValue) => {
  const parsed = Number.parseInt(String(rawValue ?? 0), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 24);
};

const buildDays = (span, monthOffset) => {
  const totalDays = SUPPORTED_SPANS[span];
  const anchorDay = new Date();
  anchorDay.setUTCHours(0, 0, 0, 0);
  anchorDay.setUTCMonth(anchorDay.getUTCMonth() - monthOffset);

  const days = [];
  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(anchorDay);
    day.setUTCDate(anchorDay.getUTCDate() - offset);
    days.push(toIsoDay(day));
  }

  return {
    days,
    startDay: days[0],
    endDay: days[days.length - 1],
  };
};

const getDesignMetric = (snapshot) => {
  const value = snapshot?.figma?.totalComponentUsages;
  return isFiniteNumber(value) ? value : null;
};

const getCodeMetric = (snapshot) => {
  const value = snapshot?.github?.consumingRepos30d;
  return isFiniteNumber(value) ? value : null;
};

const getContentMetric = (snapshot) => {
  const value = snapshot?.contentful?.totalEntries;
  return isFiniteNumber(value) ? value : null;
};

const handleStorageError = (response, error) => {
  if (isPrismaSetupError(error)) {
    response.status(503).json({
      message: 'Snapshot storage is not ready. Configure DATABASE_URL and run Prisma migrations.',
      detail: error.message,
    });
    return;
  }

  response.status(500).json({
    message: 'Unexpected storage error while loading dashboard timeseries.',
    detail: error instanceof Error ? error.message : 'Unknown error',
  });
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  response.setHeader('Cache-Control', 'no-store');

  const span = resolveSpan(pickFirst(request.query?.span));
  const monthOffset = resolveMonthOffset(pickFirst(request.query?.month_offset));
  const { days, startDay, endDay } = buildDays(span, monthOffset);
  const startDate = new Date(`${startDay}T00:00:00.000Z`);
  const endDate = new Date(`${endDay}T23:59:59.999Z`);

  try {
    const snapshots = await prisma.dashboardSnapshot.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        figma: true,
        github: true,
        contentful: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const dailyValues = new Map(
      days.map((day) => [
        day,
        {
          design: null,
          code: null,
          content: null,
        },
      ])
    );

    snapshots.forEach((snapshot) => {
      const day = toIsoDay(snapshot.createdAt);
      const bucket = dailyValues.get(day);
      if (!bucket) return;

      bucket.design = getDesignMetric(snapshot);
      bucket.code = getCodeMetric(snapshot);
      bucket.content = getContentMetric(snapshot);
    });

    response.status(200).json({
      span,
      days,
      series: {
        design: days.map((day) => dailyValues.get(day)?.design ?? null),
        code: days.map((day) => dailyValues.get(day)?.code ?? null),
        content: days.map((day) => dailyValues.get(day)?.content ?? null),
      },
      meta: {
        metricKeys: {
          design: 'figma.totalComponentUsages',
          code: 'github.consumingRepos30d',
          content: 'contentful.totalEntries',
        },
        aggregation: 'latest_per_day',
        missing: 'null_gap',
        window: {
          startDay,
          endDay,
          monthOffset,
        },
      },
    });
  } catch (error) {
    handleStorageError(response, error);
  }
}
