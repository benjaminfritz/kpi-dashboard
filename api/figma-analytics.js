const FIGMA_API_BASE_URL = "https://api.figma.com/v1";
const LOOKBACK_DAYS_DEFAULT = 30;
const MAX_TOP_COMPONENTS = 5;
const MAX_TOP_TEAMS = 3;

const sumBy = (rows, key) =>
  rows.reduce((sum, row) => {
    const value = row[key];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);

const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const VARIANT_LABELS = new Set([
  "default",
  "hover",
  "active",
  "pressed",
  "focus",
  "focused",
  "disabled",
  "selected",
  "checked",
  "unchecked",
  "primary",
  "secondary",
  "tertiary",
  "small",
  "medium",
  "large",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "mobile",
  "tablet",
  "desktop",
  "light",
  "dark",
  "on",
  "off",
  "state",
  "size",
  "variant",
  "type",
  "theme",
  "mode",
  "status",
  "kind",
  "tone",
  "style",
  "viewport",
  "orientation",
]);

const CONTAINER_LABELS = new Set([
  "components",
  "component",
  "library",
  "foundation",
  "foundations",
  "atoms",
  "molecules",
  "organisms",
  "templates",
  "patterns",
]);

const defaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - LOOKBACK_DAYS_DEFAULT);
  return {
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
  };
};

const buildError = async (response) => {
  try {
    const payload = await response.json();
    return payload?.message || JSON.stringify(payload);
  } catch {
    return response.statusText || "Unknown Figma API error";
  }
};

const fetchPagedRows = async ({ endpoint, token, params }) => {
  let cursor;
  const rows = [];

  do {
    const searchParams = new URLSearchParams(params);
    if (cursor) {
      searchParams.set("cursor", cursor);
    }

    const response = await fetch(`${FIGMA_API_BASE_URL}${endpoint}?${searchParams}`, {
      headers: {
        Accept: "application/json",
        "X-Figma-Token": token,
      },
    });

    if (!response.ok) {
      const detail = await buildError(response);
      throw new Error(`Figma request failed (${response.status}): ${detail}`);
    }

    const payload = await response.json();
    if (Array.isArray(payload.rows)) {
      rows.push(...payload.rows);
    }

    cursor = payload.next_page ? payload.cursor : undefined;
  } while (cursor);

  return rows;
};

const isLikelyVariantLabel = (value) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("=") || normalized.includes(",")) return true;
  const words = normalized.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return false;
  return words.every((word) => VARIANT_LABELS.has(word));
};

const isContainerLabel = (value) => CONTAINER_LABELS.has(value.trim().toLowerCase());

const normalizeComponentName = (rawName) => {
  if (typeof rawName !== "string") return "Unnamed component";

  const trimmedName = rawName.trim();
  if (!trimmedName) return "Unnamed component";

  const slashSegments = trimmedName
    .split(/\s*\/\s*/)
    .map((segment) => segment.split(",")[0].trim())
    .filter(Boolean);

  if (slashSegments.length === 0) return "Unnamed component";

  const componentSegments = slashSegments.filter(
    (segment) => !segment.includes("=") && !isLikelyVariantLabel(segment) && !isContainerLabel(segment)
  );

  if (componentSegments.length > 0) {
    return componentSegments[componentSegments.length - 1];
  }

  return "Unnamed component";
};

const getNormalizedComponentName = (row) => {
  const candidateNames = [
    row?.component_set_name,
    row?.main_component_name,
    row?.component_name,
    row?.name,
  ];

  for (const candidate of candidateNames) {
    const normalized = normalizeComponentName(candidate);
    if (normalized !== "Unnamed component") return normalized;
  }

  return "Unnamed component";
};

const buildTopComponentUsage = (componentRows) => {
  const usageByComponent = new Map();

  componentRows.forEach((row) => {
    const normalizedName = getNormalizedComponentName(row);
    const usages = typeof row.usages === "number" ? row.usages : 0;
    usageByComponent.set(normalizedName, (usageByComponent.get(normalizedName) || 0) + usages);
  });

  return Array.from(usageByComponent.entries())
    .map(([componentName, usages]) => ({ componentName, usages }))
    .sort((a, b) => b.usages - a.usages)
    .slice(0, MAX_TOP_COMPONENTS);
};

