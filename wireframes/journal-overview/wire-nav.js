const screens = [
  { id: '00', file: '00-flow-map.html',        label: 'Flow map' },
  { id: '01', file: '01-overview-day.html',    label: 'Overview · day' },
  { id: '02', file: '02-work-day.html',        label: 'Work · day' },
  { id: '03', file: '03-body-day.html',        label: 'Body · day' },
  { id: '04', file: '04-jimbo-day.html',       label: 'Jimbo · day' },
  { id: '05', file: '05-evening-checks.html',  label: 'Evening · checks' },
  { id: '06', file: '06-metric-anatomy.html',  label: 'Metric anatomy' },
];

(function () {
  const current = decodeURIComponent(location.pathname.split('/').pop() || '');
  const idx = screens.findIndex(s => s.file === current);

  document.addEventListener('click', e => {
    const hot = e.target.closest('[data-goto]');
    if (!hot) return;
    const target = screens.find(s => s.id === hot.dataset.goto);
    if (target) location.href = target.file;
  });

  const nav = document.createElement('div');
  nav.style.cssText = `
    position: fixed; bottom: 0; left: 0; right: 0;
    background: #111; color: #fff;
    display: flex; justify-content: center; align-items: center; gap: 22px;
    padding: 9px 16px; font-family: 'Courier New', monospace; font-size: 11px;
    z-index: 9999;
  `;

  const prev = idx > 0 ? screens[idx - 1] : null;
  const next = idx >= 0 && idx < screens.length - 1 ? screens[idx + 1] : null;
  const link = (s, text) =>
    `<a href="${s ? s.file : '#'}" style="color:${s ? '#fff' : '#555'};text-decoration:none;">${text}</a>`;

  nav.innerHTML = [
    link(prev, `← ${prev ? prev.label : '—'}`),
    `<a href="00-flow-map.html" style="color:#aaa;text-decoration:none;">[ flow map ]</a>`,
    `<span style="color:#666;">${idx >= 0 ? idx + '/' + (screens.length - 1) : ''}</span>`,
    link(next, `${next ? next.label : '—'} →`),
  ].join('');
  document.body.appendChild(nav);

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'  && prev) location.href = prev.file;
    if (e.key === 'ArrowRight' && next) location.href = next.file;
  });
})();
