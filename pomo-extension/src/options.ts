const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const usernameInput = document.getElementById('username') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const durationInput = document.getElementById('duration') as HTMLInputElement;
const statusEl = document.getElementById('status')!;

async function load(): Promise<void> {
  const stored = await chrome.storage.local.get(['basicAuth', 'defaultDuration']);
  if (stored['basicAuth']) {
    try {
      const decoded = atob(stored['basicAuth'] as string);
      usernameInput.value = decoded.substring(0, decoded.indexOf(':'));
    } catch {}
  }
  durationInput.value = String(stored['defaultDuration'] ?? 25);
}

saveBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username) {
    statusEl.textContent = 'Username is required.';
    return;
  }

  const basicAuth = btoa(`${username}:${password}`);
  const defaultDuration = parseInt(durationInput.value, 10) || 25;

  await chrome.storage.local.set({ basicAuth, defaultDuration });
  statusEl.textContent = 'Saved!';
  setTimeout(() => { statusEl.textContent = ''; }, 2000);
});

load();
