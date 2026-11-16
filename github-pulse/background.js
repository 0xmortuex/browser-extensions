/**
 * GitHub Pulse — background: asks GitHub (and, if you set it up, Cloudflare)
 * about a repo, and keeps each answer for three minutes. Without a sign-in
 * GitHub allows 60 requests an hour; one repo page costs three or four.
 */
importScripts('pulse-logic.js');

const TTL = 3 * 60 * 1000;
const memo = new Map();

async function gh(path) {
  const res = await fetch('https://api.github.com' + path, { headers: { Accept: 'application/vnd.github+json' } });
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
    const err = new Error('rate');
    err.reset = isFinite(reset) ? reset : null;
    throw err;
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('GitHub answered ' + res.status);
  return res.json();
}

async function cloudflareScripts() {
  const { pulse_cf } = await chrome.storage.local.get('pulse_cf');
  if (!pulse_cf || !pulse_cf.account || !pulse_cf.token) return null;
  const key = 'cf:' + pulse_cf.account;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const res = await fetch('https://api.cloudflare.com/client/v4/accounts/' + encodeURIComponent(pulse_cf.account) + '/workers/scripts', {
    headers: { Authorization: 'Bearer ' + pulse_cf.token },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || !data.success) throw new Error('Cloudflare: ' + ((data && data.errors && data.errors[0] && data.errors[0].message) || res.status));
  const value = (data.result || []).map(s => ({ id: s.id, modified_on: s.modified_on }));
  memo.set(key, { at: Date.now(), value });
  return value;
}

async function pulse(owner, repo) {
  const key = owner + '/' + repo;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const base = '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo);
  try {
    const info = await gh(base);
    if (!info) return { ok: false, error: 'not found' };
    const [runs, deploys, release] = await Promise.all([
      gh(base + '/actions/runs?per_page=20').catch(() => null),
      gh(base + '/deployments?per_page=5').catch(() => null),
      gh(base + '/releases/latest').catch(() => null),
    ]);
    // The newest deployment, with its latest status.
    let deployment = null;
    if (Array.isArray(deploys) && deploys.length) {
      const d = deploys[0];
      const statuses = await gh(base + '/deployments/' + d.id + '/statuses?per_page=1').catch(() => null);
      const s = Array.isArray(statuses) && statuses[0];
      deployment = { environment: d.environment, state: s ? s.state : 'pending', at: (s && s.created_at) || d.created_at, url: (s && (s.environment_url || s.target_url)) || null };
    }
    let worker = null, workerError = null;
    try {
      const scripts = await cloudflareScripts();
      const w = scripts && self.GitHubPulse.workerFor(repo, scripts);
      if (w) worker = { name: w.id, at: w.modified_on };
    } catch (e) { workerError = e.message; }
    const value = {
      ok: true,
      runs: self.GitHubPulse.latestRuns(runs && runs.workflow_runs, info.default_branch),
      deployment,
      release: release && release.tag_name ? { tag: release.tag_name, at: release.published_at, url: release.html_url } : null,
      worker, workerError,
    };
    memo.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    if (e.message === 'rate') return { ok: false, error: 'rate', reset: e.reset };
    return { ok: false, error: e.message };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'PULSE') {
    pulse(String(message.owner || ''), String(message.repo || '')).then(sendResponse);
    return true;
  }
  if (message && message.type === 'PULSE_TEST_CF') {
    memo.forEach((v, k) => { if (k.startsWith('cf:')) memo.delete(k); });
    cloudflareScripts().then(s => sendResponse(s ? { ok: true, count: s.length } : { ok: false, error: 'Account ID and token are both needed' }), e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  return false;
});
