// Angular dev proxy.
//
// Targets production jimbo-api via Caddy (https://jimbo.fourfoldmedia.uk).
// Run `npm run dev` (not `npm start`).
//
// Auth model: jimbo-api validates the jimbo_session cookie OR an X-API-Key
// header itself on /api/* AND /stream/* (Caddy does no edge auth on either —
// the application is the gate). A browser cookie isn't available to the
// proxy, so we MUST send X-API-Key (JIMBO_API_KEY from .env) ourselves.
// /auth/* is public (login endpoints); the header is harmless there.
//
// You ARE talking to production data. Same blast radius as the deployed UI.

require('dotenv').config();

const apiKey = process.env.JIMBO_API_KEY;

if (!apiKey) console.warn('[proxy] JIMBO_API_KEY not set — /api/* and /stream/* will 401. Check .env.');

const headers = apiKey ? { 'X-API-Key': apiKey } : {};

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
