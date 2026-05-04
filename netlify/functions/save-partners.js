// POST /.netlify/functions/save-partners
// Body: { partners: Partner[], commitMessage: string }
// Auth: Bearer JWT (verified via requireAdmin)
// Effect: commits the new partners.json to GitHub via the Contents API.
// Returns: 200 { success, commit, partners } | 400 | 401 | 403 | 405 | 502
const { requireAdmin } = require('./_lib/auth');

const VALID_TIERS = ['featured', 'network', 'founding'];
const FILE_PATH = 'data/partners.json';

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

function validatePartner(p, idx) {
  if (!p || typeof p !== 'object') return 'Partner #' + idx + ' must be an object';
  const tag = '#' + idx + (p && p.id ? ' (' + p.id + ')' : '');
  if (!p.id || typeof p.id !== 'string') return 'Partner ' + tag + ' missing id';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(p.id)) return 'Partner ' + tag + ' has invalid id (slug only: a-z, 0-9, -)';
  if (!p.name || typeof p.name !== 'string') return 'Partner ' + tag + ' missing name';
  if (!p.org || typeof p.org !== 'string') return 'Partner ' + tag + ' missing org';
  if (VALID_TIERS.indexOf(p.tier) === -1) return 'Partner ' + tag + ' invalid tier "' + p.tier + '"';
  if (!p.category || typeof p.category !== 'string') return 'Partner ' + tag + ' missing category';
  if (typeof p.displayOrder !== 'number' || !isFinite(p.displayOrder)) return 'Partner ' + tag + ' displayOrder must be a number';
  if (!Array.isArray(p.tags)) return 'Partner ' + tag + ' tags must be an array';
  if (typeof p.active !== 'boolean') return 'Partner ' + tag + ' active must be boolean';
  return null;
}

function validatePayload(body) {
  if (!body || typeof body !== 'object') return 'Body must be an object';
  if (!Array.isArray(body.partners)) return 'partners must be an array';
  if (typeof body.commitMessage !== 'string' || !body.commitMessage.trim()) {
    return 'commitMessage required';
  }
  if (body.commitMessage.length > 200) return 'commitMessage too long (max 200 chars)';
  const ids = Object.create(null);
  for (let i = 0; i < body.partners.length; i++) {
    const err = validatePartner(body.partners[i], i);
    if (err) return err;
    const id = body.partners[i].id;
    if (ids[id]) return 'Duplicate id "' + id + '"';
    ids[id] = true;
  }
  return null;
}

function ghHeaders() {
  return {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Authorization': 'Bearer ' + process.env.GITHUB_TOKEN,
    'User-Agent': 'pcshomes-admin'
  };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const auth = requireAdmin(event);
  if (!auth.ok) {
    console.warn('save-partners auth rejected:', auth.status, auth.error);
    return jsonResponse(auth.status, { error: auth.error });
  }

  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    console.error('save-partners missing env: GITHUB_REPO/TOKEN');
    return jsonResponse(500, { error: 'Server not configured (GITHUB_REPO / GITHUB_TOKEN)' });
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return jsonResponse(500, { error: 'GITHUB_REPO must be in "owner/repo" format' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(400, { error: 'Invalid JSON body' }); }

  const validationError = validatePayload(body);
  if (validationError) {
    console.warn('save-partners validation error:', validationError);
    return jsonResponse(400, { error: validationError });
  }

  const apiUrl = 'https://api.github.com/repos/' + repo + '/contents/' + FILE_PATH;
  const branchEnc = encodeURIComponent(branch);

  // 1. GET current file to obtain its SHA. 404 means file doesn't exist yet
  // (acceptable on first commit) — we PUT without a sha in that case.
  let sha = null;
  try {
    const getResp = await fetch(apiUrl + '?ref=' + branchEnc, {
      method: 'GET',
      headers: ghHeaders()
    });
    if (getResp.status === 200) {
      const j = await getResp.json();
      sha = j.sha;
    } else if (getResp.status !== 404) {
      const text = await getResp.text();
      console.error('save-partners GET failed:', getResp.status, text);
      const passthrough = (getResp.status === 403 || getResp.status === 429) ? getResp.status : 502;
      return jsonResponse(passthrough, {
        error: 'GitHub GET failed (' + getResp.status + ')',
        details: text.slice(0, 500)
      });
    }
  } catch (e) {
    console.error('save-partners GET network error:', e);
    return jsonResponse(502, { error: 'GitHub network error on GET' });
  }

  // 2. PUT new content
  const newContent = JSON.stringify(body.partners, null, 2) + '\n';
  const contentB64 = Buffer.from(newContent, 'utf8').toString('base64');

  const putBody = {
    message: body.commitMessage.trim(),
    content: contentB64,
    branch: branch
  };
  if (sha) putBody.sha = sha;

  console.log(
    'save-partners committing:', JSON.stringify({
      repo: repo,
      branch: branch,
      message: body.commitMessage.trim(),
      partnerCount: body.partners.length,
      hadSha: !!sha
    })
  );

  let putResp;
  try {
    putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()),
      body: JSON.stringify(putBody)
    });
  } catch (e) {
    console.error('save-partners PUT network error:', e);
    return jsonResponse(502, { error: 'GitHub network error on PUT' });
  }

  if (!putResp.ok) {
    const text = await putResp.text();
    console.error('save-partners PUT failed:', putResp.status, text);
    const passthrough = (putResp.status === 403 || putResp.status === 409 || putResp.status === 429) ? putResp.status : 502;
    return jsonResponse(passthrough, {
      error: 'GitHub PUT failed (' + putResp.status + ')',
      details: text.slice(0, 500)
    });
  }

  const result = await putResp.json();
  console.log('save-partners committed:', (result.commit && result.commit.sha) || 'unknown-sha');

  return jsonResponse(200, {
    success: true,
    commit: {
      sha: result.commit && result.commit.sha,
      url: result.commit && result.commit.html_url,
      message: result.commit && result.commit.message
    },
    partners: body.partners
  });
};
