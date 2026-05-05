const API_BASE = 'https://jimbo.fourfoldmedia.uk';

interface ActiveSession {
  id: string;
  started_at: string;
  planned_seconds: number;
  project_id: string | null;
}

interface Project {
  id: string;
  name: string;
}

// ── DOM ───────────────────────────────────────────────────────────────────────

const loadingEl = el('loading');
const notConfiguredEl = el('not-configured');
const idleEl = el('idle');
const runningEl = el('running');
const countdownEl = el('countdown');
const sessionInfoEl = el('session-info');
const startBtn = el('start-btn') as HTMLButtonElement;
const abandonBtn = el('abandon-btn') as HTMLButtonElement;
const durationInput = el('duration') as HTMLInputElement;
const projectSelect = el('project') as HTMLSelectElement;

function el(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function show(e: HTMLElement): void { e.hidden = false; }
function hide(e: HTMLElement): void { e.hidden = true; }

// ── Countdown ─────────────────────────────────────────────────────────────────

let tickTimer = 0;

function startCountdown(session: ActiveSession): void {
  const expiresAt = new Date(session.started_at).getTime() + session.planned_seconds * 1000;
  const tick = (): void => {
    const ms = expiresAt - Date.now();
    if (ms <= 0) {
      countdownEl.textContent = 'Done!';
      clearInterval(tickTimer);
      return;
    }
    const totalSecs = Math.ceil(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    countdownEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  };
  clearInterval(tickTimer);
  tick();
  tickTimer = setInterval(tick, 500) as unknown as number;
}

// ── Message passing ───────────────────────────────────────────────────────────

function send<T>(msg: object): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res: { error?: string } & T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (res?.error) { reject(new Error(res.error)); return; }
      resolve(res);
    });
  });
}

// ── Render states ─────────────────────────────────────────────────────────────

function renderRunning(session: ActiveSession): void {
  hide(loadingEl); hide(idleEl); show(runningEl);
  startCountdown(session);
  sessionInfoEl.textContent = `${Math.round(session.planned_seconds / 60)} min`;
}

function renderIdle(): void {
  hide(loadingEl); hide(runningEl); show(idleEl);
}

function renderNotConfigured(): void {
  hide(loadingEl); show(notConfiguredEl);
}

// ── Init ──────────────────────────────────────────────────────────────────────

let activeSession: ActiveSession | null = null;

async function init(): Promise<void> {
  const stored = await chrome.storage.local.get(['basicAuth', 'defaultDuration', 'defaultProjectId']);

  if (!stored['basicAuth']) {
    renderNotConfigured();
    return;
  }

  durationInput.value = String(stored['defaultDuration'] ?? 25);

  try {
    const { session } = await send<{ session: ActiveSession | null }>({ type: 'GET_ACTIVE' });
    activeSession = session;
    if (session) {
      renderRunning(session);
    } else {
      await loadProjects(stored['basicAuth'] as string, stored['defaultProjectId'] as string | null);
      renderIdle();
    }
  } catch {
    renderIdle();
  }
}

async function loadProjects(basicAuth: string, defaultProjectId: string | null): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/projects`, {
      headers: { Authorization: `Basic ${basicAuth}` },
    });
    if (!res.ok) return;
    const projects = (await res.json()) as Project[];
    projectSelect.innerHTML =
      '<option value="">No project</option>' +
      projects
        .map(
          (p) =>
            `<option value="${p.id}"${p.id === defaultProjectId ? ' selected' : ''}>${p.name}</option>`,
        )
        .join('');
  } catch {
    // non-fatal
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  startBtn.textContent = 'Starting…';
  try {
    const duration = parseInt(durationInput.value, 10) || 25;
    const projectId = projectSelect.value || null;
    const { session } = await send<{ session: ActiveSession }>({
      type: 'START_SESSION',
      duration,
      projectId,
    });
    activeSession = session;
    renderRunning(session);
  } catch (err) {
    alert(`Couldn't start: ${err instanceof Error ? err.message : err}`);
    startBtn.disabled = false;
    startBtn.textContent = 'Start';
  }
});

abandonBtn.addEventListener('click', async () => {
  if (!activeSession) return;
  abandonBtn.disabled = true;
  abandonBtn.textContent = 'Abandoning…';
  try {
    await send({ type: 'ABANDON_SESSION', sessionId: activeSession.id });
    activeSession = null;
    clearInterval(tickTimer);
    const stored = await chrome.storage.local.get(['basicAuth', 'defaultProjectId']);
    await loadProjects(stored['basicAuth'] as string, stored['defaultProjectId'] as string | null);
    renderIdle();
  } catch (err) {
    alert(`Couldn't abandon: ${err instanceof Error ? err.message : err}`);
    abandonBtn.disabled = false;
    abandonBtn.textContent = 'Abandon';
  }
});

document.getElementById('open-options')?.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();
