// Shared GitHub Contents API helpers.
// Used by save-vendors and save-categories. (save-partners predates this
// helper and inlines an equivalent flow — kept untouched per Phase 2 freeze.)
//
// Exports:
//   ghHeaders()                  → standard auth+UA+API-version headers
//   getEnv()                     → { repo, branch, token } or throws helpful error
//   fetchJsonFromRepo(path, branch)  → { sha, json } or { sha:null, json:null } if 404
//   commitJsonToRepo(path, branch, sha, json, message) → { ok, status, body }
const FILE_API = 'https://api.github.com/repos/';

function ghHeaders() {
  return {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
    'User-Agent': 'pcshomes-admin'
  };
}

function getEnv() {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    const err = new Error('Server not configured (GITHUB_REPO / GITHUB_TOKEN)');
    err.statusCode = 500;
    throw err;
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    const err = new Error('GITHUB_REPO must be in "owner/repo" format');
    err.statusCode = 500;
    throw err;
  }
  return { repo, branch, token };
}

async function fetchJsonFromRepo(path, branch) {
  const { repo } = getEnv();
  const url = FILE_API + repo + '/contents/' + path + '?ref=' + encodeURIComponent(branch);
  const resp = await fetch(url, { method: 'GET', headers: ghHeaders() });
  if (resp.status === 404) return { sha: null, json: null };
  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error('GitHub GET ' + path + ' failed (' + resp.status + ')');
    err.statusCode = (resp.status === 403 || resp.status === 429) ? resp.status : 502;
    err.details = text.slice(0, 500);
    throw err;
  }
  const meta = await resp.json();
  // content is base64; decode to get the file body
  const raw = Buffer.from(meta.content || '', meta.encoding || 'base64').toString('utf8');
  let json = null;
  try { json = JSON.parse(raw); }
  catch (e) {
    const err = new Error('Repo file ' + path + ' is not valid JSON');
    err.statusCode = 502;
    throw err;
  }
  return { sha: meta.sha, json: json };
}

async function commitJsonToRepo(path, branch, sha, value, message) {
  const { repo } = getEnv();
  const url = FILE_API + repo + '/contents/' + path;
  const newContent = JSON.stringify(value, null, 2) + '\n';
  const body = {
    message: message,
    content: Buffer.from(newContent, 'utf8').toString('base64'),
    branch: branch
  };
  if (sha) body.sha = sha;

  const resp = await fetch(url, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()),
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error('GitHub PUT ' + path + ' failed (' + resp.status + ')');
    err.statusCode = (resp.status === 403 || resp.status === 409 || resp.status === 429) ? resp.status : 502;
    err.details = text.slice(0, 500);
    throw err;
  }
  return await resp.json();
}

// ===== Binary file helpers (Phase 4) =====

// Returns { sha, contentBase64 } for an existing file, or { sha:null, contentBase64:null } if 404.
async function fetchFileFromRepo(path, branch) {
  const { repo } = getEnv();
  const url = FILE_API + repo + '/contents/' + path + '?ref=' + encodeURIComponent(branch);
  const resp = await fetch(url, { method: 'GET', headers: ghHeaders() });
  if (resp.status === 404) return { sha: null, contentBase64: null };
  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error('GitHub GET ' + path + ' failed (' + resp.status + ')');
    err.statusCode = (resp.status === 403 || resp.status === 429) ? resp.status : 502;
    err.details = text.slice(0, 500);
    throw err;
  }
  const meta = await resp.json();
  // Strip GitHub's whitespace from the base64 content (it includes newlines)
  const clean = (meta.content || '').replace(/\s+/g, '');
  return { sha: meta.sha, contentBase64: clean };
}

// PUT a binary file (caller supplies already-base64 content).
async function commitFileToRepo(path, branch, sha, contentBase64, message) {
  const { repo } = getEnv();
  const url = FILE_API + repo + '/contents/' + path;
  const body = {
    message: message,
    content: contentBase64,
    branch: branch
  };
  if (sha) body.sha = sha;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()),
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error('GitHub PUT ' + path + ' failed (' + resp.status + ')');
    err.statusCode = (resp.status === 403 || resp.status === 409 || resp.status === 429) ? resp.status : 502;
    err.details = text.slice(0, 500);
    throw err;
  }
  return await resp.json();
}

module.exports = {
  ghHeaders,
  getEnv,
  fetchJsonFromRepo,
  commitJsonToRepo,
  fetchFileFromRepo,
  commitFileToRepo
};
