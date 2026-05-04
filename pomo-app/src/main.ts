// Vanilla TS pomo timer.
//
// One screen. Three states (idle / running / expired). Server-side state
// machine: the row in jimbo_pg is the source of truth. The page renders a
// wall-clock countdown against (started_at + planned_seconds), so a tab
// close, device switch, or backgrounded mobile tab doesn't lose the session.
//
// Hits jimbo-api directly via same-origin in production, via the Vite proxy
// in dev. Caddy basic_auth gates everything at the edge.

interface FocusSession {
  id: string;
  project_id: string | null;
  started_at: string;
  ended_at: string | null;
  planned_seconds: number;
  actual_seconds: number | null;
  status: 'running' | 'completed' | 'abandoned';
  notes: string | null;
  tags: string[];
  created_at: string;
}

interface Project {
  id: string;
  display_name: string;
  status: string;
}

const PRESETS = [15, 25, 45, 90] as const;
const STORAGE_KEY = 'pomo:setup'; // remember last project + duration choice

const $app = document.getElementById('app') as HTMLElement;

// ── State ──────────────────────────────────────────────────────────────────

let active: FocusSession | null = null;
let projects: Project[] = [];
let tickHandle: number | null = null;
let wakeLock: WakeLockSentinel | null = null;
let lastSetup: { project_id: string; minutes: number } = loadSetup();

// ── API ────────────────────────────────────────────────────────────────────

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

const fetchActive = () => api<{ active: FocusSession | null }>('/api/focus-sessions/active');
// jimbo-api returns a plain array; dashboard-api would wrap as { items }.
// We hit jimbo-api directly so this is the contract.
const fetchProjects = () => api<Project[]>('/api/projects');

const startSession = (body: { project_id: string | null; planned_seconds: number }) =>
  api<FocusSession>('/api/focus-sessions', { method: 'POST', body: JSON.stringify(body) });

const completeSession = (id: string, body: { notes?: string; tags?: string[] }) =>
  api<FocusSession>(`/api/focus-sessions/${encodeURIComponent(id)}/complete`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

const abandonSession = (id: string) =>
  api<FocusSession>(`/api/focus-sessions/${encodeURIComponent(id)}/abandon`, {
    method: 'PATCH',
    body: '{}',
  });

// ── Local persistence — last-used setup ───────────────────────────────────

function loadSetup(): { project_id: string; minutes: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { project_id: '', minutes: 25 };
}

function saveSetup(s: { project_id: string; minutes: number }): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Time helpers ───────────────────────────────────────────────────────────

function remainingSeconds(s: FocusSession): number {
  const elapsed = (Date.now() - new Date(s.started_at).getTime()) / 1000;
  return Math.max(0, Math.round(s.planned_seconds - elapsed));
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function projectName(id: string | null): string {
  if (!id) return 'Unassigned';
  return projects.find(p => p.id === id)?.display_name ?? id;
}

function parseTags(raw: string): string[] | undefined {
  const parts = raw
    .split(/[,\s]+/)
    .map(t => t.replace(/^#/, '').trim())
    .filter(Boolean);
  return parts.length ? Array.from(new Set(parts)) : undefined;
}

// ── DOM helpers ────────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Partial<Record<string, string | number | boolean | EventListener>> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === 'class') {
      node.className = String(v);
    } else if (v === true) {
      node.setAttribute(k, '');
    } else {
      node.setAttribute(k, String(v));
    }
  }
  for (const c of children) node.append(c);
  return node;
}

// ── Wake lock — keep phone screen alive during a session ──────────────────

async function requestWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch { /* permission denied or unsupported */ }
}

function releaseWakeLock(): void {
  wakeLock?.release().catch(() => { /* already released */ });
  wakeLock = null;
}

// ── Render ─────────────────────────────────────────────────────────────────

function render(): void {
  $app.replaceChildren(active ? renderLive(active) : renderSetup());
  syncTitleAndTicker();
}

