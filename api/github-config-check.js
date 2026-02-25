const GITHUB_API_BASE_URL = "https://api.github.com";
const DEFAULT_MODE = "mock";

const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);

const maskValue = (value) => {
  if (!value || typeof value !== "string") return null;
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
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

const validateGithubAccess = async ({ token, owner, repo }) => {
  const response = await fetch(`${GITHUB_API_BASE_URL}/repos/${owner}/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

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

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const org = process.env.GITHUB_ORG || owner;

  const hasToken = Boolean(token);
  const hasOwner = Boolean(owner);
  const hasRepo = Boolean(repo);

  const mode = resolveMode({
    queryMode: pickFirst(request.query?.mode),
    envMode: process.env.GITHUB_ANALYTICS_MODE,
  });

  if (mode === "mock") {
    response.status(200).json({
      ready: true,
      configured: true,
      mode: "mock",
      env: {
        GITHUB_TOKEN: hasToken,
        GITHUB_OWNER: hasOwner,
        GITHUB_REPO: hasRepo,
        GITHUB_ORG: Boolean(org),
      },
      owner: owner || null,
      repo: repo || null,
      org: org || null,
      checkedAt: new Date().toISOString(),
    });
    return;
  }

  const configured = hasToken && hasOwner && hasRepo;

  if (!configured) {
    response.status(200).json({
      ready: false,
      configured: false,
      mode: "live",
      env: {
        GITHUB_TOKEN: hasToken,
        GITHUB_OWNER: hasOwner,
        GITHUB_REPO: hasRepo,
        GITHUB_ORG: Boolean(org),
      },
      hints: [
        "Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in your environment.",
        "Set GITHUB_ANALYTICS_MODE=live to enable live GitHub metrics.",
      ],
      checkedAt: new Date().toISOString(),
    });
    return;
  }

  const validation = await validateGithubAccess({ token, owner, repo });

  response.status(200).json({
    ready: validation.ok,
    configured: true,
    mode: "live",
    env: {
      GITHUB_TOKEN: true,
      GITHUB_OWNER: true,
      GITHUB_REPO: true,
      GITHUB_ORG: Boolean(org),
    },
    tokenPreview: maskValue(token),
    owner,
    repo,
    org: org || null,
    validation,
    checkedAt: new Date().toISOString(),
  });
}
