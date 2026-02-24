const FIGMA_API_BASE_URL = "https://api.figma.com/v1";

const maskValue = (value) => {
  if (!value || typeof value !== "string") return null;
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const getValidationRange = () => {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 1);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
};

const parseErrorBody = async (response) => {
  try {
    const payload = await response.json();
    return payload?.message || JSON.stringify(payload);
  } catch {
    return response.statusText || "Unknown Figma API error";
  }
};

const validateFigmaAccess = async ({ token, libraryFileKey }) => {
  const { startDate, endDate } = getValidationRange();
  const encodedFileKey = encodeURIComponent(libraryFileKey);
  const query = new URLSearchParams({
    group_by: "component",
    start_date: startDate,
    end_date: endDate,
  });

  const response = await fetch(
    `${FIGMA_API_BASE_URL}/analytics/libraries/${encodedFileKey}/component/actions?${query}`,
    {
      headers: {
        Accept: "application/json",
        "X-Figma-Token": token,
      },
    }
  );

  if (!response.ok) {
    const detail = await parseErrorBody(response);
    return {
      ok: false,
      status: response.status,
      detail,
    };
  }

  const payload = await response.json();
  return {
    ok: true,
    status: response.status,
    rowCount: Array.isArray(payload.rows) ? payload.rows.length : 0,
  };
};

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  response.setHeader("Cache-Control", "no-store");

  const token = process.env.FIGMA_ACCESS_TOKEN;
  const libraryFileKey = process.env.FIGMA_LIBRARY_FILE_KEY;
  const hasToken = Boolean(token);
  const hasLibraryFileKey = Boolean(libraryFileKey);
  const configured = hasToken && hasLibraryFileKey;

  if (!configured) {
    response.status(200).json({
      ready: false,
      configured: false,
      env: {
        FIGMA_ACCESS_TOKEN: hasToken,
        FIGMA_LIBRARY_FILE_KEY: hasLibraryFileKey,
      },
      hints: [
        "Set FIGMA_ACCESS_TOKEN and FIGMA_LIBRARY_FILE_KEY in your environment.",
        "Restart dev server after changing environment variables.",
      ],
    });
    return;
  }

  const validation = await validateFigmaAccess({
    token,
    libraryFileKey,
  });

  response.status(200).json({
    ready: validation.ok,
    configured: true,
    env: {
      FIGMA_ACCESS_TOKEN: true,
      FIGMA_LIBRARY_FILE_KEY: true,
    },
    tokenPreview: maskValue(token),
    libraryFileKeyPreview: maskValue(libraryFileKey),
    validation,
    checkedAt: new Date().toISOString(),
  });
}
