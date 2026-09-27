# DevForum+

The Roblox Developer Forum, a little better for reading code.

- **API names are links.** In any code block, `HttpService`, `HttpService:GetAsync`, `Enum.Material`, `Vector3.new`, `task.wait`, `game:GetService("Players")` and `Instance.new("Part")` link straight to their page on the Roblox docs.
- **Docs search on Alt+D** (or the **Docs** button in the forum header): every class, enum, data type and library, instantly, with arrow keys and Enter.
- **Copy button** on code blocks that don't have one.

The list of API names comes from the community-maintained API dump ([Roblox-Client-Tracker](https://github.com/MaximumADHD/Roblox-Client-Tracker)), downloaded once a week and kept as names only (a few hundred KB).

## Install

**In Vex:** Settings › Extensions › *Extensions worth installing* › DevForum+ › **Install**.

**In Chrome or Brave:** download `DevForum-Plus-<version>.zip` from [Releases](https://github.com/0xmortuex/DevForum-Plus/releases/latest), unzip, `chrome://extensions` › Developer mode › **Load unpacked**.

## Development

Plain Manifest V3, no build step. Tests: `node --test tests/logic.test.js`

MIT — by **0xmortuex**
