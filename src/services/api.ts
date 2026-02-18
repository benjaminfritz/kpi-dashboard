import { DashboardData } from '../types';

export const fetchDashboardData = async (): Promise<DashboardData> => {
  // Simuliert API Delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    figma: {
      teamName: "Marketing Design",
      filesCount: 42,
      recentComments: 12,
      designSystemUsage: 78,
      componentsPublishedLast30Days: 28,
      reviewLatencyHours: 17,
      libraryAdoption: [
        { library: "Core UI", adoption: 93 },
        { library: "Marketing Blocks", adoption: 74 },
        { library: "Editorial", adoption: 58 },
      ],
    },
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
    lastUpdated: new Date().toLocaleTimeString(),
  };
};
