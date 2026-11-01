// Speech and full-screen helpers shared by app.js and scenes.js.
// In the Android/Windows app (served from https://0.0.0.1) text is spoken by the device's own text-to-speech
// engine through MainPage.xaml.cs, because the Android WebView has no speechSynthesis. In a browser we use speechSynthesis.
(function () {
  const inApp = location.hostname === '0.0.0.1';
  const LOCALES = { it: 'it-IT', en: 'en-GB', ar: 'ar-EG' };
  let onEnd = null, ready = !inApp, run = 0;
  const pending = [];

  if (inApp) {
    const s = document.createElement('script');
    s.src = '_framework/hybridwebview.js';
    s.onload = () => { ready = true; pending.splice(0).forEach(post); };
    document.head.appendChild(s);
  }
  function post(msg) {
    if (!ready) { pending.push(msg); return; }
    try { window.HybridWebView.SendRawMessage(msg); } catch { /* bridge not available */ }
  }

  function finish() { const f = onEnd; onEnd = null; Native.speaking = false; if (f) f(); }

  function pickVoice(lang) {
    const vs = speechSynthesis.getVoices();
    const want = LOCALES[lang].toLowerCase();
    return vs.find(v => v.lang.toLowerCase().replace('_', '-') === want) || vs.find(v => v.lang.toLowerCase().startsWith(lang));
  }

  const Native = {
    inApp,
    canSpeak: inApp || !!window.speechSynthesis,
    speaking: false,
    // Speaks text in 'it', 'en' or 'ar'; calls end() when finished or stopped.
    speak(text, lang, end) {
      this.stop();
      text = String(text || '').replace(/\s+/g, ' ').trim();
      if (!text || !this.canSpeak) { if (end) end(); return; }
      onEnd = end || null;
      this.speaking = true;
      if (inApp) { post(`speak|${lang}|${text}`); return; }
      // Chrome stops long utterances after ~15 s, so speak sentence by sentence.
      const parts = text.match(/[^.!?؟;:]+[.!?؟;:]*/g) || [text];
      const voice = pickVoice(lang), id = ++run;
      const end1 = () => { if (id === run) finish(); };
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p.trim());
        u.lang = LOCALES[lang] || lang;
        if (voice) u.voice = voice;
        u.rate = lang === 'it' ? 0.95 : 1;
        if (i === parts.length - 1) { u.onend = end1; u.onerror = end1; }
        speechSynthesis.speak(u);
      });
    },
    stop() {
      const was = this.speaking;
      if (inApp) { if (was) post('stop'); } else if (window.speechSynthesis) speechSynthesis.cancel();
      run++;
      if (was) finish();
    },
    done() { finish(); },           // called by the app when the device finished speaking
    setLandscape(on) { if (inApp) post(`landscape|${on ? 1 : 0}`); },
  };
  if (window.speechSynthesis) speechSynthesis.getVoices();
  window.Native = Native;

  // The app's WebView can't open new windows: web links go to the phone's browser, and the app's own pages
  // (privacy policy, licences) open in a layer on top that Back or ✕ closes.
  if (inApp) {
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.getAttribute('href').startsWith('#')) return;
      e.preventDefault();
      e.stopPropagation();
      if (/^(https?|mailto):/i.test(a.getAttribute('href'))) { post(`open|${a.href}`); return; }
      closePage();
      const view = document.createElement('div');
      view.className = 'page-view';
      view.innerHTML = '<button class="btn" aria-label="Close">✕</button><iframe></iframe>';
      view.querySelector('iframe').src = a.href;
      view.querySelector('button').onclick = closePage;
      document.body.appendChild(view);
    }, true);
  }
  function closePage() {
    const v = document.querySelector('.page-view');
    if (v) v.remove();
    return !!v;
  }
  Native.closePage = closePage;
})();
