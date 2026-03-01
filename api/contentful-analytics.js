const CONTENTFUL_API_BASE_URL = "https://api.contentful.com";
const DEFAULT_ENVIRONMENT_ID = "master";
const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_ASSET_WINDOW_HOURS = 24;
const DEFAULT_STALE_DRAFT_DAYS = 30;
const DEFAULT_SCHEDULE_WINDOW_DAYS = 7;
const MAX_TOP_CONTENT_TYPES = 5;
const MAX_CONTENT_TYPE_SAMPLE = 30;
const DEFAULT_CONTENT_TYPE_DISTRIBUTION_CONCURRENCY = 3;
const DEFAULT_RATE_LIMIT_RETRIES = 5;
const DEFAULT_BASE_RETRY_DELAY_MS = 250;
const DEFAULT_MAX_RETRY_DELAY_MS = 8000;
const DEFAULT_CONTENT_TYPE_DISTRIBUTION_CACHE_TTL_MS = 5 * 60 * 1000;

const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const parsePositiveInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return clamp(parsed, min, max);
};

const CONTENT_TYPE_DISTRIBUTION_CONCURRENCY = parsePositiveInteger(
  process.env.CONTENTFUL_CONTENT_TYPE_CONCURRENCY,
  DEFAULT_CONTENT_TYPE_DISTRIBUTION_CONCURRENCY,
  1,
  10
);

const CONTENTFUL_RATE_LIMIT_RETRIES = parsePositiveInteger(
  process.env.CONTENTFUL_RATE_LIMIT_RETRIES,
  DEFAULT_RATE_LIMIT_RETRIES,
  1,
  10
);

const CONTENTFUL_BASE_RETRY_DELAY_MS = parsePositiveInteger(
  process.env.CONTENTFUL_BASE_RETRY_DELAY_MS,
  DEFAULT_BASE_RETRY_DELAY_MS,
  100,
  5000
);

const CONTENTFUL_MAX_RETRY_DELAY_MS = parsePositiveInteger(
  process.env.CONTENTFUL_MAX_RETRY_DELAY_MS,
  DEFAULT_MAX_RETRY_DELAY_MS,
  250,
  30000
);

const CONTENT_TYPE_DISTRIBUTION_CACHE_TTL_MS = parsePositiveInteger(
  process.env.CONTENTFUL_CONTENT_TYPE_CACHE_TTL_MS,
  DEFAULT_CONTENT_TYPE_DISTRIBUTION_CACHE_TTL_MS,
  1000,
  60 * 60 * 1000
);

const contentTypeDistributionCache = new Map();

