/**
 * Cineverse+ — the parts that do not touch the page or the network: reading
 * films, cinemas and showtimes out of Paribu Cineverse's HTML, deciding which
 * OMDb answer is the same film, and ordering showtimes. Runs in the page, in
 * the service worker and in tests.
 */
(function (root) {
  'use strict';

  const CV = {
    // "20260925" (booking page) or "2026925" (film lists) -> 2026.
    yearOf(showtime) {
      const y = Number(String(showtime || '').slice(0, 4));
      return y >= 1900 && y < 2200 ? y : null;
    },

    // The film cards /Film/GetAllowedSalesFilmsByFilterView returns: the
    // Turkish title, the original one under it, and the release date.
    filmsFrom(container) {
      return [...container.querySelectorAll('.ticket-flow-card-movie-item[data-id]')].map(c => {
        const title = (c.querySelector('.ticket-flow-card-movie-title') || {}).textContent;
        const original = (c.querySelector('p.ticket-flow-card-movie-description:not([data-type])') || {}).textContent;
        return {
          id: c.getAttribute('data-id'),
          title: String(title || '').trim(),
          original: String(original || title || '').trim(),
          year: this.yearOf(c.getAttribute('data-showtime')),
        };
      }).filter(f => f.id && f.title);
    },

    // What to ask OMDb, best guess first. The release year here is the
    // Turkish one, which can trail the original by a year.
    queries(film) {
      const out = [];
      const add = (t, y) => { if (t && !out.some(q => q.t === t && q.y === y)) out.push({ t, y }); };
      for (const t of [film.original, film.title]) {
        if (film.year) { add(t, film.year); add(t, film.year - 1); } else add(t, null);
      }
      return out;
    },

    // An OMDb answer counts only if it is a film from about that year with a
    // rating. A re-release or a remake of the same name is left unrated
    // rather than given the wrong film's score.
    accept(resp, year) {
      if (!resp || resp.Response !== 'True' || resp.Type !== 'movie') return null;
      const y = Number(String(resp.Year || '').slice(0, 4));
      if (year && !(Math.abs(y - year) <= 1)) return null;
      const rating = Number(resp.imdbRating);
      if (!(rating > 0)) return null;
      return { rating, votes: String(resp.imdbVotes || '').replace(/[^\d]/g, '') || null, imdbID: resp.imdbID || null, year: y || null };
    },

    // Cinema cards on the booking page carry a Google Maps link with their
    // coordinates.
    cinemasFrom(container) {
      return [...container.querySelectorAll('.cinema-card-item[data-id]')].map(c => {
        const a = c.querySelector('a[href*="maps.google."]');
        const m = a && /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(a.getAttribute('href'));
        const h = c.querySelector('h2');
        return {
          id: c.getAttribute('data-id'),
          name: String(h ? h.textContent : c.getAttribute('data-name') || '').replace(/^\s*Paribu Cineverse\s+/i, '').trim(),
          lat: m ? Number(m[1]) : null,
          lng: m ? Number(m[2]) : null,
        };
      }).filter(c => c.id);
    },

    distanceKm(a, b) {
      const r = (x) => x * Math.PI / 180;
      const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * 6371 * Math.asin(Math.sqrt(h));
    },

    nearest(cinemas, here, n) {
      return cinemas.filter(c => c.lat != null && c.lng != null)
        .map(c => ({ ...c, km: this.distanceKm(here, c) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, n);
    },

    // /Film/GetFilmSessionsView for one cinema: showtime ids are
    // "showtime-YYYYMMDDHHmmss", each under its format ("2D - ALTY :").
    sessionsFrom(container, cinema) {
      const out = [];
      for (const el of container.querySelectorAll('[id^="showtime-"]')) {
        if (el.getAttribute('data-session-available') === 'False') continue;
        const m = /^showtime-(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(el.id);
        if (!m) continue;
        const card = el.closest('.ticket-flow-card-movie-item');
        const fmt = card && card.querySelector('.ticket-flow-movie-subtitle');
        out.push({
          at: new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]),
          time: m[4] + ':' + m[5],
          format: fmt ? fmt.textContent.replace(/\s*:\s*$/, '').trim() : '',
          href: el.getAttribute('data-href') || '',
          cinema: cinema.name,
          km: cinema.km,
        });
      }
      return out;
    },

    // Showtimes still ahead, soonest first; a tie goes to the nearer cinema.
    soonest(sessions, now) {
      return sessions.filter(s => s.at > now).sort((a, b) => (a.at - b.at) || (a.km - b.km));
    },

    dayKey(d) {
      const p = (n) => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    },

    // jQuery's way of posting arrays, which the site's endpoints expect.
    form(fields) {
      return Object.entries(fields).flatMap(([k, v]) => [].concat(v).map(x => encodeURIComponent(k + '[]') + '=' + encodeURIComponent(x))).join('&');
    },
  };

  root.CineversePlus = CV;
  if (typeof module !== 'undefined' && module.exports) module.exports = CV;
})(typeof window !== 'undefined' ? window : globalThis);
