const CONTENTFUL_API_BASE_URL = "https://api.contentful.com";
const DEFAULT_ENVIRONMENT_ID = "master";
const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_STALE_DRAFT_DAYS = 30;
const DEFAULT_SCHEDULE_WINDOW_DAYS = 30;
const DEFAULT_TOP_CONTENT_TYPES = 15;
const MAX_TOP_CONTENT_TYPES = 30;
const CONTENT_TYPES_PAGE_LIMIT = 100;
const ENTRIES_PAGE_LIMIT = 100;
const ASSETS_PAGE_LIMIT = 100;
const MAX_TAXONOMY_SCHEMES = 10;
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
const taxonomyDistributionCache = new Map();
const tagDistributionCache = new Map();
const assetTypeDistributionCache = new Map();

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

const getTaxonomyConceptSchemeId = (value) => {
  const id = value?.sys?.id;
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : null;
};

const formatConceptLabel = (conceptId) => {
  if (typeof conceptId !== "string" || conceptId.trim().length === 0) {
    return "Unknown Concept";
  }

  return conceptId
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatTagLabel = (tagId) => {
  if (typeof tagId !== "string" || tagId.trim().length === 0) {
    return "Unknown Tag";
  }

  return tagId
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const extractFileExtension = (fileName) => {
  if (typeof fileName !== "string") return null;
  const trimmed = fileName.trim();
  if (trimmed.length === 0) return null;

  const extension = trimmed.split(".").pop();
  if (!extension || extension === trimmed) return null;

  return extension.toUpperCase();
};

const getAssetFileDetails = (asset) => {
  const fileField = asset?.fields?.file;
  if (!fileField || typeof fileField !== "object") return null;

  const localizedFile = Array.isArray(fileField)
    ? fileField[0]
    : Object.values(fileField).find((value) => value && typeof value === "object");

  if (!localizedFile || typeof localizedFile !== "object") return null;

  return localizedFile;
};

const formatMimeSubtype = (value) => value.replace(/^x-/, "").replace(/\+/g, " ").replace(/[.-]+/g, " ");

const getAssetTypeLabel = (asset) => {
  const file = getAssetFileDetails(asset);
  const contentType = typeof file?.contentType === "string" ? file.contentType.trim().toLowerCase() : "";
  const extension = extractFileExtension(file?.fileName);

  if (contentType.startsWith("image/")) {
    if (contentType === "image/jpeg") return "JPG";
    return extension || formatMimeSubtype(contentType.slice("image/".length)).toUpperCase();
  }

  if (contentType === "application/pdf") return "PDF";
  if (contentType === "image/svg+xml") return "SVG";

  if (contentType.includes("/")) {
    const [, subtype] = contentType.split("/", 2);
    if (subtype) {
      return formatMimeSubtype(subtype)
        .split(" ")
        .map((part) => (part.length <= 4 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
        .join(" ");
    }
  }

  return extension || "Unknown";
};

const getEntryConceptIds = (entry) => {
  const concepts = Array.isArray(entry?.metadata?.concepts) ? entry.metadata.concepts : [];

  return Array.from(
    new Set(
      concepts
        .map((concept) => concept?.sys?.id)
        .filter((conceptId) => typeof conceptId === "string" && conceptId.length > 0)
    )
  );
};

const getEntryTagIds = (entry) => {
  const tags = Array.isArray(entry?.metadata?.tags) ? entry.metadata.tags : [];

  return Array.from(
    new Set(
      tags
        .map((tag) => tag?.sys?.id)
        .filter((tagId) => typeof tagId === "string" && tagId.length > 0)
    )
  );
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

const fetchAllContentTypes = async ({ token, spaceId, environmentId }) => {
  const items = [];
  let skip = 0;

  while (true) {
    const payload = await requestContentful({
      token,
      path: buildEnvironmentPath(spaceId, environmentId, "/content_types"),
      searchParams: {
        limit: String(CONTENT_TYPES_PAGE_LIMIT),
        skip: String(skip),
        order: "name",
      },
    });

    const pageItems = Array.isArray(payload?.items) ? payload.items : [];
    items.push(...pageItems);

    const total = typeof payload?.total === "number" ? payload.total : items.length;
    skip += pageItems.length;

    if (skip >= total || pageItems.length === 0) {
      break;
    }
  }

  return items;
};

const fetchAllEntries = async ({ token, spaceId, environmentId }) => {
  const items = [];
  let skip = 0;

  while (true) {
    const payload = await requestContentful({
      token,
      path: buildEnvironmentPath(spaceId, environmentId, "/entries"),
      searchParams: {
        limit: String(ENTRIES_PAGE_LIMIT),
        skip: String(skip),
      },
    });

    const pageItems = Array.isArray(payload?.items) ? payload.items : [];
    items.push(...pageItems);

    const total = typeof payload?.total === "number" ? payload.total : items.length;
    skip += pageItems.length;

    if (skip >= total || pageItems.length === 0) {
      break;
    }
  }

  return items;
};

const fetchAllTags = async ({ token, spaceId, environmentId }) => {
  const items = [];
  let skip = 0;

  while (true) {
    const payload = await requestContentful({
      token,
      path: buildEnvironmentPath(spaceId, environmentId, "/tags"),
      searchParams: {
        limit: String(ENTRIES_PAGE_LIMIT),
        skip: String(skip),
      },
    });

    const pageItems = Array.isArray(payload?.items) ? payload.items : [];
    items.push(...pageItems);

    const total = typeof payload?.total === "number" ? payload.total : items.length;
    skip += pageItems.length;

    if (skip >= total || pageItems.length === 0) {
      break;
    }
  }

  return items;
};

const fetchAllAssets = async ({ token, spaceId, environmentId }) => {
  const items = [];
  let skip = 0;

  while (true) {
    const payload = await requestContentful({
      token,
      path: buildEnvironmentPath(spaceId, environmentId, "/assets"),
      searchParams: {
        limit: String(ASSETS_PAGE_LIMIT),
        skip: String(skip),
      },
    });

    const pageItems = Array.isArray(payload?.items) ? payload.items : [];
    items.push(...pageItems);

    const total = typeof payload?.total === "number" ? payload.total : items.length;
    skip += pageItems.length;

    if (skip >= total || pageItems.length === 0) {
      break;
    }
  }

  return items;
};

const fetchTaxonomySchemeIds = async ({ token, spaceId, environmentId }) => {
  const contentTypes = await fetchAllContentTypes({ token, spaceId, environmentId });
  const schemeIds = new Map();

  contentTypes.forEach((contentType) => {
    const validations = Array.isArray(contentType?.metadata?.taxonomy) ? contentType.metadata.taxonomy : [];

    validations.forEach((validation) => {
      if (validation?.sys?.linkType !== "TaxonomyConceptScheme") {
        return;
      }

      const schemeId = getTaxonomyConceptSchemeId(validation);
      if (!schemeId) {
        return;
      }

      schemeIds.set(schemeId, (schemeIds.get(schemeId) || 0) + 1);
    });
  });

  return Array.from(schemeIds.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TAXONOMY_SCHEMES)
    .map(([schemeId]) => schemeId);
};

const resolveSelectedTaxonomyScheme = async ({ token, spaceId, environmentId, query, env }) => {
  const queryOverride = pickFirst(query.taxonomy_scheme);
  if (typeof queryOverride === "string" && queryOverride.trim().length > 0) {
    return {
      selectedScheme: queryOverride.trim(),
      detectedSchemes: [],
      selectionSource: "query",
    };
  }

  const envOverride = env.CONTENTFUL_TAXONOMY_SCHEME;
  if (typeof envOverride === "string" && envOverride.trim().length > 0) {
    return {
      selectedScheme: envOverride.trim(),
      detectedSchemes: [],
      selectionSource: "env",
    };
  }

  const detectedSchemes = await fetchTaxonomySchemeIds({ token, spaceId, environmentId });

  return {
    selectedScheme: detectedSchemes.length === 1 ? detectedSchemes[0] : null,
    detectedSchemes,
    selectionSource: detectedSchemes.length === 1 ? "auto" : "none",
  };
};

const fetchEntryTaxonomyDistribution = async ({
  token,
  spaceId,
  environmentId,
  topContentTypes,
  selectedScheme,
}) => {
  const cacheKey = `${spaceId}:${environmentId}:${selectedScheme || "all"}`;
  const cached = taxonomyDistributionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value.slice(0, topContentTypes);
  }

  const conceptCounts = new Map();
  const entries = await fetchAllEntries({ token, spaceId, environmentId });

  entries.forEach((entry) => {
    const conceptIds = getEntryConceptIds(entry);

    if (conceptIds.length === 0) {
      return;
    }

    conceptIds.forEach((conceptId) => {
      conceptCounts.set(conceptId, (conceptCounts.get(conceptId) || 0) + 1);
    });
  });

  const distribution = Array.from(conceptCounts.entries())
    .map(([conceptId, entries]) => ({
      conceptId,
      conceptLabel: formatConceptLabel(conceptId),
      entries,
    }))
    .sort((a, b) => b.entries - a.entries);

  distribution.sort((a, b) => b.entries - a.entries);

  taxonomyDistributionCache.set(cacheKey, {
    value: distribution,
    expiresAt: Date.now() + CONTENT_TYPE_DISTRIBUTION_CACHE_TTL_MS,
  });

  return distribution.slice(0, topContentTypes);
};

const fetchContentTypeDistribution = async ({ token, spaceId, environmentId, topContentTypes }) => {
  const cacheKey = `${spaceId}:${environmentId}`;
  const cached = contentTypeDistributionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value.slice(0, topContentTypes);
  }

  const contentTypes = await fetchAllContentTypes({ token, spaceId, environmentId });

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
    .sort((a, b) => b.entries - a.entries);

  contentTypeDistributionCache.set(cacheKey, {
    value: distribution,
    expiresAt: Date.now() + CONTENT_TYPE_DISTRIBUTION_CACHE_TTL_MS,
  });

  return distribution.slice(0, topContentTypes);
};

const fetchTagDistribution = async ({ token, spaceId, environmentId, topContentTypes }) => {
  const cacheKey = `${spaceId}:${environmentId}`;
  const cached = tagDistributionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value.slice(0, topContentTypes);
  }

  const [entries, tags] = await Promise.all([
    fetchAllEntries({ token, spaceId, environmentId }),
    fetchAllTags({ token, spaceId, environmentId }).catch(() => []),
  ]);

  const tagNames = new Map(
    tags
      .map((tag) => {
        const tagId = tag?.sys?.id;
        if (typeof tagId !== "string" || tagId.length === 0) return null;
        const tagName = typeof tag?.name === "string" && tag.name.trim().length > 0
          ? tag.name.trim()
          : formatTagLabel(tagId);
        return [tagId, tagName];
      })
      .filter(Boolean)
  );

  const counts = new Map();

  entries.forEach((entry) => {
    getEntryTagIds(entry).forEach((tagId) => {
      counts.set(tagId, (counts.get(tagId) || 0) + 1);
    });
  });

  const distribution = Array.from(counts.entries())
    .map(([tagId, entries]) => ({
      tagId,
      tagLabel: tagNames.get(tagId) || formatTagLabel(tagId),
      entries,
    }))
    .sort((a, b) => b.entries - a.entries);

  tagDistributionCache.set(cacheKey, {
    value: distribution,
    expiresAt: Date.now() + CONTENT_TYPE_DISTRIBUTION_CACHE_TTL_MS,
  });

  return distribution.slice(0, topContentTypes);
};

const fetchAssetTypeDistribution = async ({ token, spaceId, environmentId, topContentTypes }) => {
  const cacheKey = `${spaceId}:${environmentId}`;
  const cached = assetTypeDistributionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value.slice(0, topContentTypes);
  }

  const assets = await fetchAllAssets({ token, spaceId, environmentId });
  const counts = new Map();

  assets.forEach((asset) => {
    const assetType = getAssetTypeLabel(asset);
    counts.set(assetType, (counts.get(assetType) || 0) + 1);
  });

  const distribution = Array.from(counts.entries())
    .map(([assetType, entries]) => ({ assetType, entries }))
    .sort((a, b) => b.entries - a.entries);

  assetTypeDistributionCache.set(cacheKey, {
    value: distribution,
    expiresAt: Date.now() + CONTENT_TYPE_DISTRIBUTION_CACHE_TTL_MS,
  });

  return distribution.slice(0, topContentTypes);
};

export const loadContentfulAnalytics = async ({ query = {}, env = process.env } = {}) => {
  const token = env.CONTENTFUL_MANAGEMENT_TOKEN;
  const spaceId = env.CONTENTFUL_SPACE_ID;
  const environmentId = env.CONTENTFUL_ENVIRONMENT_ID || DEFAULT_ENVIRONMENT_ID;

  if (!token || !spaceId) {
    throw new Error("Missing Contentful configuration");
  }

  const lookbackDays = parsePositiveInteger(
    pickFirst(query.lookback_days),
    DEFAULT_LOOKBACK_DAYS,
    1,
    60
  );

  const staleDraftDays = parsePositiveInteger(
    pickFirst(query.stale_draft_days),
    DEFAULT_STALE_DRAFT_DAYS,
    1,
    365
  );

  const scheduleWindowDays = parsePositiveInteger(
    pickFirst(query.schedule_window_days),
    DEFAULT_SCHEDULE_WINDOW_DAYS,
    1,
    60
  );

  const topContentTypes = parsePositiveInteger(
    pickFirst(query.top_content_types),
    DEFAULT_TOP_CONTENT_TYPES,
    1,
    MAX_TOP_CONTENT_TYPES
  );

  const {
    selectedScheme,
    detectedSchemes,
    selectionSource,
  } = await resolveSelectedTaxonomyScheme({ token, spaceId, environmentId, query, env });

  const now = new Date();
  const publishedSince = new Date(now);
  publishedSince.setUTCDate(publishedSince.getUTCDate() - lookbackDays);
  const previousPublishedSince = new Date(publishedSince);
  previousPublishedSince.setUTCDate(previousPublishedSince.getUTCDate() - lookbackDays);

  const staleDraftCutoff = new Date(now);
  staleDraftCutoff.setUTCDate(staleDraftCutoff.getUTCDate() - staleDraftDays);

  const scheduleWindowEnd = new Date(now);
  scheduleWindowEnd.setUTCDate(scheduleWindowEnd.getUTCDate() + scheduleWindowDays);

  let contentTypeDistributionError = null;
  let taxonomyDistributionError = null;
  let tagDistributionError = null;
  let assetTypeDistributionError = null;

  const [
    totalEntries,
    publishedEntries,
    draftEntries,
    staleDraftEntries,
    locales,
    publishedEntries30d,
    previousPublishedEntries30d,
    totalAssets,
    scheduledMetrics,
    contentTypeDistribution,
    resolvedTaxonomyDistribution,
    tagDistribution,
    assetTypeDistribution,
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
    }),
    fetchScheduledEntries({
      token,
      spaceId,
      environmentId,
      windowStart: now,
      windowEnd: scheduleWindowEnd,
    }).catch(() => ({ total: 0, nextWindow: 0 })),
    fetchContentTypeDistribution({ token, spaceId, environmentId, topContentTypes }).catch((error) => {
      contentTypeDistributionError =
        error instanceof Error ? error.message : "Unknown content type distribution error";
      return [];
    }),
    fetchEntryTaxonomyDistribution({
      token,
      spaceId,
      environmentId,
      topContentTypes,
      selectedScheme,
    }).catch((error) => {
      taxonomyDistributionError =
        error instanceof Error ? error.message : "Unknown taxonomy distribution error";
      return [];
    }),
    fetchTagDistribution({ token, spaceId, environmentId, topContentTypes }).catch((error) => {
      tagDistributionError =
        error instanceof Error ? error.message : "Unknown tag distribution error";
      return [];
    }),
    fetchAssetTypeDistribution({ token, spaceId, environmentId, topContentTypes }).catch((error) => {
      assetTypeDistributionError =
        error instanceof Error ? error.message : "Unknown asset type distribution error";
      return [];
    }),
  ]);

  const taxonomyDistribution =
    !selectedScheme && detectedSchemes.length > 1 ? [] : resolvedTaxonomyDistribution;

  if (!selectedScheme && detectedSchemes.length > 1) {
    taxonomyDistributionError = `Multiple taxonomy schemes detected (${detectedSchemes.join(", ")}). Set CONTENTFUL_TAXONOMY_SCHEME or use ?taxonomy_scheme=.`;
  }

  const publishedEntries30dDelta = publishedEntries30d - previousPublishedEntries30d;

  return {
    totalEntries,
    publishedEntries,
    draftEntries,
    staleDraftEntries,
    totalAssets,
    locales,
    scheduledEntries: scheduledMetrics.total,
    scheduledEntriesNext30Days: scheduledMetrics.nextWindow,
    publishedEntries30d,
    publishedEntries30dDelta,
    contentTypeDistributionStatus: contentTypeDistributionError ? "unavailable" : "ok",
    contentTypeDistributionError,
    contentTypeDistribution,
    taxonomyDistributionStatus: taxonomyDistributionError ? "unavailable" : "ok",
    taxonomyDistributionError,
    taxonomyDistributionScheme: selectedScheme,
    taxonomyDistribution,
    tagDistributionStatus: tagDistributionError ? "unavailable" : "ok",
    tagDistributionError,
    tagDistribution,
    assetTypeDistributionStatus: assetTypeDistributionError ? "unavailable" : "ok",
    assetTypeDistributionError,
    assetTypeDistribution,
    taxonomyDistributionMeta: {
      selectionSource,
      detectedSchemes,
    },
  };
};

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  response.setHeader("Cache-Control", "no-store");

  if (!process.env.CONTENTFUL_MANAGEMENT_TOKEN || !process.env.CONTENTFUL_SPACE_ID) {
    response.status(503).json({
      message: "Missing Contentful configuration",
      requiredEnv: ["CONTENTFUL_MANAGEMENT_TOKEN", "CONTENTFUL_SPACE_ID"],
    });
    return;
  }

  try {
    const payload = await loadContentfulAnalytics({ query: request.query });
    response.status(200).json(payload);
  } catch (error) {
    response.status(502).json({
      message: "Failed to load Contentful analytics",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