const parseDate = (value) => {
  if (typeof value !== "string" || value.length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getScheduledForDate = (item) => {
  const rawCandidates = [
    item?.scheduledFor?.datetime,
    item?.scheduledFor?.dateTime,
    item?.scheduledFor?.at,
    item?.scheduledFor?.timestamp,
    item?.scheduledFor,
    item?.sys?.scheduledFor?.datetime,
  ];

  for (const candidate of rawCandidates) {
    const parsed = parseDate(candidate);
    if (parsed) return parsed;
  }

  return null;
};

const parseErrorBody = async (response) => {
  try {
    const payload = await response.json();
    return payload?.message || JSON.stringify(payload);
  } catch {
    return response.statusText || "Unknown Contentful API error";
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetrySeconds = (value) => {
  if (typeof value !== "string" || value.length === 0) return null;

  const asSeconds = Number.parseFloat(value);
  if (Number.isFinite(asSeconds) && asSeconds > 0) {
    return asSeconds;
  }

  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) {
    const deltaMs = asDate.getTime() - Date.now();
    if (deltaMs > 0) return deltaMs / 1000;
  }

  return null;
};

const resolveRetryDelayMs = (response, attempt) => {
  const resetHeader = response.headers.get("x-contentful-ratelimit-reset");
  const retryAfterHeader = response.headers.get("retry-after");
  const retrySeconds = parseRetrySeconds(resetHeader) ?? parseRetrySeconds(retryAfterHeader);
  if (typeof retrySeconds === "number") {
    return Math.ceil(retrySeconds * 1000);
  }

  const exponentialBackoff = CONTENTFUL_BASE_RETRY_DELAY_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * CONTENTFUL_BASE_RETRY_DELAY_MS);
  return Math.min(CONTENTFUL_MAX_RETRY_DELAY_MS, exponentialBackoff + jitter);
};

const requestContentful = async ({ token, path, searchParams }) => {
  const query = new URLSearchParams(searchParams);
  const url = `${CONTENTFUL_API_BASE_URL}${path}?${query.toString()}`;

  for (let attempt = 0; attempt <= CONTENTFUL_RATE_LIMIT_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return response.json();
    }

    if (response.status === 429 && attempt < CONTENTFUL_RATE_LIMIT_RETRIES) {
      const retryDelayMs = resolveRetryDelayMs(response, attempt);
      await sleep(retryDelayMs);
      continue;
    }

    const detail = await parseErrorBody(response);
    throw new Error(`Contentful request failed (${response.status}): ${detail}`);
  }

  throw new Error("Contentful request failed: retry attempts exhausted");
};

const buildEnvironmentPath = (spaceId, environmentId, resourcePath) =>
  `/spaces/${encodeURIComponent(spaceId)}/environments/${encodeURIComponent(environmentId)}${resourcePath}`;

const buildSpacePath = (spaceId, resourcePath) =>
  `/spaces/${encodeURIComponent(spaceId)}${resourcePath}`;

const fetchCount = async ({ token, spaceId, environmentId, resourcePath, filters = {} }) => {
  const payload = await requestContentful({
    token,
    path: buildEnvironmentPath(spaceId, environmentId, resourcePath),
    searchParams: {
      limit: "1",
      ...filters,
    },
  });

  return typeof payload?.total === "number" ? payload.total : 0;
};

const fetchSpaceCount = async ({ token, spaceId, resourcePath, filters = {} }) => {
  const payload = await requestContentful({
    token,
    path: buildSpacePath(spaceId, resourcePath),
    searchParams: {
      limit: "1",
      ...filters,
    },
  });

  return typeof payload?.total === "number" ? payload.total : 0;
};

const fetchScheduledEntries = async ({
  token,
  spaceId,
  environmentId,
  windowStart,
  windowEnd,
}) => {
  const uniqueEntryIds = new Set();
  const uniqueWindowEntryIds = new Set();
  const limit = 100;
  let skip = 0;

  while (true) {
    const payload = await requestContentful({
      token,
      path: buildEnvironmentPath(spaceId, environmentId, "/scheduled_actions"),
      searchParams: {
        limit: String(limit),
        skip: String(skip),
      },
    });

    const items = Array.isArray(payload?.items) ? payload.items : [];
    items.forEach((item) => {
      if (item?.sys?.status !== "scheduled") return;
      if (item?.entity?.sys?.type !== "Entry") return;
      const entryId = item?.entity?.sys?.id;
      if (typeof entryId === "string" && entryId.length > 0) {
        uniqueEntryIds.add(entryId);

        const scheduledFor = getScheduledForDate(item);
        if (
          scheduledFor &&
          scheduledFor >= windowStart &&
          scheduledFor <= windowEnd
        ) {
          uniqueWindowEntryIds.add(entryId);
        }
      }
    });

    const total = typeof payload?.total === "number" ? payload.total : items.length;
    skip += items.length;

    if (skip >= total || items.length === 0) {
      break;
    }
  }

  return {
    total: uniqueEntryIds.size,
    nextWindow: uniqueWindowEntryIds.size,
  };
};

const getContentTypeName = (contentType) => {
  const name = contentType?.name;
  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim();
  }

  const id = contentType?.sys?.id;
  if (typeof id === "string" && id.trim().length > 0) {
    return id.trim();
  }

  return "Unknown Content Type";
};

const mapWithConcurrency = async (items, concurrency, mapper) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const limit = Math.max(1, concurrency);
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
};

