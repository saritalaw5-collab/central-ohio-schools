/* Analytics events. Sends to Microsoft Clarity (if installed) and window.dataLayer.
   Never pass names, emails, addresses or free text here: only categories like county, district, situation. */
(function () {
  var ALLOWED = ['county', 'district', 'resource', 'source', 'situation', 'timeline', 'marketing_consent'];
  window.dataLayer = window.dataLayer || [];
  window.siteTrack = function (name, props) {
    var clean = {};
    Object.keys(props || {}).forEach(function (k) {
      if (ALLOWED.indexOf(k) !== -1) clean[k] = String(props[k]).slice(0, 80);
    });
    try {
      if (typeof window.clarity === 'function') {
        window.clarity('event', name);
        Object.keys(clean).forEach(function (k) { window.clarity('set', k, clean[k]); });
      }
    } catch (e) {}
    window.dataLayer.push(Object.assign({ event: name }, clean));
    if (document.body && document.body.getAttribute('data-demo') === '1') {
      try { console.info('[track]', name, clean); } catch (e) {}
    }
  };
})();
