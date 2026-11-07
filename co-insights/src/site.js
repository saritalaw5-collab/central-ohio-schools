/* Central Ohio School District Insights — page behavior */
(function () {
  var body = document.body;
  var DEMO = body.getAttribute('data-demo') === '1';
  var track = window.siteTrack || function () {};
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  var params = new URLSearchParams(location.search);

  /* ---------- county map + list (home) ---------- */
  var select = document.getElementById('county-select');
  if (select) {
    var paths = document.querySelectorAll('.cty');
    var labels = document.querySelectorAll('[data-label]');
    var panels = document.querySelectorAll('[data-county-panel]');
    var empty = document.querySelector('[data-county-empty]');
    var nameFor = function (slug) {
      var opt = select.querySelector('option[value="' + slug + '"]');
      return opt ? opt.textContent.replace(/ County$/, '') : slug;
    };
    var selectCounty = function (slug, opts) {
      if (!slug || !select.querySelector('option[value="' + slug + '"]')) return;
      paths.forEach(function (p) {
        var on = p.getAttribute('data-county') === slug;
        p.classList.toggle('is-selected', on);
        p.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      labels.forEach(function (t) { t.classList.toggle('is-selected', t.getAttribute('data-label') === slug); });
      panels.forEach(function (el) { el.hidden = el.getAttribute('data-county-panel') !== slug; });
      if (empty) empty.hidden = true;
      select.value = slug;
      store.set('county', slug);
      store.set('countyName', nameFor(slug));
      if (!opts || opts.track !== false) track('county_selected', { county: nameFor(slug) });
    };
    select.addEventListener('change', function () { selectCounty(select.value); });
    paths.forEach(function (p) {
      p.addEventListener('click', function () { selectCounty(p.getAttribute('data-county')); });
      p.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCounty(p.getAttribute('data-county')); }
      });
    });
    var initial = params.get('county') || store.get('county');
    if (initial) selectCounty(initial, { track: false });

    document.querySelectorAll('.district-link').forEach(function (a) {
      a.addEventListener('click', function () {
        track('district_selected', { county: a.getAttribute('data-county'), district: a.getAttribute('data-district') });
      });
    });
  }

  /* ---------- district page: return to the county the visitor came from ---------- */
  var back = document.querySelector('[data-back-link]');
  if (back) {
    var lastSlug = store.get('county');
    var lastName = store.get('countyName');
    var chips = Array.prototype.map.call(document.querySelectorAll('.chip'), function (c) { return c.textContent.replace(/ County$/, ''); });
    if (lastSlug && lastName && chips.indexOf(lastName) !== -1) {
      back.href = back.href.replace(/county=[^&#]*/, 'county=' + lastSlug);
      back.textContent = '← Back to ' + lastName + ' County districts';
    }
  }

  /* ---------- floating portrait steps aside when the footer is on screen ---------- */
  var floatEl = document.querySelector('.float-portrait');
  var footerEl = document.querySelector('.footer');
  if (floatEl && footerEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      floatEl.classList.toggle('is-tucked', entries[0].isIntersecting);
    }).observe(footerEl);
  }

  /* ---------- official resource clicks ---------- */
  document.querySelectorAll('[data-track-resource]').forEach(function (a) {
    a.addEventListener('click', function () {
      track('official_resource_clicked', { resource: a.getAttribute('data-track-resource'), county: a.getAttribute('data-county') || store.get('countyName') || 'none' });
    });
  });

  /* ---------- guide download ---------- */
  document.querySelectorAll('[data-track-download]').forEach(function (a) {
    a.addEventListener('click', function () { track('guide_downloaded', {}); });
  });

  /* ---------- remember where a guide request began ---------- */
  document.querySelectorAll('[data-guide-source]').forEach(function (a) {
    a.addEventListener('click', function () { store.set('guideSource', a.getAttribute('data-guide-source')); });
  });

  /* ---------- forms ---------- */
  var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()); };
  var encode = function (form) { return new URLSearchParams(new FormData(form)).toString(); };

  var guide = document.querySelector('[data-ajax-form="guide"]');
  if (guide) {
    var d = params.get('district');
    if (d) {
      var opt = guide.querySelector('option[data-slug="' + d + '"]');
      if (opt) guide.elements['district'].value = opt.value;
    }
    var source = store.get('guideSource') || 'direct';
    guide.elements['source'].value = source;
    var started = false;
    guide.addEventListener('focusin', function () {
      if (started) return;
      started = true;
      track('guide_request_started', { source: source });
    });
  }

  var review = document.querySelector('[data-ajax-form="review"]');
  if (review) {
    var rd = params.get('district');
    if (rd) review.elements['district'].value = rd;
  }

  document.querySelectorAll('[data-ajax-form]').forEach(function (form) {
    var errorBox = form.querySelector('.form__error');
    var kind = form.getAttribute('data-ajax-form');
    var fail = function (msg) {
      errorBox.textContent = msg;
      errorBox.hidden = false;
      errorBox.scrollIntoView({ block: 'nearest' });
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorBox.hidden = true;
      var next = form.getAttribute('action');
      if (kind === 'guide') {
        if (!form.elements['first_name'].value.trim()) return fail('Please enter your first name.');
        if (!form.elements['last_name'].value.trim()) return fail('Please enter your last name.');
        if (!emailOk(form.elements['email'].value)) return fail('Please enter a valid email address.');
        var sit = form.querySelector('input[name="situation"]:checked');
        if (!sit) return fail('Please choose the option that best describes you.');
        next += '?s=' + encodeURIComponent(sit.value);
      } else {
        if (!form.elements['name'].value.trim()) return fail('Please enter your name.');
        if (!emailOk(form.elements['email'].value)) return fail('Please enter a valid email address.');
        if (!form.elements['address'].value.trim()) return fail('Please enter the property address.');
        if (!form.elements['timeline'].value) return fail('Please choose a selling timeline.');
      }
      var done = function () {
        if (kind === 'guide') {
          var s = form.querySelector('input[name="situation"]:checked');
          track('guide_request_submitted', { district: form.elements['district'].value || 'not_selected', situation: s ? s.value : '', marketing_consent: form.elements['marketing_consent'].checked ? 'yes' : 'no' });
        } else {
          track('home_valuation_requested', { timeline: form.elements['timeline'].value });
        }
        location.href = next;
      };
      if (DEMO) return done();
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: encode(form) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
        .catch(function () { btn.disabled = false; fail('Something went wrong sending your request. Please try again, or call 740-262-7288.'); });
    });
  });

  /* ---------- guide thank-you: homeowners see the property review offer ---------- */
  var offer = document.querySelector('[data-valuation-offer]');
  if (offer) {
    var s = params.get('s');
    if (['buying', 'selling', 'staying', 'researching'].indexOf(s) === -1) s = 'researching';
    var block = document.querySelector('[data-situation-block="' + s + '"]');
    if (block) block.hidden = false;
    if (s === 'selling' || s === 'staying') {
      offer.hidden = false;
      var link = offer.querySelector('[data-situation-link]');
      if (link) link.href += (link.href.indexOf('?') === -1 ? '?' : '&') + 'situation=' + s;
    }
    var buyer = document.querySelector('[data-buyer-contact]');
    if (buyer && s === 'buying') buyer.hidden = false;
  }

  /* ---------- preselect situation when arriving from a "Buying / Selling / Staying" link ---------- */
  var preset = params.get('situation');
  if (guide && preset) {
    var radio = guide.querySelector('input[name="situation"][value="' + preset + '"]');
    if (radio) radio.checked = true;
  }
  if (review && preset) {
    var hint = review.querySelector('input[name="situation"]');
    if (hint) hint.value = preset;
  }
})();
