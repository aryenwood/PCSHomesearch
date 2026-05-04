// POST /.netlify/functions/save-vendors
// Body: { vendors: Vendor[], commitMessage: string }
// Auth: Bearer JWT (verified via requireAdmin)
// Effect: validates referential integrity against categories.json,
//         then commits the new vendors.json to GitHub via the Contents API.
const { requireAdmin } = require('./_lib/auth');
const { fetchJsonFromRepo, commitJsonToRepo, getEnv } = require('./_lib/github');

const FILE_PATH = 'data/vendors.json';
const CATEGORIES_PATH = 'data/categories.json';

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

function isFiniteNumber(n) { return typeof n === 'number' && isFinite(n); }

function validateVendor(v, idx, knownCategoryIds) {
  if (!v || typeof v !== 'object') return 'Vendor #' + idx + ' must be an object';
  const tag = '#' + idx + (v && v.id ? ' (' + v.id + ')' : '');
  if (!v.id || typeof v.id !== 'string') return 'Vendor ' + tag + ' missing id';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(v.id)) return 'Vendor ' + tag + ' has invalid id (slug only: a-z, 0-9, -)';
  if (!v.name || typeof v.name !== 'string') return 'Vendor ' + tag + ' missing name';
  if (!v.address || typeof v.address !== 'string') return 'Vendor ' + tag + ' missing address';
  if (!v.category || typeof v.category !== 'string') return 'Vendor ' + tag + ' missing category';
  if (knownCategoryIds && !knownCategoryIds[v.category]) {
    return 'Vendor ' + tag + ' references unknown category "' + v.category + '"';
  }
  if (!isFiniteNumber(v.lat) || v.lat < -90 || v.lat > 90) {
    return 'Vendor ' + tag + ' lat must be a number in [-90, 90]';
  }
  if (!isFiniteNumber(v.lng) || v.lng < -180 || v.lng > 180) {
    return 'Vendor ' + tag + ' lng must be a number in [-180, 180]';
  }
  if (typeof v.active !== 'boolean') return 'Vendor ' + tag + ' active must be boolean';
  return null;
}

function validatePayload(body, knownCategoryIds) {
  if (!body || typeof body !== 'object') return 'Body must be an object';
  if (!Array.isArray(body.vendors)) return 'vendors must be an array';
  if (typeof body.commitMessage !== 'string' || !body.commitMessage.trim()) {
    return 'commitMessage required';
  }
  if (body.commitMessage.length > 200) return 'commitMessage too long (max 200 chars)';
  const ids = Object.create(null);
  for (let i = 0; i < body.vendors.length; i++) {
    const err = validateVendor(body.vendors[i], i, knownCategoryIds);
    if (err) return err;
    const id = body.vendors[i].id;
    if (ids[id]) return 'Duplicate vendor id "' + id + '"';
    ids[id] = true;
  }
  return null;
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const auth = requireAdmin(event);
  if (!auth.ok) {
    console.warn('save-vendors auth rejected:', auth.status, auth.error);
    return jsonResponse(auth.status, { error: auth.error });
  }

  let env;
  try { env = getEnv(); }
  catch (e) {
    console.error('save-vendors env error:', e.message);
    return jsonResponse(e.statusCode || 500, { error: e.message });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(400, { error: 'Invalid JSON body' }); }

  // Fetch categories first to validate referential integrity
  let knownCategoryIds = null;
  try {
    const catsResult = await fetchJsonFromRepo(CATEGORIES_PATH, env.branch);
    if (catsResult.json && Array.isArray(catsResult.json)) {
      knownCategoryIds = Object.create(null);
      catsResult.json.forEach(function(c) { if (c && c.id) knownCategoryIds[c.id] = true; });
    }
  } catch (e) {
    console.error('save-vendors failed to fetch categories:', e.message);
    return jsonResponse(e.statusCode || 502, { error: e.message, details: e.details });
  }

  const validationError = validatePayload(body, knownCategoryIds);
  if (validationError) {
    console.warn('save-vendors validation error:', validationError);
    return jsonResponse(400, { error: validationError });
  }

  let sha = null;
  try {
    const current = await fetchJsonFromRepo(FILE_PATH, env.branch);
    sha = current.sha;
  } catch (e) {
    console.error('save-vendors GET failed:', e.message);
    return jsonResponse(e.statusCode || 502, { error: e.message, details: e.details });
  }

  console.log('save-vendors committing:', JSON.stringify({
    repo: env.repo, branch: env.branch,
    message: body.commitMessage.trim(),
    vendorCount: body.vendors.length, hadSha: !!sha
  }));

  let result;
  try {
    result = await commitJsonToRepo(FILE_PATH, env.branch, sha, body.vendors, body.commitMessage.trim());
  } catch (e) {
    console.error('save-vendors PUT failed:', e.message);
    return jsonResponse(e.statusCode || 502, { error: e.message, details: e.details });
  }

  console.log('save-vendors committed:', (result.commit && result.commit.sha) || 'unknown-sha');

  return jsonResponse(200, {
    success: true,
    commit: {
      sha: result.commit && result.commit.sha,
      url: result.commit && result.commit.html_url,
      message: result.commit && result.commit.message
    },
    vendors: body.vendors
  });
};
