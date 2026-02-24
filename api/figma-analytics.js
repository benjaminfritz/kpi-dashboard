const FIGMA_API_BASE_URL = "https://api.figma.com/v1";
const LOOKBACK_DAYS_DEFAULT = 30;
const MAX_TOP_COMPONENTS = 5;

const sumBy = (rows, key) =>
  rows.reduce((sum, row) => {
    const value = row[key];
    return sum + (typeof value === "number" ? value : 0);
  }, 0);

const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);

const toIsoDate = (date) => date.toISOString().slice(0, 10);

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

const buildTopComponentUsage = (componentRows) =>
  componentRows
    .map((row) => ({
      componentName: row.component_name || "Unnamed component",
      usages: typeof row.usages === "number" ? row.usages : 0,
    }))
    .sort((a, b) => b.usages - a.usages)
    .slice(0, MAX_TOP_COMPONENTS);

const aggregate = ({ componentActionRows, componentUsageRows, fileUsageRows }) => {
  const componentInsertionsLast30Days = sumBy(componentActionRows, "insertions");
  const componentDetachmentsLast30Days = sumBy(componentActionRows, "detachments");
  const totalComponentUsages = sumBy(componentUsageRows, "usages");
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
    (fileUsageRows.find((row) => typeof row.team_name === "string" && row.team_name.length > 0) || {})
      .team_name || "Design System Library";

  return {
    teamName: fallbackTeamName,
    filesCount: fileUsageRows.length,
    designSystemUsage,
    totalComponentUsages,
    componentInsertionsLast30Days,
    componentDetachmentsLast30Days,
    teamsUsingLibrary,
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
