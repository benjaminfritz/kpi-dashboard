import { prisma } from './_lib/prisma.js';
import { isPrismaSetupError, toDashboardDataFromSnapshot } from './_lib/dashboard-snapshot.js';

const handleStorageError = (response, error) => {
  if (isPrismaSetupError(error)) {
    response.status(503).json({
      message: 'Snapshot storage is not ready. Configure DATABASE_URL and run Prisma migrations.',
      detail: error.message,
    });
    return;
  }

  response.status(500).json({
    message: 'Unexpected storage error while loading the latest snapshot.',
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

  try {
    const snapshot = await prisma.dashboardSnapshot.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!snapshot) {
      response.status(404).json({ message: 'No stored snapshot found.' });
      return;
    }

    response.status(200).json({
      id: snapshot.id,
      createdAt: snapshot.createdAt,
      data: toDashboardDataFromSnapshot(snapshot),
    });
  } catch (error) {
    handleStorageError(response, error);
  }
}
