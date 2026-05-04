// POST /.netlify/functions/geocode
// Body: { address: string }
// Auth: Bearer JWT (no anonymous geocoding)
// Returns: 200 { matches: [{lat, lng, formatted_address, confidence}] }  (top 3, biased to Watertown NY)
//          400 / 401 / 405 / 429 / 500 / 502 with { error: string }
const { requireAdmin } = require('./_lib/auth');

// Bias geocoding toward Fort Drum / Watertown NY
const PROXIMITY = '-75.9094,43.9748';
const COUNTRY = 'US';
const MAX_MATCHES = 3;
const MAPBOX_URL = 'https://api.mapbox.com/search/geocode/v6/forward';

function jsonResponse(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const auth = requireAdmin(event);
  if (!auth.ok) {
    console.warn('geocode auth rejected:', auth.status, auth.error);
    return jsonResponse(auth.status, { error: auth.error });
  }

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    console.error('geocode missing MAPBOX_TOKEN env var');
    return jsonResponse(500, { error: 'Server not configured (MAPBOX_TOKEN)' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return jsonResponse(400, { error: 'Invalid JSON body' }); }

  const address = (body && typeof body.address === 'string') ? body.address.trim() : '';
  if (!address) return jsonResponse(400, { error: 'address required' });
  if (address.length > 300) return jsonResponse(400, { error: 'address too long (max 300 chars)' });

  const url = MAPBOX_URL +
    '?q=' + encodeURIComponent(address) +
    '&access_token=' + encodeURIComponent(token) +
    '&proximity=' + PROXIMITY +
    '&country=' + COUNTRY +
    '&limit=' + MAX_MATCHES;

  let resp;
  try { resp = await fetch(url, { method: 'GET' }); }
  catch (e) {
    console.error('geocode network error:', e);
    return jsonResponse(502, { error: 'Geocoding failed: network error' });
  }

  if (resp.status === 429) {
    console.warn('geocode rate limited by Mapbox');
    return jsonResponse(429, { error: 'Geocoding rate limited. Try again in a moment.' });
  }

  if (!resp.ok) {
    const text = await resp.text();
    console.error('geocode Mapbox error:', resp.status, text);
    return jsonResponse(502, {
      error: 'Geocoding failed: Mapbox HTTP ' + resp.status,
      details: text.slice(0, 300)
    });
  }

  let payload;
  try { payload = await resp.json(); }
  catch (e) {
    console.error('geocode bad JSON from Mapbox:', e);
    return jsonResponse(502, { error: 'Geocoding failed: invalid response from Mapbox' });
  }

  const features = Array.isArray(payload && payload.features) ? payload.features : [];
  if (!features.length) {
    return jsonResponse(200, { matches: [] });
  }

  const matches = features.slice(0, MAX_MATCHES).map(function(f) {
    const coords = (f.geometry && Array.isArray(f.geometry.coordinates)) ? f.geometry.coordinates : [null, null];
    const props = f.properties || {};
    const formatted = props.full_address || props.place_formatted || props.name || address;
    const confidence = (props.match_code && props.match_code.confidence) || null;
    return {
      lat: typeof coords[1] === 'number' ? coords[1] : null,
      lng: typeof coords[0] === 'number' ? coords[0] : null,
      formatted_address: formatted,
      confidence: confidence
    };
  }).filter(function(m) { return m.lat != null && m.lng != null; });

  console.log('geocode ok:', address, '→', matches.length, 'matches');
  return jsonResponse(200, { matches: matches });
};
