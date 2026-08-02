const screens = [
  { id: '00', file: '00-index.html',            label: 'Index' },
  { id: '01', file: '01-findings-ledger.html',  label: 'Findings Ledger' },
  { id: '02', file: '02-decision-desk.html',    label: 'Decision Desk' },
  { id: '03', file: '03-evidence-card.html',    label: 'Evidence Card' },
  { id: '04', file: '04-tension-report.html',   label: 'Tension Report' },
  { id: '05', file: '05-diff-briefing.html',    label: 'Diff Briefing' },
  { id: '06', file: '06-morning-paper.html',    label: 'Morning Paper' },
  { id: '07', file: '07-scoreboard.html',       label: 'Scoreboard' },
  { id: '08', file: '08-companion-thread.html', label: 'Companion Thread' },
  { id: '09', file: '09-week-shape.html',       label: 'Week Shape' },
  { id: '10', file: '10-editors-verdict.html',  label: "Editor's Verdict" },
];

(function () {
  const current = location.pathname.split('/').pop();
  const idx = screens.findIndex(s => s.file === current);

  const nav = document.createElement('div');
  nav.style.cssText = `
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 640px; background: #111; color: #fff;
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 16px; font-family: ui-monospace, monospace; font-size: 11px;
    border-top: 2px solid #444; z-index: 9999;
  `;

  const prev = idx > 0 ? screens[idx - 1] : null;
  const next = idx < screens.length - 1 ? screens[idx + 1] : null;

  nav.innerHTML = `
    <a href="${prev ? prev.file : '#'}" style="color:${prev ? '#fff' : '#555'}; text-decoration:none;">← ${prev ? prev.label : '—'}</a>
    <a href="00-index.html" style="color:#aaa; text-decoration:none;">[ index ]</a>
    <a href="${next ? next.file : '#'}" style="color:${next ? '#fff' : '#555'}; text-decoration:none;">${next ? next.label : '—'} →</a>
  `;
  document.body.appendChild(nav);

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' && prev) location.href = prev.file;
    if (e.key === 'ArrowRight' && next) location.href = next.file;
  });

  document.querySelectorAll('[data-goto]').forEach(el => {
    const id = el.getAttribute('data-goto').padStart(2, '0');
    const target = screens.find(s => s.id === id);
    if (!target) return;
    el.style.cursor = 'pointer';
    el.addEventListener('mouseenter', () => { el.style.outline = '2px solid #4a90d9'; });
    el.addEventListener('mouseleave', () => { el.style.outline = ''; });
    el.addEventListener('click', () => { location.href = target.file; });
  });
})();
