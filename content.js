/**
 * Cineverse+ on paribucineverse.com:
 *   - an IMDb badge on every film card (film lists, home page, booking page);
 *   - on the booking page, once a film is picked, "Soonest showings near me":
 *     today's showtimes at your nearest cinemas, soonest first.
 */
(function () {
  'use strict';
  if (window.__cineversePlus) return;
  window.__cineversePlus = true;
  const CV = window.CineversePlus;

  const NEAREST = 6;
  const SHOW = 12;

  const post = (url, fields) => fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
    body: CV.form(fields),
  }).then(r => { if (!r.ok) throw new Error('Cineverse answered ' + r.status); return r.text(); });

  const html = (text) => { const d = document.createElement('div'); d.innerHTML = text; return d; };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ---- IMDb badges ------------------------------------------------------------
  // Every film on sale, with its original title, in one request. Films not on
  // sale yet fall back to their Turkish title.
  let films = null;
  function filmList() {
    if (!films) {
      films = post('/Film/GetAllowedSalesFilmsByFilterView', {})
        .then(t => new Map(CV.filmsFrom(html(t)).map(f => [f.id, f])));
    }
    return films;
  }

  const CARD = '.movie-list-banner-item, .ticket-flow-card-movie-item, .swiper-slide';
  const TITLE = 'h3.movie-title, h4.ticket-flow-card-movie-title';
  // Set once OMDb cannot be used on this page (no key, bad key, daily limit).
  let stopped = false;

  function filmFor(titleEl) {
    const card = titleEl.closest(CARD);
    if (!card) return null;
    const holder = card.hasAttribute('data-id') ? card : card.querySelector('[data-movie-id]');
    const id = holder && (holder.getAttribute('data-id') || holder.getAttribute('data-movie-id'));
    if (!id) return null;
    return { id, title: titleEl.textContent.trim(), year: CV.yearOf(card.getAttribute('data-showtime')) };
  }

  async function badge(titleEl) {
    titleEl.setAttribute('data-cvp', '');
    const seen = filmFor(titleEl);
    if (!seen) return;
    const known = (await filmList()).get(seen.id);
    const film = known || { ...seen, original: seen.title };
    if (stopped) return;
    const r = await chrome.runtime.sendMessage({ type: 'RATING', film });
    if (r && r.error === 'nokey') { stop('Cineverse+ needs a free OMDb key to show IMDb ratings.', 'Add key'); return; }
    if (r && r.error === 'badkey') { stop('OMDb did not accept your key. Check it in Cineverse+ options.', 'Options'); return; }
    if (r && r.error === 'limit') { stop('Your OMDb key has used today’s 1,000 lookups. Ratings come back tomorrow.', null); return; }
    if (r && r.error) throw new Error('Cineverse+ rating for "' + film.title + '": ' + (r.message || r.error));
    if (!r || r.none) return;
    const a = el('a', 'cvp-imdb');
    a.append(el('b', null, 'IMDb'), ' ' + r.rating.toFixed(1));
    a.href = 'https://www.imdb.com/title/' + r.imdbID + '/';
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = r.votes ? Number(r.votes).toLocaleString() + ' votes on IMDb' : 'On IMDb';
    // The booking page selects a film on any click inside its card.
    a.addEventListener('click', (e) => e.stopPropagation(), true);
    titleEl.insertAdjacentElement('afterend', a);
  }

  function stop(text, action) {
    if (stopped) return;
    stopped = true;
    const n = el('div', 'cvp-notice');
    n.append(el('span', null, text));
    if (action) {
      const b = el('button', null, action);
      b.addEventListener('click', () => { chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }); n.remove(); });
      n.append(b);
    }
    const x = el('button', 'cvp-x', '×');
    x.title = 'Close';
    x.addEventListener('click', () => n.remove());
    n.append(x);
    document.body.appendChild(n);
  }

  function paintBadges() {
    for (const t of document.querySelectorAll(TITLE)) {
      if (t.hasAttribute('data-cvp')) continue;
      badge(t).catch((e) => console.error('[cv+]', e));
    }
  }

  // ---- soonest showings near me -------------------------------------------
  let panel = null;
  let panelFilm = null;

  function selectedFilm() {
    const f = document.querySelector('#filmList');
    return f ? f.getAttribute('data-selected-film-id') || '' : '';
  }

  function paintPanel() {
    const step = document.querySelector('[data-step-type="cinema"]');
    const film = selectedFilm();
    if (!step || !film) { if (panel) panel.remove(); panel = null; return; }
    if (panel && panel.isConnected && panelFilm === film) return;
    if (panel) panel.remove();
    panelFilm = film;
    panel = el('div', 'cvp-soon');
    const head = el('div', 'cvp-soon-head');
    const go = el('button', 'cvp-go', 'Soonest showings near me');
    const status = el('span', 'cvp-status');
    head.append(go, status);
    const list = el('ol', 'cvp-list');
    panel.append(head, list);
    go.addEventListener('click', () => {
      go.disabled = true;
      list.textContent = '';
      soonest(film, status, list).catch((e) => { status.textContent = e.message; console.error('[cv+]', e); })
        .finally(() => { go.disabled = false; });
    });
    step.prepend(panel);
  }

  // Asked through geo-bridge.js in the page's world (see there for why).
  function here() {
    return new Promise((resolve, reject) => {
      const done = (e) => {
        document.removeEventListener('cvp-geo-result', done);
        clearTimeout(timer);
        const r = JSON.parse(e.detail);
        if (r.error) reject(new Error(r.error)); else resolve(r);
      };
      // Longer than the bridge's own 20 s, so its answer normally arrives first;
      // this only fires if the bridge is not there at all.
      const timer = setTimeout(() => {
        document.removeEventListener('cvp-geo-result', done);
        reject(new Error('Could not ask for your location. Reload the page and try again.'));
      }, 60000);
      document.addEventListener('cvp-geo-result', done);
      document.dispatchEvent(new CustomEvent('cvp-geo-request'));
    });
  }

  async function soonest(film, status, list) {
    const cinemas = CV.cinemasFrom(document.querySelector('#cinemaList') || document);
    if (!cinemas.length) throw new Error('No cinemas are listed for this film.');
    status.textContent = 'Finding you…';
    const near = CV.nearest(cinemas, await here(), NEAREST);
    if (!near.length) throw new Error('None of the listed cinemas has a location.');
    const now = new Date();
    for (const [offset, label] of [[0, 'Today'], [1, 'Tomorrow']]) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      status.textContent = 'Checking ' + near.length + ' cinemas near you…';
      const each = await Promise.all(near.map(c =>
        post('/Film/GetFilmSessionsView', { FilmIds: [film], CinemaIds: [c.id], Dates: [CV.dayKey(day)] })
          .then(t => CV.sessionsFrom(html(t), c))));
      const rows = CV.soonest(each.flat(), now).slice(0, SHOW);
      if (!rows.length) continue;
      status.textContent = label + ', within ' + Math.ceil(near[near.length - 1].km) + ' km';
      for (const s of rows) {
        const li = el('li');
        const a = el('a');
        a.href = s.href;
        a.append(el('b', 'cvp-time', s.time), el('span', 'cvp-cinema', s.cinema), el('span', 'cvp-km', s.km.toFixed(1) + ' km'), el('span', 'cvp-fmt', s.format));
        li.append(a);
        list.append(li);
      }
      return;
    }
    status.textContent = 'No showings today or tomorrow at the ' + near.length + ' nearest cinemas.';
  }

  // ---- keep up with the page -----------------------------------------------
  let timer = null;
  function refresh() {
    timer = null;
    paintBadges();
    if (location.pathname.startsWith('/biletleme')) paintPanel();
  }
  new MutationObserver(() => { if (!timer) timer = setTimeout(refresh, 300); })
    .observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-selected-film-id'] });
  refresh();
})();
