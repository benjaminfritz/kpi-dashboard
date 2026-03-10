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
  topDetachedComponents: {
    componentName: string;
    detachments: number;
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
  totalAssets: number;
  locales: number;
  scheduledEntries: number;
  scheduledEntriesNext30Days: number;
  publishedEntries30d: number;
  publishedEntries30dDelta: number;
  contentTypeDistributionStatus?: 'ok' | 'unavailable';
  contentTypeDistributionError?: string | null;
  taxonomyDistributionStatus?: 'ok' | 'unavailable';
  taxonomyDistributionError?: string | null;
  tagDistributionStatus?: 'ok' | 'unavailable';
  tagDistributionError?: string | null;
  assetTypeDistributionStatus?: 'ok' | 'unavailable';
  assetTypeDistributionError?: string | null;
  taxonomyDistributionScheme?: string | null;
  contentTypeDistribution: {
    contentType: string;
    entries: number;
  }[];
  taxonomyDistribution: {
    conceptId: string;
    conceptLabel: string;
    entries: number;
  }[];
  tagDistribution: {
    tagId: string;
    tagLabel: string;
    entries: number;
  }[];
  assetTypeDistribution: {
    assetType: string;
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

export type TimeSpan = '30d' | '90d' | '365d';

export interface DashboardTimeseriesResponse {
  span: TimeSpan;
  days: string[];
  series: {
    design: Array<number | null>;
    code: Array<number | null>;
    content: Array<number | null>;
  };
  meta: {
    metricKeys: {
      design: 'figma.totalComponentUsages';
      code: 'github.consumingRepos30d';
      content: 'contentful.totalEntries';
    };
    aggregation: 'latest_per_day';
    missing: 'null_gap';
    window: {
      startDay: string;
      endDay: string;
      monthOffset: number;
    };
  };
}
