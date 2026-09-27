// Run: pnpm install && pnpm test   (needs jsdom)
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const CV = require('../cineverse-logic.js');

const div = (html) => { const d = new JSDOM('<!doctype html><body>' + html + '</body>').window.document; return d.body; };

// Trimmed from /Film/GetAllowedSalesFilmsByFilterView (2026-09-27).
const FILMS = `
<div id="film-e7cd89a7" class="movie-item-card ticket-flow-card-movie-item" data-id="e7cd89a7-0000" data-showtime="20260925">
  <h4 class="ticket-flow-card-movie-title"> İsyan </h4>
  <p class="ticket-flow-card-movie-description"> Mutiny </p>
  <p data-type="genre" data-genre="Aksiyon" class="ticket-flow-card-movie-description"><span>1 sa 35 dk</span> / Aksiyon</p>
</div>
<div id="film-3ad282da" class="movie-item-card ticket-flow-card-movie-item" data-id="3ad282da-0000" data-showtime="20260925">
  <h4 class="ticket-flow-card-movie-title"> Damat Mektebi </h4>
  <p class="ticket-flow-card-movie-description"> Damat Mektebi </p>
</div>`;

test('films on sale, with their original titles', () => {
  assert.deepEqual(CV.filmsFrom(div(FILMS)), [
    { id: 'e7cd89a7-0000', title: 'İsyan', original: 'Mutiny', year: 2026 },
    { id: '3ad282da-0000', title: 'Damat Mektebi', original: 'Damat Mektebi', year: 2026 },
  ]);
  assert.equal(CV.yearOf('2026925'), 2026);
  assert.equal(CV.yearOf(''), null);
});

test('OMDb is asked the original title first, this year then last year', () => {
  assert.deepEqual(CV.queries({ title: 'İsyan', original: 'Mutiny', year: 2026 }), [
    { t: 'Mutiny', y: 2026 }, { t: 'Mutiny', y: 2025 }, { t: 'İsyan', y: 2026 }, { t: 'İsyan', y: 2025 },
  ]);
  assert.deepEqual(CV.queries({ title: 'The Odyssey', original: 'The Odyssey', year: 2026 }), [
    { t: 'The Odyssey', y: 2026 }, { t: 'The Odyssey', y: 2025 },
  ]);
});

test('only the same film, from about that year, with a rating, counts', () => {
  const ok = { Response: 'True', Type: 'movie', Year: '2025', imdbRating: '7.4', imdbVotes: '12,345', imdbID: 'tt1' };
  assert.deepEqual(CV.accept(ok, 2026), { rating: 7.4, votes: '12345', imdbID: 'tt1', year: 2025 });
  assert.equal(CV.accept({ ...ok, Year: '2002' }, 2026), null, 'a 2002 film of the same name');
  assert.equal(CV.accept({ ...ok, imdbRating: 'N/A' }, 2026), null, 'not rated yet');
  assert.equal(CV.accept({ ...ok, Type: 'series' }, 2026), null);
  assert.equal(CV.accept({ Response: 'False', Error: 'Movie not found!' }, 2026), null);
});

// Trimmed from the booking page's cinema list and /Film/GetFilmSessionsView.
const CINEMAS = `
<div id="cinema-a" class="card ticket-flow-card-movie-item cinema-card-item" data-id="a" data-name="Hilltown">
  <h2>Paribu Cineverse Hilltown Küçükyalı</h2><a href="http://maps.google.com/maps?q=40.9468,29.1136">map</a></div>
<div id="cinema-b" class="card ticket-flow-card-movie-item cinema-card-item" data-id="b" data-name="Bolu">
  <h2>Paribu Cineverse 14 Bolu Burda</h2><a href="http://maps.google.com/maps?q=40.7321,31.563">map</a></div>
<div id="cinema-c" class="card ticket-flow-card-movie-item cinema-card-item" data-id="c" data-name="Piazza">
  <h2>Paribu Cineverse Maltepe Piazza</h2><a href="http://maps.google.com/maps?q=40.9214,29.1330">map</a></div>`;

test('the nearest cinemas, by their map pins', () => {
  const home = { lat: 40.955, lng: 29.097 };
  const near = CV.nearest(CV.cinemasFrom(div(CINEMAS)), home, 2);
  assert.deepEqual(near.map(c => c.name), ['Hilltown Küçükyalı', 'Maltepe Piazza']);
  assert.ok(near[0].km > 1 && near[0].km < 3, 'Hilltown is about 2 km away: ' + near[0].km);
});

const SESSIONS = `
<div data-id="1" class="ticket-flow-card-movie-item" data-type="date">
  <span class="ticket-flow-movie-subtitle">2D - ALTY :</span>
  <div id="showtime-20260927211500" data-session-available="True" data-href="/biletleme/~step~ticket~code~84~session~1" class="ticket-flow-movie-datetime"> 21:15 </div>
  <div id="showtime-20260927153000" data-session-available="True" data-href="/biletleme/~step~ticket~code~84~session~0" class="ticket-flow-movie-datetime"> 15:30 </div>
</div>
<div data-id="1" class="ticket-flow-card-movie-item" data-type="date">
  <span class="ticket-flow-movie-subtitle">IMAX - DUB :</span>
  <div id="showtime-20260927194500" data-session-available="True" data-href="/biletleme/~step~ticket~code~84~session~2" class="ticket-flow-movie-datetime"> 19:45 </div>
  <div id="showtime-20260927203000" data-session-available="False" data-href="/x" class="ticket-flow-movie-datetime"> 20:30 </div>
</div>`;

test('showtimes still ahead, soonest first, with format and booking link', () => {
  const a = CV.sessionsFrom(div(SESSIONS), { name: 'Hilltown', km: 2.1 });
  const b = CV.sessionsFrom(div(SESSIONS.replace(/21:15|211500/g, m => m === '21:15' ? '19:45' : '194500')), { name: 'Piazza', km: 4.4 });
  const rows = CV.soonest([...b, ...a], new Date(2026, 8, 27, 17, 0));
  assert.deepEqual(rows.map(r => r.time + ' ' + r.cinema + ' ' + r.format), [
    '19:45 Hilltown IMAX - DUB',
    '19:45 Piazza 2D - ALTY',
    '19:45 Piazza IMAX - DUB',
    '21:15 Hilltown 2D - ALTY',
  ]);
  assert.equal(rows[0].href, '/biletleme/~step~ticket~code~84~session~2');
});

test('the site\'s array form encoding', () => {
  assert.equal(CV.form({ FilmIds: ['f'], CinemaIds: ['a', 'b'] }), 'FilmIds%5B%5D=f&CinemaIds%5B%5D=a&CinemaIds%5B%5D=b');
  assert.equal(CV.form({}), '');
  assert.equal(CV.dayKey(new Date(2026, 8, 7)), '2026-09-07');
});
