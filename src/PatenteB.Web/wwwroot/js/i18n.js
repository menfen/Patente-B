// Language support: English ('en') or Egyptian Arabic ('ar', right-to-left).
// The choice is stored with the other settings (see app.js); this file only reads it at start-up.
// Arabic text lives in lessons-ar.js, scenarios-ar.js, data/topics-ar.js and data/questions-ar.js.
(function () {
  'use strict';
  let lang = 'en';
  try {
    const s = JSON.parse(localStorage.getItem('patenteb.v1') || '{}').settings || {};
    lang = s.lang || ((navigator.language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en');
  } catch { /* storage unavailable */ }

  const I18N = {
    get lang() { return lang; },
    get ar() { return lang === 'ar'; },
    set(l) { lang = l === 'ar' ? 'ar' : 'en'; apply(); },
    // Pick the English or Arabic version of a UI string.
    tx: (en, ar) => (lang === 'ar' ? ar : en),
    // Translate a string used inside an animated scenario (falls back to English).
    tl: s => (lang === 'ar' && window.SCENES_AR && window.SCENES_AR[s]) || s,
  };
  function apply() {
    const h = document.documentElement;
    h.lang = lang === 'ar' ? 'ar-EG' : 'en';
    h.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }
  apply();
  window.I18N = I18N;
})();
