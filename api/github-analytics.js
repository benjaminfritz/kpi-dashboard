const GITHUB_API_BASE_URL = "https://api.github.com";
const DEFAULT_MODE = "mock";

const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);

const parseBoolean = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return fallback;
};

const resolveMode = ({ queryMode, envMode }) => {
  const mode = (queryMode || envMode || DEFAULT_MODE).toLowerCase();
  return mode === "live" ? "live" : "mock";
};

const parseErrorBody = async (response) => {
  try {
    const payload = await response.json();
    return payload?.message || JSON.stringify(payload);
  } catch {
    return response.statusText || "Unknown GitHub API error";
  }
};

const requestGithub = async ({ token, path, searchParams = {} }) => {
  const query = new URLSearchParams(searchParams);
  const url = `${GITHUB_API_BASE_URL}${path}${query.size > 0 ? `?${query.toString()}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const detail = await parseErrorBody(response);
    throw new Error(`GitHub request failed (${response.status}): ${detail}`);
  }

  return response.json();
};

const buildMockGithubAnalytics = ({ owner, repo, org }) => ({
  source: "mock",
  organization: org || owner || "vodafone",
  repoName: repo || "frontend-monorepo",
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
    { repo: "web-checkout", imports: 612 },
    { repo: "myvodafone-app", imports: 477 },
    { repo: "shop-shell", imports: 329 },
    { repo: "care-portal", imports: 210 },
  ],
  topImportedComponents: [
    { componentName: "<Button />", count: 1240 },
    { componentName: "<Card />", count: 840 },
    { componentName: "<Input />", count: 670 },
    { componentName: "<Modal />", count: 381 },
  ],
});

const buildLiveGithubAnalytics = async ({ token, owner, repo, org }) => {
  // Minimal live scaffold: repository and traffic endpoints. Extend with code-search/import
  // aggregation + issue/PR analytics in this function when moving beyond mock data.
  const [viewsPayload, clonesPayload] = await Promise.all([
    requestGithub({ token, path: `/repos/${owner}/${repo}/traffic/views` }),
    requestGithub({ token, path: `/repos/${owner}/${repo}/traffic/clones` }),
  ]);

  const viewsCount = typeof viewsPayload?.count === "number" ? viewsPayload.count : 0;
  const uniques = typeof viewsPayload?.uniques === "number" ? viewsPayload.uniques : 0;
  const clonesCount = typeof clonesPayload?.count === "number" ? clonesPayload.count : 0;
  const cloneUniques = typeof clonesPayload?.uniques === "number" ? clonesPayload.uniques : 0;

  return {
    ...buildMockGithubAnalytics({ owner, repo, org }),
    source: "live",
    organization: org || owner,
    repoName: repo,
    repoViews14d: viewsCount,
    uniqueVisitors14d: uniques,
    repoClones14d: clonesCount,
    uniqueCloners14d: cloneUniques,
    repoViews14dDelta: 0,
  };
};

export const loadGithubAnalytics = async ({ query = {}, env = process.env } = {}) => {
  const token = env.GITHUB_TOKEN;
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const org = env.GITHUB_ORG || owner;

  const mode = resolveMode({
    queryMode: pickFirst(query.mode),
    envMode: env.GITHUB_ANALYTICS_MODE,
  });

  const allowMockFallback = parseBoolean(
    pickFirst(query.allow_mock_fallback),
    true
  );

  if (mode === "mock") {
    return buildMockGithubAnalytics({ owner, repo, org });
  }

  if (!token || !owner || !repo) {
    if (allowMockFallback) {
      return buildMockGithubAnalytics({ owner, repo, org });
    }

    throw new Error("Missing GitHub configuration");
  }

  try {
    return await buildLiveGithubAnalytics({ token, owner, repo, org });
  } catch (error) {
    if (allowMockFallback) {
      return buildMockGithubAnalytics({ owner, repo, org });
    }

    throw error;
  }
};

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  response.setHeader("Cache-Control", "no-store");

  try {
    const payload = await loadGithubAnalytics({ query: request.query });
    response.status(200).json(payload);
  } catch (error) {
    const requiredEnv = ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"];
    const missingConfig = !process.env.GITHUB_TOKEN || !process.env.GITHUB_OWNER || !process.env.GITHUB_REPO;
    response.status(missingConfig ? 503 : 502).json({
      message: missingConfig ? "Missing GitHub configuration" : "Failed to load GitHub analytics",
      ...(missingConfig ? { requiredEnv } : { detail: error instanceof Error ? error.message : "Unknown error" }),
    });
  }
}
