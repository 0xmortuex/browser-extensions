const $ = (id) => document.getElementById(id);
const say = (t) => { $('status').textContent = t; };

chrome.storage.local.get('omdbKey', ({ omdbKey }) => { if (omdbKey) $('key').value = omdbKey; });

$('save').addEventListener('click', async () => {
  const key = $('key').value.trim();
  if (!/^[0-9a-z]{6,12}$/i.test(key)) { say('That does not look like an OMDb key (8 letters and digits).'); return; }
  say('Testing…');
  chrome.runtime.sendMessage({ type: 'TEST_KEY', key }, async (r) => {
    if (!r || !r.ok) { say('Not saved. OMDb said: ' + ((r && r.message) || 'no answer')); return; }
    await chrome.storage.local.set({ omdbKey: key });
    // Films looked up without a key were cached as "no rating".
    const all = await chrome.storage.local.get(null);
    await chrome.storage.local.remove(Object.keys(all).filter(k => k.startsWith('r:')));
    say('Saved. Reload the Cineverse tab to see ratings.');
  });
});

$('clear').addEventListener('click', async () => {
  await chrome.storage.local.remove('omdbKey');
  $('key').value = '';
  say('Removed.');
});
