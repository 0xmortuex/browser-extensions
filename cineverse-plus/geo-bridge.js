/**
 * Runs in the page's own world. Some browsers (Vex among them) answer
 * navigator.geolocation only there, not in an extension's isolated world, so
 * content.js asks through this bridge. The site could read its own location
 * with the same permission anyway; this adds no access it did not have.
 */
(function () {
  'use strict';
  if (window.__cvpGeoBridge) return;
  window.__cvpGeoBridge = true;
  document.addEventListener('cvp-geo-request', () => {
    const answer = (detail) => document.dispatchEvent(new CustomEvent('cvp-geo-result', { detail: JSON.stringify(detail) }));
    if (!navigator.geolocation) { answer({ error: 'This browser has no location service.' }); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => answer({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => answer({ error: e.code === 1 ? 'No location: it is blocked for this site, or your browser has none set. Allow it (in Vex, also check Settings › Location), then try again.' : 'Could not get your location: ' + e.message }),
      { timeout: 20000, maximumAge: 5 * 60 * 1000 },
    );
  });
})();
