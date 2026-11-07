// One animation per exam topic (the "Topic by topic" list in a chapter's Watch tab).
// Each chapter has a script file, js/topics/<chapter id>.js, that registers for every topic:
//   { v: [template, options], s: [[english, arabic, highlight or emoji], ...] }
// This file turns a script into a scenario for the engine in scenes.js. Every topic plays:
//   1. a close-up of its real exam signs, if it has any;
//   2. the scripted steps over an animated template (road, drive, curve, side, vehicle, cross, ramp, card);
//   3. two exam checks taken from the question bank: one TRUE statement and one FALSE one.
// Everything here except build()/update() works without a DOM: tools/narration/export.mjs uses it too.
(function () {
  'use strict';
  const { bez } = window.Scenes;
  const SCRIPTS = (window.TOPIC_SCRIPTS = window.TOPIC_SCRIPTS || {});
  const AR = (window.SCENES_AR = window.SCENES_AR || {});
  const pair = (en, ar) => { if (ar) AR[en] = ar; return en; };
  const STEP = 6, EXAM = 5.5, CLOSEUP = 3.6;
  const K = (...p) => p;
  const FONT = 'system-ui, sans-serif';
  const COLORS = ['#2a7de1', '#2fa84f', '#e0a020', '#7b3fa0', '#d7263d', '#17a2a2'];

  // Words used on the pictures, in both languages.
  const WORD = {
    cw: ['Carriageway (carreggiata)', 'نهر الطريق (carreggiata)'], lane: ['Lane (corsia)', 'حارة (corsia)'],
    shoulder: ['Shoulder (banchina)', 'الكتف (banchina)'], walk: ['Pavement (marciapiede)', 'الرصيف (marciapiede)'],
    div: ['Central divider (spartitraffico)', 'الفاصل اللي في النص (spartitraffico)'], fence: ['Side fence (recinzione)', 'السور الجانبي (recinzione)'],
    em: ['Emergency lane (corsia di emergenza)', 'حارة الطوارئ (corsia di emergenza)'], inner: ['Inner lane: overtaking', 'الحارة الداخلية: للتخطي'],
    right: ['Right lane: normal driving', 'الحارة اليمين: للسواقة العادية'], side: ['Side carriageway: one way', 'النهر الجانبي: اتجاه واحد'],
    central: ['Central carriageway', 'النهر اللي في النص'], cycle: ['Cycle path (pista ciclabile)', 'حارة العجل (pista ciclabile)'],
    park: ['Parking bay', 'مكان الركن'], accel: ['Acceleration lane', 'حارة التسارع'], decel: ['Deceleration lane', 'حارة التباطؤ'],
    island: ['Traffic island (isola di traffico)', 'جزيرة مرورية (isola di traffico)'],
    safe: ['Refuge (salvagente)', 'جزيرة أمان (salvagente)'], layby: ['Lay-by (piazzola)', 'مكان وقوف جانبي (piazzola)'],
  };
  for (const v of Object.values(WORD)) pair(v[0], v[1]);
  pair('Reaction distance', 'مسافة رد الفعل'); pair('Braking distance', 'مسافة الفرملة'); pair('Stopping distance', 'مسافة التوقف'); pair('Safe distance', 'مسافة الأمان');
  pair('Italian exam wording', 'الجملة زي ما هتيجي في الامتحان');

  // ---------- exam checks ----------
  // The statement that best fits a spoken check: fairly short, and with a picture if the topic has pictures.
  const NEG_EN = /\b(not|never|cannot|no)\b|n't/i, NEG_IT = /\b(non|mai|senza|né|nessun|nessuna|vietat|proibit)/i;
  const mismatch = q => NEG_EN.test(q.e) && !NEG_IT.test(q.t);
  function pickQ(sub, a, used) {
    const hasImg = sub.qs.some(q => q.m);
    const list = sub.qs.filter(q => q.a === a && q.e && q.t && !used.includes(q.i) && !/[\u0400-\u04FF\u0600-\u06FF]/.test(q.e) && !mismatch(q));
    const fit = q => (q.e.length <= 125 ? 200 - q.e.length : 0) + (hasImg && q.m ? 100 : 0) + (q.e.length < 35 ? -60 : 0);
    return list.slice().sort((x, y) => fit(y) - fit(x) || x.i - y.i)[0] || null;
  }
  function examSteps(sub, ar) {
    const out = [];
    for (const [a, en, arLabel] of [[1, 'True in the exam:', 'في الامتحان صح:'], [0, 'A trap, this is false:', 'فخ، دي غلط:']]) {
      const q = pickQ(sub, a, out.map(x => x.q.i));
      if (!q) continue;
      const text = `<b>${en}</b> ${q.e}`;
      const tr = ar && ar[q.i] && ar[q.i][0];
      out.push({ q, text, ar: tr ? `<b>${arLabel}</b> ${tr}` : null });
    }
    return out;
  }

  // ---------- drawing helpers ----------
  function drawText(el, parent, x, y, str, o = {}) {
    const t = el('text', { x, y, 'text-anchor': o.anchor || 'middle', 'font-size': o.size || 14, 'font-weight': o.weight || 700, fill: o.fill || '#111', 'font-family': FONT }, parent);
    if (o.outline) { t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', o.outline); t.setAttribute('stroke-width', 3); }
    t.textContent = str;
    return t;
  }
  function wrap(el, parent, x, y, str, width, size, o = {}) {
    const perChar = size * 0.52;
    const max = Math.max(8, Math.floor(width / perChar));
    const lines = [];
    let line = '';
    for (const word of str.split(/\s+/)) {
      if (line && (line + ' ' + word).length > max) { lines.push(line); line = word; } else line = line ? line + ' ' + word : word;
    }
    if (line) lines.push(line);
    lines.forEach((l, i) => drawText(el, parent, x, y + i * size * 1.28, l, { size, weight: o.weight || 650, fill: o.fill || '#14202b', anchor: o.anchor }));
    return lines.length;
  }
  const svgImg = (el, parent, m, x, y, s) => el('image', { href: `img/signs/${m}.png`, x, y, width: s, height: s, preserveAspectRatio: 'xMidYMid meet' }, parent);
  function pop(node, cx, cy, f) {
    const k = f <= 0 ? 0 : f >= 1 ? 1 : 1 + 2.2 * Math.pow(f - 1, 3) + 1.2 * Math.pow(f - 1, 2);
    node.setAttribute('transform', `translate(${cx} ${cy}) scale(${k.toFixed(3)}) translate(${-cx} ${-cy})`);
    node.style.opacity = f <= 0 ? 0 : 1;
  }
  function grassBg(el, g) {
    el('rect', { x: 0, y: 0, width: 800, height: 450, fill: '#86b97a' }, g);
    el('rect', { x: 0, y: 0, width: 800, height: 450, fill: 'url(#scGrass)' }, g);
  }
  // Moves actors along a lane again and again by giving each pass its own time window.
  function passes(kind, color, y, dir, t0, t1, every, runs, base = {}) {
    const out = [];
    const span = dir > 0 ? [-70, 870] : [870, -70];
    for (let i = 0; i < runs; i++) {
      const a = t0 + i * every, b = a + (t1 - t0);
      out.push({ kind, color: COLORS[(color + i) % COLORS.length], keys: K([a, span[0], y], [b, span[1], y]), show: [a, b], ...base });
    }
    return out;
  }

  // ---------- particle weather and night ----------
  function addFx(ctx, fx) {
    if (!fx) return;
    const prev = ctx.update, prevBuild = ctx.build;
    const n = { rain: 70, snow: 50, wind: 22 }[fx] || 0;
    let drops = [];
    ctx.build = h => {
      if (prevBuild) prevBuild(h);
      const g = h.el('g', { 'pointer-events': 'none' }, h.layers.over);
      if (fx === 'fog') for (let i = 0; i < 4; i++) drops.push(h.el('ellipse', { cx: 200 * i, cy: 90 + i * 90, rx: 420, ry: 70, fill: '#eef2f4', opacity: 0.62 }, g));
      if (fx === 'ice') h.el('rect', { x: 0, y: 0, width: 800, height: 450, fill: 'rgba(190,225,255,.16)' }, g);
      for (let i = 0; i < n; i++) {
        const x = (i * 137) % 800, y = (i * 263) % 450;
        const e = fx === 'snow' ? h.el('circle', { r: 2 + (i % 3), fill: '#fff', opacity: 0.9 }, g)
          : h.el('line', { x1: 0, y1: 0, x2: fx === 'wind' ? 26 : -4, y2: fx === 'wind' ? 2 : 14, stroke: fx === 'wind' ? 'rgba(255,255,255,.7)' : 'rgba(205,225,255,.8)', 'stroke-width': 1.6 }, g);
        drops.push({ e, x, y, v: 0.7 + (i % 5) / 5 });
      }
    };
    ctx.update = (t, h, a) => {
      if (prev) prev(t, h, a);
      if (fx === 'fog') drops.forEach((d, i) => d.setAttribute('transform', `translate(${Math.sin(t / 2 + i) * 60} 0)`));
      else if (n) for (const d of drops) {
        const speed = fx === 'snow' ? 45 : fx === 'wind' ? 340 : 420;
        const yy = fx === 'wind' ? d.y : (d.y + t * speed * d.v) % 450;
        const xx = fx === 'wind' ? (d.x + t * speed * d.v) % 800 : fx === 'snow' ? (d.x + Math.sin(t + d.y) * 12 + 800) % 800 : d.x;
        d.e.setAttribute('transform', `translate(${xx.toFixed(1)} ${yy.toFixed(1)})`);
      }
    };
  }

  // ---------- template: road, a labelled cross-section ----------
  // l: '1+1' one carriageway, 1 lane each way; '3+3' six lanes on one carriageway;
  // '2|2' two carriageways with a divider; '2|2+2|2' three carriageways (eight lanes).
  // side: 'walk' | 'shoulder' | 'fence' (autostrada); cycle, bays: extra strips; zebra: crossing.
  function roadTpl(o, c) {
    const parts = {}, actors = [], lanesY = [];
    const groups = (o.l || '1+1').split('|').map(s => s.split('+').map(Number));
    const total = groups.reduce((a, g) => a + g.reduce((x, y) => x + y, 0), 0);
    const dividers = groups.length - 1;
    const laneH = Math.min(48, Math.floor((o.side === 'fence' ? 215 : 235) / total));
    const divH = 20;
    const emH = o.em ? 24 : 0, stripH = o.side === 'fence' ? 12 : 22, walkH = o.side === 'walk' ? 26 : 0, cyc = o.cycle ? 22 : 0;
    const height = total * laneH + dividers * divH + 2 * (emH + stripH + walkH) + cyc;
    const top = Math.round(248 - height / 2);
    const draws = [];
    let y = top;
    const strip = (name, h, fn) => { fn(y, h); parts[name] = parts[name] || { x: 6, y, w: 788, h, word: name }; y += h; };
    if (walkH) strip('walk', walkH, (a, h) => draws.push(['rect', { x: 0, y: a, width: 800, height: h, fill: '#d6d0c4' }]));
    if (o.side === 'fence') draws.push(['fence', top - 4]);
    if (stripH) { draws.push(['rect', { x: 0, y, width: 800, height: stripH, fill: '#a9a59a' }]); y += stripH; }
    if (emH) { draws.push(['rect', { x: 0, y, width: 800, height: emH, fill: '#5a5f66' }]); y += emH; }
    groups.forEach((g, gi) => {
      const lanes = g.reduce((a, b) => a + b, 0);
      const h = lanes * laneH;
      const dirTop = groups.length === 1 || gi < (groups.length - 1) / 2 ? -1 : groups.length === 3 && gi === 1 ? -1 : 1;
      draws.push(['rect', { x: 0, y, width: 800, height: h, fill: '#5a5f66' }]);
      parts[gi === 0 ? 'cw' : gi === 1 && groups.length === 3 ? 'central' : 'cw' + gi] = { x: 6, y: y + 2, w: 788, h: h - 4, word: gi === 1 && groups.length === 3 ? 'central' : 'cw' };
      for (let i = 0; i < lanes; i++) {
        const ly = y + i * laneH + laneH / 2;
        const westbound = g.length === 2 ? i < g[0] : groups.length > 1 && dirTop < 0;
        lanesY.push({ y: ly, west: westbound, cw: gi, i });
        if (i < lanes - 1) {
          const centre = g.length === 2 && i === g[0] - 1;
          draws.push(['line', { x1: 0, x2: 800, y1: y + (i + 1) * laneH, y2: y + (i + 1) * laneH, stroke: '#fff', 'stroke-width': centre ? 4 : 2.5, 'stroke-dasharray': centre && o.solid ? '' : '22 16' }]);
        }
      }
      draws.push(['line', { x1: 0, x2: 800, y1: y + 2, y2: y + 2, stroke: '#fff', 'stroke-width': 2 }], ['line', { x1: 0, x2: 800, y1: y + h - 2, y2: y + h - 2, stroke: '#fff', 'stroke-width': 2 }]);
      y += h;
      if (gi < groups.length - 1) {
        draws.push(['rect', { x: 0, y, width: 800, height: divH, fill: '#6fa364' }], ['rect', { x: 0, y: y + divH / 2 - 1.5, width: 800, height: 3, fill: '#c9cdd2' }]);
        parts[gi === 0 ? 'div' : 'div' + gi] = { x: 6, y: y - 1, w: 788, h: divH + 2, word: 'div' };
        y += divH;
      }
    });
    if (emH) { draws.push(['rect', { x: 0, y, width: 800, height: emH, fill: '#5a5f66' }], ['line', { x1: 0, x2: 800, y1: y + emH - 2, y2: y + emH - 2, stroke: '#fff', 'stroke-width': 2 }]); parts.em = { x: 6, y, w: 788, h: emH, word: 'em' }; y += emH; }
    if (stripH) { draws.push(['rect', { x: 0, y, width: 800, height: stripH, fill: '#a9a59a' }]); parts.shoulder = { x: 6, y, w: 788, h: stripH, word: 'shoulder' }; y += stripH; }
    if (cyc) { draws.push(['rect', { x: 0, y, width: 800, height: cyc, fill: '#b5533c' }]); parts.cycle = { x: 6, y, w: 788, h: cyc, word: 'cycle' }; actors.push(...passes('bike', 2, y + cyc / 2, 1, c.start, c.start + 9, 7, 3)); y += cyc; }
    if (walkH) { draws.push(['rect', { x: 0, y, width: 800, height: walkH, fill: '#d6d0c4' }]); parts.walk = { x: 6, y, w: 788, h: walkH, word: 'walk' }; }
    if (o.side === 'fence') draws.push(['fence', y + 2]);
    const bottomLanes = lanesY.filter(l => !l.west);
    const rightLane = bottomLanes[bottomLanes.length - 1] || lanesY[lanesY.length - 1];
    parts.lane = { x: 6, y: rightLane.y - laneH / 2 + 2, w: 788, h: laneH - 4, word: 'lane' };
    parts.right = { ...parts.lane, word: 'right' };
    const inner = bottomLanes[0] || rightLane;
    parts.inner = { x: 6, y: inner.y - laneH / 2 + 2, w: 788, h: laneH - 4, word: 'inner' };
    if (groups.length === 3) parts.side = { x: 6, y: parts.cw.y, w: 788, h: parts.cw.h, word: 'side' };
    lanesY.forEach((l, i) => {
      const fast = l.i % 2 === 0;
      const kind = o.traffic && !fast ? o.traffic : (i % 5 === 3 ? 'truck' : 'car');
      actors.push(...passes(kind, i, l.y, l.west ? -1 : 1, c.start + (i % 3) * 1.4, c.start + (i % 3) * 1.4 + (fast ? 7 : 9), 6.5, Math.ceil((c.T + 8) / 6.5)));
    });
    return {
      layout: 'diagram', parts, actors,
      build(h) {
        grassBg(h.el, h.layers.base);
        for (const [tag, attrs] of draws) {
          if (tag === 'fence') {
            for (let x = 0; x <= 800; x += 28) h.el('rect', { x, y: attrs - 3, width: 3, height: 7, fill: '#555' }, h.layers.base);
            h.el('line', { x1: 0, x2: 800, y1: attrs, y2: attrs, stroke: '#777', 'stroke-width': 2 }, h.layers.base);
          } else h.el(tag, attrs, h.layers.base);
        }
        if (o.zebra) for (let i = 0; i < Math.floor((y - top) / 13); i++) h.el('rect', { x: 560, y: top + 24 + i * 13, width: 44, height: 7, fill: '#fff' }, h.layers.marks);
        if (o.badge) { const b = h.el('g', { transform: 'translate(62 62)' }, h.layers.labels); h.signShape(b, o.badge[0], 62, { value: o.badge[1] }); }
        if (o.limit) { const b = h.el('g', { transform: 'translate(738 62)' }, h.layers.labels); h.signShape(b, 'speed', 60, { value: o.limit }); }
      },
    };
  }

  // ---------- template: ramp, joining or leaving a fast road ----------
  function rampTpl(o, c) {
    const out = o.dir === 'out';
    const lanes = [150, 200];
    const s = c.start, e = c.T;
    const me = out
      ? { id: 'me', kind: 'car', keys: K([s, -50, 200], [s + (e - s) * 0.3, 260, 200], [s + (e - s) * 0.42, 400, 252], [s + (e - s) * 0.72, 560, 252], [e, 840, 400]), blink: [[s + (e - s) * 0.2, s + (e - s) * 0.45, 'R']], brake: [[s + (e - s) * 0.42, e]] }
      : { id: 'me', kind: 'car', keys: K([s, -40, 400], [s + (e - s) * 0.25, 240, 252], [s + (e - s) * 0.6, 500, 252], [s + (e - s) * 0.75, 650, 200], [e, 900, 200]), blink: [[s + (e - s) * 0.35, s + (e - s) * 0.75, 'L']] };
    return {
      layout: 'diagram', parts: { [out ? 'decel' : 'accel']: { x: 240, y: 230, w: 320, h: 44, word: out ? 'decel' : 'accel' } },
      actors: [me, ...passes('car', 0, 150, 1, s, s + 6, 4.5, 4), ...passes('truck', 1, 200, 1, s + 5, s + 13, 8, 2)],
      build(h) {
        const g = h.layers.base;
        grassBg(h.el, g);
        h.el('rect', { x: 0, y: 118, width: 800, height: 112, fill: '#5a5f66' }, g);
        h.el('rect', { x: 240, y: 230, width: 320, height: 44, fill: '#5a5f66' }, g);
        h.el('path', { d: out ? 'M560 230 L800 420 L800 450 L720 450 L520 274 Z' : 'M240 230 L0 420 L0 450 L80 450 L280 274 Z', fill: '#5a5f66' }, g);
        for (const y of [120, 228]) h.el('line', { x1: 0, x2: 800, y1: y, y2: y, stroke: '#fff', 'stroke-width': 2.5 }, g);
        h.el('line', { x1: 0, x2: 800, y1: 175, y2: 175, stroke: '#fff', 'stroke-width': 2.5, 'stroke-dasharray': '26 26' }, g);
        h.el('line', { x1: 240, x2: 560, y1: 230, y2: 230, stroke: '#fff', 'stroke-width': 5, 'stroke-dasharray': '12 10' }, g);
      },
    };
  }

  // ---------- template: drive, a car meets something on an ordinary road ----------
  // act: pass | slow | stop (waits until the obstacle clears) | around (passes it, leaving room) | park | queue
  // obj: ped | kids | oldie | cane | stroller | bike | moto | animal | wild | zebra | cones | parked | bus | taxi | tractor |
  //      hole | ice | oil | rock | narrowL | narrowR | narrowB | train | tram | truck | ambulance | junction
  // m: picture on a post beside the road; fx: rain | snow | fog | ice | wind; night, beam: low | high.
  function driveTpl(o, c) {
    const s = c.start, e = c.T, dur = Math.max(2, e - s);
    const at = f => s + dur * f;
    const y = 250, stopX = o.stopX || 440, obj = o.obj;
    const extras = [], actors = [];
    let keys, brake = [], blink = [];
    switch (o.act || 'slow') {
      case 'pass': keys = K([s, -40, y], [e, 860, y]); break;
      case 'slow': keys = K([s, -40, y], [at(0.3), 300, y], [at(0.75), 500, y], [e, 860, y]); brake = [[at(0.28), at(0.5)]]; break;
      case 'stop': keys = K([s, -40, y], [at(0.3), 340, y], [at(0.42), stopX, y], [at(0.74), stopX, y], [e, 860, y]); brake = [[at(0.27), at(0.74)]]; break;
      case 'around': keys = K([s, -40, y], [at(0.28), 320, y], [at(0.42), 440, 206], [at(0.62), 620, 206], [at(0.76), 730, y], [e, 860, y]); blink = [[at(0.2), at(0.42), 'L'], [at(0.6), at(0.76), 'R']]; break;
      case 'park': keys = K([s, -40, y], [at(0.35), 340, y], [at(0.55), 470, 292], [e, 470, 292]); blink = [[at(0.25), at(0.6), 'R']]; brake = [[at(0.4), at(0.56)]]; break;
      case 'queue': keys = K([s, -40, y], [at(0.3), 250, y], [e - 0.1, 250, y]); brake = [[at(0.26), e]]; break;
    }
    const me = { id: 'me', kind: o.me || 'car', color: '#d7263d', keys, brake, blink, beam: o.beam ? [[0, o.beam]] : undefined };
    actors.push(me);
    const X = 520;
    const crossing = (kind, color, x, from, to, a, b) => actors.push({ kind, color, keys: K([0, x, from], [a, x, from], [b, x, to], [e + 20, x, to]) });
    const crossT0 = at(0.3), crossT1 = at(0.72);
    switch (obj) {
      case 'zebra': case 'ped': if (obj === 'zebra' || o.zebra !== false) extras.push({ type: 'zebra', x: X - 22, y: 178, w: 44, h: 94, dir: 'v' }); crossing('ped', '#7b3fa0', X, 300, 150, crossT0, crossT1); break;
      case 'kids': extras.push({ type: 'zebra', x: X - 22, y: 178, w: 44, h: 94, dir: 'v' }); [0, 16, 32].forEach((d, i) => crossing('ped', COLORS[i], X - 12 + d / 2, 302 + d / 2, 150 + d / 2, crossT0 + i * 0.2, crossT1 + i * 0.2)); break;
      case 'oldie': extras.push({ type: 'zebra', x: X - 22, y: 178, w: 44, h: 94, dir: 'v' }); crossing('ped', '#8a8a8a', X, 300, 150, crossT0, crossT1 + 0.5); break;
      case 'cane': crossing('ped', '#222', X, 300, 150, crossT0, crossT1 + 0.4); break;
      case 'stroller': extras.push({ type: 'zebra', x: X - 22, y: 178, w: 44, h: 94, dir: 'v' }); crossing('ped', '#c0398c', X, 300, 150, crossT0, crossT1); crossing('ped', '#f0d060', X, 318, 168, crossT0, crossT1); break;
      case 'bike': actors.push({ kind: 'bike', color: '#2a7de1', keys: K([s, 200, 262], [e, 800, 262]) }); break;
      case 'moto': actors.push({ kind: 'moto', color: '#2a7de1', keys: K([s, -200, 200], [e, 900, 200]) }); break;
      case 'animal': case 'wild': break;
      case 'cones': for (let i = 0; i < 7; i++) extras.push({ type: 'cone', x: 450 + i * 32, y: 232 + i * 0, layer: 'marks' }); extras.push({ type: 'zone', x: 450, y: 234, w: 200, h: 38, fill: 'rgba(246,210,27,.45)', stroke: '#f6d21b' }); break;
      case 'parked': actors.push({ kind: 'car', color: '#6d6f75', keys: K([0, X, 258, 0]) }); break;
      case 'bus': actors.push({ kind: 'truck', color: '#e0a020', keys: K([0, X, 258, 0]) }); crossing('ped', '#2a7de1', X + 60, 296, 148, crossT0, crossT1); break;
      case 'taxi': actors.push({ kind: 'car', color: '#f2f2f2', keys: K([0, X, 290, 0]) }); crossing('ped', '#2a7de1', X + 44, 305, 292, crossT0, crossT1); break;
      case 'tractor': actors.push({ kind: 'truck', color: '#2c8a3e', keys: K([s, 330, y], [e, 640, y]) }); break;
      case 'truck': actors.push({ kind: 'truck', keys: K([s, 330, y], [e, 760, y]) }); break;
      case 'ambulance': actors.push({ kind: 'ambulance', keys: K([s, -300, y], [at(0.5), 300, y], [at(0.65), 440, 206], [e, 900, 206]), siren: [[s, e]] }); break;
      case 'tram': actors.push({ kind: 'tram', keys: K([at(0.1), X, -90], [at(0.74), X, 540]) }); break;
    }
    // The queue the car waits behind.
    if (o.act === 'queue') for (let i = 0; i < 3; i++) actors.push({ kind: 'car', color: COLORS[i], keys: K([0, 620 + i * 66, y, 0]) });
    const ctx = {
      layout: 'road', opts: { centerType: o.line || 'dashed' }, extras, actors, night: !!o.night,
      build(h) {
        const g = h.layers.marks;
        const hole = (x, yy, rx, ry, fill) => h.el('ellipse', { cx: x, cy: yy, rx, ry, fill }, g);
        if (obj === 'island') { h.el('path', { d: 'M440 225 L520 205 L640 205 L720 225 L640 245 L520 245 Z', fill: 'rgba(255,255,255,.2)', stroke: '#fff', 'stroke-width': 3 }, g); for (let x = 470; x < 700; x += 22) h.el('line', { x1: x, y1: 245, x2: x + 22, y2: 205, stroke: '#fff', 'stroke-width': 4 }, g); }
        if (obj === 'hole') { [[470, 255, 16, 9], [520, 242, 11, 7], [575, 260, 19, 8], [640, 248, 13, 7]].forEach(([x, yy, a, b]) => hole(x, yy, a, b, '#2f3237')); }
        if (obj === 'ice') { h.el('rect', { x: 430, y: 180, width: 280, height: 90, rx: 18, fill: 'rgba(200,235,255,.72)' }, g); }
        if (obj === 'oil') { hole(530, 250, 70, 18, 'rgba(15,15,20,.7)'); hole(590, 240, 38, 10, 'rgba(15,15,20,.6)'); }
        if (obj === 'rock') { [[500, 232, 16], [540, 212, 10], [470, 205, 8], [572, 245, 9]].forEach(([x, yy, r]) => h.el('circle', { cx: x, cy: yy, r, fill: '#7d7468', stroke: '#4c463f' }, g)); }
        if (obj === 'narrowB' || obj === 'narrowL') h.el('path', { d: 'M430 150 L800 150 L800 196 L510 196 Z', fill: '#86b97a' }, g);
        if (obj === 'narrowB' || obj === 'narrowR') h.el('path', { d: 'M430 300 L800 300 L800 254 L510 254 Z', fill: '#86b97a' }, g);
        if (obj === 'junction') { h.el('rect', { x: 490, y: 268, width: 70, height: 182, fill: '#5a5f66' }, g); h.el('rect', { x: 490, y: 0, width: 70, height: 180, fill: '#5a5f66' }, g); }
        if (obj === 'train') {
          h.el('rect', { x: 490, y: 0, width: 40, height: 450, fill: '#7b6a58' }, g);
          for (const x of [497, 523]) h.el('rect', { x, y: 0, width: 3, height: 450, fill: '#d7d7d7' }, g);
          h.state.barrier = h.el('rect', { x: -60, y: -3, width: 120, height: 6, fill: '#d7263d', stroke: '#fff' }, h.layers.over);
          h.state.train = h.el('g', {}, h.layers.over);
          h.el('rect', { x: 490, y: -160, width: 40, height: 150, rx: 7, fill: '#3c6ea5', stroke: '#1d3b5e' }, h.state.train);
          h.el('rect', { x: 495, y: -150, width: 30, height: 40, rx: 3, fill: '#bfe3ff' }, h.state.train);
        }
        if (o.emoji) h.state.em = drawText(h.el, h.layers.over, 0, 0, o.emoji, { size: 56 });
        if (obj === 'animal' || obj === 'wild') { h.state.an = drawText(h.el, h.layers.over, 0, 0, obj === 'wild' ? '🦌' : '🐄', { size: 42 }); }
        if (o.m) {
          const p = h.el('g', { transform: 'translate(250 92)' }, h.layers.marks);
          h.el('rect', { x: -2, y: 44, width: 4, height: 58, fill: '#777' }, p);
          svgImg(h.el, p, o.m, -34, -26, 68);
        }
      },
      update(t, h) {
        if (h.state.em) { const f = Math.max(0, Math.min(1, (t - s) / dur)); const fly = o.emoji === '✈️'; h.state.em.setAttribute('x', fly ? 860 - f * 920 : 560); h.state.em.setAttribute('y', fly ? 110 : 122 + Math.sin(t * 5) * 4); }
        if (h.state.an) {
          const f = Math.max(0, Math.min(1, (t - at(0.3)) / (at(0.72) - at(0.3))));
          h.state.an.setAttribute('x', X); h.state.an.setAttribute('y', 130 + f * 200);
        }
        if (h.state.train) {
          const f = Math.max(0, Math.min(1, (t - at(0.25)) / (at(0.72) - at(0.25))));
          h.state.train.setAttribute('transform', `translate(0 ${f * 800})`);
          const down = t > at(0.15) && t < at(0.76);
          h.state.barrier.setAttribute('transform', `translate(470 ${down ? 225 : 150}) rotate(${down ? 90 : 0})`);
        }
      },
    };
    return ctx;
  }

  // ---------- template: curve, a road that bends ----------
  function curveTpl(o, c) {
    const paths = {
      R: [[-40, 130], [470, 130], [560, 480]], L: [[-40, 330], [470, 330], [560, -30]],
      RL: [[-40, 110], [300, 110], [380, 240]], LR: [[-40, 340], [300, 340], [380, 220]],
    };
    const [a, b, d] = paths[o.k || 'R'];
    const s = c.start, e = c.T, mid = s + (e - s) * 0.55;
    let keys = bez(a, b, d, s, o.k && o.k.length === 2 ? mid : e, 20).map(k => [k[0], k[1], k[2]]);
    let dPath = `M${a[0]} ${a[1]} Q${b[0]} ${b[1]} ${d[0]} ${d[1]}`;
    if (o.k === 'RL') { keys = keys.concat(bez([380, 240], [460, 370], [840, 370], mid, e, 20)); dPath += ' Q460 370 840 370'; }
    if (o.k === 'LR') { keys = keys.concat(bez([380, 220], [460, 100], [840, 100], mid, e, 20)); dPath += ' Q460 100 840 100'; }
    return {
      layout: 'diagram', opts: {},
      actors: [{ id: 'me', kind: 'car', color: '#d7263d', keys, brake: [[s + 0.4, s + (e - s) * 0.35]] }],
      build(h) {
        grassBg(h.el, h.layers.base);
        const p = (stroke, w, dash) => h.el('path', { d: dPath, fill: 'none', stroke, 'stroke-width': w, 'stroke-dasharray': dash || '' }, h.layers.base);
        p('#d6d0c4', 96); p('#5a5f66', 84); p('#fff', 2.5, o.overtake === false ? '' : '');
        if (o.m) { const q = h.el('g', { transform: 'translate(100 60)' }, h.layers.marks); svgImg(h.el, q, o.m, -30, -30, 60); }
      },
    };
  }

  // ---------- template: side, the road seen from the side ----------
  const TERRAIN = {
    hump: x => 330 - 95 * Math.exp(-Math.pow((x - 420) / 110, 2)),
    dip: x => 270 + 90 * Math.exp(-Math.pow((x - 420) / 110, 2)),
    down: x => (x < 220 ? 170 : x > 620 ? 350 : 170 + (x - 220) * 0.45),
    up: x => (x < 220 ? 350 : x > 620 ? 170 : 350 - (x - 220) * 0.45),
    rough: x => 310 + 7 * Math.sin(x / 11) + 5 * Math.sin(x / 4.7),
    flat: () => 320,
    bridge: x => (x > 300 && x < 520 ? 268 : 320 - 52 * Math.exp(-Math.pow((x < 300 ? x - 300 : x - 520) / 80, 2))),
    quay: () => 300,
  };
  function sideTpl(o, c) {
    const f = TERRAIN[o.k] || TERRAIN.flat;
    const s = c.start, e = c.T;
    const stopAt = o.k === 'quay' ? 500 : null;
    return {
      layout: 'diagram', opts: { bg: '#cfe7f7' },
      build(h) {
        const g = h.layers.base;
        h.el('circle', { cx: 700, cy: 70, r: 34, fill: '#ffe48a' }, g);
        if (o.k === 'quay') h.el('rect', { x: 610, y: 340, width: 190, height: 110, fill: '#3e8fcb' }, g);
        let d = 'M0 450';
        const end = o.k === 'quay' ? 610 : 800;
        for (let x = 0; x <= end; x += 8) d += ` L${x} ${f(x).toFixed(1)}`;
        d += ` L${end} 450 Z`;
        h.el('path', { d, fill: '#7fae6f' }, g);
        let road = '';
        for (let x = 0; x <= end; x += 6) road += `${x ? 'L' : 'M'}${x} ${f(x).toFixed(1)} `;
        h.el('path', { d: road, stroke: '#4d5157', 'stroke-width': 12, fill: 'none' }, g);
        if (o.k === 'bridge') h.el('rect', { x: 300, y: 276, width: 220, height: 174, fill: '#3e8fcb' }, g);
        const car = h.el('g', {}, h.layers.actors);
        h.el('path', { d: 'M-40 -6 L-40 -22 L-18 -25 L-7 -38 L22 -38 L34 -24 L46 -20 L46 -6 Z', fill: '#d7263d', stroke: 'rgba(0,0,0,.35)' }, car);
        h.el('path', { d: 'M-15 -25 L-5 -35 L19 -35 L28 -25 Z', fill: '#bfe3ff' }, car);
        for (const x of [-25, 31]) h.el('circle', { cx: x, cy: -5, r: 7, fill: '#222' }, car);
        h.state.car = car;
        if (o.m) { const q = h.el('g', { transform: `translate(120 ${f(120) - 108})` }, h.layers.marks); h.el('rect', { x: -2, y: 40, width: 4, height: 66, fill: '#777' }, q); svgImg(h.el, q, o.m, -32, -24, 64); }
      },
      update(t, h) {
        let p = Math.max(0, Math.min(1, (t - s) / (e - s)));
        // slower through the middle: the driver slows down for the hazard
        p = p < 0.5 ? 0.5 * Math.pow(2 * p, 0.8) : 1 - 0.5 * Math.pow(2 * (1 - p), 0.8);
        let x = -50 + p * 900;
        if (stopAt !== null) x = Math.min(x, stopAt);
        const y = f(x) - 5, ang = Math.atan2(f(x + 6) - f(x - 6), 12) * 180 / Math.PI;
        h.state.car.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
      },
    };
  }

  // ---------- template: vehicle, one type of vehicle from the side ----------
  function drawVehicle(el, parent, type, color) {
    const g = el('g', {}, parent);
    const w = (x, r = 14) => { el('circle', { cx: x, cy: -r, r, fill: '#222' }, g); el('circle', { cx: x, cy: -r, r: r * 0.42, fill: '#bbb' }, g); };
    const box = (x, y, wd, ht, fill = color, rx = 4) => el('rect', { x, y, width: wd, height: ht, rx, fill, stroke: 'rgba(0,0,0,.35)' }, g);
    const glass = (x, y, wd, ht) => el('rect', { x, y, width: wd, height: ht, rx: 3, fill: '#bfe3ff' }, g);
    const rider = x => { el('circle', { cx: x + 2, cy: -84, r: 9, fill: '#333' }, g); el('path', { d: `M${x} -76 L${x - 8} -46 L${x + 14} -44 L${x + 10} -74 Z`, fill: '#3a4a5a' }, g); };
    const scoot = (a, b) => { el('path', { d: `M${a} -22 L${b} -22 L${b - 6} -42 L${a + 22} -42 Z`, fill: color, stroke: 'rgba(0,0,0,.3)' }, g); el('line', { x1: b - 8, y1: -22, x2: b + 4, y2: -66, stroke: '#333', 'stroke-width': 4 }, g); };
    switch (type) {
      case 'moped': w(-34, 12); w(36, 12); scoot(-34, 36); rider(-8); break;
      case 'moto': w(-42); w(44); el('path', { d: 'M-40 -24 L-8 -46 L26 -46 L44 -24 L6 -14 Z', fill: color, stroke: 'rgba(0,0,0,.3)' }, g); el('line', { x1: 30, y1: -46, x2: 44, y2: -68, stroke: '#333', 'stroke-width': 4 }, g); rider(-6); break;
      case 'trike': w(-44, 14); w(-22, 14); w(50, 14); scoot(-44, 50); rider(-6); break;
      case 'quad': w(-44, 13); w(46, 13); box(-58, -56, 118, 40); glass(4, -52, 36, 22); box(-44, -74, 60, 22, color); glass(-34, -71, 40, 16); break;
      case 'car': case 'taxi': el('path', { d: 'M-80 -16 L-80 -42 L-44 -46 L-22 -70 L34 -70 L56 -44 L84 -38 L84 -16 Z', fill: type === 'taxi' ? '#f2f2f2' : color, stroke: 'rgba(0,0,0,.35)' }, g); el('path', { d: 'M-34 -47 L-18 -66 L30 -66 L46 -47 Z', fill: '#bfe3ff' }, g); w(-48); w(54); if (type === 'taxi') { box(-14, -80, 34, 10, '#ffd23f', 2); } break;
      case 'van': box(-92, -84, 130, 68); box(38, -62, 48, 46, '#ddd'); glass(46, -58, 34, 22); w(-58); w(56); break;
      case 'truck': box(-130, -100, 170, 82); box(40, -76, 52, 58, '#e9e9e9'); glass(52, -70, 32, 26); w(-92); w(-50); w(66); break;
      case 'bus': box(-130, -92, 262, 76); for (let x = -118; x < 110; x += 44) glass(x, -84, 34, 26); w(-84); w(92); break;
      case 'trailer': box(-32, -70, 96, 54, '#aab2bd'); el('line', { x1: -32, y1: -24, x2: -74, y2: -24, stroke: '#333', 'stroke-width': 4 }, g); w(18); el('g', { transform: 'translate(-158 0)' }, g).appendChild(drawVehicle(el, null, 'car', color)); break;
      case 'caravan': el('rect', { x: -30, y: -86, width: 118, height: 70, rx: 12, fill: '#f4f1ea', stroke: '#999' }, g); glass(0, -72, 34, 20); el('line', { x1: -30, y1: -24, x2: -74, y2: -24, stroke: '#333', 'stroke-width': 4 }, g); w(30); el('g', { transform: 'translate(-158 0)' }, g).appendChild(drawVehicle(el, null, 'car', color)); break;
      case 'camper': el('path', { d: 'M-110 -16 L-110 -100 L34 -100 L44 -82 L44 -66 L92 -50 L92 -16 Z', fill: '#f4f1ea', stroke: '#999' }, g); glass(-84, -84, 38, 22); glass(50, -62, 28, 20); w(-70); w(60); break;
      case 'tractor': box(-30, -66, 76, 34, '#2c8a3e'); box(-40, -104, 44, 42, '#2c8a3e'); glass(-34, -98, 32, 28); w(-24, 26); w(50, 13); break;
      case 'plough': box(-70, -82, 110, 66, '#f08a24'); box(40, -66, 40, 50, '#ddd'); glass(46, -60, 28, 20); w(-40); w(54); el('path', { d: 'M86 -8 L126 -50 L126 -4 Z', fill: '#d7263d' }, g); break;
    }
    return g;
  }
  const SPECS = {
    moped: [['2 or 3 wheels', 'عجلتين أو تلاتة'], ['Max 45 km/h', 'أقصى سرعة 45 كم/س'], ['Up to 50 cc', 'لحد 50 سي سي']],
    moto: [['2 wheels', 'عجلتين'], ['Over 45 km/h', 'أكتر من 45 كم/س'], ['Not a moped', 'مش ciclomotore']],
    trike: [['3 symmetrical wheels', '3 عجل متماثلين'], ['Over 50 cc', 'أكبر من 50 سي سي'], ['Inspection: 4 years, then every 2', 'الفحص: بعد 4 سنين، وبعدين كل سنتين']],
    quad: [['4 wheels', '4 عجل'], ['Not an autoveicolo', 'مش autoveicolo'], ['Periodic inspection', 'فحص دوري']],
    car: [['Carries people', 'لنقل الناس'], ['Up to 9 seats', 'لحد 9 مقاعد'], ['Periodic inspection', 'فحص دوري']],
    van: [['Autoveicolo', 'Autoveicolo'], ['Cars, lorries, buses', 'ملاكي ونقل وأتوبيس']],
    truck: [['Carries goods', 'لنقل البضاعة'], ['Reflective panels over 3.5 t', 'لوحات عاكسة فوق 3.5 طن']],
    trailer: [['No engine', 'من غير موتور'], ['Towed', 'بتتسحب'], ['Light: up to 750 kg', 'الخفيفة: لحد 750 كجم']],
    caravan: [['A trailer', 'مقطورة'], ['Has its own plate', 'ليها لوحة أرقام'], ['Stay only when stopped', 'الإقامة وهي واقفة بس']],
    camper: [['Has an engine', 'ليها موتور'], ['Not a trailer', 'مش مقطورة'], ['Periodic inspection', 'فحص دوري']],
    tractor: [['Wheels or tracks', 'عجل أو جنزير'], ['Registered to use roads', 'لازم تسجيل للطريق'], ['No passengers', 'مش لنقل ركاب']],
  };
  for (const list of Object.values(SPECS)) for (const [en, ar] of list) pair(en, ar);
  function vehicleTpl(o, c) {
    const s = c.start, e = c.T, arrive = s + Math.min(2, (e - s) * 0.4);
    return {
      layout: 'diagram', opts: { bg: '#dcefff' },
      build(h) {
        const g = h.layers.base;
        h.el('rect', { x: 0, y: 330, width: 800, height: 120, fill: '#5a5f66' }, g);
        h.el('rect', { x: 0, y: 310, width: 800, height: 20, fill: '#86b97a' }, g);
        h.el('line', { x1: 0, x2: 800, y1: 390, y2: 390, stroke: '#fff', 'stroke-width': 3, 'stroke-dasharray': '30 22' }, g);
        h.state.v = drawVehicle(h.el, h.layers.actors, o.t, o.c || '#d7263d');
        h.state.chips = o.row ? [] : (o.spec || SPECS[o.t] || []).map(([en], i, all) => {
          const g = h.el('g', {}, h.layers.labels);
          const text = h.tl(en), wd = Math.min(640, 34 + text.length * 10.5), y = 76 + i * 50;
          h.el('rect', { x: 400 - wd / 2, y, width: wd, height: 38, rx: 10, fill: '#fff', stroke: '#0b6e4f', 'stroke-width': 2 }, g);
          drawText(h.el, g, 400, y + 26, text, { size: 19, fill: '#0b4f3a' });
          return { g, cy: y + 19, at: s + 0.5 + i * ((e - s - 1) / Math.max(1, all.length)) };
        });
        if (o.row) o.row.forEach(([t, ok], i) => {
          const w = h.el('g', { transform: `translate(${130 + i * 540 / Math.max(1, o.row.length - 1)} 150) scale(.5)` }, h.layers.marks);
          drawVehicle(h.el, w, t, COLORS[i % COLORS.length]);
          h.el('circle', { cx: 80, cy: -130, r: 22, fill: ok ? '#2fa84f' : '#d7263d' }, w);
          drawText(h.el, w, 80, -120, ok ? '✓' : '✕', { size: 30, fill: '#fff' });
        });
      },
      update(t, h) {
        const f = Math.max(0, Math.min(1, (t - s) / (arrive - s)));
        const x = -220 + (1 - Math.pow(1 - f, 3)) * 620;
        const shake = f < 1 ? Math.sin(t * 40) * 0.7 : 0;
        h.state.v.setAttribute('transform', `translate(${x.toFixed(1)} ${(o.row ? 360 : 362) + shake})${o.row ? '' : ' scale(1.25)'}`);
        for (const chip of h.state.chips) pop(chip.g, 400, chip.cy, (t - chip.at) / 0.45);
      },
    };
  }

  // ---------- template: cross, a junction with cars that take turns ----------
  // lay: cross | tee | round. cars: [from N/E/S/W, to N/E/S/W, order of going, colour or 'A'-style label].
  // light: traffic-light sequence for the first car; sign: picture beside the road; officer: true.
  const ENTRY = { W: [300, 250], E: [500, 200], S: [425, 325], N: [375, 125] };
  const FAR = { W: [-60, 200], E: [860, 250], S: [375, 500], N: [425, -60] };
  const START = { W: [-60, 250], E: [860, 200], S: [425, 500], N: [375, -60] };
  const CENTRE = { WE: null, EW: null, SN: null, NS: null };
  function routeKeys(from, to, t0, tGo, tEnd) {
    const a = START[from], b = ENTRY[from], d = FAR[to];
    const mid = (tGo + tEnd) / 2;
    const straight = (from === 'W' && to === 'E') || (from === 'E' && to === 'W') || (from === 'N' && to === 'S') || (from === 'S' && to === 'N');
    const keys = [[t0, a[0], a[1]], [Math.min(t0 + 1.4, tGo), b[0], b[1]], [tGo, b[0], b[1]]];
    if (straight) keys.push([tEnd, d[0], d[1]]);
    else {
      const ctrl = [from === 'W' || from === 'E' ? d[0] === -60 || d[0] === 860 ? 400 : d[0] : b[0], to === 'W' || to === 'E' ? d[1] : b[1]];
      for (const k of bez(b, ctrl, [to === 'N' || to === 'S' ? d[0] : (to === 'E' ? 500 : 300), to === 'N' || to === 'S' ? (to === 'S' ? 325 : 125) : d[1]], tGo, mid, 10)) keys.push(k);
      keys.push([tEnd, d[0], d[1]]);
    }
    return keys;
  }
  void CENTRE;
  function crossTpl(o, c) {
    const s = c.start, e = c.T;
    const cars = o.cars || [['W', 'E', 0]];
    const n = cars.reduce((a, x) => Math.max(a, x[2] || 0), 0) + 1;
    const slot = (e - s - 1.2) / n;
    const actors = cars.map((x, i) => {
      const tGo = s + 1.2 + (x[2] || 0) * slot;
      const turnRight = (x[0] === 'W' && x[1] === 'S') || (x[0] === 'S' && x[1] === 'E') || (x[0] === 'E' && x[1] === 'N') || (x[0] === 'N' && x[1] === 'W');
      const straight = (x[0] === 'W' && x[1] === 'E') || (x[0] === 'E' && x[1] === 'W') || (x[0] === 'N' && x[1] === 'S') || (x[0] === 'S' && x[1] === 'N');
      return {
        kind: x[4] || 'car', color: i === 0 ? '#d7263d' : COLORS[i % COLORS.length], label: x[3] || undefined,
        keys: routeKeys(x[0], x[1], s, tGo, tGo + slot + 0.4), blink: straight ? undefined : [[s, tGo + slot * 0.4, turnRight ? 'R' : 'L']],
        brake: [[s + 0.8, tGo]], siren: x[4] === 'ambulance' || x[4] === 'police' ? [[s, e]] : undefined,
      };
    });
    if (o.officer) actors.push({ kind: 'officer', keys: [[0, 400, 225, 0]], arms: o.arms || [[0, 0]] });
    const extras = [];
    if (o.light) extras.push({ type: 'light', x: 318, y: 310, seq: o.light });
    if (o.lightCross) extras.push({ type: 'light', x: 490, y: 130, seq: o.lightCross });
    if (o.zebra) extras.push({ type: 'zebra', x: 352, y: 300, w: 96, h: 36, dir: 'h' });
    return {
      layout: o.lay === 'tee' ? 'tee' : 'cross', opts: { stopLines: o.lines !== false, stopLine: o.stopLine }, actors, extras,
      build(h) {
        if (o.m) { const q = h.el('g', { transform: 'translate(250 90)' }, h.layers.marks); svgImg(h.el, q, o.m, -34, -34, 68); }
      },
    };
  }

  // ---------- template: card, a key idea on a picture background ----------
  // Each step's third value is an emoji; the bold words of its caption become the card's title.
  function cardTpl(o, c) {
    const bgs = { sky: '#dcefff', sand: '#f4ecd8', mint: '#dff3e7', rose: '#fbe6e6', night: '#1c2a44', grey: '#e6e8eb' };
    const ctx = {
      layout: 'diagram', opts: { bg: bgs[o.bg] || bgs.sky },
      build(h) {
        h.state.cards = c.steps.map((st, i) => {
          const g = h.el('g', {}, h.layers.marks);
          const n = c.steps.length;
          const cx = n === 1 ? 400 : 400 + (i - (n - 1) / 2) * Math.min(250, 640 / n);
          drawText(h.el, g, cx, 215, st.h || o.icon || '💡', { size: n > 2 ? 86 : 110 });
          h.state['p' + i] = { g, cx };
          return g;
        });
        h.state.car = null;
        if (o.road) {
          h.el('rect', { x: 0, y: 370, width: 800, height: 80, fill: '#5a5f66' }, h.layers.base);
          h.el('line', { x1: 0, x2: 800, y1: 410, y2: 410, stroke: '#fff', 'stroke-width': 3, 'stroke-dasharray': '30 22' }, h.layers.base);
          h.state.car = drawVehicle(h.el, h.layers.actors, o.road === true ? 'car' : o.road, '#d7263d');
        }
      },
      update(t, h) {
        c.steps.forEach((st, i) => {
          const p = h.state['p' + i];
          pop(p.g, p.cx, 180, (t - st.t - 0.1) / 0.5);
          const active = t >= st.t && t < st.t + st.d;
          if (active) p.g.setAttribute('transform', p.g.getAttribute('transform') + ` translate(0 ${(Math.sin((t - st.t) * 3) * 5).toFixed(1)})`);
          p.g.style.opacity = t < st.t + 0.1 ? 0 : active ? 1 : 0.32;
        });
        if (h.state.car) h.state.car.setAttribute('transform', `translate(${((t * 70) % 1000 - 100).toFixed(1)} 412) scale(.55)`);
      },
    };
    return ctx;
  }

  // ---------- template: ban, a banned vehicle stops and turns back, an allowed one drives through ----------
  // no / yes: actor kinds ('none' for nobody); noColor, yesColor; m: the sign.
  function banTpl(o, c) {
    const s = c.start, e = c.T, dur = Math.max(2, e - s), at = f => s + dur * f;
    const actors = [];
    if (o.no && o.no !== 'none') {
      actors.push({ id: 'no', kind: o.no, color: o.noColor || '#d7263d', keys: K([s, -80, 250], [at(0.25), 300, 250], [at(0.45), 300, 250], [at(0.55), 240, 200], [at(0.8), -80, 200]), brake: [[at(0.18), at(0.45)]], blink: [[at(0.3), at(0.55), 'L']] });
    }
    if (o.yes && o.yes !== 'none') {
      const y = o.yes === 'ped' ? 288 : 250;
      actors.push({ id: 'yes', kind: o.yes, color: o.yesColor || '#2fa84f', keys: K([at(0.45), -60, y], [e, o.yes === 'ped' ? 700 : 880, y]), show: [at(0.45), e + 1] });
    }
    return {
      layout: 'road', opts: {}, actors,
      build(h) {
        const g = h.layers.over;
        if (o.m) { const q = h.el('g', { transform: 'translate(405 112)' }, g); h.el('rect', { x: -2, y: 30, width: 4, height: 50, fill: '#777' }, q); svgImg(h.el, q, o.m, -38, -36, 76); }
        h.el('line', { x1: 400, y1: 176, x2: 400, y2: 274, stroke: '#d7263d', 'stroke-width': 4, 'stroke-dasharray': '10 8' }, h.layers.marks);
        const badge = (ok) => { const b = h.el('g', {}, g); h.el('circle', { r: 17, fill: ok ? '#1f9d55' : '#d7263d', stroke: '#fff', 'stroke-width': 2 }, b); drawText(h.el, b, 0, 8, ok ? '✓' : '✕', { size: 22, fill: '#fff' }); return b; };
        h.state.noB = badge(false); h.state.yesB = badge(true);
      },
      update(t, h, a) {
        const place = (b, p, on) => { b.style.display = on && p ? '' : 'none'; if (on && p) b.setAttribute('transform', `translate(${p.x.toFixed(1)} ${(p.y - 36).toFixed(1)})`); };
        place(h.state.noB, a.no, t >= at(0.15) && t < at(0.8));
        place(h.state.yesB, a.yes, t >= at(0.48));
      },
    };
  }

  // ---------- template: dist, following distance and stopping distance ----------
  // stop: true shows a hazard, then the yellow reaction bar and the red braking bar. Otherwise a car follows at a safe gap.
  // fx: weather; long: stretches the braking bar (a wet road); me: the car's kind.
  function distTpl(o, c) {
    const s = c.start, e = c.T, dur = Math.max(2, e - s), y = 250;
    const see = s + dur * 0.28, brake = s + dur * 0.42, halt = s + dur * 0.78;
    const seeX = 200, brakeX = 340, haltX = o.long ? 660 : 520;
    const lead = o.stop ? null : { kind: o.lead || 'truck', keys: K([s, 260, y], [e, 860, y]) };
    const gap = o.gap || 170;
    const me = o.stop
      ? { id: 'me', kind: 'car', keys: K([s, -40, y], [see, seeX, y], [brake, brakeX, y], [halt, haltX, y], [e, haltX, y]), brake: [[brake, e]] }
      : { id: 'me', kind: 'car', keys: K([s, 260 - gap, y], [e, 860 - gap, y]) };
    return {
      layout: 'road', opts: {}, actors: lead ? [me, lead] : [me],
      build(h) {
        const g = h.layers.labels;
        const bar = (color, label, yy) => {
          const b = h.el('g', {}, g);
          const line = h.el('rect', { y: yy, height: 12, rx: 3, fill: color }, b);
          const text = drawText(h.el, b, 0, yy + 34, h.tl(label), { size: 17, fill: color, outline: 'rgba(255,255,255,.95)' });
          return { b, line, text };
        };
        h.state.bars = o.stop ? { a: bar('#d99a00', 'Reaction distance', 306), b: bar('#d7263d', 'Braking distance', 350) } : { a: bar('#1f9d55', 'Safe distance', 306) };
        if (o.stop) drawText(h.el, h.layers.over, Math.min(haltX + 90, 760), 262, '⚠️', { size: 42 });
      },
      update(t, h, a) {
        const set = (x, x0, x1, on) => { x.b.style.display = on && x1 > x0 + 1 ? '' : 'none'; x.line.setAttribute('x', x0); x.line.setAttribute('width', Math.max(0, x1 - x0)); x.text.setAttribute('x', (x0 + x1) / 2); };
        if (o.stop) {
          const X = a.me ? a.me.x : 0;
          set(h.state.bars.a, seeX, Math.min(X, brakeX), t >= see);
          set(h.state.bars.b, brakeX, Math.min(X, haltX), t >= brake);
        } else if (a.me) set(h.state.bars.a, a.me.x + 22, a.me.x + gap - 42, true);
      },
    };
  }

  // ---------- template: figure, a diagram from the exam shown large ----------
  function figureTpl(o, c) {
    return {
      layout: 'diagram', opts: { bg: '#f7f5ef' },
      build(h) { h.state.fig = h.el('g', {}, h.layers.marks); svgImg(h.el, h.state.fig, o.m, 400 - 190, 56, 380); },
      update(t, h) {
        const k = 1 + 0.08 * Math.min(1, t / Math.max(1, c.T));
        h.state.fig.setAttribute('transform', `translate(400 246) scale(${k.toFixed(3)}) translate(-400 -246)`);
      },
    };
  }

  const TEMPLATES = { dist: distTpl, figure: figureTpl, ban: banTpl, road: roadTpl, ramp: rampTpl, drive: driveTpl, curve: curveTpl, side: sideTpl, vehicle: vehicleTpl, cross: crossTpl, card: cardTpl };

  // ---------- turning a script into a scenario ----------
  function scenarioFor(chId, sub) {
    const sc = (SCRIPTS[chId] || {})[sub.id];
    if (!sc) return null;
    const exams = examSteps(sub, window.QDATA_AR);
    const imgs = (sc.m || [...new Set(sub.qs.map(q => q.m).filter(Boolean))]).slice(0, 4);
    const [tplName, tplOpts = {}] = sc.v || ['card', {}];
    const closeup = imgs.length && tplName !== 'card' && tplName !== 'figure' && !sc.noClose;
    const d = sc.d || STEP;
    const lines = sc.s.slice();
    if (sc.auto) {
      const used = exams.map(x => x.q.i), q = sub.qs.filter(x => x.a === 1 && x.e && !used.includes(x.i) && !mismatch(x)).sort((x, y) => y.e.length - x.e.length)[0];
      const a = q && window.QDATA_AR && window.QDATA_AR[q.i];
      if (q) lines.push([`<b>The answer:</b> ${q.e}`, a && a[0] ? `<b>الإجابة:</b> ${a[0]}` : null]);
    }
    const hand = lines.map((st, i) => ({ t: i * d, d, text: pair(st[0], st[1]), h: st[2] }));
    if (hand.length === 1 && closeup) hand[0].d = d + 2;
    const T = hand.reduce((a, x) => a + x.d, 0);
    const start = closeup ? Math.min(CLOSEUP, hand[0].d - 1) : 0;
    const opts = closeup && tplOpts.m === undefined ? { ...tplOpts, m: imgs[0] } : tplOpts;
    const ctx = TEMPLATES[tplName](opts, { start, T, steps: hand });
    addFx(ctx, tplOpts.fx);

    const extras = (ctx.extras || []).slice();
    for (const st of hand) {
      const part = st.h && ctx.parts && ctx.parts[st.h];
      if (!part) continue;
      const a = Math.max(st.t, start), b = st.t + st.d;
      extras.push({ type: 'zone', x: part.x, y: part.y, w: part.w, h: part.h, fill: 'rgba(255,210,63,.32)', stroke: '#ffd23f', t0: a, t1: b, layer: 'under' });
      const label = WORD[part.word || st.h];
      if (label) extras.push({ type: 'label', x: 400, y: part.y < 120 ? part.y + part.h + 26 : part.y - 10, text: label[0], size: 16, t0: a, t1: b });
    }
    const examT = exams.map((x, i) => T + i * EXAM);
    const duration = T + exams.length * EXAM + 0.4;
    const prevBuild = ctx.build, prevUpdate = ctx.update;
    const steps = hand.map(st => ({ t: st.t, text: st.text })).concat(exams.map((x, i) => {
      if (x.ar) AR[x.text] = x.ar;
      return { t: examT[i], text: x.text };
    }));
    return {
      title: pair(sub.en, sub.ar || (window.TOPICS_AR && window.TOPICS_AR[`${chId}/${sub.id}`])),
      layout: ctx.layout, opts: ctx.opts, night: ctx.night, extras, actors: ctx.actors || [], duration, steps, audioDir: 'topics', topic: true,
      build(h) {
        if (prevBuild) prevBuild(h);
        buildOverlays(h, imgs, closeup, hand, exams, sub);
      },
      update(t, h, a) {
        if (prevUpdate) prevUpdate(t, h, a);
        updateOverlays(t, h, closeup ? start : 0, hand, exams, examT);
      },
    };
  }

  // The bold words of a caption, used as the term banner on the picture.
  const boldOf = html => { const m = /<b>(.*?)<\/b>/.exec(html); const w = m ? m[1].replace(/<[^>]+>/g, '') : ''; return w.charAt(0).toUpperCase() + w.slice(1); };
  function buildOverlays(h, imgs, closeup, hand, exams) {
    const { el, layers } = h, top = el('g', { 'pointer-events': 'none' }, layers.labels);
    const tl = s => (window.I18N ? window.I18N.tl(s) : s);
    // term banner
    h.state.banners = hand.map(st => {
      const word = boldOf(tl(st.text));
      if (!word) return null;
      const g = el('g', {}, top);
      const wd = Math.min(740, 40 + word.length * 10.2);
      el('rect', { x: 400 - wd / 2, y: 12, width: wd, height: 36, rx: 18, fill: '#0b6e4f', stroke: '#fff', 'stroke-width': 2 }, g);
      drawText(el, g, 400, 37, word, { size: 19, fill: '#fff' });
      return g;
    });
    // close-up of the real signs
    if (closeup) {
      const g = el('g', {}, top);
      el('rect', { x: 0, y: 0, width: 800, height: 450, fill: '#f7f5ef' }, g);
      const s = imgs.length === 1 ? 300 : imgs.length === 2 ? 240 : 180;
      h.state.close = { g, signs: imgs.map((m, i) => {
        const n = imgs.length, cx = 400 + (i - (n - 1) / 2) * (s + 14);
        const sg = el('g', {}, g);
        svgImg(el, sg, m, cx - s / 2, 245 - s / 2, s);
        return { sg, cx };
      }) };
    }
    // exam cards
    h.state.exams = exams.map(x => {
      const g = el('g', {}, top);
      el('rect', { x: 0, y: 0, width: 800, height: 450, fill: 'rgba(10,20,30,.62)' }, g);
      el('rect', { x: 60, y: 44, width: 680, height: 362, rx: 18, fill: '#fff' }, g);
      drawText(el, g, 400, 80, tl('Italian exam wording'), { size: 15, fill: '#667' });
      const hasImg = !!x.q.m;
      if (hasImg) svgImg(el, g, x.q.m, 84, 110, 200);
      wrap(el, g, hasImg ? 512 : 400, hasImg ? 145 : 165, x.q.t, hasImg ? 400 : 600, x.q.t.length > 120 ? 22 : 27);
      const stamp = el('g', {}, g);
      const ok = x.q.a === 1, col = ok ? '#1f9d55' : '#d7263d';
      el('rect', { x: 300, y: 336, width: 200, height: 54, rx: 10, fill: 'none', stroke: col, 'stroke-width': 5 }, stamp);
      drawText(el, stamp, 400, 374, ok ? 'VERO ✓' : 'FALSO ✕', { size: 32, weight: 800, fill: col });
      return { g, stamp };
    });
  }
  function updateOverlays(t, h, closeEnd, hand, exams, examT) {
    (h.state.banners || []).forEach((b, i) => {
      if (!b) return;
      const st = hand[i], on = t >= st.t && t < st.t + st.d && t >= closeEnd - 0.01;
      b.style.opacity = on ? 1 : 0;
    });
    if (h.state.close) {
      const { g, signs } = h.state.close;
      g.style.opacity = t < closeEnd - 0.4 ? 1 : t > closeEnd ? 0 : (closeEnd - t) / 0.4;
      g.style.display = t > closeEnd ? 'none' : '';
      signs.forEach((s, i) => pop(s.sg, s.cx, 245, (t - 0.1 - i * 0.35) / 0.5));
    }
    h.state.exams.forEach((x, i) => {
      const a = examT[i], b = examT[i + 1] ?? Infinity, on = t >= a && t < b;
      x.g.style.display = on ? '' : 'none';
      if (on) pop(x.stamp, 400, 362, (t - a - 1.1) / 0.45);
    });
  }

  window.TopicScenes = {
    scenarioFor,
    mismatch,
    // Topics of a chapter that have an animation; a script may add topics of its own with `extra`, which come first.
    list(ch) {
      const scripts = SCRIPTS[ch.id] || {};
      const extra = Object.entries(scripts).filter(([, v]) => v.extra).map(([id, v]) => ({ id, en: v.extra[0], ar: v.extra[1], it: v.extra[2], qs: [] }));
      return extra.concat(ch.subs.filter(x => scripts[x.id]));
    },
    has: chId => !!SCRIPTS[chId],
    // Loads the script of a chapter once.
    load(chId) {
      return new Promise(done => {
        if (SCRIPTS[chId]) return done();
        const s = document.createElement('script');
        s.src = `js/topics/${chId}.js`;
        s.onload = s.onerror = () => done();
        document.head.appendChild(s);
      });
    },
  };
})();
