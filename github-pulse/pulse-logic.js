/**
 * GitHub Pulse — the pure parts: which page is a repo, what its runs,
 * deployments and release say, and how long ago.
 */
(function (root) {
  'use strict';

  // First path segments that are GitHub's own pages, not an owner.
  const NOT_OWNERS = new Set(['settings', 'orgs', 'organizations', 'marketplace', 'explore', 'topics', 'trending', 'collections', 'notifications', 'issues', 'pulls', 'search', 'sponsors', 'login', 'logout', 'new', 'features', 'about', 'pricing', 'enterprise', 'codespaces', 'copilot', 'apps', 'users', 'watching', 'stars', 'dashboard']);

  const Pulse = {
    repoFromPath(pathname) {
      const parts = String(pathname || '').split('/').filter(Boolean);
      if (parts.length < 2 || NOT_OWNERS.has(parts[0].toLowerCase())) return null;
      if (!/^[A-Za-z0-9-]+$/.test(parts[0]) || !/^[A-Za-z0-9._-]+$/.test(parts[1])) return null;
      return { owner: parts[0], repo: parts[1] };
    },

    // The newest run of each workflow, on the default branch when it has one.
    latestRuns(runs, defaultBranch, max = 3) {
      const seen = new Set(), out = [];
      const list = (runs || []).filter(r => !defaultBranch || r.head_branch === defaultBranch);
      for (const r of (list.length ? list : runs || [])) {
        const key = r.workflow_id || r.name;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          name: r.name || 'Workflow',
          state: r.status !== 'completed' ? 'running' : (r.conclusion || 'neutral'),
          url: r.html_url,
          at: r.updated_at || r.created_at,
          branch: r.head_branch,
        });
        if (out.length >= max) break;
      }
      return out;
    },

    // success / failure / running / cancelled / skipped / neutral -> ok / bad / busy / quiet
    tone(state) {
      if (state === 'success') return 'ok';
      if (state === 'failure' || state === 'timed_out' || state === 'startup_failure' || state === 'error') return 'bad';
      if (state === 'running' || state === 'in_progress' || state === 'queued' || state === 'pending') return 'busy';
      return 'quiet';
    },

    ago(iso, now = Date.now()) {
      const t = Date.parse(iso);
      if (!isFinite(t)) return '';
      const s = Math.max(0, Math.round((now - t) / 1000));
      if (s < 60) return 'just now';
      const m = Math.round(s / 60); if (m < 60) return m + ' min ago';
      const h = Math.round(m / 60); if (h < 48) return h + ' h ago';
      const d = Math.round(h / 24); if (d < 60) return d + ' days ago';
      return Math.round(d / 30) + ' months ago';
    },

    // The Cloudflare Worker that goes with a repo: the same name, or the repo
    // name with or without "-worker".
    workerFor(repo, scripts) {
      const name = String(repo || '').toLowerCase();
      const want = new Set([name, name.replace(/-worker$/, ''), name + '-worker']);
      return (scripts || []).find(s => want.has(String(s.id || '').toLowerCase())) || null;
    },
  };

  root.GitHubPulse = Pulse;
  if (typeof module !== 'undefined' && module.exports) module.exports = Pulse;
})(typeof window !== 'undefined' ? window : globalThis);
