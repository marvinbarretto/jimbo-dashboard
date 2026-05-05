// Angular dev proxy.
//
// All /api/* and /stream/* → LOCAL jimbo-api on :3100. Run `npm run dev:api`
// in another terminal.
//
// You ARE talking to prod data when running locally. Same blast radius
// as the production dashboard. Sole-operator setup.

require('dotenv').config();

const apiKey = process.env.JIMBO_API_KEY;
if (!apiKey) console.warn('[proxy] JIMBO_API_KEY not set — API requests will fail auth');

module.exports = [
  {
    // SSE stream → local jimbo-api.
    context: ['/stream'],
    target: 'http://localhost:3100',
    secure: false,
    changeOrigin: true,
    headers: { 'X-API-Key': apiKey ?? '' },
  },
  {
    // All API calls → local jimbo-api.
    context: ['/api'],
    target: 'http://localhost:3100',
    secure: false,
    changeOrigin: true,
    headers: { 'X-API-Key': apiKey ?? '' },
  },
];
