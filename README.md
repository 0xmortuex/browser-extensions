# browser-extensions

Four small Manifest V3 browser extensions by **0xmortuex**, kept in one repository. Each one lives in its own folder with its own README, tests and full commit history, has no build step, and works when loaded unpacked straight from that folder.

| Extension | Folder | What it does | Load unpacked |
| --- | --- | --- | --- |
| ChatKeep | [`chatkeep/`](chatkeep/) | Export ChatGPT, Claude and Gemini conversations as Markdown, and keep one prompt library for all three. | `chrome://extensions` › Developer mode › **Load unpacked** › pick `chatkeep` |
| Cineverse+ | [`cineverse-plus/`](cineverse-plus/) | Paribu Cineverse, better: IMDb ratings on every film, and the soonest showings at the cinemas nearest you. | `chrome://extensions` › Developer mode › **Load unpacked** › pick `cineverse-plus` |
| DevForum+ | [`devforum-plus/`](devforum-plus/) | Roblox DevForum, for developers: API names in code link to their docs, a docs search on Alt+D, and a Copy button on code. | `chrome://extensions` › Developer mode › **Load unpacked** › pick `devforum-plus` |
| GitHub Pulse | [`github-pulse/`](github-pulse/) | A bar under every GitHub repo: latest workflow runs, deployment, release, and your Cloudflare Worker's last deploy. | `chrome://extensions` › Developer mode › **Load unpacked** › pick `github-pulse` |

Clone or download this repository first, then pick the extension's folder (the one that contains `manifest.json`) in the **Load unpacked** dialog. This works in Chrome, Brave and other Chromium browsers.
