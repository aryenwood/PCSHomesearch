// POST /.netlify/functions/save-categories
// Body: { categories: Category[], commitMessage: string }
// Auth: Bearer JWT
// Effect: refuses any save that would orphan vendors in vendors.json,
//         then commits new categories.json via the GitHub Contents API.
const { requireAdmin } = require('./_lib/auth');
const { fetchJsonFromRepo, commitJsonToRepo, getEnv } = require('./_lib/github');

const FILE_PATH = 'data/categories.json';
const VENDORS_PATH = 'data/vendors.json';

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

function validateCategory(c, idx) {
  if (!c || typeof c !== 'object') return 'Category #' + idx + ' must be an object';
  const tag = '#' + idx + (c && c.id ? ' (' + c.id + ')' : '');
  if (!c.id || typeof c.id !== 'string') return 'Category ' + tag + ' missing id';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(c.id)) return 'Category ' + tag + ' has invalid id (slug only: a-z, 0-9, -)';
  if (!c.label || typeof c.label !== 'string') return 'Category ' + tag + ' missing label';
  if (c.label.length > 60) return 'Category ' + tag + ' label too long (max 60 chars)';
  if (!c.color || typeof c.color !== 'string' || !HEX_RE.test(c.color)) {
    return 'Category ' + tag + ' color must be a hex string like #C9A84C';
  }
  if (typeof c.active !== 'boolean') return 'Category ' + tag + ' active must be boolean';
  return null;
}

function validatePayload(body) {
  if (!body || typeof body !== 'object') return 'Body must be an object';
  if (!Array.isArray(body.categories)) return 'categories must be an array';
  if (typeof body.commitMessage !== 'string' || !body.commitMessage.trim()) {
    return 'commitMessage required';
  }
  if (body.commitMessage.length > 200) return 'commitMessage too long (max 200 chars)';
  const ids = Object.create(null);
  for (let i = 0; i < body.categories.length; i++) {
    const err = validateCategory(body.categories[i], i);
    if (err) return err;
    const id = body.categories[i].id;
    if (ids[id]) return 'Duplicate category id "' + id + '"';
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
    console.warn('save-categories auth rejected:', auth.status, auth.error);
    return jsonResponse(auth.status, { error: auth.error });
  }

  let env;
  try { env = getEnv(); }
  catch (e) {
    console.error('save-categories env error:', e.message);
    return jsonResponse(e.statusCode || 500, { error: e.message });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(400, { error: 'Invalid JSON body' }); }

  const validationError = validatePayload(body);
  if (validationError) {
    console.warn('save-categories validation error:', validationError);
    return jsonResponse(400, { error: validationError });
  }

  // Referential integrity: any category id present in current vendors.json
  // but missing from the proposed new categories list = orphaned vendors.
  let currentCats = null;
  let currentVendors = null;
  let categoriesSha = null;
  try {
    const catsResult = await fetchJsonFromRepo(FILE_PATH, env.branch);
    categoriesSha = catsResult.sha;
    currentCats = catsResult.json;
    const vendorsResult = await fetchJsonFromRepo(VENDORS_PATH, env.branch);
    currentVendors = vendorsResult.json || [];
  } catch (e) {
    console.error('save-categories GET failed:', e.message);
    return jsonResponse(e.statusCode || 502, { error: e.message, details: e.details });
  }

  const newIds = Object.create(null);
  body.categories.forEach(function(c) { newIds[c.id] = true; });

  // Find vendors whose category id has been removed in this save
  const orphanedByCategory = Object.create(null);
  if (Array.isArray(currentVendors)) {
    currentVendors.forEach(function(v) {
      if (v && v.category && !newIds[v.category]) {
        if (!orphanedByCategory[v.category]) orphanedByCategory[v.category] = [];
        orphanedByCategory[v.category].push(v.name || v.id);
      }
    });
  }

  const blockers = Object.keys(orphanedByCategory);
  if (blockers.length) {
    console.warn('save-categories rejected: would orphan vendors:', JSON.stringify(orphanedByCategory));
    return jsonResponse(409, {
      error: 'Cannot remove categories that vendors still reference. Reassign or remove the vendors first.',
      blocked: blockers.map(function(catId) {
        return { categoryId: catId, vendors: orphanedByCategory[catId] };
      })
    });
  }

  console.log('save-categories committing:', JSON.stringify({
    repo: env.repo, branch: env.branch,
    message: body.commitMessage.trim(),
    categoryCount: body.categories.length, hadSha: !!categoriesSha
  }));

  let result;
  try {
    result = await commitJsonToRepo(FILE_PATH, env.branch, categoriesSha, body.categories, body.commitMessage.trim());
  } catch (e) {
    console.error('save-categories PUT failed:', e.message);
    return jsonResponse(e.statusCode || 502, { error: e.message, details: e.details });
  }

  console.log('save-categories committed:', (result.commit && result.commit.sha) || 'unknown-sha');

  return jsonResponse(200, {
    success: true,
    commit: {
      sha: result.commit && result.commit.sha,
      url: result.commit && result.commit.html_url,
      message: result.commit && result.commit.message
    },
    categories: body.categories
  });
};
