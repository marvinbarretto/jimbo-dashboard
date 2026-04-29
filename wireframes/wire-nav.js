const screens = [
  { id: '00', file: '00-flow-map.html',        label: 'Flow Map' },
  { id: '01', file: '01-card-improved.html',   label: 'Card — with reply' },
  { id: '02', file: '02-detail-stacked.html',  label: 'Detail — stacked' },
  { id: '03', file: '03-questions-feed.html',  label: 'Questions feed' },
  { id: '04', file: '04-question-reply.html',  label: 'Reply + tokens' },
];

(function () {
  const current = location.pathname.split('/').pop();
  const idx = screens.findIndex(s => s.file === current);

  const nav = document.createElement('div');
  nav.style.cssText = `
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 375px; background: #111; color: #fff;
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 16px; font-family: 'Courier New', monospace; font-size: 11px;
    border-top: 2px solid #444; z-index: 9999;
  `;

  const prev = idx > 0 ? screens[idx - 1] : null;
  const next = idx < screens.length - 1 ? screens[idx + 1] : null;

  nav.innerHTML = `
    <a href="${prev ? prev.file : '#'}" style="color:${prev ? '#fff' : '#555'}; text-decoration:none;">← ${prev ? prev.label : '—'}</a>
    <a href="00-flow-map.html" style="color:#aaa; text-decoration:none;">[ map ]</a>
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
    el.style.outline = '1px dashed #999';
    el.title = `→ ${target.label}`;
    el.addEventListener('click', e => { e.stopPropagation(); location.href = target.file; });
  });
})();
