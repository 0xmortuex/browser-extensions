/**
 * DevForum+ — background: the Roblox API name list, from the community API
 * dump on GitHub (MaximumADHD/Roblox-Client-Tracker), shrunk to names and
 * kept for a week.
 */
importScripts('devforum-logic.js');

const DUMP = 'https://raw.githubusercontent.com/MaximumADHD/Roblox-Client-Tracker/roblox/Mini-API-Dump.json';
const WEEK = 7 * 86400000;
let memo = null;

async function api() {
  if (memo && Date.now() - memo.at < WEEK) return memo;
  const { dfp_api } = await chrome.storage.local.get('dfp_api');
  if (dfp_api && Date.now() - dfp_api.at < WEEK) { memo = dfp_api; return memo; }
  try {
    const res = await fetch(DUMP);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const reduced = self.DevForumPlus.reduceDump(await res.json());
    memo = { at: Date.now(), api: reduced };
    await chrome.storage.local.set({ dfp_api: memo });
    return memo;
  } catch (e) {
    // An old list is better than none while GitHub is unreachable.
    if (dfp_api) { memo = dfp_api; return memo; }
    throw e;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'DFP_API') {
    api().then(m => sendResponse({ ok: true, api: m.api, at: m.at }), e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  return false;
});
