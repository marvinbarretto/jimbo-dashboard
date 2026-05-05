// Vanilla TS pomo timer + retrospective.
//
// Three states: idle (setup) → running (countdown) → expired (retrospective).
// Server row is source of truth — wall-clock countdown survives tab close.

interface FocusSession {
  id: string;
  project_id: string | null;
  started_at: string;
  ended_at: string | null;
  planned_seconds: number;
  actual_seconds: number | null;
  status: 'running' | 'completed' | 'abandoned';
  mood: -1 | 0 | 1 | null;
  interrupted: boolean;
  notes: string | null;
  tags: string[];
  created_at: string;
}

interface Project {
  id: string;
  display_name: string;
  status: string;
}

interface VaultNote {
  id: string;
  seq: number | null;
  title: string;
  status: string;
  type: string;
}

type Mood = -1 | 0 | 1;

const PRESETS = [15, 25, 45, 90] as const;
const STORAGE_KEY = 'pomo:setup';

const $app = document.getElementById('app') as HTMLElement;

// ── State ─────────────────────────────────────────────────────────────────

let active: FocusSession | null = null;
let projects: Project[] = [];
let tickHandle: number | null = null;
let wakeLock: WakeLockSentinel | null = null;
let lastSetup: { project_id: string; minutes: number } = loadSetup();

// ── API ───────────────────────────────────────────────────────────────────

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const fetchActive    = () => api<{ active: FocusSession | null }>('/api/focus-sessions/active');
const fetchProjects  = () => api<Project[]>('/api/projects');
const searchVault    = (q: string) =>
  api<{ items: VaultNote[] }>(`/api/vault/search?q=${encodeURIComponent(q)}&limit=10`);

const startSession = (body: { project_id: string | null; planned_seconds: number }) =>
  api<FocusSession>('/api/focus-sessions', { method: 'POST', body: JSON.stringify(body) });

const completeSession = (id: string, body: {
  notes?: string; tags?: string[]; mood?: Mood; interrupted?: boolean;
}) =>
  api<FocusSession>(`/api/focus-sessions/${encodeURIComponent(id)}/complete`, {
    method: 'PATCH', body: JSON.stringify(body),
  });

const linkVaultNote = (sessionId: string, vaultNoteId: string) =>
  api<void>(`/api/focus-sessions/${encodeURIComponent(sessionId)}/notes`, {
    method: 'POST', body: JSON.stringify({ vault_note_id: vaultNoteId }),
  });

const abandonSession = (id: string) =>
  api<FocusSession>(`/api/focus-sessions/${encodeURIComponent(id)}/abandon`, {
    method: 'PATCH', body: '{}',
  });

// ── Persistence ───────────────────────────────────────────────────────────

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

// ── Time helpers ──────────────────────────────────────────────────────────

