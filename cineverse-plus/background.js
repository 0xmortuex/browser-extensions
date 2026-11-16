/**
 * Cineverse+ service worker: IMDb ratings from OMDb, with your own free key.
 * A found rating is kept 3 days, a film OMDb does not know 1 day.
 */
importScripts('cineverse-logic.js');
const CV = self.CineversePlus;

const HIT_MS = 3 * 24 * 3600 * 1000;
const MISS_MS = 24 * 3600 * 1000;

async function omdb(key, q) {
  const u = new URL('https://www.omdbapi.com/');
  u.searchParams.set('apikey', key);
  u.searchParams.set('t', q.t);
  u.searchParams.set('type', 'movie');
  if (q.y) u.searchParams.set('y', String(q.y));
  const r = await fetch(u);
  // OMDb answers a bad or used-up key with 401 and a JSON body.
  const body = await r.json();
  if (body && body.Response === 'False' && /api key|limit/i.test(body.Error || '')) {
    const e = new Error(body.Error); e.code = /limit/i.test(body.Error) ? 'limit' : 'badkey'; throw e;
  }
  if (!r.ok) throw new Error('OMDb answered ' + r.status);
  return body;
}

async function rating(film) {
  const { omdbKey } = await chrome.storage.local.get('omdbKey');
  if (!omdbKey) return { error: 'nokey' };
  const cacheKey = 'r:' + film.id;
  const cached = (await chrome.storage.local.get(cacheKey))[cacheKey];
  if (cached && Date.now() - cached.at < (cached.found ? HIT_MS : MISS_MS)) return cached.found || { none: true };
  let found = null;
  for (const q of CV.queries(film)) {
    found = CV.accept(await omdb(omdbKey, q), film.year);
    if (found) break;
  }
  await chrome.storage.local.set({ [cacheKey]: { at: Date.now(), found } });
  return found || { none: true };
}

// One lookup at a time: a list page asks for ~30 films at once, and OMDb's
// free key allows 1,000 requests a day.
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === 'RATING') {
    const job = queue.then(() => rating(msg.film));
    // The queue must survive a failed lookup or a tab that went away.
    queue = job.catch(() => {});
    job.then(reply, (e) => reply({ error: e.code || 'failed', message: e.message }));
    return true;
  }
  if (msg && msg.type === 'OPEN_OPTIONS') { chrome.runtime.openOptionsPage(); return false; }
  if (msg && msg.type === 'TEST_KEY') {
    omdb(msg.key, { t: 'The Matrix', y: 1999 })
      .then((b) => reply(b.Response === 'True' ? { ok: true } : { ok: false, message: b.Error || 'No answer' }),
        (e) => reply({ ok: false, message: e.message }));
    return true;
  }
  return false;
});
