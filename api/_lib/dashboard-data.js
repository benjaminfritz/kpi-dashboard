import { loadContentfulAnalytics } from '../contentful-analytics.js';
import { loadFigmaAnalytics } from '../figma-analytics.js';
import { loadGithubAnalytics } from '../github-analytics.js';

const fallbackDashboardData = {
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
    taxonomyDistributionStatus: 'ok',
    taxonomyDistributionError: null,
    taxonomyDistributionScheme: 'deConsumer',
    contentTypeDistribution: [
      { contentType: 'LandingPage', entries: 310 },
      { contentType: 'Article', entries: 442 },
      { contentType: 'Teaser', entries: 268 },
      { contentType: 'FAQ', entries: 119 },
    ],
    taxonomyDistribution: [
      { conceptId: 'documentationPages', conceptLabel: 'Documentation Pages', entries: 41 },
      { conceptId: 'header', conceptLabel: 'Header', entries: 4 },
      { conceptId: 'optionenAppsServicesMoFu', conceptLabel: 'Optionen Apps Services MoFu', entries: 3 },
      { conceptId: 'legalSeiten', conceptLabel: 'Legal Seiten', entries: 2 },
      { conceptId: 'uncategorized', conceptLabel: 'Uncategorized', entries: 1200 },
    ],
  },
  github: {
    source: 'mock',
    organization: 'vodafone',
    repoName: 'frontend-monorepo',
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
      { componentName: '<Button />', count: 1240 },
      { componentName: '<Card />', count: 840 },
      { componentName: '<Input />', count: 670 },
      { componentName: '<Modal />', count: 381 },
    ],
  },
};

const formatLastUpdated = (date) => date.toLocaleTimeString();

const toErrorMessage = (error) => (error instanceof Error ? error.message : 'Unknown error');

export const buildDashboardSnapshotData = async ({ now = new Date() } = {}) => {
  const [figmaResult, contentfulResult, githubResult] = await Promise.allSettled([
    loadFigmaAnalytics(),
    loadContentfulAnalytics(),
    loadGithubAnalytics(),
  ]);

  const data = {
    figma: figmaResult.status === 'fulfilled' ? figmaResult.value : null,
    contentful:
      contentfulResult.status === 'fulfilled' ? contentfulResult.value : fallbackDashboardData.contentful,
    github: githubResult.status === 'fulfilled' ? githubResult.value : fallbackDashboardData.github,
    lastUpdated: formatLastUpdated(now),
  };

  return {
    data,
    hasFreshData:
      figmaResult.status === 'fulfilled' ||
      contentfulResult.status === 'fulfilled' ||
      (githubResult.status === 'fulfilled' && githubResult.value.source === 'live'),
    warnings: {
      figma: figmaResult.status === 'rejected' ? toErrorMessage(figmaResult.reason) : null,
      contentful: contentfulResult.status === 'rejected' ? toErrorMessage(contentfulResult.reason) : null,
      github: githubResult.status === 'rejected' ? toErrorMessage(githubResult.reason) : null,
    },
  };
};