function remainingSeconds(s: FocusSession): number {
  const elapsed = (Date.now() - new Date(s.started_at).getTime()) / 1000;
  return Math.max(0, Math.round(s.planned_seconds - elapsed));
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatMins(seconds: number): string {
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

function projectName(id: string | null): string {
  if (!id) return 'Unassigned';
  return projects.find(p => p.id === id)?.display_name ?? id;
}

function parseTags(raw: string): string[] | undefined {
  const parts = raw.split(/[,\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean);
  return parts.length ? Array.from(new Set(parts)) : undefined;
}

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let timer: number | null = null;
  return (...args: T) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}

// ── DOM helpers ───────────────────────────────────────────────────────────

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

// ── Wake lock ─────────────────────────────────────────────────────────────

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

// ── Render ────────────────────────────────────────────────────────────────

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
    id: 'minutes', type: 'number', min: 1, max: 480,
    class: 'pomo__field', value: String(lastSetup.minutes),
  });

  const presetRow = el('div', { class: 'pomo__presets' },
    PRESETS.map(m => el('button', {
      type: 'button',
      class: `pomo__preset${lastSetup.minutes === m ? ' pomo__preset--active' : ''}`,
      onclick: () => {
        lastSetup.minutes = m;
        (minutesInput as HTMLInputElement).value = String(m);
        renderPresetState();
      },
    }, [`${m}m`])),
  );

  function renderPresetState(): void {
    presetRow.querySelectorAll('button').forEach((btn, i) => {
      btn.classList.toggle('pomo__preset--active', PRESETS[i] === lastSetup.minutes);
    });
  }

  minutesInput.addEventListener('input', () => {
    const v = Number((minutesInput as HTMLInputElement).value);
    if (Number.isFinite(v)) { lastSetup.minutes = v; renderPresetState(); }
  });

  const startBtn = el('button', { type: 'submit', class: 'pomo__btn pomo__btn--primary' }, ['Start']);

  const form = el('form', {
    class: 'pomo__setup',
    onsubmit: async (e: Event) => {
      e.preventDefault();
      const minutes = Number((minutesInput as HTMLInputElement).value);
      if (!Number.isFinite(minutes) || minutes < 1) return;
      const project_id = (projectSelect as HTMLSelectElement).value || null;
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
    root.append(renderRetrospective(s));
  } else {
    const finishEarly = el('button', {
      type: 'button', class: 'pomo__btn pomo__btn--primary',
      onclick: async () => {
        if (!active) return;
        try {
          await completeSession(active.id, {});
          active = null; releaseWakeLock(); render();
        } catch (err) { alert(`Could not finish: ${(err as Error).message}`); }
      },
    }, ['Finish early']);

    const abandon = el('button', {
      type: 'button', class: 'pomo__btn pomo__btn--ghost',
      onclick: async () => {
        if (!active || !confirm('Abandon this session?')) return;
        try {
          await abandonSession(active.id);
          active = null; releaseWakeLock(); render();
        } catch (err) { alert(`Could not abandon: ${(err as Error).message}`); }
      },
    }, ['Abandon']);

    root.append(el('div', { class: 'pomo__live-actions' }, [finishEarly, abandon]));
  }

  return root;
}

// ── Retrospective form ─────────────────────────────────────────────────────

function renderRetrospective(s: FocusSession): HTMLElement {
  let selectedMood: Mood | null = null;
  let interrupted = false;
  const linkedNotes = new Map<string, string>(); // id → title

  // ── Mood ────────────────────────────────────────────────────────────────

  const MOOD_OPTIONS: [Mood, string, string][] = [
    [-1, '👎', 'Bad'],
    [ 0, '😐', 'OK'],
    [ 1, '👍', 'Good'],
  ];

  const moodBtns = MOOD_OPTIONS.map(([value, icon, label]) => {
    const btn = el('button', {
      type: 'button',
      class: 'pomo__mood-btn',
      'aria-label': label,
      'data-mood': value,
    }, [el('span', { class: 'pomo__mood-icon' }, [icon]), el('span', { class: 'pomo__mood-label' }, [label])]);

    btn.addEventListener('click', () => {
      selectedMood = selectedMood === value ? null : value;
      moodBtns.forEach(b => b.classList.toggle(
        'pomo__mood-btn--active',
        Number(b.dataset['mood']) === selectedMood,
      ));
    });
    return btn;
  });

  const moodRow = el('div', { class: 'pomo__mood' }, moodBtns);

  // ── Interrupted ──────────────────────────────────────────────────────────

  const interruptedChk = el('input', { type: 'checkbox', id: 'interrupted-chk' }) as HTMLInputElement;
  interruptedChk.addEventListener('change', () => { interrupted = interruptedChk.checked; });

  const interruptedRow = el('label', { class: 'pomo__interrupted', for: 'interrupted-chk' }, [
    interruptedChk,
    'Session was derailed by distractions',
  ]);

  // ── Vault note typeahead ──────────────────────────────────────────────────

  const chipsEl = el('div', { class: 'pomo__chips' });

  function renderChips(): void {
    chipsEl.replaceChildren(
      ...Array.from(linkedNotes.entries()).map(([id, title]) => {
        const chip = el('span', { class: 'pomo__chip' }, [
          title,
          el('button', { type: 'button', 'aria-label': `Remove ${title}`, class: 'pomo__chip-remove' }, ['×']),
        ]);
        chip.querySelector('button')!.addEventListener('click', () => {
          linkedNotes.delete(id);
          renderChips();
        });
        return chip;
      }),
    );
  }

  const dropdown = el('ul', { class: 'pomo__vault-dropdown' });
  dropdown.hidden = true;

  const vaultInput = el('input', {
    type: 'text', class: 'pomo__field', placeholder: 'Search active vault notes…',
  }) as HTMLInputElement;

  const doSearch = debounce(async (q: string) => {
    if (!q) { dropdown.hidden = true; return; }
    try {
      const { items } = await searchVault(q);
      const fresh = items.filter(n => !linkedNotes.has(n.id));
      if (!fresh.length) { dropdown.hidden = true; return; }
      dropdown.replaceChildren(
        ...fresh.map(n => {
          const li = el('li', { class: 'pomo__vault-result' }, [
            n.seq != null ? el('span', { class: 'pomo__vault-result-seq' }, [`#${n.seq}`]) : '',
            el('span', { class: 'pomo__vault-result-title' }, [n.title]),
            el('span', { class: 'pomo__vault-result-meta' }, [n.type]),
          ]);
          li.addEventListener('mousedown', (e) => {
            e.preventDefault(); // prevent input blur before click registers
            linkedNotes.set(n.id, n.title);
            renderChips();
            vaultInput.value = '';
            dropdown.hidden = true;
          });
          return li;
        }),
      );
      dropdown.hidden = false;
    } catch { /* non-fatal */ }
  }, 280);

  vaultInput.addEventListener('input', () => doSearch(vaultInput.value.trim()));
  vaultInput.addEventListener('blur', () => { setTimeout(() => { dropdown.hidden = true; }, 150); });

  const vaultWrapper = el('div', { class: 'pomo__vault-wrapper' }, [vaultInput, dropdown]);

  // ── Notes ─────────────────────────────────────────────────────────────────

  const notesField = el('textarea', {
    class: 'pomo__field', rows: 3, placeholder: 'What did you get done? Reflections…',
  }) as HTMLTextAreaElement;

  // ── Tags ──────────────────────────────────────────────────────────────────

  const tagsField = el('input', {
    type: 'text', class: 'pomo__field', placeholder: 'tags, comma or space separated',
  }) as HTMLInputElement;

  // ── Actions ───────────────────────────────────────────────────────────────

  const saveBtn = el('button', { type: 'submit', class: 'pomo__btn pomo__btn--primary' }, ['Save & finish']);

  const skipBtn = el('button', { type: 'button', class: 'pomo__btn pomo__btn--ghost' }, ['Skip']);
  skipBtn.addEventListener('click', async () => {
    if (!active) return;
    skipBtn.setAttribute('disabled', '');
    try {
      await completeSession(active.id, {});
      active = null; releaseWakeLock(); render();
    } catch (err) {
      alert(`Could not save: ${(err as Error).message}`);
      skipBtn.removeAttribute('disabled');
    }
  });

  // ── Form ──────────────────────────────────────────────────────────────────

  const form = el('form', {
    class: 'pomo__retro',
    onsubmit: async (e: Event) => {
      e.preventDefault();
      if (!active) return;
      saveBtn.setAttribute('disabled', '');
      try {
        const sessionId = active.id;
        const body: Parameters<typeof completeSession>[1] = {};
        if (selectedMood !== null)    body.mood        = selectedMood;
        if (interrupted)              body.interrupted = true;
        const notesTrimmed = notesField.value.trim();
        if (notesTrimmed)             body.notes       = notesTrimmed;
        const tagsParsed = parseTags(tagsField.value);
        if (tagsParsed)               body.tags        = tagsParsed;

        await completeSession(sessionId, body);

        if (linkedNotes.size > 0) {
          await Promise.all([...linkedNotes.keys()].map(nid => linkVaultNote(sessionId, nid)));
        }

        active = null; releaseWakeLock(); render();
      } catch (err) {
        alert(`Could not save: ${(err as Error).message}`);
        saveBtn.removeAttribute('disabled');
      }
    },
  }, [
    el('div', { class: 'pomo__retro-header' }, [
      el('p', { class: 'pomo__retro-title' }, ['Session complete']),
      el('p', { class: 'pomo__retro-meta' }, [
        `${formatMins(s.planned_seconds)} · ${projectName(s.project_id)}`,
      ]),
    ]),

    el('div', { class: 'pomo__field-group' }, [
      el('span', { class: 'pomo__label' }, ['How was it?']),
      moodRow,
    ]),

    interruptedRow,

    el('div', { class: 'pomo__field-group' }, [
      el('span', { class: 'pomo__label' }, ['What were you working on?']),
      chipsEl,
      vaultWrapper,
    ]),

    el('div', { class: 'pomo__field-group' }, [
      el('span', { class: 'pomo__label' }, ['Notes']),
      notesField,
    ]),

    el('div', { class: 'pomo__field-group' }, [
      el('span', { class: 'pomo__label' }, ['Tags']),
      tagsField,
    ]),

    el('div', { class: 'pomo__retro-actions' }, [saveBtn, skipBtn]),
  ]);

  return form;
}

// ── Tick + title ──────────────────────────────────────────────────────────

function syncTitleAndTicker(): void {
  if (active) {
    if (tickHandle === null) tickHandle = window.setInterval(tick, 1000);
    document.title = `${formatTime(remainingSeconds(active))} — Pomo`;
  } else {
    if (tickHandle !== null) { clearInterval(tickHandle); tickHandle = null; }
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

  if (!wasExpired && isExpiredNow) { render(); return; }

  root.querySelector('.pomo__clock')!.textContent = formatTime(remaining);
  const fill = root.querySelector<HTMLElement>('.pomo__progress-fill');
  if (fill) {
    fill.style.width = `${Math.min(100, Math.max(0, ((active.planned_seconds - remaining) / active.planned_seconds) * 100))}%`;
  }
  document.title = `${formatTime(remaining)} — Pomo`;
}

// ── Visibility — refetch when tab regains focus ───────────────────────────

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible') return;
  try {
    const { active: latest } = await fetchActive();
    if (active && (!latest || latest.id !== active.id)) {
      active = latest; releaseWakeLock(); render();
    } else if (!active && latest) {
      active = latest; await requestWakeLock(); render();
    }
  } catch { /* offline — keep showing what we had */ }
});

// ── Boot ──────────────────────────────────────────────────────────────────

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