const getTeamName = (row) => {
  const candidates = [row?.team_name, row?.workspace_name, row?.teamName];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().replace(/^DE\s*-\s*/i, "").trim();
    }
  }
  return "Unknown team";
};

const buildTopLibraryConsumingTeams = (fileUsageRows) => {
  const usageByTeam = new Map();

  fileUsageRows.forEach((row, index) => {
    const teamName = getTeamName(row);
    const usages = typeof row.usages === "number" ? row.usages : 0;
    const current = usageByTeam.get(teamName);

    if (!current) {
      usageByTeam.set(teamName, { usages, firstSeen: index });
      return;
    }

    usageByTeam.set(teamName, {
      usages: current.usages + usages,
      firstSeen: current.firstSeen,
    });
  });

  return Array.from(usageByTeam.entries())
    .map(([teamName, value]) => ({ teamName, usages: value.usages, firstSeen: value.firstSeen }))
    .sort((a, b) => {
      if (b.usages !== a.usages) return b.usages - a.usages;
      return a.firstSeen - b.firstSeen;
    })
    .slice(0, MAX_TOP_TEAMS)
    .map(({ teamName, usages }) => ({ teamName, usages }));
};

const aggregate = ({ componentActionRows, componentUsageRows, fileUsageRows }) => {
  const componentInsertionsLast30Days = sumBy(componentActionRows, "insertions");
  const componentDetachmentsLast30Days = sumBy(componentActionRows, "detachments");
  const totalComponentUsages = sumBy(componentUsageRows, "usages");
  const topLibraryConsumingTeams = buildTopLibraryConsumingTeams(fileUsageRows);
  const teamsUsingLibrary = new Set(
    fileUsageRows
      .map((row) => row.team_name || row.workspace_name)
      .filter((value) => typeof value === "string" && value.length > 0)
  ).size;

  const adoptionBase = componentInsertionsLast30Days + componentDetachmentsLast30Days;
  const designSystemUsage = adoptionBase
    ? Math.round((componentInsertionsLast30Days / adoptionBase) * 100)
    : 0;

  const fallbackTeamName =
    topLibraryConsumingTeams[0]?.teamName ||
    (fileUsageRows.find((row) => typeof row.team_name === "string" && row.team_name.length > 0) || {})
      .team_name ||
    "Design System Library";

  return {
    teamName: fallbackTeamName,
    filesCount: fileUsageRows.length,
    designSystemUsage,
    totalComponentUsages,
    componentInsertionsLast30Days,
    componentDetachmentsLast30Days,
    teamsUsingLibrary,
    topLibraryConsumingTeams,
    topComponentUsage: buildTopComponentUsage(componentUsageRows),
  };
};

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const token = process.env.FIGMA_ACCESS_TOKEN;
  const libraryFileKey = process.env.FIGMA_LIBRARY_FILE_KEY;

  if (!token || !libraryFileKey) {
    response.status(503).json({
      message: "Missing Figma configuration",
      requiredEnv: ["FIGMA_ACCESS_TOKEN", "FIGMA_LIBRARY_FILE_KEY"],
    });
    return;
  }

  const defaults = defaultDateRange();
  const startDate = pickFirst(request.query?.start_date) || defaults.startDate;
  const endDate = pickFirst(request.query?.end_date) || defaults.endDate;
  const encodedLibraryKey = encodeURIComponent(libraryFileKey);

  try {
    const [componentActionRows, componentUsageRows, fileUsageRows] = await Promise.all([
      fetchPagedRows({
        endpoint: `/analytics/libraries/${encodedLibraryKey}/component/actions`,
        token,
        params: { group_by: "component", start_date: startDate, end_date: endDate },
      }),
      fetchPagedRows({
        endpoint: `/analytics/libraries/${encodedLibraryKey}/component/usages`,
        token,
        params: { group_by: "component", start_date: startDate, end_date: endDate },
      }),
      fetchPagedRows({
        endpoint: `/analytics/libraries/${encodedLibraryKey}/component/usages`,
        token,
        params: { group_by: "file", start_date: startDate, end_date: endDate },
      }),
    ]);

    response
      .status(200)
      .json(aggregate({ componentActionRows, componentUsageRows, fileUsageRows }));
  } catch (error) {
    response.status(502).json({
      message: "Failed to load Figma library analytics",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
