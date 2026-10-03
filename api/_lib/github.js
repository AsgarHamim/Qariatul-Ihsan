const API_BASE = 'https://api.github.com';

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // format: "owner/name"
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token) throw new Error('GITHUB_TOKEN is not configured');
  if (!repo) throw new Error('GITHUB_REPO is not configured');
  return { token, repo, branch };
}

async function githubRequest(path, options = {}) {
  const { token } = getConfig();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`GitHub API ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

// Returns { sha, contentBase64 } or null if file does not exist
async function getFile(filePath) {
  const { repo, branch } = getConfig();
  try {
    const data = await githubRequest(`/repos/${repo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`);
    return { sha: data.sha, contentBase64: data.content.replace(/\n/g, '') };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

// contentBase64: base64-encoded file content (no data: prefix)
async function putFile(filePath, contentBase64, message) {
  const { repo, branch } = getConfig();
  const existing = await getFile(filePath);
  const body = {
    message,
    content: contentBase64,
    branch,
  };
  if (existing) body.sha = existing.sha;
  return githubRequest(`/repos/${repo}/contents/${encodeURIComponent(filePath)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

module.exports = { getFile, putFile };
