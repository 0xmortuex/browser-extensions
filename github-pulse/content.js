/**
 * GitHub Pulse — the bar under a repository's header: the latest run of each
 * workflow, the latest deployment, the latest release, and (if set up) when
 * its Cloudflare Worker was last deployed. Every value from GitHub is written
 * as text, never as HTML.
 */
(function () {
  'use strict';
  const P = window.GitHubPulse;
  let lastKey = '';

  const ICON = {
    ok: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M13.8 4.3a.8.8 0 0 1 0 1.1l-6.5 6.5a.8.8 0 0 1-1.1 0L2.2 8a.8.8 0 1 1 1.1-1.1l3.4 3.4 6-6a.8.8 0 0 1 1.1 0Z"/></svg>',
    bad: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3.7 3.7a.8.8 0 0 1 1.1 0L8 6.9l3.2-3.2a.8.8 0 1 1 1.1 1.1L9.1 8l3.2 3.2a.8.8 0 1 1-1.1 1.1L8 9.1l-3.2 3.2a.8.8 0 1 1-1.1-1.1L6.9 8 3.7 4.8a.8.8 0 0 1 0-1.1Z"/></svg>',
    busy: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="20 14"/></svg>',
    quiet: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="currentColor"/></svg>',
  };

  function item(tone, label, detail, url) {
    const el = document.createElement(url ? 'a' : 'span');
    el.className = 'gp-item gp-' + tone;
    if (url) { el.href = url; el.target = '_self'; }
    const ico = document.createElement('span');
    ico.className = 'gp-ico';
    ico.innerHTML = ICON[tone] || ICON.quiet;
    const text = document.createElement('span');
    text.className = 'gp-label';
    text.textContent = label;
    const sub = document.createElement('span');
    sub.className = 'gp-detail';
    sub.textContent = detail || '';
    el.append(ico, text, sub);
    return el;
  }

  function render(bar, data) {
    bar.textContent = '';
    if (!data || !data.ok) {
      if (data && data.error === 'rate') {
        const when = data.reset ? new Date(data.reset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'within the hour';
        bar.append(item('quiet', 'GitHub rate limit reached', '60 requests an hour without signing in; back at ' + when));
      } else {
        bar.remove();
      }
      return;
    }
    const parts = [];
    for (const r of data.runs) parts.push(item(P.tone(r.state), r.name, (r.state === 'running' ? 'running' : r.state) + ' · ' + P.ago(r.at), r.url));
    if (data.deployment) parts.push(item(P.tone(data.deployment.state), 'Deploy: ' + data.deployment.environment, data.deployment.state + ' · ' + P.ago(data.deployment.at), data.deployment.url));
    if (data.worker) parts.push(item('ok', 'Worker: ' + data.worker.name, 'deployed ' + P.ago(data.worker.at), 'https://dash.cloudflare.com/'));
    if (data.release) parts.push(item('quiet', 'Release ' + data.release.tag, P.ago(data.release.at), data.release.url));
    if (!parts.length) parts.push(item('quiet', 'No workflows, deployments or releases', ''));
    bar.append(...parts);
  }

  function run() {
    const meta = document.querySelector('meta[name="octolytics-dimension-repository_nwo"]');
    const fromMeta = meta && meta.content && meta.content.includes('/') ? { owner: meta.content.split('/')[0], repo: meta.content.split('/')[1] } : null;
    const repo = fromMeta || P.repoFromPath(location.pathname);
    const header = document.querySelector('#repository-container-header');
    if (!repo || !header) { lastKey = ''; return; }
    const key = repo.owner + '/' + repo.repo;
    const existing = document.querySelector('.gp-bar');
    if (existing && lastKey === key) return;
    if (existing) existing.remove();
    lastKey = key;
    const bar = document.createElement('div');
    bar.className = 'gp-bar';
    bar.setAttribute('aria-label', 'GitHub Pulse');
    bar.append(item('busy', 'Checking ' + key + '…', ''));
    header.after(bar);
    chrome.runtime.sendMessage({ type: 'PULSE', owner: repo.owner, repo: repo.repo }, (data) => {
      if (chrome.runtime.lastError) { bar.remove(); return; }
      if (lastKey === key) render(bar, data);
    });
  }

  // GitHub swaps pages without a reload (Turbo).
  document.addEventListener('turbo:load', run);
  document.addEventListener('pjax:end', run);
  let lastPath = location.pathname;
  new MutationObserver(() => {
    if (location.pathname !== lastPath) { lastPath = location.pathname; setTimeout(run, 300); }
    else if (!document.querySelector('.gp-bar') && document.querySelector('#repository-container-header')) run();
  }).observe(document.documentElement, { childList: true, subtree: true });
  run();
})();
