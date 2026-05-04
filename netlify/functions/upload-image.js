// POST /.netlify/functions/upload-image
// Body: { filename, contentBase64, contentType, targetDir }
// Auth: Bearer JWT (verified via requireAdmin)
// Validates MIME, slugified filename, target-dir whitelist, and 5MB ceiling.
// Commits the image to GitHub. On filename collision with different bytes,
// appends a 6-char content-hash suffix to disambiguate without overwriting.
// Returns: 200 { url, finalFilename, commit, reused }
const crypto = require('crypto');
const { requireAdmin } = require('./_lib/auth');
const { fetchFileFromRepo, commitFileToRepo, getEnv } = require('./_lib/github');

const MAX_DECODED_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const ALLOWED_DIRS  = ['images/partners', 'images/vendors'];
const FILENAME_RE   = /^[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp|svg)$/i;

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

function validateInput(body) {
  if (!body || typeof body !== 'object') return 'Body must be an object';

  if (typeof body.filename !== 'string' || !body.filename) return 'filename required';
  if (body.filename.indexOf('/') !== -1 || body.filename.indexOf('\\') !== -1 || body.filename.indexOf('..') !== -1) {
    return 'filename must not contain path components';
  }
  if (!FILENAME_RE.test(body.filename)) {
    return 'filename must be slugified (a-z, 0-9, -) with extension .png|.jpg|.jpeg|.webp|.svg';
  }

  if (typeof body.contentType !== 'string' || ALLOWED_TYPES.indexOf(body.contentType) === -1) {
    return 'contentType must be one of: ' + ALLOWED_TYPES.join(', ');
  }

  if (typeof body.targetDir !== 'string' || ALLOWED_DIRS.indexOf(body.targetDir) === -1) {
    return 'targetDir must be one of: ' + ALLOWED_DIRS.join(', ');
  }

  if (typeof body.contentBase64 !== 'string' || !body.contentBase64) {
    return 'contentBase64 required';
  }
  // Strip any whitespace then validate base64 alphabet
  const clean = body.contentBase64.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) return 'contentBase64 not valid base64';
  return null;
}

function splitFilename(name) {
  const dot = name.lastIndexOf('.');
  return { stem: name.slice(0, dot), ext: name.slice(dot) };
}

function shortHash(base64) {
  return crypto.createHash('sha256').update(base64).digest('hex').slice(0, 6);
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const auth = requireAdmin(event);
  if (!auth.ok) {
    console.warn('upload-image auth rejected:', auth.status, auth.error);
    return jsonResponse(auth.status, { error: auth.error });
  }

  let env;
  try { env = getEnv(); }
  catch (e) {
    console.error('upload-image env error:', e.message);
    return jsonResponse(e.statusCode || 500, { error: e.message });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(400, { error: 'Invalid JSON body' }); }

  const validationError = validateInput(body);
  if (validationError) {
    console.warn('upload-image validation error:', validationError);
    return jsonResponse(400, { error: validationError });
  }

  const cleanBase64 = body.contentBase64.replace(/\s+/g, '');
  const decodedSize = Math.floor(cleanBase64.length * 3 / 4) - (cleanBase64.endsWith('==') ? 2 : cleanBase64.endsWith('=') ? 1 : 0);
  if (decodedSize > MAX_DECODED_BYTES) {
    return jsonResponse(400, { error: 'image too large (' + Math.round(decodedSize/1024) + ' KB > 5 MB max)' });
  }

  const filename = body.filename.toLowerCase();
  const targetDir = body.targetDir;
  const desiredPath = targetDir + '/' + filename;

  console.log('upload-image attempt:', JSON.stringify({
    repo: env.repo, branch: env.branch, path: desiredPath,
    contentType: body.contentType, decodedKB: Math.round(decodedSize/1024)
  }));

  // Check if a file already exists at the desired path.
  let existing;
  try {
    existing = await fetchFileFromRepo(desiredPath, env.branch);
  } catch (e) {
    console.error('upload-image GET failed:', e.message, e.details);
    return jsonResponse(e.statusCode || 502, { error: e.message, details: e.details });
  }

  let finalFilename = filename;
  let finalPath = desiredPath;
  let putSha = null;

  if (existing.contentBase64) {
    // Compare bytes. Idempotent re-upload of identical content → no-op.
    if (existing.contentBase64 === cleanBase64) {
      console.log('upload-image identical content already present at', desiredPath, '— skipping commit');
      return jsonResponse(200, {
        url: '/' + desiredPath,
        finalFilename: filename,
        reused: true,
        commit: null
      });
    }
    // Different content → disambiguate with a content hash suffix
    const parts = splitFilename(filename);
    const hash = shortHash(cleanBase64);
    finalFilename = parts.stem + '-' + hash + parts.ext;
    finalPath = targetDir + '/' + finalFilename;

    // Check the hashed path too — extremely unlikely to collide but be safe
    let hashedExisting;
    try { hashedExisting = await fetchFileFromRepo(finalPath, env.branch); }
    catch (e) {
      console.error('upload-image hashed GET failed:', e.message);
      return jsonResponse(e.statusCode || 502, { error: e.message, details: e.details });
    }
    if (hashedExisting.contentBase64) {
      if (hashedExisting.contentBase64 === cleanBase64) {
        // Already uploaded with the same hash — reuse
        return jsonResponse(200, {
          url: '/' + finalPath,
          finalFilename: finalFilename,
          reused: true,
          commit: null
        });
      }
      putSha = hashedExisting.sha; // truly improbable; allow update
    }
  }

  let result;
  try {
    result = await commitFileToRepo(
      finalPath,
      env.branch,
      putSha,
      cleanBase64,
      'Upload image: ' + finalFilename
    );
  } catch (e) {
    console.error('upload-image PUT failed:', e.message, e.details);
    return jsonResponse(e.statusCode || 502, { error: e.message, details: e.details });
  }

  console.log('upload-image committed:', finalPath, (result.commit && result.commit.sha) || 'unknown-sha');

  return jsonResponse(200, {
    url: '/' + finalPath,
    finalFilename: finalFilename,
    reused: false,
    commit: {
      sha: result.commit && result.commit.sha,
      url: result.commit && result.commit.html_url,
      message: result.commit && result.commit.message
    }
  });
};
