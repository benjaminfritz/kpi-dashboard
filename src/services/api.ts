import { DashboardData, FigmaConfigStatus, FigmaData } from '../types';

const fallbackDashboardData: Omit<DashboardData, 'lastUpdated' | 'figma'> = {
  contentful: {
    totalEntries: 1250,
    publishedEntries: 1100,
    draftEntries: 150,
    recentAssetUploads: 5,
    locales: 6,
    scheduledEntries: 48,
    weeklyPublishRate: 137,
    contentTypeDistribution: [
      { contentType: "LandingPage", entries: 310 },
      { contentType: "Article", entries: 442 },
      { contentType: "Teaser", entries: 268 },
      { contentType: "FAQ", entries: 119 },
    ],
  },
  github: {
    repoName: "frontend-monorepo",
    openPRs: 3,
    mergedPRs7d: 21,
    avgReviewTimeHours: 9,
    buildSuccessRate: 96,
    openIssues: 37,
    commitVolume7d: 114,
    componentUsageCount: [
      { componentName: "<Button />", count: 342 },
      { componentName: "<Card />", count: 120 },
      { componentName: "<Hero />", count: 45 },
      { componentName: "<Modal />", count: 88 },
    ],
  },
};

const isLiveFigmaPayload = (payload: unknown): payload is FigmaData => {
  if (!payload || typeof payload !== 'object') return false;

  const candidate = payload as FigmaData;

  return (
    typeof candidate.teamName === 'string' &&
    typeof candidate.filesCount === 'number' &&
    typeof candidate.designSystemUsage === 'number' &&
    typeof candidate.totalComponentUsages === 'number' &&
    typeof candidate.componentInsertionsLast30Days === 'number' &&
    typeof candidate.componentDetachmentsLast30Days === 'number' &&
    typeof candidate.teamsUsingLibrary === 'number' &&
    Array.isArray(candidate.topComponentUsage)
  );
};

const fetchLiveFigmaData = async (): Promise<FigmaData> => {
  const response = await fetch('/api/figma-analytics');
  if (!response.ok) {
    throw new Error(`Figma analytics request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isLiveFigmaPayload(payload)) {
    throw new Error("Figma analytics payload has unexpected shape");
  }

  return payload;
};

export const fetchDashboardData = async (): Promise<DashboardData> => {
  const figmaData = await fetchLiveFigmaData().catch((error) => {
    console.warn("No live Figma metrics available", error);
    return null;
  });

  return {
    ...fallbackDashboardData,
    figma: figmaData,
    lastUpdated: new Date().toLocaleTimeString(),
  };
};

const isFigmaConfigPayload = (payload: unknown): payload is FigmaConfigStatus => {
  if (!payload || typeof payload !== 'object') return false;

  const candidate = payload as FigmaConfigStatus;
  return typeof candidate.ready === 'boolean' && typeof candidate.configured === 'boolean';
};

export const fetchFigmaConfigStatus = async (): Promise<FigmaConfigStatus | null> => {
  const response = await fetch('/api/figma-config-check');
  if (!response.ok) {
    throw new Error(`Figma config check failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isFigmaConfigPayload(payload)) {
    throw new Error("Figma config check payload has unexpected shape");
  }

  return payload;
};
