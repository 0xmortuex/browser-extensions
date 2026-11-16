# GitHub Pulse

A slim bar under every GitHub repository's header: is it green, is it deployed, what was released.

- **Workflows** — the newest run of each workflow on the default branch: passing, failing or running, and how long ago. Click through to the run.
- **Deployments** — the latest deployment and its state (GitHub Pages, environments).
- **Release** — the latest release tag and when it went out.
- **Cloudflare Workers** *(optional)* — when the Worker with the repo's name was last deployed. Add a read-only API token in the options (*Workers Scripts: Read*); it stays in your browser and only goes to `api.cloudflare.com`.

Uses GitHub's public API without signing in (60 requests an hour; each repo costs three or four and is cached for three minutes), so it works on public repositories.

## Install

**In Vex:** Settings › Extensions › *Extensions worth installing* › GitHub Pulse › **Install**.

**In Chrome or Brave:** download `GitHub-Pulse-<version>.zip` from [Releases](https://github.com/0xmortuex/GitHub-Pulse/releases/latest), unzip, open `chrome://extensions`, turn on Developer mode, **Load unpacked**, pick the folder.

## Development

Plain Manifest V3, no build step. Tests: `node --test tests/logic.test.js`

MIT — by **0xmortuex**
