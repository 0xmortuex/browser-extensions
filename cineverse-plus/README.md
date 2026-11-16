# Cineverse+

Paribu Cineverse, a little better.

- **IMDb ratings on every film** — in the film lists, on the home page and on the booking page. Click a rating to open the film on IMDb. Films are matched by their original title and year, so *İsyan* is looked up as *Mutiny*; a film OMDb does not know, or a re-release it cannot tell apart, is left without a rating rather than given the wrong one.
- **Soonest showings near me** — on the booking page, pick a film and press the yellow button: today's showtimes at your 6 nearest cinemas, soonest first (tomorrow's once today's are over). Click one to go straight to booking it.

## IMDb ratings need a free key

Ratings come from [OMDb](https://www.omdbapi.com/). Get a free key at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) (the FREE plan, 1,000 lookups a day), then paste it in Cineverse+'s options. The key stays in your browser and is sent only to `www.omdbapi.com` with the film titles; ratings are kept for 3 days. *Soonest showings* needs no key.

Your location is asked through the browser, only when you press the button, and is used on the page only to measure the distance to each cinema. It is not sent anywhere.

## Install

**In Vex:** Settings › Extensions › *Extensions worth installing* › Cineverse+ › **Install**. In Vex, your location comes from Settings › Location.

**In Chrome or Brave:** download `Cineverse-Plus-<version>.zip` from [Releases](https://github.com/0xmortuex/Cineverse-Plus/releases/latest), unzip, `chrome://extensions` › Developer mode › **Load unpacked**.

## Development

Plain Manifest V3, no build step. Tests: `pnpm install && pnpm test` (uses jsdom).

MIT — by **0xmortuex**
