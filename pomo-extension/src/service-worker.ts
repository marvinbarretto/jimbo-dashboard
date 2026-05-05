const API_BASE = 'https://jimbo.fourfoldmedia.uk';
const ALARM_NAME = 'pomo-tick';
// MV3 alarms minimum is 0.5 min (30s). Badge updates every ~30s is fine.
const TICK_INTERVAL_MINUTES = 0.5;

interface StoredConfig {
  basicAuth: string;
  defaultDuration: number;
}

interface ActiveSession {
  id: string;
  started_at: string;
  duration_minutes: number;
  project_id: string | null;
  status: 'running';
}

async function getConfig(): Promise<StoredConfig | null> {
  const r = await chrome.storage.local.get(['basicAuth', 'defaultDuration']);
  if (!r.basicAuth) return null;
  return { basicAuth: r.basicAuth, defaultDuration: r.defaultDuration ?? 25 };
}

function authHeader(config: StoredConfig): Record<string, string> {
  return { Authorization: `Basic ${config.basicAuth}` };
}

async function fetchActive(config: StoredConfig): Promise<ActiveSession | null> {
  try {
    const res = await fetch(`${API_BASE}/api/focus-sessions/active`, {
      headers: authHeader(config),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json() as Promise<ActiveSession>;
  } catch {
    return null;
  }
}

async function refreshBadge(): Promise<void> {
  const config = await getConfig();
  if (!config) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const session = await fetchActive(config);
  if (!session) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const expiresAt = new Date(session.started_at).getTime() + session.duration_minutes * 60_000;
  const remainingMs = expiresAt - Date.now();

  if (remainingMs <= 0) {
    // Expired — open capture tab, stop alarm, clear badge
    chrome.action.setBadgeText({ text: '' });
    chrome.alarms.clear(ALARM_NAME);
    chrome.tabs.create({ url: `${API_BASE}/pomo` });
    return;
  }

  const remainingMins = Math.ceil(remainingMs / 60_000);
  chrome.action.setBadgeText({ text: String(remainingMins) });
  chrome.action.setBadgeBackgroundColor({ color: '#1e7e34' });
}

// ── Alarm ─────────────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) refreshBadge();
});

// ── Messages from popup ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  handleMessage(msg as { type: string } & Record<string, unknown>)
    .then(reply)
    .catch((err: unknown) => reply({ error: String(err) }));
  return true; // keep channel open for async reply
});

async function handleMessage(
  msg: { type: string } & Record<string, unknown>,
): Promise<unknown> {
  const config = await getConfig();
  if (!config) return { error: 'Not configured — open Options.' };

  switch (msg.type) {
    case 'GET_ACTIVE': {
      return { session: await fetchActive(config) };
    }

    case 'START_SESSION': {
      const body = {
        duration_minutes: (msg['duration'] as number) ?? config.defaultDuration,
        project_id: (msg['projectId'] as string | null) ?? null,
        notes: null,
        tags: [],
      };
      const res = await fetch(`${API_BASE}/api/focus-sessions`, {
        method: 'POST',
        headers: { ...authHeader(config), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.status.toString());
        throw new Error(`API ${res.status}: ${text}`);
      }
      const session = (await res.json()) as ActiveSession;
      chrome.alarms.create(ALARM_NAME, { periodInMinutes: TICK_INTERVAL_MINUTES });
      refreshBadge();
      return { session };
    }

    case 'ABANDON_SESSION': {
      const id = msg['sessionId'] as string;
      const res = await fetch(`${API_BASE}/api/focus-sessions/${id}/abandon`, {
        method: 'PATCH',
        headers: authHeader(config),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      chrome.alarms.clear(ALARM_NAME);
      chrome.action.setBadgeText({ text: '' });
      return { ok: true };
    }

    default:
      return { error: `Unknown message: ${msg.type}` };
  }
}

// ── Resume badge on browser start / extension update ─────────────────────────

async function resumeIfActive(): Promise<void> {
  const config = await getConfig();
  if (!config) return;
  const session = await fetchActive(config);
  if (!session) return;
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: TICK_INTERVAL_MINUTES });
  refreshBadge();
}

chrome.runtime.onInstalled.addListener(resumeIfActive);
chrome.runtime.onStartup.addListener(resumeIfActive);
