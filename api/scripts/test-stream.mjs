// Read-only smoke test for /dashboard-api/ws/stream — connect, log
// hydration, observe live events for 5s, then close.
// Loads env via the parent shell (run with `set -a; source .env; set +a`).

import WebSocket from 'ws';

const key = process.env.DASHBOARD_API_KEY;
if (!key) {
  console.error('DASHBOARD_API_KEY required in env');
  process.exit(1);
}

const url = `ws://localhost:3201/dashboard-api/ws/stream?key=${encodeURIComponent(key)}`;
console.log(`[client] connecting to /dashboard-api/ws/stream`);
const ws = new WebSocket(url);

ws.on('open', () => console.log('[client] open'));

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.type === 'hydrate') {
    console.log(`[client] hydrate: ${msg.events.length} events`);
    if (msg.events.length > 0) {
      const last = msg.events[msg.events.length - 1];
      console.log(`[client] most recent: ${last.ts} ${last.actor} ${last.action}`);
    }
  } else if (msg.type === 'event') {
    console.log(`[client] LIVE event:`, msg.event);
  } else {
    console.log(`[client] unknown msg:`, msg);
  }
});

ws.on('close', (code, reason) => console.log(`[client] close: ${code} ${reason}`));
ws.on('error', (err) => console.error(`[client] error:`, err.message));

setTimeout(() => {
  ws.close(1000, 'done');
  process.exit(0);
}, 5000);
