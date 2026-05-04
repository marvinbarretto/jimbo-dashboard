// Read-only smoke test for the local /dashboard-api/ws/stream — connect,
// log hydration, observe live events for 5s, then close.
//
// Connects directly to the local dashboard-api on 127.0.0.1:3201 (no
// Caddy in the loop, so no basic_auth). For testing the prod path
// through Caddy, point a browser at https://jimbo.fourfoldmedia.uk/stream
// and authenticate via the basic_auth prompt.

import WebSocket from 'ws';

const url = 'ws://127.0.0.1:3201/dashboard-api/ws/stream';
console.log(`[client] connecting to ${url}`);
const ws = new WebSocket(url);

ws.on('open', () => console.log('[client] open'));

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.type === 'hydrate') {
    console.log(`[client] hydrate: ${msg.events.length} events`);
    if (msg.events.length > 0) {
      const last = msg.events[msg.events.length - 1];
      console.log(`[client] most recent: ${last.ts} ${last.source}/${last.kind} — ${last.title}`);
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
