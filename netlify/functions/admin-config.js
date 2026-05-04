// GET /.netlify/functions/admin-config
// Auth: Bearer JWT
// Returns: { mapboxPublicToken: string|null }
//
// Returns the public Mapbox token used by the admin dashboard's map preview.
// The geocoding token (MAPBOX_TOKEN) stays server-side and is never returned.
const { requireAdmin } = require('./_lib/auth');

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const auth = requireAdmin(event);
  if (!auth.ok) return jsonResponse(auth.status, { error: auth.error });

  const pub = process.env.MAPBOX_PUBLIC_TOKEN || null;
  // If MAPBOX_PUBLIC_TOKEN isn't set but MAPBOX_TOKEN is a public (pk.*) token,
  // fall back to it. We never expose secret (sk.*) tokens.
  const fallback = process.env.MAPBOX_TOKEN || '';
  const safeFallback = /^pk\./.test(fallback) ? fallback : null;

  return jsonResponse(200, {
    mapboxPublicToken: pub || safeFallback || null
  });
};
