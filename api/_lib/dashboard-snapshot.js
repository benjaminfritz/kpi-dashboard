const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value) => typeof value === 'string';
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isArray = (value) => Array.isArray(value);

const demoContentfulReleases = [
  {
    id: 'release-spring-launch',
    name: 'Spring Launch',
    version: 'v2.4.0',
    releaseDate: '2026-03-18T09:00:00.000Z',
    status: 'planned',
    summary: '3 items in release',
  },
  {
    id: 'release-self-service',
    name: 'Self-Service Improvements',
    version: 'v2.3.2',
    releaseDate: '2026-03-10T13:30:00.000Z',
    status: 'inProgress',
    summary: '2 items in release',
  },
  {
    id: 'release-winter-wrap',
    name: 'Winter Wrap-Up',
    version: 'v2.3.0',
    releaseDate: '2026-02-27T08:00:00.000Z',
    status: 'released',
    summary: '4 items in release',
  },
];

const isFigmaData = (value) => {
  if (value === null) return true;
  if (!isObject(value)) return false;

  return (
    isString(value.teamName) &&
    isNumber(value.filesCount) &&
    isNumber(value.designSystemUsage) &&
    isNumber(value.totalComponentUsages) &&
    isNumber(value.componentInsertionsLast30Days) &&
    isNumber(value.componentDetachmentsLast30Days) &&
    isNumber(value.teamsUsingLibrary) &&
    isArray(value.topLibraryConsumingTeams) &&
    isArray(value.topComponentUsage) &&
    isArray(value.topDetachedComponents)
  );
};

const isContentfulData = (value) => {
  if (!isObject(value)) return false;

  return (
    isNumber(value.totalEntries) &&
    isNumber(value.publishedEntries) &&
    isNumber(value.draftEntries) &&
    isNumber(value.staleDraftEntries) &&
    isNumber(value.totalAssets) &&
    isNumber(value.locales) &&
    isNumber(value.scheduledEntries) &&
    isNumber(value.scheduledEntriesNext30Days) &&
    isNumber(value.publishedEntries30d) &&
    isNumber(value.publishedEntries30dDelta) &&
    (value.releases === undefined || isArray(value.releases)) &&
    isArray(value.contentTypeDistribution) &&
    (value.taxonomyDistribution === undefined || isArray(value.taxonomyDistribution)) &&
    (value.tagDistribution === undefined || isArray(value.tagDistribution)) &&
    (value.assetTypeDistribution === undefined || isArray(value.assetTypeDistribution))
  );
};

const isGithubData = (value) => {
  if (!isObject(value)) return false;

  return (
    (value.source === 'mock' || value.source === 'live') &&
    isString(value.organization) &&
    isString(value.repoName) &&
    isNumber(value.consumingRepos30d) &&
    isNumber(value.newConsumingRepos30d) &&
    isNumber(value.repoViews14d) &&
    isNumber(value.repoViews14dDelta) &&
    isNumber(value.uniqueVisitors14d) &&
    isNumber(value.repoClones14d) &&
    isNumber(value.uniqueCloners14d) &&
    isNumber(value.openBugs) &&
    isNumber(value.openCriticalBugs) &&
    isNumber(value.medianBugAgeDays) &&
    isNumber(value.bugsOpened7d) &&
    isNumber(value.bugsClosed7d) &&
    isNumber(value.openPRs) &&
    isNumber(value.openPROlderThan7d) &&
    isNumber(value.mergedPRs7d) &&
    isNumber(value.medianTimeToFirstReviewHours) &&
    isNumber(value.medianTimeToMergeHours) &&
    isArray(value.topConsumingRepos) &&
    isArray(value.topImportedComponents)
  );
};

export const isDashboardSnapshotPayload = (value) => {
  if (!isObject(value)) return false;

  return (
    (value.lastUpdated === undefined || value.lastUpdated === null || isString(value.lastUpdated)) &&
    isFigmaData(value.figma) &&
    isContentfulData(value.contentful) &&
    isGithubData(value.github)
  );
};

export const toDashboardDataFromSnapshot = (snapshot) => {
  const fallbackLastUpdated = new Date(snapshot.createdAt).toLocaleTimeString();
  const contentful = snapshot.contentful || {};

  return {
    figma: snapshot.figma,
    contentful: {
      ...contentful,
      taxonomyDistributionStatus: contentful.taxonomyDistributionStatus ?? 'ok',
      taxonomyDistributionError: contentful.taxonomyDistributionError ?? null,
      tagDistributionStatus: contentful.tagDistributionStatus ?? 'ok',
      tagDistributionError: contentful.tagDistributionError ?? null,
      assetTypeDistributionStatus: contentful.assetTypeDistributionStatus ?? 'ok',
      assetTypeDistributionError: contentful.assetTypeDistributionError ?? null,
      taxonomyDistributionScheme: contentful.taxonomyDistributionScheme ?? null,
      releases: Array.isArray(contentful.releases)
        ? contentful.releases
        : demoContentfulReleases,
      taxonomyDistribution: Array.isArray(contentful.taxonomyDistribution)
        ? contentful.taxonomyDistribution.filter((item) => item?.conceptId !== 'uncategorized')
        : [],
      tagDistribution: Array.isArray(contentful.tagDistribution) ? contentful.tagDistribution : [],
      assetTypeDistribution: Array.isArray(contentful.assetTypeDistribution) ? contentful.assetTypeDistribution : [],
    },
    github: snapshot.github,
    lastUpdated: snapshot.lastUpdatedLabel || fallbackLastUpdated,
  };
};

export const isPrismaSetupError = (error) => {
  const code = error?.code;

  return (
    code === 'P1001' || // Can't reach database server.
    code === 'P1003' || // Database does not exist.
    code === 'P1012' || // Missing or invalid datasource env.
    code === 'P2021' // Table does not exist (migration not applied).
  );
};
