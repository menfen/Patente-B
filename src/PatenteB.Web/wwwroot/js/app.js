// Patente B – single-page app shared by the web, Android and Windows builds.
// Routes (hash): #/  ·  #/ch/<chapter>/<learn|watch|practice>  ·  #/quiz  ·  #/exam  ·  #/search
// Every UI string comes in English and Egyptian Arabic: tx('English', 'عربي') picks the current language.
(function () {
  'use strict';

  const DATA = window.QDATA;
  const LESSONS = window.LESSONS;
  const SCENARIOS = window.SCENARIOS;
  const I = window.I18N;
  const { tx, tl } = I;
  const app = document.getElementById('app');

  // ---------- index ----------
  const lessonById = Object.fromEntries(LESSONS.map((l, i) => [l.id, Object.assign(l, { n: i + 1 })]));
  const chapters = DATA.chapters.filter(c => lessonById[c.id]);
  const Q = new Map();          // id -> { q, ch, sub }
  for (const ch of chapters) {
    ch.lesson = lessonById[ch.id];
    ch.ids = [];
    for (const sub of ch.subs) {
      sub.ids = sub.qs.map(q => { Q.set(q.i, { q, ch, sub }); ch.ids.push(q.i); return q.i; });
      sub.img = (sub.qs.find(q => q.m) || {}).m;
    }
  }
  const TOTAL = Q.size;

  // ---------- storage ----------
  const KEY = 'patenteb.v1';
  const store = (() => {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { s = {}; }
    s.q ||= {}; s.exams ||= []; s.seen ||= {}; s.settings ||= { en: true, size: 'normal' };
    return s;
  })();
  // Lets scenes.js read and change the voice/sound setting.
  window.AppSettings = { get: k => store.settings[k], set: (k, v) => { store.settings[k] = v; save(); } };
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage unavailable */ } }
  function record(id, correct) {
    const r = store.q[id] || [0, 0, 0];
    if (correct) r[0]++; else r[1]++;
    r[2] = correct ? 1 : 0;
    store.q[id] = r;
    save();
  }
  const mastered = ids => ids.filter(id => store.q[id] && store.q[id][2] === 1).length;
  const answered = ids => ids.filter(id => store.q[id]).length;
  const mistakes = () => [...Q.keys()].filter(id => store.q[id] && store.q[id][2] === 0);
  document.documentElement.dataset.size = store.settings.size || 'normal';

  // ---------- language ----------
  // The Arabic question bank is large, so it is only loaded once Arabic is chosen.
  function loadArabic() {
    return new Promise(done => {
      if (window.QDATA_AR) return done();
      const s = document.createElement('script');
      s.src = 'data/questions-ar.js';
      s.onload = s.onerror = () => done();
      document.head.appendChild(s);
    });
  }
  async function setLang(l) {
    store.settings.lang = l; save();
    I.set(l);
    if (I.ar) await loadArabic();
  }
  const lessonAr = L => (I.ar && window.LESSONS_AR && window.LESSONS_AR[L.id]) || {};
  const title = L => lessonAr(L).title || L.en;
  const subName = (ch, s) => (I.ar && window.TOPICS_AR && window.TOPICS_AR[`${ch.id}/${s.id}`]) || s.en;
  // Translation, trap note, picture note, trap-word notes and legal explanation of a question in the current language.
  function qtr(q) {
    const a = I.ar && window.QDATA_AR && window.QDATA_AR[q.i];
    if (!a) return { e: q.e, x: q.x, s: q.s, k: q.k || [], w: q.w };
    return { e: a[0] || q.e, x: a[1] || q.x, s: a[2] || q.s, k: (q.k || []).map(([p, w], j) => [p, (a[3] && a[3][j]) || w]), w: a[4] || q.w };
  }

  // ---------- helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const go = h => { if (location.hash === h) route(); else location.hash = h; };
  const back = () => tx('←', '→');
  const fwd = () => tx('→', '←');
  let activePlayers = [];
  let timerId = 0;
  function cleanup() {
    activePlayers.forEach(p => p.destroy());
    activePlayers = [];
    clearInterval(timerId);
    Native.stop();
  }
  function topbar(text, backTo) {
    return `<header class="topbar">
      ${backTo ? `<button class="icon-btn" data-go="${backTo}" aria-label="${tx('Back', 'رجوع')}">${back()}</button>` : '<img class="logo" src="img/icon.svg" alt="" width="34" height="34">'}
      <h1>${esc(text)}</h1>
      <button class="icon-btn lang-btn" data-act="lang" aria-label="${tx('العربي المصري', 'English')}">${tx('ع', 'EN')}</button>
      <button class="icon-btn" data-act="search" aria-label="${tx('Search questions', 'دوّر في الأسئلة')}">🔍</button>
      <button class="icon-btn" data-act="settings" aria-label="${tx('Settings', 'الإعدادات')}">⚙️</button>
    </header>`;
  }
  function toast(msg) {
    document.querySelectorAll('.tip').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = 'tip'; t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }
  // Pick n questions, preferring ones answered wrong, then unseen, then known.
  function smartPick(ids, n) {
    const score = id => { const r = store.q[id]; return !r ? 1 : r[2] === 0 ? 0 : 2 + Math.min(r[0], 3); };
    return shuffle(ids.slice()).sort((a, b) => score(a) - score(b)).slice(0, n);
  }
  function highlight(text, kws) {
    if (!kws || !kws.length) return esc(text);
    const low = text.toLowerCase();
    const ranges = [];
    for (const [phrase, why] of kws) {
      const p = phrase.toLowerCase();
      const at = low.indexOf(p);
      if (at >= 0 && !ranges.some(r => at < r[1] && at + p.length > r[0])) ranges.push([at, at + p.length, why]);
    }
    ranges.sort((a, b) => a[0] - b[0]);
    let out = '', pos = 0;
    for (const [s, e, why] of ranges) {
      out += esc(text.slice(pos, s)) + `<mark data-why="${esc(why)}" tabindex="0">${esc(text.slice(s, e))}</mark>`;
      pos = e;
    }
    return out + esc(text.slice(pos));
  }
  // Reads one part of the current question aloud: 'q' the Italian text, 'tr' the translation, 'why' the legal explanation.
  // Pressing the same 🔊 button again stops it.
  let saying = '';
  function say(what) {
    const h = location.hash;
    const id = h === '#/exam' ? exam.ids[exam.i] : quiz && quiz.ids[quiz.i];
    if (id === undefined) return;
    const key = `${id}/${what}`;
    if (saying === key && Native.speaking) { Native.stop(); return; }
    const { q } = Q.get(id), T = qtr(q);
    const lang = what === 'q' ? 'it' : I.ar && (what === 'why' ? T.w !== q.w : T.e !== q.e) ? 'ar' : 'en';
    const text = what === 'q' ? q.t : what === 'tr' ? T.e : T.w;
    saying = key;
    markSaying(key);
    Native.speak(text, lang, () => { if (saying === key) { saying = ''; markSaying(''); } });
  }
  function markSaying(key) {
    document.querySelectorAll('[data-act="say"]').forEach(b => b.classList.toggle('speaking', !!key && key.endsWith('/' + b.dataset.what)));
  }
  const sayBtn = (what, label) => (Native.canSpeak ? `<button class="chip say" data-act="say" data-what="${what}" aria-label="${tx('Listen', 'اسمع')}">🔊${label ? ' ' + label : ''}</button>` : '');
  const imgTag = (m, cls = '') => (m ? `<img class="${cls}" src="img/signs/${esc(m)}.png" alt="${tx('Picture for the question', 'صورة السؤال')}" loading="lazy">` : '');

  // ---------- home ----------
  function home() {
    const m = mastered([...Q.keys()]);
    const a = answered([...Q.keys()]);
    const lastEx = store.exams[store.exams.length - 1];
    const wrong = mistakes().length;
    const cont = store.last && lessonById[store.last] ? lessonById[store.last] : null;
    app.innerHTML = topbar('Patente B') + `
    <main class="wrap">
      <section class="card hero">
        <h2>${tx('Pass the Italian theory exam – in English', 'انجح في امتحان النظري الإيطالي – بالمصري')}</h2>
        <p>${tx('Every lesson explains the rules in English, shows an animated scenario, then gives you all the official questions on that topic.',
          'كل درس بيشرحلك القواعد بالمصري، وبيوريك سيناريو متحرك، وبعدين بيديك كل الأسئلة الرسمية اللي على الموضوع ده.')}</p>
        <div class="steps3">
          <div><b>${tx('1 · Learn', '1 · اتعلّم')}</b>${tx('Short lesson in English', 'درس قصير بالمصري')}</div>
          <div><b>${tx('2 · Watch', '2 · اتفرّج')}</b>${tx('Animated scenario', 'سيناريو متحرك')}</div>
          <div><b>${tx('3 · Practise', '3 · اتمرّن')}</b>${tx('Official questions', 'الأسئلة الرسمية')}</div>
        </div>
        <div class="row" style="margin-top:14px">
          ${cont ? `<button class="btn" data-go="#/ch/${cont.id}/learn">▶ ${tx('Continue', 'كمّل')}: ${esc(title(cont))}</button>`
            : `<button class="btn" data-go="#/ch/${chapters[0].id}/learn">▶ ${tx('Start with lesson 1', 'ابدأ بالدرس الأول')}</button>`}
          <button class="btn secondary" data-act="exam">📝 ${tx('Mock exam', 'امتحان تجريبي')}</button>
        </div>
      </section>
      <div class="stats">
        <div class="stat"><b>${pct(m, TOTAL)}%</b><span>${tx(`${m} of ${TOTAL} questions mastered`, `${m} من ${TOTAL} سؤال بقيت متمكن منهم`)}</span></div>
        <div class="stat"><b>${a}</b><span>${tx('questions answered', 'سؤال جاوبت عليه')}</span></div>
        <div class="stat"><b>${lastEx ? (lastEx.errors <= 3 ? '✅ ' : '❌ ') + lastEx.errors : '–'}</b><span>${lastEx ? tx('errors in last mock exam', 'غلطات في آخر امتحان تجريبي') : tx('no mock exam yet', 'لسه ماعملتش امتحان تجريبي')}</span></div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn ghost grow" data-act="mistakes" ${wrong ? '' : 'disabled'}>🔁 ${tx('Review my mistakes', 'راجع غلطاتي')} (${wrong})</button>
        <button class="btn ghost grow" data-act="random">🎲 ${tx('20 random questions', '20 سؤال عشوائي')}</button>
      </div>
      <h3 style="margin-top:24px">${tx('The 25 chapters', 'الـ 25 فصل')}</h3>
      <p class="muted small" style="margin-top:-4px">${tx('The exam has 30 true/false questions in Italian, taken from all chapters. You have 20 minutes and may make at most 3 mistakes.',
        'الامتحان فيه 30 سؤال صح ولا غلط بالإيطالي، من كل الفصول. عندك 20 دقيقة، ومسموحلك بـ 3 غلطات بالكتير.')}</p>
      <div class="chapters">
        ${chapters.map(ch => {
          const L = ch.lesson, mm = mastered(ch.ids);
          return `<button class="chap" data-go="#/ch/${ch.id}/learn">
            <span class="ico">${L.icon}</span>
            <span class="grow">
              <span class="num">${tx(`CHAPTER ${L.n} · ${ch.ids.length} questions`, `الفصل ${L.n} · ${ch.ids.length} سؤال`)}</span>
              <div class="t">${esc(title(L))}</div>
              <div class="it" dir="ltr">${esc(L.it)}</div>
              <div class="bar"><i style="width:${pct(mm, ch.ids.length)}%"></i></div>
              <div class="small muted">${pct(mm, ch.ids.length)}% ${tx('mastered', 'متمكن منه')}</div>
            </span>
          </button>`;
        }).join('')}
      </div>
      <p class="credits">${tx('Unofficial study tool. Questions from the official ministry list via', 'أداة مذاكرة مش رسمية. الأسئلة من القايمة الرسمية بتاعة الوزارة عن طريق')} <a href="https://github.com/Ed0ardo/QuizPatenteB" target="_blank" rel="noopener">Ed0ardo/QuizPatenteB</a> (MIT)${tx('; English translations and trap-word notes via', '؛ الترجمة الإنجليزي وملاحظات الكلمات الفخ عن طريق')} <a href="https://github.com/MathKidsClub/Italian-Driving-Theory-Tester" target="_blank" rel="noopener">MathKidsClub/Italian-Driving-Theory-Tester</a> (MIT)${tx('. Translations are automatic aids – the exam is in Italian. Rules can change: check the official Codice della Strada.',
        '. الترجمة المصري معمولة من الإنجليزي. الترجمات دي مساعدة بس – الامتحان بالإيطالي. القواعد ممكن تتغير: راجع الـ Codice della Strada الرسمي.')}</p>
    </main>`;
  }

  // ---------- chapter ----------
  function chapter(id, tab) {
    const ch = chapters.find(c => c.id === id);
    if (!ch) return go('#/');
    const L = ch.lesson, A = lessonAr(L);
    store.last = id; store.seen[id] = true; save();
    const nsc = L.scenarios.length;
    const tabs = [['learn', `📖 ${tx('Learn', 'اتعلّم')}`, tx('lesson', 'الدرس')], ['watch', `🎬 ${tx('Watch', 'اتفرّج')}`, tx(`${nsc} scenario${nsc > 1 ? 's' : ''}`, `${nsc} سيناريو`)], ['practice', `✅ ${tx('Practise', 'اتمرّن')}`, tx(`${ch.ids.length} questions`, `${ch.ids.length} سؤال`)]];
    let body = '';
    if (tab === 'learn') {
      body = `
        <p style="font-size:1.05rem">${A.intro || L.intro}</p>
        ${(A.sections || L.sections).map(s => `<section class="card lesson-sec"><h3 style="margin-top:0">${esc(s.h)}</h3><ul>${s.items.map(i => `<li>${i}</li>`).join('')}</ul></section>`).join('')}
        <section class="remember"><h3>🧠 ${tx('Remember for the exam', 'افتكر دول في الامتحان')}</h3><ul>${(A.remember || L.remember).map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>
        <h3>🇮🇹 ${tx('Words you will see in the questions', 'كلمات هتشوفها في الأسئلة')}</h3>
        <div class="words">${(A.words || L.words).map(([it, en]) => `<span class="word"><b dir="ltr">${esc(it)}</b> <i>= ${esc(en)}</i></span>`).join('')}</div>
        <div class="next-row"><button class="btn" data-go="#/ch/${id}/watch">${tx('Next: watch the scenario', 'اللي بعده: اتفرّج على السيناريو')} 🎬</button></div>`;
    } else if (tab === 'watch') {
      body = L.scenarios.map((sid, i) => {
        const sc = SCENARIOS[sid];
        return sc ? `<div class="scene-title"><h3>${i + 1}. ${esc(tl(sc.title))}</h3></div>
          <div class="scene-host" data-scene="${sid}"></div>
          <details class="steps"><summary>${tx('Read all steps', 'اقرا كل الخطوات')}</summary><ol>${sc.steps.map(s => `<li>${tl(s.text)}</li>`).join('')}</ol></details>` : '';
      }).join('') + `<div class="next-row"><button class="btn" data-go="#/ch/${id}/practice">${tx('Next: practise the questions', 'اللي بعده: اتمرّن على الأسئلة')} ✅</button></div>`;
    } else {
      const mm = mastered(ch.ids);
      body = `
        <div class="card">
          <div class="row"><div class="grow">${tx(`<b>${mm} of ${ch.ids.length}</b> questions mastered in this chapter`, `<b>${mm} من ${ch.ids.length}</b> سؤال متمكن منهم في الفصل ده`)}</div><div class="muted small">${pct(mm, ch.ids.length)}%</div></div>
          <div class="bar"><i style="width:${pct(mm, ch.ids.length)}%"></i></div>
          <div class="row" style="margin-top:12px">
            <button class="btn grow" data-act="chquiz" data-ch="${id}">🎯 ${tx('Chapter quiz (20 questions)', 'اختبار الفصل (20 سؤال)')}</button>
            <button class="btn secondary grow" data-act="chall" data-ch="${id}">📚 ${tx(`All ${ch.ids.length} in order`, `الـ ${ch.ids.length} سؤال بالترتيب`)}</button>
          </div>
        </div>
        <h3>${tx('Topics in this chapter', 'المواضيع اللي في الفصل ده')}</h3>
        <p class="muted small" style="margin-top:-4px">${tx('Pick a topic to study all of its questions with English explanations.', 'اختار موضوع وذاكر كل أسئلته مع الشرح بالمصري.')}</p>
        <div class="topics">
          ${ch.subs.map((s, k) => {
            const sm = mastered(s.ids);
            return `<button class="topic" data-act="sub" data-ch="${id}" data-sub="${k}">
              ${s.img ? imgTag(s.img) : '<span class="noimg">📝</span>'}
              <span class="grow">
                <div class="t">${esc(subName(ch, s))}</div>
                <div class="it"><span dir="ltr">${esc(s.it)}</span> · ${s.ids.length} ${tx('q', 'سؤال')}</div>
                <div class="bar"><i style="width:${pct(sm, s.ids.length)}%"></i></div>
              </span>
            </button>`;
          }).join('')}
        </div>`;
    }
    app.innerHTML = topbar(`${L.n}. ${title(L)}`, '#/') + `
      <main class="wrap">
        <div class="muted small" dir="ltr"><i>${esc(L.it)}</i></div>
        <nav class="tabs">${tabs.map(([k, label, sub]) => `<button class="${k === tab ? 'on' : ''}" data-go="#/ch/${id}/${k}">${label}<small>${sub}</small></button>`).join('')}</nav>
        ${body}
      </main>`;
    if (tab === 'watch') document.querySelectorAll('.scene-host').forEach(host => activePlayers.push(window.Scenes.create(host, SCENARIOS[host.dataset.scene])));
    window.scrollTo(0, 0);
  }

  // ---------- quiz (practice) ----------
  let quiz = null;
  // name is a function so the title follows the language when it is switched mid-quiz.
  function startQuiz(name, ids, backTo) {
    if (!ids.length) return toast(tx('No questions here yet.', 'مفيش أسئلة هنا لسه.'));
    quiz = { mode: 'practice', name, get title() { return this.name(); }, ids, i: 0, answers: {}, back: backTo || '#/', showEn: !!store.settings.en };
    go('#/quiz');
  }
  function renderQuiz() {
    if (!quiz || quiz.mode !== 'practice') return go('#/');
    if (quiz.i >= quiz.ids.length) return renderSummary();
    const id = quiz.ids[quiz.i];
    const { q, ch, sub } = Q.get(id);
    const ans = quiz.answers[id];
    const done = ans !== undefined;
    const correct = done && ans === !!q.a;
    const T = qtr(q);
    const kw = T.k;
    app.innerHTML = topbar(quiz.title, quiz.back) + `
      <main class="wrap">
        <div class="quiz-head">
          <b>${quiz.i + 1}/${quiz.ids.length}</b>
          <div class="bar"><i style="width:${pct(quiz.i + (done ? 1 : 0), quiz.ids.length)}%"></i></div>
          <span class="small muted">✓ ${Object.entries(quiz.answers).filter(([k, v]) => v === !!Q.get(+k).q.a).length}</span>
        </div>
        <section class="card qcard">
          <div class="small muted" style="margin-bottom:8px">${ch.lesson.icon} ${esc(title(ch.lesson))} › ${esc(subName(ch, sub))}</div>
          ${q.m ? `<div class="qimg">${imgTag(q.m)}</div>` : ''}
          <div class="qtext" dir="ltr" lang="it">${highlight(q.t, kw)}</div>
          ${(quiz.showEn || done) ? `<div class="qen"><b>${tx('English', 'بالمصري')} ${T.e ? sayBtn('tr') : ''}</b>${T.e ? `<span dir="auto">${esc(T.e)}</span>` : `<i>${tx('No English translation for this question yet.', 'لسه مفيش ترجمة للسؤال ده.')}</i>`}</div>` : ''}
          <div class="qtools">
            <button class="chip ${quiz.showEn ? 'on' : ''}" data-act="toggleEn">${tx(`🇬🇧 English ${quiz.showEn ? 'on' : 'off'}`, `🇪🇬 الترجمة ${quiz.showEn ? 'شغالة' : 'مقفولة'}`)}</button>
            ${sayBtn('q', tx('Listen in Italian', 'اسمع بالإيطالي'))}
            ${kw.length ? `<span class="small muted" style="align-self:center">${tx('Tap the <mark style="background:var(--mark)">highlighted</mark> words', 'دوس على الكلمات <mark style="background:var(--mark)">المعلّمة</mark>')}</span>` : ''}
          </div>
          <div class="answers">
            <button class="ans v ${done ? (q.a ? 'right' : (ans === true ? 'wrong' : '')) : ''}" data-act="answer" data-v="1" ${done ? 'disabled' : ''}>VERO<small>${tx('True · press V', 'صح · دوس V')}</small></button>
            <button class="ans f ${done ? (!q.a ? 'right' : (ans === false ? 'wrong' : '')) : ''}" data-act="answer" data-v="0" ${done ? 'disabled' : ''}>FALSO<small>${tx('False · press F', 'غلط · دوس F')}</small></button>
          </div>
          ${done ? `
          <div class="feedback ${correct ? 'ok' : 'bad'}">
            <h4>${correct ? tx('✅ Correct!', '✅ برافو!') : tx('❌ Not quite.', '❌ لأ، مش كده.')} ${tx('The answer is', 'الإجابة هي')} <b>${q.a ? tx('VERO (true)', 'VERO (صح)') : tx('FALSO (false)', 'FALSO (غلط)')}</b>.</h4>
            ${T.w ? `<div class="law"><div class="law-head"><b>⚖️ ${tx('Why, according to the law', 'ليه؟ القانون بيقول إيه')}</b>${sayBtn('why', tx('Listen', 'اسمع'))}</div><p dir="auto">${esc(T.w)}</p></div>` : ''}
            ${T.x ? `<div><b>${tx("Why it's tricky:", 'فين الفخ:')}</b> <span dir="auto">${esc(T.x)}</span></div>` : ''}
            ${T.s ? `<div style="margin-top:6px"><b>${tx('The picture:', 'الصورة:')}</b> <span dir="auto">${esc(T.s)}</span></div>` : ''}
            ${kw.length ? `<ul class="kw">${kw.map(([p, w]) => `<li><b dir="ltr">${esc(p)}</b> – <span dir="auto">${esc(w)}</span></li>`).join('')}</ul>` : ''}
          </div>` : ''}
        </section>
        <div class="quiz-foot">
          <button class="btn ghost" data-act="prevQ" ${quiz.i ? '' : 'disabled'}>${back()} ${tx('Back', 'رجوع')}</button>
          <button class="btn" data-act="nextQ" ${done ? '' : 'disabled'}>${quiz.i + 1 < quiz.ids.length ? `${tx('Next', 'اللي بعده')} ${fwd()}` : tx('Finish', 'خلّصت')}</button>
        </div>
      </main>`;
  }
  function renderSummary() {
    const right = quiz.ids.filter(id => quiz.answers[id] === !!Q.get(id).q.a);
    const wrong = quiz.ids.filter(id => quiz.answers[id] !== undefined && quiz.answers[id] !== !!Q.get(id).q.a);
    const p = pct(right.length, quiz.ids.length);
    app.innerHTML = topbar(quiz.title, quiz.back) + `
      <main class="wrap">
        <section class="card result">
          <div class="big">${p >= 90 ? '🏆' : p >= 70 ? '👍' : '💪'}</div>
          <h2>${right.length} / ${quiz.ids.length} ${tx('correct', 'صح')}</h2>
          <p class="muted">${p >= 90 ? tx('Excellent – you know this topic.', 'ممتاز – إنت فاهم الموضوع ده كويس.') : p >= 70 ? tx('Good! Review the mistakes below.', 'كويس! راجع الغلطات اللي تحت.') : tx('Keep going – read the lesson again and retry.', 'كمّل – اقرا الدرس تاني وجرّب من الأول.')}</p>
          <div class="row" style="justify-content:center">
            ${wrong.length ? `<button class="btn" data-act="retryWrong">🔁 ${tx('Retry my mistakes', 'جرّب غلطاتي تاني')}</button>` : ''}
            <button class="btn secondary" data-act="retryAll">${tx('Do it again', 'اعملها تاني')}</button>
            <button class="btn ghost" data-go="${quiz.back}">${tx('Done', 'خلاص')}</button>
          </div>
        </section>
        ${wrong.length ? `<h3>${tx('Mistakes to review', 'غلطات محتاجة مراجعة')}</h3><section class="card">${wrong.map(id => reviewItem(id)).join('')}</section>` : ''}
      </main>`;
    quiz.wrong = wrong;
  }
  function reviewItem(id, plain) {
    const { q } = Q.get(id);
    const T = qtr(q);
    const mine = quiz.answers[id];
    const ok = mine === !!q.a;
    const answer = `${tx('answer', 'الإجابة')}: ${q.a ? 'VERO' : 'FALSO'}`;
    return `<div class="review-item">
      ${imgTag(q.m)}
      <div class="tag ${ok ? 'ok' : 'bad'}">${plain ? answer : `${ok ? tx('✓ CORRECT', '✓ صح') : mine === undefined ? tx('– NOT ANSWERED', '– مجاوبتش') : tx('✗ WRONG', '✗ غلط')} · ${answer}`}</div>
      <div dir="ltr" lang="it"><b>${esc(q.t)}</b></div>
      ${T.e ? `<div class="muted" dir="auto">${esc(T.e)}</div>` : ''}
      ${T.w ? `<div class="small law-line" dir="auto">⚖️ ${esc(T.w)}</div>` : ''}
      ${T.x ? `<div class="small" style="margin-top:4px" dir="auto">💡 ${esc(T.x)}</div>` : ''}
      <div style="clear:both"></div>
    </div>`;
  }

  // ---------- mock exam ----------
  let exam = null;
  function buildExam() {
    // One question from every chapter, plus five more from random chapters – 30 in chapter order.
    const pickFrom = ch => ch.ids[Math.floor(Math.random() * ch.ids.length)];
    const picked = new Set(chapters.map(pickFrom));
    while (picked.size < 30) picked.add(pickFrom(chapters[Math.floor(Math.random() * chapters.length)]));
    return [...picked].sort((a, b) => a - b);
  }
  function startExam() {
    exam = { ids: buildExam(), i: 0, answers: {}, end: Date.now() + 20 * 60 * 1000, finished: false, showEn: false };
    go('#/exam');
  }
  function renderExam() {
    if (!exam) return go('#/');
    if (exam.finished) return renderExamResult();
    const left = Math.max(0, exam.end - Date.now());
    if (left <= 0) return finishExam(true);
    const id = exam.ids[exam.i];
    const { q } = Q.get(id);
    const ans = exam.answers[id];
    const mm = Math.floor(left / 60000), ss = Math.floor(left / 1000) % 60;
    const count = Object.keys(exam.answers).length;
    app.innerHTML = topbar(tx('Mock exam', 'امتحان تجريبي'), '#/') + `
      <main class="wrap">
        <div class="quiz-head">
          <b>${tx('Question', 'سؤال')} ${exam.i + 1}/30</b>
          <div class="bar"><i style="width:${pct(count, 30)}%"></i></div>
          <span class="timer ${left < 120000 ? 'low' : ''}" id="timer" dir="ltr">⏱ ${mm}:${String(ss).padStart(2, '0')}</span>
        </div>
        <section class="card qcard">
          ${q.m ? `<div class="qimg">${imgTag(q.m)}</div>` : ''}
          <div class="qtext" dir="ltr" lang="it">${esc(q.t)}</div>
          ${exam.showEn ? `<div class="qen"><b>${tx('English (help – not available in the real exam)', 'الترجمة (مساعدة – مش موجودة في الامتحان الحقيقي)')}</b><span dir="auto">${esc(qtr(q).e || tx('No translation available.', 'مفيش ترجمة.'))}</span></div>` : ''}
          <div class="qtools">
            <button class="chip ${exam.showEn ? 'on' : ''}" data-act="examEn">${tx(`🇬🇧 English help ${exam.showEn ? 'on' : 'off'}`, `🇪🇬 مساعدة الترجمة ${exam.showEn ? 'شغالة' : 'مقفولة'}`)}</button>
            ${sayBtn('q', tx('Listen in Italian', 'اسمع بالإيطالي'))}
            ${exam.showEn && qtr(q).e ? sayBtn('tr', tx('Listen to the translation', 'اسمع الترجمة')) : ''}
          </div>
          <div class="answers">
            <button class="ans v ${ans === true ? 'picked' : ''}" data-act="examAns" data-v="1">VERO<small>${tx('True', 'صح')}</small></button>
            <button class="ans f ${ans === false ? 'picked' : ''}" data-act="examAns" data-v="0">FALSO<small>${tx('False', 'غلط')}</small></button>
          </div>
        </section>
        <div class="quiz-foot">
          <button class="btn ghost" data-act="examPrev" ${exam.i ? '' : 'disabled'}>${back()} ${tx('Previous', 'اللي قبله')}</button>
          ${exam.i < 29 ? `<button class="btn secondary" data-act="examNext">${tx('Next', 'اللي بعده')} ${fwd()}</button>` : ''}
          <button class="btn" data-act="examFinish">${tx('Finish', 'سلّم')} (${count}/30)</button>
        </div>
        <div class="grid-nav">${exam.ids.map((qid, k) => `<button class="${exam.answers[qid] !== undefined ? 'done' : ''} ${k === exam.i ? 'cur' : ''}" data-act="examGo" data-k="${k}">${k + 1}</button>`).join('')}</div>
      </main>`;
    clearInterval(timerId);
    timerId = setInterval(() => {
      const l = Math.max(0, exam.end - Date.now());
      const t = document.getElementById('timer');
      if (l <= 0) { clearInterval(timerId); finishExam(true); return; }
      if (t) { t.textContent = `⏱ ${Math.floor(l / 60000)}:${String(Math.floor(l / 1000) % 60).padStart(2, '0')}`; t.classList.toggle('low', l < 120000); }
    }, 500);
  }
  function finishExam(timeUp) {
    clearInterval(timerId);
    exam.finished = true;
    exam.timeUp = !!timeUp;
    exam.errors = exam.ids.filter(id => exam.answers[id] !== !!Q.get(id).q.a).length;
    for (const id of exam.ids) if (exam.answers[id] !== undefined) record(id, exam.answers[id] === !!Q.get(id).q.a);
    store.exams.push({ at: Date.now(), errors: exam.errors });
    save();
    renderExamResult();
  }
  function renderExamResult() {
    const pass = exam.errors <= 3;
    quiz = { answers: exam.answers };
    app.innerHTML = topbar(tx('Mock exam result', 'نتيجة الامتحان التجريبي'), '#/') + `
      <main class="wrap">
        <section class="card result">
          <div class="big">${pass ? '🎉' : '📚'}</div>
          <h2>${pass ? tx('PASSED', 'ناجح') : tx('NOT PASSED', 'مش ناجح')} – ${tx(`${exam.errors} error${exam.errors === 1 ? '' : 's'}`, `${exam.errors} غلطة`)}</h2>
          <p class="muted">${exam.timeUp ? tx('Time is up. ', 'الوقت خلص. ') : ''}${tx('To pass you may make at most 3 errors (unanswered questions count as errors).', 'عشان تنجح مسموحلك بـ 3 غلطات بالكتير (الأسئلة اللي متجاوبتش بتتحسب غلط).')}</p>
          <div class="row" style="justify-content:center">
            <button class="btn" data-act="exam">${tx('New mock exam', 'امتحان تجريبي جديد')}</button>
            <button class="btn ghost" data-go="#/">${tx('Home', 'الرئيسية')}</button>
          </div>
        </section>
        <h3>${tx('Your answers', 'إجاباتك')}</h3>
        <div class="grid-nav" style="margin-bottom:12px">${exam.ids.map((id, k) => `<button class="${exam.answers[id] === !!Q.get(id).q.a ? 'r' : 'w'}" data-act="jump" data-k="${k}">${k + 1}</button>`).join('')}</div>
        <section class="card">${exam.ids.map((id, k) => `<div id="rv${k}">${reviewItem(id)}</div>`).join('')}</section>
      </main>`;
  }

  // ---------- search ----------
  function search(term) {
    app.innerHTML = topbar(tx('Search questions', 'دوّر في الأسئلة'), '#/') + `
      <main class="wrap">
        <input class="search" id="sq" type="search" placeholder="${tx("Search in Italian or English, e.g. 'sorpasso' or 'overtake'", "دوّر بالإيطالي أو بالعربي، مثلاً 'sorpasso' أو 'تخطّي'")}" value="${esc(term || '')}" autofocus>
        <div id="sres" style="margin-top:12px"></div>
      </main>`;
    const input = document.getElementById('sq');
    const run = () => {
      const t = input.value.trim().toLowerCase();
      const out = document.getElementById('sres');
      if (t.length < 3) { out.innerHTML = `<p class="muted">${tx('Type at least 3 letters.', 'اكتب 3 حروف على الأقل.')}</p>`; return; }
      const hits = [];
      for (const [id, { q }] of Q) {
        const e = qtr(q).e;
        if (q.t.toLowerCase().includes(t) || (q.e && q.e.toLowerCase().includes(t)) || (e && e !== q.e && e.includes(t))) hits.push(id);
        if (hits.length >= 200) break;
      }
      quiz = { answers: {} };
      out.innerHTML = `<div class="row"><p class="muted grow">${hits.length >= 200 ? '200+' : hits.length} ${tx('questions found', 'سؤال لقيتهم')}</p>${hits.length ? `<button class="btn secondary" data-act="searchQuiz">${tx('Practise these', 'اتمرّن عليهم')}</button>` : ''}</div>
        <section class="card">${hits.slice(0, 60).map(id => reviewItem(id, true)).join('') || `<p class="muted">${tx('Nothing found.', 'ملقيتش حاجة.')}</p>`}</section>`;
      out.dataset.hits = hits.join(',');
    };
    input.addEventListener('input', run);
    run();
  }

  // ---------- settings ----------
  function settings() {
    const modal = document.createElement('div');
    modal.className = 'modal-back';
    const draw = () => {
      modal.innerHTML = `<div class="modal" role="dialog" aria-label="${tx('Settings', 'الإعدادات')}">
        <h2>${tx('Settings', 'الإعدادات')}</h2>
        <div class="setting"><span>${tx('Language', 'اللغة')}</span><span class="seg">${[['en', 'English'], ['ar', 'مصري']].map(([l, name]) => `<button data-lang="${l}" class="${I.lang === l ? 'on' : ''}">${name}</button>`).join('')}</span></div>
        <div class="setting"><span>${tx('Show English automatically in practice', 'اعرض الترجمة أوتوماتيك في التمرين')}</span><button class="switch ${store.settings.en ? 'on' : ''}" data-s="en" aria-label="${tx('Toggle English', 'شغّل أو اقفل الترجمة')}"></button></div>
        ${Native.canSpeak ? `<div class="setting"><span>${tx('Read the explanation aloud after each answer', 'اقرا الشرح بصوت بعد كل إجابة')}</span><button class="switch ${store.settings.say !== false ? 'on' : ''}" data-s="say" aria-label="${tx('Toggle reading aloud', 'شغّل أو اقفل القراية بصوت')}"></button></div>
        <div class="setting"><span>${tx('Voice and sound in the scenarios', 'الصوت في السيناريوهات')}</span><button class="switch ${store.settings.sceneAudio !== false ? 'on' : ''}" data-s="sceneAudio" aria-label="${tx('Toggle scenario sound', 'شغّل أو اقفل صوت السيناريوهات')}"></button></div>` : ''}
        <div class="setting"><span>${tx('Text size', 'حجم الخط')}</span><span class="seg">${['small', 'normal', 'large'].map(s => `<button data-size="${s}" class="${store.settings.size === s ? 'on' : ''}">${s === 'small' ? 'A' : s === 'normal' ? 'A+' : 'A++'}</button>`).join('')}</span></div>
        <div class="setting"><span>${tx('Reset all progress', 'امسح كل التقدّم')}</span><button class="btn ghost" data-s="reset">${tx('Reset', 'امسح')}</button></div>
        <details class="about"><summary>${tx('About, privacy and disclaimer', 'عن التطبيق والخصوصية وإخلاء المسؤولية')}</summary>
          <p>${tx('<b>Free for everyone, always.</b> Made for students and Arabic speakers in Italy who want to get the Patente B without strong Italian. No ads, no payments, no tracking of any kind. Open source under the MIT licence: anyone may use, copy and share it.',
            '<b>ببلاش للكل، على طول.</b> معمول للطلبة واللي بيتكلموا عربي في إيطاليا وعايزين ياخدوا الباتينتي B من غير ما يكونوا شاطرين في الإيطالي. مفيش إعلانات ولا فلوس ولا أي تتبّع. مفتوح المصدر برخصة MIT: أي حد يقدر يستخدمه وينسخه ويشاركه.')}</p>
          <p>${tx('<b>Privacy:</b> this app collects no personal data. It has no account, no ads, no analytics and no internet access; your progress and settings stay on this device only. Reading aloud uses your device\'s own text-to-speech engine.',
            '<b>الخصوصية:</b> التطبيق ده مش بيجمع أي بيانات شخصية. مفيش حساب ولا إعلانات ولا تتبّع ولا إنترنت؛ تقدّمك وإعداداتك بيفضلوا على الجهاز ده بس. القراية بصوت بتستخدم محرّك الكلام اللي على جهازك.')}</p>
          <p>${tx('<b>Not an official app.</b> It is not affiliated with or endorsed by the Italian Ministry of Infrastructure and Transport (MIT) or the Motorizzazione Civile. The questions come from the public ministerial list; for official information see',
            '<b>ده مش تطبيق رسمي.</b> مالوش علاقة بوزارة البنية التحتية والنقل الإيطالية (MIT) ولا بالـ Motorizzazione Civile. الأسئلة من القايمة الوزارية العامة؛ للمعلومات الرسمية شوف')} <a href="https://www.ilportaledellautomobilista.it" target="_blank" rel="noopener">ilportaledellautomobilista.it</a> ${tx('and', 'و')} <a href="https://www.mit.gov.it" target="_blank" rel="noopener">mit.gov.it</a>.</p>
          <p>${tx('<b>Study aid only.</b> Translations, lessons and the "why, according to the law" explanations were written with the help of AI and may contain mistakes. They are not legal advice. Rules change: always check the current Codice della Strada.',
            '<b>مساعدة للمذاكرة بس.</b> الترجمات والدروس وشرح "القانون بيقول إيه" اتكتبوا بمساعدة الذكاء الاصطناعي وممكن يكون فيهم غلط. دي مش استشارة قانونية. القواعد بتتغير: راجع دايمًا الـ Codice della Strada الحالي.')}</p>
          <p>${tx('Full privacy policy and licences:', 'سياسة الخصوصية الكاملة والتراخيص:')} <a href="privacy.html" target="_blank" rel="noopener">privacy.html</a> · <a href="licenses.html" target="_blank" rel="noopener">${tx('Licences', 'التراخيص')}</a></p>
        </details>
        <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn" data-s="close">${tx('Close', 'اقفل')}</button></div>
      </div>`;
    };
    draw();
    modal.addEventListener('click', async e => {
      const b = e.target.closest('button');
      if (e.target === modal || (b && b.dataset.s === 'close')) { modal.remove(); route(); return; }
      if (!b) return;
      if (b.dataset.lang) { await setLang(b.dataset.lang); draw(); route(); }
      if (b.dataset.s === 'en') { store.settings.en = !store.settings.en; save(); draw(); }
      if (b.dataset.s === 'say' || b.dataset.s === 'sceneAudio') { store.settings[b.dataset.s] = store.settings[b.dataset.s] === false; save(); draw(); if (!store.settings.say) Native.stop(); }
      if (b.dataset.size) { store.settings.size = b.dataset.size; document.documentElement.dataset.size = b.dataset.size; save(); draw(); }
      if (b.dataset.s === 'reset' && confirm(tx('Delete all your answers and exam results?', 'تمسح كل إجاباتك ونتايج امتحاناتك؟'))) { store.q = {}; store.exams = []; store.seen = {}; delete store.last; save(); modal.remove(); go('#/'); }
    });
    document.body.appendChild(modal);
  }

  // ---------- events ----------
  app.addEventListener('click', async e => {
    const mk = e.target.closest('mark[data-why]');
    if (mk) { toast(`<b>${esc(mk.textContent)}</b>: ${esc(mk.dataset.why) || tx('key word – read it carefully', 'كلمة مهمة – اقراها كويس')}`); return; }
    const b = e.target.closest('[data-go],[data-act]');
    if (!b || b.disabled) return;
    if (b.dataset.go) return go(b.dataset.go);
    const act = b.dataset.act;
    const ch = b.dataset.ch && chapters.find(c => c.id === b.dataset.ch);
    switch (act) {
      case 'settings': return settings();
      case 'lang': await setLang(I.ar ? 'en' : 'ar'); return route();
      case 'search': return go('#/search');
      case 'exam': return startExam();
      case 'mistakes': return startQuiz(() => tx('My mistakes', 'غلطاتي'), shuffle(mistakes()).slice(0, 30), '#/');
      case 'random': return startQuiz(() => tx('20 random questions', '20 سؤال عشوائي'), smartPick([...Q.keys()], 20), '#/');
      case 'chquiz': return startQuiz(() => `${ch.lesson.n}. ${tx('Chapter quiz', 'اختبار الفصل')}`, smartPick(ch.ids, 20), `#/ch/${ch.id}/practice`);
      case 'chall': return startQuiz(() => `${ch.lesson.n}. ${tx('All questions', 'كل الأسئلة')}`, ch.ids.slice(), `#/ch/${ch.id}/practice`);
      case 'sub': { const s = ch.subs[+b.dataset.sub]; return startQuiz(() => subName(ch, s), s.ids.slice(), `#/ch/${ch.id}/practice`); }
      case 'toggleEn': quiz.showEn = !quiz.showEn; return renderQuiz();
      case 'say': return say(b.dataset.what);
      case 'answer': {
        const id = quiz.ids[quiz.i], v = b.dataset.v === '1';
        quiz.answers[id] = v;
        record(id, v === !!Q.get(id).q.a);
        renderQuiz();
        // Read the legal explanation aloud straight away (can be switched off in Settings).
        if (store.settings.say !== false && qtr(Q.get(id).q).w) say('why');
        return;
      }
      case 'nextQ': Native.stop(); quiz.i++; window.scrollTo(0, 0); return renderQuiz();
      case 'prevQ': Native.stop(); quiz.i = Math.max(0, quiz.i - 1); return renderQuiz();
      case 'retryWrong': return startQuiz(quiz.name, shuffle(quiz.wrong.slice()), quiz.back);
      case 'retryAll': return startQuiz(quiz.name, shuffle(quiz.ids.slice()), quiz.back);
      case 'examAns': Native.stop(); exam.answers[exam.ids[exam.i]] = b.dataset.v === '1'; if (exam.i < 29) exam.i++; return renderExam();
      case 'examPrev': Native.stop(); exam.i = Math.max(0, exam.i - 1); return renderExam();
      case 'examNext': Native.stop(); exam.i = Math.min(29, exam.i + 1); return renderExam();
      case 'examGo': Native.stop(); exam.i = +b.dataset.k; return renderExam();
      case 'examEn': exam.showEn = !exam.showEn; return renderExam();
      case 'examFinish': {
        const missing = 30 - Object.keys(exam.answers).length;
        if (missing && !confirm(tx(`${missing} question${missing > 1 ? 's are' : ' is'} unanswered and will count as errors. Finish anyway?`, `${missing} سؤال لسه متجاوبش وهيتحسب غلط. تسلّم برضه؟`))) return;
        return finishExam(false);
      }
      case 'jump': { const el = document.getElementById('rv' + b.dataset.k); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      case 'searchQuiz': { const ids = (document.getElementById('sres').dataset.hits || '').split(',').filter(Boolean).map(Number); return startQuiz(() => tx('Search results', 'نتايج البحث'), ids, '#/search'); }
    }
  });
  app.addEventListener('keydown', e => {
    const mk = e.target.closest && e.target.closest('mark[data-why]');
    if (mk && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); mk.click(); }
  });
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || document.querySelector('.modal-back')) return;
    const k = e.key.toLowerCase();
    const h = location.hash;
    // In right-to-left mode the arrow keys follow the reading direction.
    const nextKey = I.ar ? 'arrowleft' : 'arrowright', prevKey = I.ar ? 'arrowright' : 'arrowleft';
    if (h === '#/quiz' && quiz) {
      const done = quiz.answers[quiz.ids[quiz.i]] !== undefined;
      if (!done && (k === 'v' || k === '1')) document.querySelector('[data-act="answer"][data-v="1"]')?.click();
      else if (!done && (k === 'f' || k === '2')) document.querySelector('[data-act="answer"][data-v="0"]')?.click();
      else if (done && (k === 'enter' || k === nextKey)) document.querySelector('[data-act="nextQ"]')?.click();
    } else if (h === '#/exam' && exam && !exam.finished) {
      if (k === 'v' || k === '1') document.querySelector('[data-act="examAns"][data-v="1"]')?.click();
      else if (k === 'f' || k === '2') document.querySelector('[data-act="examAns"][data-v="0"]')?.click();
      else if (k === nextKey) document.querySelector('[data-act="examNext"]')?.click();
      else if (k === prevKey) document.querySelector('[data-act="examPrev"]')?.click();
    }
  });

  // ---------- router ----------
  function route() {
    cleanup();
    document.title = 'Patente B';
    const parts = (location.hash || '#/').slice(2).split('/');
    if (parts[0] === 'ch') return chapter(parts[1], parts[2] || 'learn');
    if (parts[0] === 'quiz') return renderQuiz();
    if (parts[0] === 'exam') return renderExam();
    if (parts[0] === 'search') return search();
    window.scrollTo(0, 0);
    return home();
  }
  window.addEventListener('hashchange', route);
  // Called by the Android back button in the MAUI app: returns true if the app handled it.
  window.appBack = function () {
    if (Native.closePage()) return true;
    if (window.Scenes && window.Scenes.exitFull()) return true;
    if (document.querySelector('.modal-back')) { document.querySelector('.modal-back').remove(); route(); return true; }
    if (location.hash && location.hash !== '#/' && location.hash !== '#') {
      const b = document.querySelector('.topbar [data-go]');
      if (b) go(b.dataset.go); else go('#/');
      return true;
    }
    return false;
  };
  if (I.ar) loadArabic().then(route); else route();
})();
