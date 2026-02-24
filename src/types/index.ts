export interface FigmaData {
  teamName: string;
  filesCount: number;
  designSystemUsage: number;
  totalComponentUsages: number;
  componentInsertionsLast30Days: number;
  componentDetachmentsLast30Days: number;
  teamsUsingLibrary: number;
  topLibraryConsumingTeams: {
    teamName: string;
    usages: number;
  }[];
  topComponentUsage: {
    componentName: string;
    usages: number;
  }[];
}

export interface FigmaConfigStatus {
  ready: boolean;
  configured: boolean;
  env?: {
    FIGMA_ACCESS_TOKEN: boolean;
    FIGMA_LIBRARY_FILE_KEY: boolean;
  };
  tokenPreview?: string | null;
  libraryFileKeyPreview?: string | null;
  validation?: {
    ok: boolean;
    status: number;
    rowCount?: number;
    detail?: string;
  };
  checkedAt?: string;
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
  figma: FigmaData | null;
  contentful: ContentfulData;
  github: GithubData;
  lastUpdated: string;
}
