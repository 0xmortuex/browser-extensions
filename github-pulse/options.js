const $ = (id) => document.getElementById(id);
const say = (t) => { $('status').textContent = t; };

chrome.storage.local.get('pulse_cf', ({ pulse_cf }) => {
  if (pulse_cf) { $('account').value = pulse_cf.account || ''; $('token').value = pulse_cf.token ? '••••••••' : ''; }
});

$('save').addEventListener('click', async () => {
  const account = $('account').value.trim();
  const tokenField = $('token').value.trim();
  const { pulse_cf } = await chrome.storage.local.get('pulse_cf');
  const token = tokenField === '••••••••' && pulse_cf ? pulse_cf.token : tokenField;
  if (!/^[0-9a-f]{32}$/i.test(account)) { say('The account ID is 32 hex characters.'); return; }
  if (!token) { say('Paste the API token.'); return; }
  await chrome.storage.local.set({ pulse_cf: { account, token } });
  say('Testing…');
  chrome.runtime.sendMessage({ type: 'PULSE_TEST_CF' }, (r) => {
    say(r && r.ok ? 'Saved. Cloudflare lists ' + r.count + ' Worker' + (r.count === 1 ? '' : 's') + '.' : 'Saved, but Cloudflare said: ' + ((r && r.error) || 'no answer'));
  });
});

$('clear').addEventListener('click', async () => {
  await chrome.storage.local.remove('pulse_cf');
  $('account').value = ''; $('token').value = '';
  say('Removed.');
});
