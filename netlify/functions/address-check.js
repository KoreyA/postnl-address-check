const fetch = require('node-fetch');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
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

    // use destructured vars for consistency
    if (cityName) params.append('cityName', cityName.trim());
    if (streetName) params.append('streetName', streetName.trim());
    if (houseNumberAddition) {
      params.append('houseNumberAddition', houseNumberAddition.trim());
    }

    // Prod URL:
    // const url = `https://api.postnl.nl/v2/address/benelux?${params.toString()}`;
    // Sandbox URL:
    const url = `https://api-sandbox.postnl.nl/v2/address/benelux?${params.toString()}`;

    // Optional: log URL for initial debugging, then remove
    // console.log('PostNL URL:', url);

    const apiRes = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: process.env.POSTNL_API_KEY,
        Accept: 'application/json'
      }
    });

    const data = await apiRes.json().catch(() => null);

    if (!apiRes.ok) {
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