const fetchContentTypeDistribution = async ({ token, spaceId, environmentId }) => {
  const cacheKey = `${spaceId}:${environmentId}`;
  const cached = contentTypeDistributionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const payload = await requestContentful({
    token,
    path: buildEnvironmentPath(spaceId, environmentId, "/content_types"),
    searchParams: {
      limit: String(MAX_CONTENT_TYPE_SAMPLE),
      order: "name",
    },
  });

  const contentTypes = Array.isArray(payload?.items) ? payload.items : [];

  if (contentTypes.length === 0) {
    contentTypeDistributionCache.set(cacheKey, {
      value: [],
      expiresAt: Date.now() + CONTENT_TYPE_DISTRIBUTION_CACHE_TTL_MS,
    });
    return [];
  }

  const counts = await mapWithConcurrency(
    contentTypes,
    CONTENT_TYPE_DISTRIBUTION_CONCURRENCY,
    async (contentType) => {
      const contentTypeId = contentType?.sys?.id;
      if (typeof contentTypeId !== "string" || contentTypeId.length === 0) {
        return null;
      }

      const entries = await fetchCount({
        token,
        spaceId,
        environmentId,
        resourcePath: "/entries",
        filters: { content_type: contentTypeId },
      });

      return {
        contentType: getContentTypeName(contentType),
        entries,
      };
    }
  );

  const distribution = counts
    .filter((item) => item && item.entries > 0)
    .sort((a, b) => b.entries - a.entries)
    .slice(0, MAX_TOP_CONTENT_TYPES);

  contentTypeDistributionCache.set(cacheKey, {
    value: distribution,
    expiresAt: Date.now() + CONTENT_TYPE_DISTRIBUTION_CACHE_TTL_MS,
  });

  return distribution;
};

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  response.setHeader("Cache-Control", "no-store");

  const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
  const spaceId = process.env.CONTENTFUL_SPACE_ID;
  const environmentId = process.env.CONTENTFUL_ENVIRONMENT_ID || DEFAULT_ENVIRONMENT_ID;

  if (!token || !spaceId) {
    response.status(503).json({
      message: "Missing Contentful configuration",
      requiredEnv: ["CONTENTFUL_MANAGEMENT_TOKEN", "CONTENTFUL_SPACE_ID"],
    });
    return;
  }

  const lookbackDays = parsePositiveInteger(
    pickFirst(request.query?.lookback_days),
    DEFAULT_LOOKBACK_DAYS,
    1,
    60
  );

  const assetWindowHours = parsePositiveInteger(
    pickFirst(request.query?.asset_window_hours),
    DEFAULT_ASSET_WINDOW_HOURS,
    1,
    168
  );

  const staleDraftDays = parsePositiveInteger(
    pickFirst(request.query?.stale_draft_days),
    DEFAULT_STALE_DRAFT_DAYS,
    1,
    365
  );

  const scheduleWindowDays = parsePositiveInteger(
    pickFirst(request.query?.schedule_window_days),
    DEFAULT_SCHEDULE_WINDOW_DAYS,
    1,
    60
  );

  const now = new Date();
  const publishedSince = new Date(now);
  publishedSince.setUTCDate(publishedSince.getUTCDate() - lookbackDays);
  const previousPublishedSince = new Date(publishedSince);
  previousPublishedSince.setUTCDate(previousPublishedSince.getUTCDate() - lookbackDays);

  const assetsSince = new Date(now);
  assetsSince.setUTCHours(assetsSince.getUTCHours() - assetWindowHours);
  const previousAssetsSince = new Date(assetsSince);
  previousAssetsSince.setUTCHours(previousAssetsSince.getUTCHours() - assetWindowHours);

  const staleDraftCutoff = new Date(now);
  staleDraftCutoff.setUTCDate(staleDraftCutoff.getUTCDate() - staleDraftDays);

  const scheduleWindowEnd = new Date(now);
  scheduleWindowEnd.setUTCDate(scheduleWindowEnd.getUTCDate() + scheduleWindowDays);

  try {
    let contentTypeDistributionError = null;

    const [
      totalEntries,
      publishedEntries,
      draftEntries,
      staleDraftEntries,
      locales,
      weeklyPublishRate,
      previousWeeklyPublishRate,
      recentAssetUploads,
      previousRecentAssetUploads,
      scheduledMetrics,
      contentTypeDistribution,
    ] = await Promise.all([
      fetchCount({
        token,
        spaceId,
        environmentId,
        resourcePath: "/entries",
      }),
      fetchCount({
        token,
        spaceId,
        environmentId,
        resourcePath: "/entries",
        filters: { "sys.publishedAt[exists]": "true" },
      }),
      fetchCount({
        token,
        spaceId,
        environmentId,
        resourcePath: "/entries",
        filters: { "sys.publishedAt[exists]": "false" },
      }),
      fetchCount({
        token,
        spaceId,
        environmentId,
        resourcePath: "/entries",
        filters: {
          "sys.publishedAt[exists]": "false",
          "sys.updatedAt[lte]": staleDraftCutoff.toISOString(),
        },
      }),
      fetchSpaceCount({ token, spaceId, resourcePath: "/locales" }),
      fetchCount({
        token,
        spaceId,
        environmentId,
        resourcePath: "/entries",
        filters: { "sys.publishedAt[gte]": publishedSince.toISOString() },
      }),
      fetchCount({
        token,
        spaceId,
        environmentId,
        resourcePath: "/entries",
        filters: {
          "sys.publishedAt[gte]": previousPublishedSince.toISOString(),
          "sys.publishedAt[lt]": publishedSince.toISOString(),
        },
      }),
      fetchCount({
        token,
        spaceId,
        environmentId,
        resourcePath: "/assets",
        filters: { "sys.createdAt[gte]": assetsSince.toISOString() },
      }),
      fetchCount({
        token,
        spaceId,
        environmentId,
        resourcePath: "/assets",
        filters: {
          "sys.createdAt[gte]": previousAssetsSince.toISOString(),
          "sys.createdAt[lt]": assetsSince.toISOString(),
        },
      }),
      fetchScheduledEntries({
        token,
        spaceId,
        environmentId,
        windowStart: now,
        windowEnd: scheduleWindowEnd,
      }).catch(() => ({ total: 0, nextWindow: 0 })),
      fetchContentTypeDistribution({ token, spaceId, environmentId }).catch((error) => {
        contentTypeDistributionError =
          error instanceof Error ? error.message : "Unknown content type distribution error";
        return [];
      }),
    ]);

    const weeklyPublishRateDelta = weeklyPublishRate - previousWeeklyPublishRate;
    const recentAssetUploadsDelta = recentAssetUploads - previousRecentAssetUploads;

    response.status(200).json({
      totalEntries,
      publishedEntries,
      draftEntries,
      staleDraftEntries,
      recentAssetUploads,
      recentAssetUploadsDelta,
      locales,
      scheduledEntries: scheduledMetrics.total,
      scheduledEntriesNext7Days: scheduledMetrics.nextWindow,
      weeklyPublishRate,
      weeklyPublishRateDelta,
      contentTypeDistributionStatus: contentTypeDistributionError ? "unavailable" : "ok",
      contentTypeDistributionError,
      contentTypeDistribution,
    });
  } catch (error) {
    response.status(502).json({
      message: "Failed to load Contentful analytics",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
