import {
  ContentfulConfigStatus,
  ContentfulData,
  DashboardData,
  DashboardTimeseriesResponse,
  FigmaConfigStatus,
  FigmaData,
  GithubConfigStatus,
  GithubData,
  TimeSpan,
} from '../types';

const fallbackDashboardData: Omit<DashboardData, 'lastUpdated' | 'figma'> = {
  contentful: {
    totalEntries: 1250,
    publishedEntries: 1100,
    draftEntries: 150,
    staleDraftEntries: 42,
    totalAssets: 510,
    locales: 6,
    scheduledEntries: 48,
    scheduledEntriesNext7Days: 12,
    weeklyPublishRate: 137,
    weeklyPublishRateDelta: 18,
    contentTypeDistributionStatus: 'ok',
    contentTypeDistributionError: null,
    contentTypeDistribution: [
      { contentType: "LandingPage", entries: 310 },
      { contentType: "Article", entries: 442 },
      { contentType: "Teaser", entries: 268 },
      { contentType: "FAQ", entries: 119 },
    ],
  },
  github: {
    source: 'mock',
    organization: 'vodafone',
    repoName: "frontend-monorepo",
    consumingRepos30d: 42,
    newConsumingRepos30d: 8,
    repoViews14d: 1896,
    repoViews14dDelta: 312,
    uniqueVisitors14d: 267,
    repoClones14d: 138,
    uniqueCloners14d: 64,
    openBugs: 29,
    openCriticalBugs: 4,
    medianBugAgeDays: 11,
    bugsOpened7d: 9,
    bugsClosed7d: 7,
    openPRs: 3,
    openPROlderThan7d: 1,
    mergedPRs7d: 12,
    medianTimeToFirstReviewHours: 6,
    medianTimeToMergeHours: 38,
    topConsumingRepos: [
      { repo: 'web-checkout', imports: 612 },
      { repo: 'myvodafone-app', imports: 477 },
      { repo: 'shop-shell', imports: 329 },
      { repo: 'care-portal', imports: 210 },
    ],
    topImportedComponents: [
      { componentName: "<Button />", count: 1240 },
      { componentName: "<Card />", count: 840 },
      { componentName: "<Input />", count: 670 },
      { componentName: "<Modal />", count: 381 },
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
    Array.isArray(candidate.topLibraryConsumingTeams) &&
    Array.isArray(candidate.topComponentUsage) &&
    Array.isArray(candidate.topDetachedComponents)
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

const isLiveContentfulPayload = (payload: unknown): payload is ContentfulData => {
  if (!payload || typeof payload !== 'object') return false;

  const candidate = payload as ContentfulData;

  return (
    typeof candidate.totalEntries === 'number' &&
    typeof candidate.publishedEntries === 'number' &&
    typeof candidate.draftEntries === 'number' &&
    typeof candidate.staleDraftEntries === 'number' &&
    typeof candidate.totalAssets === 'number' &&
    typeof candidate.locales === 'number' &&
    typeof candidate.scheduledEntries === 'number' &&
    typeof candidate.scheduledEntriesNext7Days === 'number' &&
    typeof candidate.weeklyPublishRate === 'number' &&
    typeof candidate.weeklyPublishRateDelta === 'number' &&
    Array.isArray(candidate.contentTypeDistribution)
  );
};

const fetchLiveContentfulData = async (): Promise<ContentfulData> => {
  const response = await fetch('/api/contentful-analytics');
  if (!response.ok) {
    throw new Error(`Contentful analytics request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isLiveContentfulPayload(payload)) {
    throw new Error("Contentful analytics payload has unexpected shape");
  }

  return payload;
};

const isLiveGithubPayload = (payload: unknown): payload is GithubData => {
  if (!payload || typeof payload !== 'object') return false;

  const candidate = payload as GithubData;

  return (
    (candidate.source === 'mock' || candidate.source === 'live') &&
    typeof candidate.organization === 'string' &&
    typeof candidate.repoName === 'string' &&
    typeof candidate.consumingRepos30d === 'number' &&
    typeof candidate.newConsumingRepos30d === 'number' &&
    typeof candidate.repoViews14d === 'number' &&
    typeof candidate.repoViews14dDelta === 'number' &&
    typeof candidate.uniqueVisitors14d === 'number' &&
    typeof candidate.repoClones14d === 'number' &&
    typeof candidate.uniqueCloners14d === 'number' &&
    typeof candidate.openBugs === 'number' &&
    typeof candidate.openCriticalBugs === 'number' &&
    typeof candidate.medianBugAgeDays === 'number' &&
    typeof candidate.bugsOpened7d === 'number' &&
    typeof candidate.bugsClosed7d === 'number' &&
    typeof candidate.openPRs === 'number' &&
    typeof candidate.openPROlderThan7d === 'number' &&
    typeof candidate.mergedPRs7d === 'number' &&
    typeof candidate.medianTimeToFirstReviewHours === 'number' &&
    typeof candidate.medianTimeToMergeHours === 'number' &&
    Array.isArray(candidate.topConsumingRepos) &&
    Array.isArray(candidate.topImportedComponents)
  );
};

const fetchLiveGithubData = async (): Promise<GithubData> => {
  const response = await fetch('/api/github-analytics');
  if (!response.ok) {
    throw new Error(`GitHub analytics request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isLiveGithubPayload(payload)) {
    throw new Error("GitHub analytics payload has unexpected shape");
  }

  return payload;
};

const isDashboardDataPayload = (payload: unknown): payload is DashboardData => {
  if (!payload || typeof payload !== 'object') return false;

  const candidate = payload as DashboardData;

  return (
    (candidate.figma === null || isLiveFigmaPayload(candidate.figma)) &&
    isLiveContentfulPayload(candidate.contentful) &&
    isLiveGithubPayload(candidate.github) &&
    typeof candidate.lastUpdated === 'string'
  );
};

const fetchLatestStoredDashboardData = async (): Promise<DashboardData | null> => {
  const response = await fetch('/api/dashboard-snapshots-latest');
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Dashboard snapshot load failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error("Dashboard snapshot payload has unexpected shape");
  }

  const candidate = payload as { data?: unknown };
  if (!isDashboardDataPayload(candidate.data)) {
    throw new Error("Dashboard snapshot payload has unexpected data shape");
  }

  return candidate.data;
};

export const fetchDashboardData = async (): Promise<DashboardData> => {
  const [figmaData, contentfulData, githubData] = await Promise.all([
    fetchLiveFigmaData().catch((error) => {
      console.warn("No live Figma metrics available", error);
      return null;
    }),
    fetchLiveContentfulData().catch((error) => {
      console.warn("No live Contentful metrics available", error);
      return null;
    }),
    fetchLiveGithubData().catch((error) => {
      console.warn("No live GitHub metrics available", error);
      return null;
    }),
  ]);

  const dashboardData: DashboardData = {
    ...fallbackDashboardData,
    figma: figmaData,
    contentful: contentfulData || fallbackDashboardData.contentful,
    github: githubData || fallbackDashboardData.github,
    lastUpdated: new Date().toLocaleTimeString(),
  };

  const hasFreshLiveData = Boolean(figmaData || contentfulData || githubData);

  if (hasFreshLiveData) {
    return dashboardData;
  }

  const latestStoredDashboard = await fetchLatestStoredDashboardData().catch((error) => {
    console.warn("Unable to load latest stored dashboard snapshot", error);
    return null;
  });

  return latestStoredDashboard || dashboardData;
};

const isTimeSpan = (value: unknown): value is TimeSpan => (
  value === '7d' || value === '30d' || value === '90d' || value === '365d'
);

const isTimeseriesValueArray = (values: unknown, expectedLength: number): values is Array<number | null> => (
  Array.isArray(values) &&
  values.length === expectedLength &&
  values.every((value) => value === null || typeof value === 'number')
);

const isDashboardTimeseriesPayload = (payload: unknown): payload is DashboardTimeseriesResponse => {
  if (!payload || typeof payload !== 'object') return false;

  const candidate = payload as DashboardTimeseriesResponse;
  if (!isTimeSpan(candidate.span)) return false;
  if (!Array.isArray(candidate.days) || !candidate.days.every((day) => typeof day === 'string')) return false;
  if (!candidate.series || typeof candidate.series !== 'object') return false;
  if (!candidate.meta || typeof candidate.meta !== 'object') return false;
  if (!candidate.meta.window || typeof candidate.meta.window !== 'object') return false;
  if (
    typeof candidate.meta.window.startDay !== 'string' ||
    typeof candidate.meta.window.endDay !== 'string' ||
    typeof candidate.meta.window.monthOffset !== 'number'
  ) return false;

  const expectedLength = candidate.days.length;
  return (
    isTimeseriesValueArray(candidate.series.design, expectedLength) &&
    isTimeseriesValueArray(candidate.series.code, expectedLength) &&
    isTimeseriesValueArray(candidate.series.content, expectedLength)
  );
};

export const fetchDashboardTimeseries = async (span: TimeSpan = '7d', monthOffset = 0): Promise<DashboardTimeseriesResponse> => {
  const safeMonthOffset = Number.isFinite(monthOffset) ? Math.max(0, Math.floor(monthOffset)) : 0;
  const response = await fetch(`/api/dashboard-timeseries?span=${span}&month_offset=${safeMonthOffset}`);
  if (!response.ok) {
    throw new Error(`Dashboard timeseries request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isDashboardTimeseriesPayload(payload)) {
    throw new Error("Dashboard timeseries payload has unexpected shape");
  }

  return payload;
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

const isContentfulConfigPayload = (payload: unknown): payload is ContentfulConfigStatus => {
  if (!payload || typeof payload !== 'object') return false;

  const candidate = payload as ContentfulConfigStatus;
  return typeof candidate.ready === 'boolean' && typeof candidate.configured === 'boolean';
};

export const fetchContentfulConfigStatus = async (): Promise<ContentfulConfigStatus | null> => {
  const response = await fetch('/api/contentful-config-check');
  if (!response.ok) {
    throw new Error(`Contentful config check failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isContentfulConfigPayload(payload)) {
    throw new Error("Contentful config check payload has unexpected shape");
  }

  return payload;
};

const isGithubConfigPayload = (payload: unknown): payload is GithubConfigStatus => {
  if (!payload || typeof payload !== 'object') return false;

  const candidate = payload as GithubConfigStatus;
  return (
    typeof candidate.ready === 'boolean' &&
    typeof candidate.configured === 'boolean' &&
    (candidate.mode === 'mock' || candidate.mode === 'live')
  );
};

export const fetchGithubConfigStatus = async (): Promise<GithubConfigStatus | null> => {
  const response = await fetch('/api/github-config-check');
  if (!response.ok) {
    throw new Error(`GitHub config check failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!isGithubConfigPayload(payload)) {
    throw new Error("GitHub config check payload has unexpected shape");
  }

  return payload;
};
