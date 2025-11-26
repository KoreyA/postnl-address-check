PostNL Address Check (Netlify Function)

This project provides a secure serverless proxy for validating addresses using the PostNL Adrescheck Benelux API.
It runs on Netlify Functions, so your PostNL API key is never exposed in client-side code.

# Features

Secure. API keys never exposed publicly.

Fast. Lightweight serverless function.

Flexible. Supports postcode, house number, street, city, additions.

Environment-switching. Sandbox or production via environment variables.

Anti-abuse. Requires a shared X-Client-Token header.

Simple deploy. Just push to GitHub and connect Netlify.

# Endpoint
POST /.netlify/functions/address-check

Required Headers
Content-Type: application/json
X-Client-Token: <your CLIENT_TOKEN>

JSON Request Body
{
  "countryIso": "NL",
  "postalCode": "1014 AK",
  "houseNumber": "102",
  "cityName": "Amsterdam",
  "streetName": "Transformatorweg"
}


# Required:

postalCode

houseNumber

Optional:

cityName

streetName

houseNumberAddition

# Example Responses
Valid Address
{
  "valid": true,
  "rawValid": true,
  "best": {
    "street": "Transformatorweg",
    "city": "AMSTERDAM",
    "postalCode": "1014AK",
    "houseNumber": 102,
    "houseNumberAddition": ""
  }
}

# No Match
{
  "valid": false,
  "results": []
}

Environment Variables (Netlify)

# Add these in Site Settings → Environment variables.

Variable	Description
POSTNL_API_KEY	Your PostNL API key (sandbox or production)
POSTNL_BASE_URL	API base URL (defaults to sandbox)
CLIENT_TOKEN	Shared token required in requests

Sandbox Example
POSTNL_BASE_URL=https://api-sandbox.postnl.nl/v2
POSTNL_API_KEY=<sandbox-key>
CLIENT_TOKEN=<your-client-token>

Production Example
POSTNL_BASE_URL=https://api.postnl.nl/v2
POSTNL_API_KEY=<production-key>
CLIENT_TOKEN=<your-client-token>

# Deployment

Push this repo to GitHub.

Create a new Netlify site via Deploy from Git.

Add environment variables.

Redeploy the site.

# Test with curl:

Windows CMD
curl -X POST "https://your-site.netlify.app/.netlify/functions/address-check" ^
  -H "Content-Type: application/json" ^
  -H "X-Client-Token: <your-client-token>" ^
  -d "{\"postalCode\":\"1014 AK\",\"houseNumber\":\"102\"}"

macOS / Linux
curl -X POST "https://your-site.netlify.app/.netlify/functions/address-check" \
  -H "Content-Type: application/json" \
  -H "X-Client-Token: <your-client-token>" \
  -d '{"postalCode":"1014 AK","houseNumber":"102"}'

# Local Development

Install Netlify CLI:

npm install -g netlify-cli


Run locally:

netlify dev


Local endpoint:

http://localhost:8888/.netlify/functions/address-check

Project Structure
netlify/
  functions/
    address-check.js
netlify.toml
package.json
README.md

License

MIT