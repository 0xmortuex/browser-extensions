// Run: node --test tests/logic.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../pulse-logic.js');

test('only repository pages', () => {
  assert.deepEqual(P.repoFromPath('/0xmortuex/Vex/issues/3'), { owner: '0xmortuex', repo: 'Vex' });
  assert.equal(P.repoFromPath('/trending'), null);
  assert.equal(P.repoFromPath('/settings/profile'), null);
  assert.equal(P.repoFromPath('/0xmortuex'), null);
});

test('the newest run of each workflow, on the default branch', () => {
  const runs = [
    { workflow_id: 1, name: 'CI', status: 'completed', conclusion: 'failure', head_branch: 'feature', updated_at: '2026-09-27T15:00:00Z' },
    { workflow_id: 1, name: 'CI', status: 'completed', conclusion: 'success', head_branch: 'main', updated_at: '2026-09-27T14:00:00Z' },
    { workflow_id: 1, name: 'CI', status: 'completed', conclusion: 'failure', head_branch: 'main', updated_at: '2026-09-26T14:00:00Z' },
    { workflow_id: 2, name: 'Deploy', status: 'in_progress', conclusion: null, head_branch: 'main', updated_at: '2026-09-27T15:10:00Z' },
  ];
  const out = P.latestRuns(runs, 'main');
  assert.deepEqual(out.map(r => [r.name, r.state]), [['CI', 'success'], ['Deploy', 'running']]);
  assert.equal(P.tone('failure'), 'bad');
  assert.equal(P.tone('in_progress'), 'busy');
});

test('how long ago', () => {
  const now = Date.parse('2026-09-27T16:00:00Z');
  assert.equal(P.ago('2026-09-27T15:42:00Z', now), '18 min ago');
  assert.equal(P.ago('2026-09-27T13:00:00Z', now), '3 h ago');
  assert.equal(P.ago('2026-04-11T22:10:00Z', now), '6 months ago');
});

test('a repo finds its Worker by name', () => {
  const scripts = [{ id: 'billforge-worker' }, { id: 'gitpulse' }];
  assert.equal(P.workerFor('billforge-worker', scripts).id, 'billforge-worker');
  assert.equal(P.workerFor('billforge', scripts).id, 'billforge-worker');
  assert.equal(P.workerFor('gitpulse-worker', scripts).id, 'gitpulse');
  assert.equal(P.workerFor('vex', scripts), null);
});
