// Angular dev proxy.
//
// Targets production jimbo-api via Caddy (https://jimbo.fourfoldmedia.uk).
// Run `npm run dev` (not `npm start`).
//
// Auth model (changed when session-cookie auth landed):
//   /api/*    — jimbo-api validates the jimbo_session cookie OR an X-API-Key
//               header. Caddy no longer does edge basic_auth here, nor injects
//               a key, so in dev we MUST send X-API-Key ourselves (JIMBO_API_KEY
//               from .env). A browser cookie isn't available to the proxy.
//   /stream/* — Caddy still basic_auths this on the public host (cookie bypass),
//               so it needs the Authorization: Basic header. dev.sh fetches
//               DASHBOARD_BASIC_AUTH from the VPS and exports it.
//   /auth/*   — public (login endpoints); no auth needed but headers are harmless.
//
// We attach both headers to every context: X-API-Key satisfies /api, Basic
// satisfies /stream, and each is ignored where the other applies.
//
// You ARE talking to production data. Same blast radius as the deployed UI.

require('dotenv').config();

const basicAuth = process.env.DASHBOARD_BASIC_AUTH;
const apiKey = process.env.JIMBO_API_KEY;

if (!basicAuth) console.warn('[proxy] DASHBOARD_BASIC_AUTH not set — /stream will 401. Run via `npm run dev`.');
if (!apiKey) console.warn('[proxy] JIMBO_API_KEY not set — /api/* will 500 (jimbo-api rejects unauthenticated). Check .env.');

const headers = {
  ...(basicAuth ? { Authorization: 'Basic ' + Buffer.from(basicAuth).toString('base64') } : {}),
  ...(apiKey ? { 'X-API-Key': apiKey } : {}),
};

const target = 'https://jimbo.fourfoldmedia.uk';

module.exports = [
  {
    context: ['/stream'],
    target,
    secure: true,
    changeOrigin: true,
    headers,
  },
  {
    context: ['/api'],
    target,
    secure: true,
    changeOrigin: true,
    headers,
  },
  {
    context: ['/auth'],
    target,
    secure: true,
    changeOrigin: true,
    headers,
  },
];
