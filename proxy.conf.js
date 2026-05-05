// Angular dev proxy.
//
// Targets production jimbo-api via Caddy (https://jimbo.fourfoldmedia.uk).
// Run `npm run dev` (not `npm start`) — dev.sh fetches DASHBOARD_BASIC_AUTH
// from the VPS and exports it before ng serve starts. Caddy validates the
// basic-auth credential and injects X-API-Key when forwarding to jimbo-api.
//
// You ARE talking to production data. Same blast radius as the deployed UI.

require('dotenv').config();

const basicAuth = process.env.DASHBOARD_BASIC_AUTH;
if (!basicAuth) console.warn('[proxy] DASHBOARD_BASIC_AUTH not set — run via `npm run dev`, not `npm start`');

const authHeader = basicAuth ? 'Basic ' + Buffer.from(basicAuth).toString('base64') : '';

const target = 'https://jimbo.fourfoldmedia.uk';
const headers = authHeader ? { Authorization: authHeader } : {};

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
];
