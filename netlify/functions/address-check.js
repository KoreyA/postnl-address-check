// const fetch = require('node-fetch'); // not needed on Netlify (Node 18+)

const EXPECTED_TOKEN = process.env.CLIENT_TOKEN;

const POSTNL_BASE_URL =
  process.env.POSTNL_BASE_URL || 'https://api-sandbox.postnl.nl/v2';

// Allowed origins, comma separated: "https://site1.com,https://site2.com"
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Build CORS headers based on request origin + allow list
const makeCorsHeaders = (event) => {
  const headers = event.headers || {};
  const requestOrigin = headers.origin || headers.Origin || '';

  // Default: allow all if no allow list configured
  if (!ALLOWED_ORIGINS.length) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Client-Token',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
  }

  // If origin is in allow list, echo it back. Otherwise, use first allowed.
  const allowedOrigin = (
    requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
  )
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, X-Client-Token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
};

exports.handler = async (event, context) => {
  const corsHeaders = makeCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Tiny anti-abuse: shared token required if configured
  if (EXPECTED_TOKEN) {
    const headers = event.headers || {};
    // headers keys are lowercased by Netlify
    const token = headers['x-client-token'];

    if (!token || token !== EXPECTED_TOKEN) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      countryIso = 'NL',
      postalCode,
      houseNumber,
      cityName,
      streetName,
      houseNumberAddition
    } = body;

    if (!postalCode || !houseNumber) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing postcode or house number' })
      };
    }

    const cleanedPostcode = String(postalCode).replace(/\s+/g, '').toUpperCase();
    const iso = String(countryIso).trim().toUpperCase();

    const params = new URLSearchParams();
    params.append('countryIso', iso);
    params.append('postalCode', cleanedPostcode);
    params.append('houseNumber', String(houseNumber).trim());

    if (cityName) params.append('cityName', cityName.trim());
    if (streetName) params.append('streetName', streetName.trim());
    if (houseNumberAddition) {
      params.append('houseNumberAddition', houseNumberAddition.trim());
    }

    const url = `${POSTNL_BASE_URL}/address/benelux?${params.toString()}`;

    const apiRes = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: process.env.POSTNL_API_KEY,
        Accept: 'application/json'
      }
    });

    const data = await apiRes.json().catch(() => null);

    if (!apiRes.ok) {
      console.error('PostNL error', apiRes.status, data);
      return {
        statusCode: apiRes.status,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'PostNL error',
          status: apiRes.status,
          data
        })
      };
    }

    const results = Array.isArray(data) ? data : [];
    const best = results[0] || null;

    if (!best) {
      console.warn('No address match for', { postalCode: cleanedPostcode, houseNumber });
    }

    const responseBody = !best
      ? { valid: false, results: [] }
      : {
        valid:
          (best.mailabilityScore ?? 0) >= 80 &&
          (best.resultPercentage ?? 0) >= 90,
        rawValid: true,
        best: {
          street: best.streetName,
          city: best.cityName,
          postalCode: best.postalCode,
          houseNumber: best.houseNumber,
          houseNumberAddition: best.houseNumberAddition || ''
        }
      };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(responseBody)
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal address check error' })
    };
  }
};
