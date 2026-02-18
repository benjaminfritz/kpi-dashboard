export interface FigmaData {
  teamName: string;
  filesCount: number;
  recentComments: number;
  designSystemUsage: number;
  componentsPublishedLast30Days: number;
  reviewLatencyHours: number;
  libraryAdoption: {
    library: string;
    adoption: number;
  }[];
}

export interface ContentfulData {
  totalEntries: number;
  publishedEntries: number;
  draftEntries: number;
  recentAssetUploads: number;
  locales: number;
  scheduledEntries: number;
  weeklyPublishRate: number;
  contentTypeDistribution: {
    contentType: string;
    entries: number;
  }[];
}

export interface GithubData {
  repoName: string;
  openPRs: number;
  mergedPRs7d: number;
  avgReviewTimeHours: number;
  buildSuccessRate: number;
  openIssues: number;
  commitVolume7d: number;
  componentUsageCount: {
    componentName: string;
    count: number;
  }[];
}

export interface DashboardData {
  figma: FigmaData;
  contentful: ContentfulData;
  github: GithubData;
  lastUpdated: string;
}
