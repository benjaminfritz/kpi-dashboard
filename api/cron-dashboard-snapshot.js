import { buildDashboardSnapshotData } from './_lib/dashboard-data.js';
import { isPrismaSetupError } from './_lib/dashboard-snapshot.js';
import { prisma } from './_lib/prisma.js';

const getHeader = (request, name) => {
  if (typeof request.headers?.get === 'function') {
    return request.headers.get(name);
  }

  const direct = request.headers?.[name];
  if (typeof direct === 'string') return direct;

  const lowerCased = request.headers?.[name.toLowerCase()];
  return typeof lowerCased === 'string' ? lowerCased : null;
};

const isCronAuthorized = (request) => {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return process.env.VERCEL !== '1';
  }

  return getHeader(request, 'authorization') === `Bearer ${cronSecret}`;
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
    message: 'Unexpected storage error while creating a scheduled snapshot.',
    detail: error instanceof Error ? error.message : 'Unknown error',
  });
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  if (!process.env.CRON_SECRET && process.env.VERCEL === '1') {
    response.status(503).json({
      message: 'Missing CRON_SECRET configuration.',
      requiredEnv: ['CRON_SECRET'],
    });
    return;
  }

  if (!isCronAuthorized(request)) {
    response.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const { data, hasFreshData, warnings } = await buildDashboardSnapshotData();

    if (!hasFreshData) {
      response.status(502).json({
        message: 'Scheduled snapshot skipped because no analytics provider returned data.',
        warnings,
      });
      return;
    }

    const snapshot = await prisma.dashboardSnapshot.create({
      data: {
        figma: data.figma,
        contentful: data.contentful,
        github: data.github,
        lastUpdatedLabel: data.lastUpdated,
      },
    });

    response.status(201).json({
      id: snapshot.id,
      createdAt: snapshot.createdAt,
      warnings,
    });
  } catch (error) {
    handleStorageError(response, error);
  }
}
