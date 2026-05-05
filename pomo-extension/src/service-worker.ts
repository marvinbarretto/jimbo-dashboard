const API_BASE = 'https://jimbo.fourfoldmedia.uk';
const ALARM_NAME = 'pomo-tick';
const TICK_INTERVAL_MINUTES = 0.5; // MV3 minimum

interface StoredConfig {
  basicAuth: string;
  defaultDuration: number;
}

interface ActiveSession {
  id: string;
  started_at: string;
  planned_seconds: number;
  project_id: string | null;
  status: 'running';
}

// ── Storage ───────────────────────────────────────────────────────────────────

async function getConfig(): Promise<StoredConfig | null> {
  const r = await chrome.storage.local.get(['basicAuth', 'defaultDuration']);
  if (!r['basicAuth']) return null;
  return { basicAuth: r['basicAuth'] as string, defaultDuration: (r['defaultDuration'] as number) ?? 25 };
}

function authHeader(config: StoredConfig): Record<string, string> {
  return { Authorization: `Basic ${config.basicAuth}` };
}

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchActive(config: StoredConfig): Promise<ActiveSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/focus-sessions/active`, {
      headers: authHeader(config),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { active: ActiveSession | null };
    return body.active;
  } catch {
    return null;
  }
}

async function startSession(config: StoredConfig): Promise<ActiveSession> {
  const res = await fetch(`${API_BASE}/api/focus-sessions`, {
    method: 'POST',
    headers: { ...authHeader(config), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planned_seconds: config.defaultDuration * 60,
      project_id: null,
      notes: null,
      tags: [],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status));
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<ActiveSession>;
}

async function abandonSession(config: StoredConfig, id: string): Promise<void> {
  await fetch(`${API_BASE}/api/focus-sessions/${id}/abandon`, {
    method: 'PATCH',
    headers: authHeader(config),
  });
}

// ── Icon drawing ──────────────────────────────────────────────────────────────

// Draws a red circle with optional white text — used as the action icon.
// OffscreenCanvas is available in MV3 service workers (Chrome 109+).
function makeIcon(label: string): ImageData {
  const size = 32;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d')!;

  // Tomato red circle
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Tiny green leaf nub at the top
  ctx.fillStyle = '#27ae60';
  ctx.beginPath();
  ctx.ellipse(size / 2, 3, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (label) {
    const fontSize = label.length > 2 ? 10 : 13;
    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, size / 2, size / 2 + 2);
  }

  return ctx.getImageData(0, 0, size, size);
}

async function setIdleIcon(): Promise<void> {
  chrome.action.setIcon({ imageData: makeIcon('') });
  chrome.action.setTitle({ title: 'Jimbo Pomo — click to start' });
  chrome.action.setBadgeText({ text: '' });
}

async function setRunningIcon(remainingMins: number, remainingSecs: number): Promise<void> {
  const label = remainingMins > 0 ? String(remainingMins) : String(remainingSecs) + 's';
  chrome.action.setIcon({ imageData: makeIcon(label) });
  chrome.action.setTitle({ title: `Jimbo Pomo — ${remainingMins}m remaining` });
  chrome.action.setBadgeText({ text: '' });
}

// ── Tick / badge refresh ──────────────────────────────────────────────────────

async function tick(): Promise<void> {
  const config = await getConfig();
  if (!config) { setIdleIcon(); return; }

  const session = await fetchActive(config);
  if (!session) { setIdleIcon(); return; }

  const expiresAt = new Date(session.started_at).getTime() + session.planned_seconds * 1000;
  const remainingMs = expiresAt - Date.now();

  if (remainingMs <= 0) {
    setIdleIcon();
    chrome.alarms.clear(ALARM_NAME);
    chrome.tabs.create({ url: `${API_BASE}/pomo` });
    return;
  }

  const remainingMins = Math.floor(remainingMs / 60_000);
  const remainingSecs = Math.floor((remainingMs % 60_000) / 1000);
  setRunningIcon(remainingMins, remainingSecs);
}

// ── Alarms ────────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) tick();
});

// ── Click — start or open pomo ────────────────────────────────────────────────

chrome.action.onClicked.addListener(async () => {
  const config = await getConfig();
  if (!config) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const active = await fetchActive(config);

  if (active) {
    // Session already running — open /pomo to complete or abandon
    chrome.tabs.create({ url: `${API_BASE}/pomo` });
    return;
  }

  try {
    await startSession(config);
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: TICK_INTERVAL_MINUTES });
    tick();
  } catch (err) {
    // Surface the error as the icon title — visible on hover
    chrome.action.setTitle({ title: `Failed to start: ${String(err)}` });
  }
});

// ── Context menu — abandon ────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'abandon',
    title: 'Abandon session',
    contexts: ['action'],
  });
  chrome.contextMenus.create({
    id: 'options',
    title: 'Options…',
    contexts: ['action'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'options') {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (info.menuItemId === 'abandon') {
    const config = await getConfig();
    if (!config) return;
    const session = await fetchActive(config);
    if (!session) return;
    await abandonSession(config, session.id);
    chrome.alarms.clear(ALARM_NAME);
    setIdleIcon();
  }
});

// ── Resume on browser start / extension reload ────────────────────────────────

async function resume(): Promise<void> {
  const config = await getConfig();
  if (!config) return;
  const session = await fetchActive(config);
  if (!session) { setIdleIcon(); return; }
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: TICK_INTERVAL_MINUTES });
  tick();
}

chrome.runtime.onInstalled.addListener(resume);
chrome.runtime.onStartup.addListener(resume);