function renderSetup(): HTMLElement {
  const projectSelect = el('select', { id: 'project', class: 'pomo__field' }, [
    el('option', { value: '' }, ['— Unassigned —']),
    ...projects
      .filter(p => p.status === 'active')
      .map(p => el('option', { value: p.id, selected: p.id === lastSetup.project_id }, [p.display_name])),
  ]);

  const minutesInput = el('input', {
    id: 'minutes',
    type: 'number',
    min: 1,
    max: 480,
    class: 'pomo__field',
    value: String(lastSetup.minutes),
  });

  const presetRow = el('div', { class: 'pomo__presets' },
    PRESETS.map(m => el('button', {
      type: 'button',
      class: `pomo__preset${lastSetup.minutes === m ? ' pomo__preset--active' : ''}`,
      onclick: () => {
        lastSetup.minutes = m;
        minutesInput.value = String(m);
        renderPresetState();
      },
    }, [`${m}m`])),
  );

  function renderPresetState(): void {
    const buttons = presetRow.querySelectorAll('button');
    buttons.forEach((btn, i) => {
      btn.classList.toggle('pomo__preset--active', PRESETS[i] === lastSetup.minutes);
    });
  }

  minutesInput.addEventListener('input', () => {
    const v = Number(minutesInput.value);
    if (Number.isFinite(v)) {
      lastSetup.minutes = v;
      renderPresetState();
    }
  });

  const startBtn = el('button', {
    type: 'submit',
    class: 'pomo__btn pomo__btn--primary',
  }, ['Start']);

  const form = el('form', {
    class: 'pomo__setup',
    onsubmit: async (e: Event) => {
      e.preventDefault();
      const minutes = Number(minutesInput.value);
      if (!Number.isFinite(minutes) || minutes < 1) return;
      const project_id = projectSelect.value || null;
      lastSetup = { project_id: project_id ?? '', minutes };
      saveSetup(lastSetup);
      startBtn.setAttribute('disabled', '');
      try {
        active = await startSession({ project_id, planned_seconds: Math.round(minutes * 60) });
        await requestWakeLock();
        render();
      } catch (err) {
        alert(`Could not start: ${(err as Error).message}`);
        startBtn.removeAttribute('disabled');
      }
    },
  }, [
    el('h1', { class: 'pomo__title' }, ['Pomo']),

    fieldGroup('Project', projectSelect, 'project'),

    el('div', { class: 'pomo__field-group' }, [
      el('span', { class: 'pomo__label' }, ['Duration']),
      presetRow,
    ]),

    fieldGroup('Minutes', minutesInput, 'minutes'),

    startBtn,
  ]);

  return form;
}

function fieldGroup(label: string, input: HTMLElement, htmlFor: string): HTMLElement {
  return el('div', { class: 'pomo__field-group' }, [
    el('label', { class: 'pomo__label', for: htmlFor }, [label]),
    input,
  ]);
}

