const CONTENTFUL_API_BASE_URL = "https://api.contentful.com";
const DEFAULT_ENVIRONMENT_ID = "master";

const maskValue = (value) => {
  if (!value || typeof value !== "string") return null;
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const parseErrorBody = async (response) => {
  try {
    const payload = await response.json();
    return payload?.message || JSON.stringify(payload);
  } catch {
    return response.statusText || "Unknown Contentful API error";
  }
};

const validateContentfulAccess = async ({ token, spaceId, environmentId }) => {
  const encodedSpaceId = encodeURIComponent(spaceId);
  const encodedEnvironmentId = encodeURIComponent(environmentId);

  const response = await fetch(
    `${CONTENTFUL_API_BASE_URL}/spaces/${encodedSpaceId}/environments/${encodedEnvironmentId}/entries?limit=1`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
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

  return {
    ok: true,
    status: response.status,
  };
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

  const hasToken = Boolean(token);
  const hasSpaceId = Boolean(spaceId);
  const configured = hasToken && hasSpaceId;

  if (!configured) {
    response.status(200).json({
      ready: false,
      configured: false,
      env: {
        CONTENTFUL_MANAGEMENT_TOKEN: hasToken,
        CONTENTFUL_SPACE_ID: hasSpaceId,
        CONTENTFUL_ENVIRONMENT_ID: Boolean(process.env.CONTENTFUL_ENVIRONMENT_ID),
      },
      hints: [
        "Set CONTENTFUL_MANAGEMENT_TOKEN and CONTENTFUL_SPACE_ID in your environment.",
        "Set CONTENTFUL_ENVIRONMENT_ID optionally; defaults to master.",
      ],
    });
    return;
  }

  const validation = await validateContentfulAccess({
    token,
    spaceId,
    environmentId,
  });

  response.status(200).json({
    ready: validation.ok,
    configured: true,
    env: {
      CONTENTFUL_MANAGEMENT_TOKEN: true,
      CONTENTFUL_SPACE_ID: true,
      CONTENTFUL_ENVIRONMENT_ID: Boolean(process.env.CONTENTFUL_ENVIRONMENT_ID),
    },
    tokenPreview: maskValue(token),
    spaceIdPreview: maskValue(spaceId),
    environmentId,
    validation,
    checkedAt: new Date().toISOString(),
  });
}
