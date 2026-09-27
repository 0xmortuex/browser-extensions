/**
 * DevForum+ — on devforum.roblox.com:
 *   - Roblox API names in code blocks link to their docs page;
 *   - Alt+D (or the "Docs" button in the header) searches every class, enum,
 *     data type and library;
 *   - a Copy button on code blocks that have none.
 */
(function () {
  'use strict';
  const D = window.DevForumPlus;
  let API = null;

  function load() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'DFP_API' }, (r) => {
        if (chrome.runtime.lastError || !r || !r.ok) { resolve(null); return; }
        API = r.api;
        resolve(API);
      });
    });
  }

  // ---- links in code -------------------------------------------------------
  function linkText(node, ranges) {
    const text = node.nodeValue;
    const frag = document.createDocumentFragment();
    let at = 0;
    for (const r of ranges) {
      if (r.start > at) frag.appendChild(document.createTextNode(text.slice(at, r.start)));
      const a = document.createElement('a');
      a.className = 'dfp-api';
      a.href = r.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.title = 'Roblox docs: ' + r.title;
      a.textContent = text.slice(r.start, r.end);
      frag.appendChild(a);
      at = r.end;
    }
    if (at < text.length) frag.appendChild(document.createTextNode(text.slice(at)));
    node.parentNode.replaceChild(frag, node);
  }

  function linkCode(code) {
    if (!API || code.querySelector('.dfp-api') || code.dataset.dfpDone === code.textContent.length + '') return;
    code.dataset.dfpDone = code.textContent.length + '';
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || parent.closest('.hljs-comment, a')) continue;
      if (parent.closest('.hljs-string')) {
        // A string that is exactly a class name: GetService("Players"),
        // Instance.new("Part"). Any other string is left alone.
        const m = node.nodeValue.match(/^(["'`]?)([A-Za-z]+)(["'`]?)$/);
        if (m && D.kindOf(API, m[2]) === 'class') linkText(node, [{ start: m[1].length, end: m[1].length + m[2].length, url: D.urlFor('class', m[2]), title: m[2] }]);
        continue;
      }
      const ranges = D.find(node.nodeValue, API);
      if (ranges.length) linkText(node, ranges);
    }
  }

  // ---- copy button (only where the forum has none) --------------------------
  function addCopy(pre) {
    if (pre.dataset.dfpCopy || pre.querySelector('.copy-cmd, .codeblock-button-wrapper, button')) return;
    const wrap = pre.parentElement && pre.parentElement.querySelector(':scope > .codeblock-button-wrapper');
    if (wrap) return;
    pre.dataset.dfpCopy = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dfp-copy';
    btn.textContent = 'Copy';
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code') || pre;
      try { await navigator.clipboard.writeText(code.innerText); btn.textContent = 'Copied'; }
      catch { btn.textContent = 'Could not copy'; }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
    pre.classList.add('dfp-has-copy');
    pre.appendChild(btn);
  }

  function scan() {
    document.querySelectorAll('.cooked pre').forEach((pre) => {
      addCopy(pre);
      const code = pre.querySelector('code');
      if (!code) return;
      // After the forum's own highlighter, which rewrites the block: wait
      // until it has run (or clearly will not).
      const lang = (code.className.match(/lang-(\w+)/) || [])[1];
      const highlighted = code.classList.contains('hljs') || code.querySelector('[class^="hljs"]');
      const waited = code.dataset.dfpSeen && Date.now() - Number(code.dataset.dfpSeen) > 1500;
      if (!code.dataset.dfpSeen) code.dataset.dfpSeen = String(Date.now());
      if (highlighted || waited || lang === 'plaintext' || lang === 'text') linkCode(code);
    });
  }

  // ---- docs search (Alt+D) -------------------------------------------------
  let box = null;
  function openSearch() {
    if (!API) return;
    if (box) { box.querySelector('input').focus(); return; }
    box = document.createElement('div');
    box.className = 'dfp-search';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Search Roblox docs');
    box.innerHTML = '<input type="search" placeholder="Search Roblox docs: a class, enum, type or library" aria-label="Search Roblox docs"><ol role="listbox"></ol><div class="dfp-hint">Enter opens the page · ↑↓ to choose · Esc to close</div>';
    document.body.appendChild(box);
    const input = box.querySelector('input'), list = box.querySelector('ol');
    let results = [], at = 0;
    const paint = () => {
      list.textContent = '';
      results.forEach((r, i) => {
        const li = document.createElement('li');
        li.className = i === at ? 'on' : '';
        li.setAttribute('role', 'option');
        const name = document.createElement('span'); name.textContent = r.name;
        const kind = document.createElement('small'); kind.textContent = r.kind;
        li.append(name, kind);
        li.addEventListener('mousedown', (e) => { e.preventDefault(); window.open(r.url, '_blank', 'noopener'); close(); });
        list.appendChild(li);
      });
    };
    const close = () => { if (box) { box.remove(); box = null; } };
    input.addEventListener('input', () => { results = D.search(API, input.value); at = 0; paint(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown') { at = Math.min(at + 1, results.length - 1); paint(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { at = Math.max(at - 1, 0); paint(); e.preventDefault(); }
      else if (e.key === 'Enter' && results[at]) { window.open(results[at].url, '_blank', 'noopener'); close(); }
    });
    input.addEventListener('blur', () => setTimeout(close, 150));
    input.focus();
  }
  document.addEventListener('keydown', (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); openSearch(); }
  }, true);

  function addHeaderButton() {
    const icons = document.querySelector('.d-header-icons');
    if (!icons || icons.querySelector('.dfp-docs-btn')) return;
    const li = document.createElement('li');
    li.className = 'header-dropdown-toggle dfp-docs-btn';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon btn-flat';
    b.title = 'Search Roblox docs (Alt+D)';
    b.textContent = 'Docs';
    b.addEventListener('click', openSearch);
    li.appendChild(b);
    icons.prepend(li);
  }

  load().then(() => {
    scan();
    addHeaderButton();
    new MutationObserver(() => { scan(); addHeaderButton(); }).observe(document.body, { childList: true, subtree: true });
    setInterval(scan, 2000);   // picks up blocks whose highlighting never announced itself
  });
})();