function renderLive(s: FocusSession): HTMLElement {
  const remaining = remainingSeconds(s);
  const expired = remaining === 0;
  const progress = Math.min(100, Math.max(0, ((s.planned_seconds - remaining) / s.planned_seconds) * 100));

  const clock = el('div', { class: 'pomo__clock' }, [formatTime(remaining)]);
  const progressFill = el('div', { class: 'pomo__progress-fill' });
  progressFill.style.width = `${progress}%`;

  const root = el('section', { class: `pomo__live${expired ? ' pomo__live--expired' : ''}` }, [
    el('p', { class: 'pomo__project' }, [projectName(s.project_id)]),
    clock,
    el('div', { class: 'pomo__progress', role: 'progressbar' }, [progressFill]),
  ]);

  if (expired) {
    const notes = el('textarea', {
      class: 'pomo__field',
      rows: 3,
      placeholder: 'A line about the session…',
    }) as HTMLTextAreaElement;
    const tags = el('input', {
      class: 'pomo__field',
      type: 'text',
      placeholder: 'tags (space or comma separated)',
    }) as HTMLInputElement;
    const saveBtn = el('button', {
      type: 'submit',
      class: 'pomo__btn pomo__btn--primary',
    }, ['Save & finish']);

    const captureForm = el('form', {
      class: 'pomo__capture',
      onsubmit: async (e: Event) => {
        e.preventDefault();
        if (!active) return;
        saveBtn.setAttribute('disabled', '');
        try {
          await completeSession(active.id, {
            notes: notes.value.trim() || undefined,
            tags: parseTags(tags.value),
          });
          active = null;
          releaseWakeLock();
          render();
        } catch (err) {
          alert(`Could not save: ${(err as Error).message}`);
          saveBtn.removeAttribute('disabled');
        }
      },
    }, [
      el('p', { class: 'pomo__capture-prompt' }, ['What did you get done?']),
      notes,
      tags,
      saveBtn,
    ]);

    root.append(captureForm);
  } else {
    const finishEarly = el('button', {
      type: 'button',
      class: 'pomo__btn pomo__btn--primary',
      onclick: async () => {
        if (!active) return;
        try {
          await completeSession(active.id, {});
          active = null;
          releaseWakeLock();
          render();
        } catch (err) {
          alert(`Could not finish: ${(err as Error).message}`);
        }
      },
    }, ['Finish early']);

    const abandon = el('button', {
      type: 'button',
      class: 'pomo__btn pomo__btn--ghost',
      onclick: async () => {
        if (!active) return;
        if (!confirm('Abandon this session?')) return;
        try {
          await abandonSession(active.id);
          active = null;
          releaseWakeLock();
          render();
        } catch (err) {
          alert(`Could not abandon: ${(err as Error).message}`);
        }
      },
    }, ['Abandon']);

    root.append(el('div', { class: 'pomo__live-actions' }, [finishEarly, abandon]));
  }

  return root;
}

// ── Tick + title ──────────────────────────────────────────────────────────

function syncTitleAndTicker(): void {
  if (active) {
    if (tickHandle === null) tickHandle = window.setInterval(tick, 1000);
    document.title = `${formatTime(remainingSeconds(active))} — Pomo`;
  } else {
    if (tickHandle !== null) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
    document.title = 'Pomo';
  }
}

function tick(): void {
  if (!active) return;
  const root = $app.firstElementChild;
  if (!root) return;

  const remaining = remainingSeconds(active);
  const wasExpired = root.classList.contains('pomo__live--expired');
  const isExpiredNow = remaining === 0;

  // Cross over from running → expired: full re-render to swap action set.
  if (!wasExpired && isExpiredNow) {
    render();
    return;
  }

  const clock = root.querySelector('.pomo__clock');
  const fill = root.querySelector<HTMLElement>('.pomo__progress-fill');
  if (clock) clock.textContent = formatTime(remaining);
  if (fill) {
    const progress = ((active.planned_seconds - remaining) / active.planned_seconds) * 100;
    fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }
  document.title = `${formatTime(remaining)} — Pomo`;
}

// ── Visibility — refetch active state when tab regains focus ──────────────

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return;
  try {
    const { active: latest } = await fetchActive();
    // If the server says it's done (e.g. completed elsewhere), drop the local view.
    if (active && (!latest || latest.id !== active.id)) {
      active = latest;
      releaseWakeLock();
      render();
    } else if (!active && latest) {
      active = latest;
      await requestWakeLock();
      render();
    }
  } catch { /* offline — keep showing what we had */ }
});

// ── Boot ───────────────────────────────────────────────────────────────────

async function boot(): Promise<void> {
  $app.textContent = 'Loading…';
  try {
    const [{ active: a }, items] = await Promise.all([fetchActive(), fetchProjects()]);
    active = a;
    projects = items;
    if (active) await requestWakeLock();
  } catch (err) {
    $app.textContent = `Couldn't reach the API: ${(err as Error).message}`;
    return;
  }
  render();
}

boot();
