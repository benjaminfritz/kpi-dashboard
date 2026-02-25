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
  staleDraftEntries: number;
  recentAssetUploads: number;
  recentAssetUploadsDelta: number;
  locales: number;
  scheduledEntries: number;
  scheduledEntriesNext7Days: number;
  weeklyPublishRate: number;
  weeklyPublishRateDelta: number;
  contentTypeDistributionStatus?: 'ok' | 'unavailable';
  contentTypeDistributionError?: string | null;
  contentTypeDistribution: {
    contentType: string;
    entries: number;
  }[];
}

export interface ContentfulConfigStatus {
  ready: boolean;
  configured: boolean;
  env?: {
    CONTENTFUL_MANAGEMENT_TOKEN: boolean;
    CONTENTFUL_SPACE_ID: boolean;
    CONTENTFUL_ENVIRONMENT_ID: boolean;
  };
  tokenPreview?: string | null;
  spaceIdPreview?: string | null;
  environmentId?: string;
  validation?: {
    ok: boolean;
    status: number;
    detail?: string;
  };
  checkedAt?: string;
}

export interface GithubData {
  source: 'mock' | 'live';
  organization: string;
  repoName: string;
  consumingRepos30d: number;
  newConsumingRepos30d: number;
  repoViews14d: number;
  repoViews14dDelta: number;
  uniqueVisitors14d: number;
  repoClones14d: number;
  uniqueCloners14d: number;
  openBugs: number;
  openCriticalBugs: number;
  medianBugAgeDays: number;
  bugsOpened7d: number;
  bugsClosed7d: number;
  openPRs: number;
  openPROlderThan7d: number;
  mergedPRs7d: number;
  medianTimeToFirstReviewHours: number;
  medianTimeToMergeHours: number;
  topConsumingRepos: {
    repo: string;
    imports: number;
  }[];
  topImportedComponents: {
    componentName: string;
    count: number;
  }[];
}

export interface GithubConfigStatus {
  ready: boolean;
  configured: boolean;
  mode: 'mock' | 'live';
  env?: {
    GITHUB_TOKEN: boolean;
    GITHUB_OWNER: boolean;
    GITHUB_REPO: boolean;
    GITHUB_ORG: boolean;
  };
  tokenPreview?: string | null;
  owner?: string;
  repo?: string;
  org?: string;
  validation?: {
    ok: boolean;
    status: number;
    detail?: string;
  };
  checkedAt?: string;
}

export interface DashboardData {
  figma: FigmaData | null;
  contentful: ContentfulData;
  github: GithubData;
  lastUpdated: string;
}
