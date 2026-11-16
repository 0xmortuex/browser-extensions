/**
 * DevForum+ — the pure parts: turning Roblox's API dump into a small name
 * list, finding API names in a piece of code, and searching them.
 */
(function (root) {
  'use strict';

  const DOCS = 'https://create.roblox.com/docs/reference/engine/';

  // Not in the API dump (it lists classes and enums only).
  const DATATYPES = ['Axes', 'BrickColor', 'CatalogSearchParams', 'CFrame', 'Color3', 'ColorSequence', 'ColorSequenceKeypoint', 'Content', 'DateTime', 'DockWidgetPluginGuiInfo', 'Enum', 'EnumItem', 'Enums', 'Faces', 'FloatCurveKey', 'Font', 'Instance', 'NumberRange', 'NumberSequence', 'NumberSequenceKeypoint', 'OverlapParams', 'Path2DControlPoint', 'PathWaypoint', 'PhysicalProperties', 'Random', 'Ray', 'RaycastParams', 'RaycastResult', 'RBXScriptConnection', 'RBXScriptSignal', 'Rect', 'Region3', 'Region3int16', 'RotationCurveKey', 'Secret', 'SharedTable', 'TweenInfo', 'UDim', 'UDim2', 'ValueCurveKey', 'Vector2', 'Vector2int16', 'Vector3', 'Vector3int16'];
  const LIBRARIES = ['bit32', 'buffer', 'coroutine', 'debug', 'math', 'os', 'string', 'table', 'task', 'utf8', 'vector'];

  const Dev = {
    DATATYPES, LIBRARIES,

    // { v, classes: { Name: [member names] }, enums: [names] } from the dump.
    reduceDump(dump) {
      const classes = {};
      for (const c of (dump && dump.Classes) || []) {
        if (!c || !c.Name) continue;
        classes[c.Name] = [...new Set((c.Members || []).map(m => m && m.Name).filter(Boolean))];
      }
      const enums = ((dump && dump.Enums) || []).map(e => e && e.Name).filter(Boolean);
      return { v: String((dump && dump.Version) || ''), classes, enums };
    },

    urlFor(kind, name, member) {
      const base = DOCS + (kind === 'class' ? 'classes/' : kind === 'enum' ? 'enums/' : kind === 'datatype' ? 'datatypes/' : 'libraries/') + encodeURIComponent(name);
      return member ? base + '#' + encodeURIComponent(member) : base;
    },

    // What a name is, or null.
    kindOf(api, name) {
      if (api && api.classes && Object.prototype.hasOwnProperty.call(api.classes, name)) return 'class';
      if (DATATYPES.includes(name)) return 'datatype';
      if (LIBRARIES.includes(name)) return 'library';
      return null;
    },

    // Every API name in a line of code: [{ start, end, url, title }], in order,
    // never overlapping. Recognised:
    //   Enum.Material / Enum.Material.Plastic   -> the enum
    //   HttpService:GetAsync / Vector3.new      -> the member of that class
    //   HttpService, Vector3, task              -> the class / type / library
    //   GetService("Players")                   -> the service named
    find(text, api) {
      const out = [];
      const s = String(text || '');
      const taken = (a, b) => out.some(o => a < o.end && b > o.start);
      const add = (start, end, url, title) => { if (!taken(start, end)) out.push({ start, end, url, title }); };
      const enums = new Set((api && api.enums) || []);
      let m;
      const reEnum = /\bEnum\.([A-Za-z_][A-Za-z0-9_]*)/g;
      while ((m = reEnum.exec(s))) if (enums.has(m[1])) add(m.index, m.index + m[0].length, this.urlFor('enum', m[1]), 'Enum.' + m[1]);
      const reService = /GetService\(\s*(["'])([A-Za-z]+)\1\s*\)/g;
      while ((m = reService.exec(s))) {
        if (this.kindOf(api, m[2]) === 'class') {
          const at = m.index + m[0].indexOf(m[2]);
          add(at, at + m[2].length, this.urlFor('class', m[2]), m[2]);
        }
      }
      const reName = /\b([A-Za-z_][A-Za-z0-9_]*)(?:([.:])([A-Za-z_][A-Za-z0-9_]*))?/g;
      while ((m = reName.exec(s))) {
        const name = m[1];
        if (name === 'Enum') continue;
        const kind = this.kindOf(api, name);
        if (!kind) { if (m[2]) reName.lastIndex = m.index + name.length; continue; }
        const member = m[3];
        const members = kind === 'class' ? api.classes[name] : null;
        if (member && (kind !== 'class' || (members && members.includes(member)))) {
          add(m.index, m.index + m[0].length, this.urlFor(kind, name, kind === 'library' ? member : member), name + m[2] + member);
        } else {
          add(m.index, m.index + name.length, this.urlFor(kind, name), name);
          if (m[2]) reName.lastIndex = m.index + name.length;
        }
      }
      return out.sort((a, b) => a.start - b.start);
    },

    // Docs search: exact, then starts-with, then contains; classes first.
    search(api, query, max = 8) {
      const q = String(query || '').trim().toLowerCase();
      if (!q) return [];
      const pool = [];
      for (const n of Object.keys((api && api.classes) || {})) pool.push({ name: n, kind: 'class' });
      for (const n of (api && api.enums) || []) pool.push({ name: n, kind: 'enum' });
      for (const n of DATATYPES) pool.push({ name: n, kind: 'datatype' });
      for (const n of LIBRARIES) pool.push({ name: n, kind: 'library' });
      const rank = (x) => { const n = x.name.toLowerCase(); return n === q ? 0 : n.startsWith(q) ? 1 : n.includes(q) ? 2 : 9; };
      const order = { class: 0, datatype: 1, library: 2, enum: 3 };
      return pool.map(x => ({ ...x, r: rank(x) })).filter(x => x.r < 9)
        .sort((a, b) => a.r - b.r || order[a.kind] - order[b.kind] || a.name.length - b.name.length || a.name.localeCompare(b.name))
        .slice(0, max).map(x => ({ name: x.name, kind: x.kind, url: this.urlFor(x.kind, x.name) }));
    },
  };

  root.DevForumPlus = Dev;
  if (typeof module !== 'undefined' && module.exports) module.exports = Dev;
})(typeof window !== 'undefined' ? window : globalThis);
