import { prisma } from './_lib/prisma.js';
import { isDashboardSnapshotPayload, isPrismaSetupError } from './_lib/dashboard-snapshot.js';

const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);

const parseBody = async (request) => {
  if (request.body && typeof request.body === 'object') return request.body;

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return null;

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
};

const parseLimit = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 100);
};

const toSummary = (snapshot) => ({
  id: snapshot.id,
  createdAt: snapshot.createdAt,
  lastUpdated: snapshot.lastUpdatedLabel,
});

const handleStorageError = (response, error) => {
  if (isPrismaSetupError(error)) {
    response.status(503).json({
      message: 'Snapshot storage is not ready. Configure DATABASE_URL and run Prisma migrations.',
      detail: error.message,
    });
    return;
  }

  response.status(500).json({
    message: 'Unexpected storage error while handling snapshots.',
    detail: error instanceof Error ? error.message : 'Unknown error',
  });
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method === 'GET') {
    try {
      const limit = parseLimit(pickFirst(request.query?.limit));
      const snapshots = await prisma.dashboardSnapshot.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      response.status(200).json({ snapshots: snapshots.map(toSummary) });
    } catch (error) {
      handleStorageError(response, error);
    }
    return;
  }

  if (request.method === 'POST') {
    const body = await parseBody(request);

    if (!isDashboardSnapshotPayload(body)) {
      response.status(400).json({ message: 'Invalid dashboard snapshot payload.' });
      return;
    }

    try {
      const snapshot = await prisma.dashboardSnapshot.create({
        data: {
          figma: body.figma,
          contentful: body.contentful,
          github: body.github,
          lastUpdatedLabel: body.lastUpdated || null,
        },
      });

      response.status(201).json({ id: snapshot.id, createdAt: snapshot.createdAt });
    } catch (error) {
      handleStorageError(response, error);
    }
    return;
  }

  response.setHeader('Allow', 'GET, POST');
  response.status(405).json({ message: 'Method Not Allowed' });
}
