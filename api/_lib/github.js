const API_BASE = 'https://api.github.com';

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token) throw new Error('GITHUB_TOKEN is not configured');
  if (!repo) throw new Error('GITHUB_REPO is not configured');
  return { token, repo, branch };
}

async function gh(path, options = {}) {
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

async function getFile(filePath) {
  const { repo, branch } = getConfig();
  try {
    const data = await gh(`/repos/${repo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`);
    return { sha: data.sha, contentBase64: data.content.replace(/\n/g, '') };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function putFile(filePath, contentBase64, message) {
  const { repo, branch } = getConfig();
  const existing = await getFile(filePath);
  const body = { message, content: contentBase64, branch };
  if (existing) body.sha = existing.sha;
  return gh(`/repos/${repo}/contents/${encodeURIComponent(filePath)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

async function commitFiles(files, message) {
  const { repo, branch } = getConfig();

  const refData = await gh(`/repos/${repo}/git/ref/heads/${branch}`);
  const baseCommitSha = refData.object.sha;

  const baseCommit = await gh(`/repos/${repo}/git/commits/${baseCommitSha}`);
  const baseTreeSha = baseCommit.tree.sha;

  const blobs = await Promise.all(
    files.map(async (f) => {
      const blob = await gh(`/repos/${repo}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: f.contentBase64, encoding: 'base64' }),
      });
      return { path: f.path, mode: '100644', type: 'blob', sha: blob.sha };
    })
  );

  const newTree = await gh(`/repos/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseTreeSha, tree: blobs }),
  });

  const newCommit = await gh(`/repos/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: newTree.sha, parents: [baseCommitSha] }),
  });

  await gh(`/repos/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  return newCommit;
}

module.exports = { getFile, putFile, commitFiles };
