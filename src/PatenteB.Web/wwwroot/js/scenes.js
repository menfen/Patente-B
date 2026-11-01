// Animated driving scenarios: a small SVG scene engine.
// A scenario is plain data (layout, signs, actors with keyframes, captioned steps) plus optional
// build/update hooks for custom drawings. See scenarios.js for the scenario definitions.
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const W = 800, H = 450;
  const COL = {
    grass: '#86b97a', grassDark: '#6fa364', road: '#5a5f66', roadEdge: '#4b4f55', walk: '#d6d0c4',
    line: '#ffffff', yellow: '#f2c230', red: '#d7263d', blue: '#1f5fbf', night: '#08101f',
  };

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const lerp = (a, b, f) => a + (b - a) * f;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Scene text in the current language (see i18n.js); English when no translation exists.
  const tl = s => (window.I18N ? window.I18N.tl(s) : s);
  const tx = (en, ar) => (window.I18N ? window.I18N.tx(en, ar) : en);
  // Voice and sound on/off, shared with Settings in app.js.
  const audioOn = () => !window.AppSettings || window.AppSettings.get('sceneAudio') !== false;

  // ---------- sound (Web Audio, no files) ----------
  // One shared context; each player owns an engine hum, a two-tone siren and an indicator click.
  let actx = null;
  function audioCtx() {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!actx) actx = new C();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function makeSound() {
    const ctx = audioCtx();
    if (!ctx) return null;
    const out = ctx.createGain(); out.gain.value = 0.9; out.connect(ctx.destination);
    // engine: low sawtooth through a low-pass filter, louder and higher when vehicles move faster
    const eng = ctx.createOscillator(); eng.type = 'sawtooth'; eng.frequency.value = 48;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const eg = ctx.createGain(); eg.gain.value = 0;
    eng.connect(lp); lp.connect(eg); eg.connect(out); eng.start();
    // siren: Italian two-tone ("bitonale")
    const sir = ctx.createOscillator(); sir.type = 'triangle'; sir.frequency.value = 440;
    const sg = ctx.createGain(); sg.gain.value = 0;
    sir.connect(sg); sg.connect(out); sir.start();
    const ramp = (p, v) => p.setTargetAtTime(v, ctx.currentTime, 0.06);
    return {
      update(engine, speed, siren, sirenHigh) {
        ramp(eg.gain, engine ? Math.min(0.07, 0.015 + speed * 0.0004) : 0);
        ramp(eng.frequency, 42 + Math.min(70, speed * 0.25));
        ramp(sg.gain, siren ? 0.045 : 0);
        sir.frequency.setTargetAtTime(sirenHigh ? 660 : 440, ctx.currentTime, 0.01);
      },
      click() {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square'; o.frequency.value = 1800;
        g.gain.setValueAtTime(0.05, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
        o.connect(g); g.connect(out); o.start(); o.stop(ctx.currentTime + 0.04);
      },
      chime() {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        o.connect(g); g.connect(out); o.start(); o.stop(ctx.currentTime + 0.4);
      },
      silence() { ramp(eg.gain, 0); ramp(sg.gain, 0); },
      close() { try { eng.stop(); sir.stop(); out.disconnect(); } catch { /* already stopped */ } },
    };
  }

  // ---------- keyframe helpers (used by scenarios.js) ----------
  // Quadratic bezier from p0 via control p1 to p2, timed from t0 to t1.
  function bez(p0, p1, p2, t0, t1, n = 12) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n, g = 1 - f;
      out.push([lerp(t0, t1, f), g * g * p0[0] + 2 * g * f * p1[0] + f * f * p2[0], g * g * p0[1] + 2 * g * f * p1[1] + f * f * p2[1]]);
    }
    return out;
  }
  // Arc around (cx,cy); angles in degrees, counter-clockwise on screen when a1 > a0.
  function arc(cx, cy, r, a0, a1, t0, t1, n = 16) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n, a = lerp(a0, a1, f) * Math.PI / 180;
      out.push([lerp(t0, t1, f), cx + r * Math.cos(a), cy - r * Math.sin(a)]);
    }
    return out;
  }

  // ---------- layouts ----------
  function bg(g, color) {
    el('rect', { x: 0, y: 0, width: W, height: H, fill: color || COL.grass }, g);
    if (!color) el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#scGrass)' }, g);
  }
  // Grass areas of each layout where trees and houses can stand without covering the road.
  const DECOR = {
    road: [[0, 0, 800, 140], [0, 310, 800, 140]],
    cross: [[0, 0, 325, 150], [475, 0, 325, 150], [0, 300, 325, 150], [475, 300, 325, 150]],
    tee: [[0, 0, 800, 140], [0, 310, 325, 140], [475, 310, 325, 140]],
    roundabout: [[0, 0, 340, 165], [460, 0, 340, 165], [0, 285, 340, 165], [460, 285, 340, 165]],
    motorway: [[0, 0, 800, 62], [345, 318, 455, 132]],
  };
  // Scatters trees, bushes and the odd house, the same way every time for a given scenario.
  function decorate(g, sc) {
    const zones = DECOR[sc.layout];
    if (!zones) return;
    let seed = 7;
    for (const c of sc.title || '') seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    // keep clear of signs, labels and anything that moves
    const busy = [];
    for (const x of sc.extras || []) if (x.x !== undefined && x.y !== undefined) busy.push([x.x, x.y, 46]);
    for (const x of sc.extras || []) if (x.type === 'zebra' || x.type === 'zone' || x.type === 'rect') busy.push([x.x + x.w / 2, x.y + x.h / 2, Math.max(x.w, x.h) / 2 + 20]);
    for (const a of sc.actors || []) for (const k of a.keys) busy.push([k[1], k[2], 34]);
    const free = (x, y, r) => !busy.some(([bx, by, br]) => Math.hypot(x - bx, y - by) < br + r) &&
      (sc.layout !== 'roundabout' || Math.hypot(x - 400, y - 225) > 170 + r);
    for (const [zx, zy, zw, zh] of zones) {
      const n = Math.round(zw * zh / 5200);
      for (let i = 0; i < n; i++) {
        const house = rnd() < 0.18 && zh > 100;
        const r = house ? 22 : 7 + rnd() * 9;
        const x = zx + r + rnd() * (zw - 2 * r), y = zy + r + rnd() * (zh - 2 * r);
        if (!free(x, y, r)) continue;
        busy.push([x, y, r]);
        if (house) {
          const w = 34 + rnd() * 14, h = 26 + rnd() * 10, roof = ['#b5523b', '#8e4a3a', '#6d6f75'][Math.floor(rnd() * 3)];
          el('rect', { x: x - w / 2 + 4, y: y - h / 2 + 5, width: w, height: h, fill: 'rgba(0,0,0,.22)', rx: 2 }, g);
          el('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, fill: roof, rx: 2 }, g);
          el('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h / 2, fill: 'rgba(255,255,255,.14)' }, g);
          el('line', { x1: x - w / 2, y1: y, x2: x + w / 2, y2: y, stroke: 'rgba(0,0,0,.25)', 'stroke-width': 1.5 }, g);
        } else {
          const dark = ['#3f7a3a', '#4b8a43', '#356b33'][Math.floor(rnd() * 3)];
          el('circle', { cx: x + 3, cy: y + 4, r, fill: 'rgba(0,0,0,.2)' }, g);
          el('circle', { cx: x, cy: y, r, fill: dark }, g);
          el('circle', { cx: x - r * 0.3, cy: y - r * 0.3, r: r * 0.55, fill: 'rgba(255,255,255,.13)' }, g);
        }
      }
    }
  }
  // Shared gradients and textures (one copy per page).
  function ensureDefs() {
    if (document.getElementById('scDefs')) return;
    const s = el('svg', { id: 'scDefs', width: 0, height: 0, style: 'position:absolute;width:0;height:0', 'aria-hidden': 'true' });
    const d = el('defs', {}, s);
    const p = el('pattern', { id: 'scGrass', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, d);
    for (const [x, y] of [[3, 5], [15, 2], [9, 14], [20, 18], [2, 21]]) el('path', { d: `M${x} ${y + 3} l1.5 -4 l1.5 4`, stroke: 'rgba(40,90,40,.28)', 'stroke-width': 1, fill: 'none' }, p);
    const a = el('pattern', { id: 'scAsphalt', width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, d);
    for (const [x, y, o] of [[2, 3, .07], [9, 7, .05], [13, 13, .08], [5, 12, .06]]) el('circle', { cx: x, cy: y, r: 1, fill: `rgba(255,255,255,${o})` }, a);
    const sh = el('linearGradient', { id: 'scShine', x1: 0, y1: 0, x2: 0, y2: 1 }, d);
    el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.32 }, sh);
    el('stop', { offset: 0.5, 'stop-color': '#fff', 'stop-opacity': 0 }, sh);
    el('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': 0.18 }, sh);
    document.body.appendChild(s);
  }
  function dashLine(g, x1, y1, x2, y2, opts = {}) {
    el('line', {
      x1, y1, x2, y2, stroke: opts.color || COL.line, 'stroke-width': opts.w || 3,
      'stroke-dasharray': opts.solid ? '' : (opts.dash || '18 14'),
    }, g);
  }
  function centerLine(g, x1, x2, y, type) {
    if (type === 'none') return;
    if (type === 'solid') dashLine(g, x1, y, x2, y, { solid: true });
    else if (type === 'double') { dashLine(g, x1, y - 4, x2, y - 4, { solid: true }); dashLine(g, x1, y + 4, x2, y + 4, { solid: true }); }
    else if (type === 'mixed') { dashLine(g, x1, y - 4, x2, y - 4, { solid: true }); dashLine(g, x1, y + 4, x2, y + 4); }
    else if (type === 'mixedR') { dashLine(g, x1, y - 4, x2, y - 4); dashLine(g, x1, y + 4, x2, y + 4, { solid: true }); }
    else dashLine(g, x1, y, x2, y);
  }

  const LAYOUTS = {
    // Straight two-way road. Eastbound lane y=250, westbound lane y=200.
    road(g, o) {
      bg(g);
      el('rect', { x: 0, y: 150, width: W, height: 25, fill: COL.walk }, g);
      el('rect', { x: 0, y: 275, width: W, height: 25, fill: COL.walk }, g);
      el('rect', { x: 0, y: 175, width: W, height: 100, fill: COL.road }, g);
      dashLine(g, 0, 179, W, 179, { solid: true, w: 2 });
      dashLine(g, 0, 271, W, 271, { solid: true, w: 2 });
      const segs = o.center || [[0, W, o.centerType || 'dashed']];
      for (const [x1, x2, type] of segs) centerLine(g, x1, x2, 225, type);
    },
    // Four-way crossroads. Lanes: EB y=250, WB y=200, NB x=425, SB x=375.
    cross(g, o) {
      bg(g);
      el('rect', { x: 0, y: 160, width: W, height: 130, fill: COL.walk }, g);
      el('rect', { x: 335, y: 0, width: 130, height: H, fill: COL.walk }, g);
      el('rect', { x: 0, y: 175, width: W, height: 100, fill: COL.road }, g);
      el('rect', { x: 350, y: 0, width: 100, height: H, fill: COL.road }, g);
      centerLine(g, 0, 335, 225, o.centerType || 'dashed');
      centerLine(g, 465, W, 225, o.centerType || 'dashed');
      dashLine(g, 400, 0, 400, 160, { solid: o.centerType === 'solid' });
      dashLine(g, 400, 290, 400, H, { solid: o.centerType === 'solid' });
      if (o.stopLines !== false) {
        const sl = { solid: true, w: 4 };
        dashLine(g, 340, 225, 340, 275, sl); dashLine(g, 460, 175, 460, 225, sl);
        dashLine(g, 400, 285, 450, 285, sl); dashLine(g, 350, 165, 400, 165, sl);
      }
    },
    // T-junction: main road east-west, side road from the south. Side road lanes: NB x=425, SB x=375.
    tee(g, o) {
      bg(g);
      el('rect', { x: 0, y: 150, width: W, height: 25, fill: COL.walk }, g);
      el('rect', { x: 0, y: 275, width: W, height: 25, fill: COL.walk }, g);
      el('rect', { x: 335, y: 275, width: 130, height: H, fill: COL.walk }, g);
      el('rect', { x: 0, y: 175, width: W, height: 100, fill: COL.road }, g);
      el('rect', { x: 350, y: 270, width: 100, height: H, fill: COL.road }, g);
      centerLine(g, 0, W, 225, o.centerType || 'dashed');
      dashLine(g, 400, 300, 400, H);
      if (o.stopLine === 'stop') dashLine(g, 400, 285, 450, 285, { solid: true, w: 5 });
      else if (o.stopLine === 'yield') dashLine(g, 400, 285, 450, 285, { w: 5, dash: '8 6' });
    },
    // Roundabout centred at (400,225); circulating lane radius ~112, counter-clockwise.
    roundabout(g) {
      bg(g);
      el('rect', { x: 0, y: 175, width: W, height: 100, fill: COL.road }, g);
      el('rect', { x: 350, y: 0, width: 100, height: H, fill: COL.road }, g);
      el('circle', { cx: 400, cy: 225, r: 152, fill: COL.road }, g);
      el('circle', { cx: 400, cy: 225, r: 72, fill: COL.grassDark, stroke: '#eee', 'stroke-width': 6 }, g);
      el('circle', { cx: 400, cy: 225, r: 40, fill: '#5d9a52' }, g);
      for (const [x1, y1, x2, y2] of [[0, 225, 230, 225], [570, 225, W, 225], [400, 0, 400, 55], [400, 395, 400, H]]) dashLine(g, x1, y1, x2, y2, { solid: true });
      // give-way lines at the four entries
      const gw = { w: 4, dash: '7 6' };
      dashLine(g, 250, 225, 250, 275, gw); dashLine(g, 550, 175, 550, 225, gw);
      dashLine(g, 400, 375, 450, 375, gw); dashLine(g, 350, 75, 400, 75, gw);
    },
    // Motorway, eastbound only. Lane centres y=140 (fast), 190, 240 (right). Strip y 265-305:
    // acceleration lane x<600 (centre y=285), emergency lane x>600.
    motorway(g) {
      bg(g);
      el('rect', { x: 0, y: 70, width: W, height: 25, fill: COL.grassDark }, g);
      el('rect', { x: 0, y: 95, width: W, height: 210, fill: COL.road }, g);
      // slip road from the bottom-left joining the acceleration lane
      el('path', { d: 'M0 450 L 0 420 C 120 380 160 320 260 300 L 330 300 C 190 330 150 390 90 450 Z', fill: COL.road }, g);
      el('rect', { x: 0, y: 92, width: W, height: 5, fill: '#b9bec4' }, g);
      dashLine(g, 0, 115, W, 115, { solid: true, w: 3 });
      dashLine(g, 0, 165, W, 165, { dash: '30 30' });
      dashLine(g, 0, 215, W, 215, { dash: '30 30' });
      dashLine(g, 0, 265, 270, 265, { solid: true });
      dashLine(g, 270, 265, 600, 265, { dash: '12 12', w: 4 });
      dashLine(g, 600, 265, W, 265, { solid: true });
      dashLine(g, 600, 305, W, 305, { solid: true, w: 2 });
      el('rect', { x: 0, y: 305, width: W, height: 4, fill: '#b9bec4' }, g);
      el('text', { x: 700, y: 290, fill: '#e8e8e8', 'font-size': 12, 'text-anchor': 'middle', 'font-family': 'sans-serif' }, g).textContent = tx('emergency lane', 'حارة الطوارئ');
    },
    diagram(g, o) { bg(g, o.bg || '#f4f1ea'); },
  };

  // ---------- road signs ----------
  function signShape(g, kind, s, opt) {
    const r = s / 2;
    const tri = (fill = '#fff', border = COL.red) => el('path', { d: `M0 ${-r} L${r * 0.95} ${r * 0.72} L${-r * 0.95} ${r * 0.72} Z`, fill, stroke: border, 'stroke-width': s * 0.12, 'stroke-linejoin': 'round' }, g);
    const triDown = () => el('path', { d: `M0 ${r * 0.85} L${r * 0.95} ${-r * 0.75} L${-r * 0.95} ${-r * 0.75} Z`, fill: '#fff', stroke: COL.red, 'stroke-width': s * 0.12, 'stroke-linejoin': 'round' }, g);
    const circ = (fill = '#fff', border = COL.red) => el('circle', { r: r * 0.92, fill, stroke: border, 'stroke-width': border === 'none' ? 0 : s * 0.12 }, g);
    const txt = (t, size, fill = '#111', y = 0) => { const e = el('text', { y: y + size * 0.36, 'text-anchor': 'middle', 'font-size': size, 'font-weight': 700, 'font-family': 'Arial, sans-serif', fill }, g); e.textContent = t; return e; };
    const car = (x, y, fill, sc = 1) => el('path', { d: `M${x - 5 * sc} ${y + 3 * sc} l0 -4 l2 -3 l6 0 l2 3 l0 4 z`, fill }, g);
    const arrow = (rot, color = '#fff') => { const a = el('path', { d: `M0 ${r * 0.55} L0 ${-r * 0.2} M${-r * 0.3} ${-r * 0.05} L0 ${-r * 0.5} L${r * 0.3} ${-r * 0.05}`, stroke: color, 'stroke-width': s * 0.12, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g); a.setAttribute('transform', `rotate(${rot})`); };
    switch (kind) {
      case 'stop': {
        const pts = []; for (let i = 0; i < 8; i++) { const a = (Math.PI / 8) + i * Math.PI / 4; pts.push(`${r * Math.cos(a)},${r * Math.sin(a)}`); }
        el('polygon', { points: pts.join(' '), fill: COL.red, stroke: '#fff', 'stroke-width': s * 0.05 }, g);
        txt('STOP', s * 0.3, '#fff'); break;
      }
      case 'yield': triDown(); break;
      case 'triangle': el('path', { d: `M0 ${-r} L${r} ${r * 0.75} L${-r} ${r * 0.75} Z`, fill: 'none', stroke: '#ff2a2a', 'stroke-width': s * 0.18, 'stroke-linejoin': 'round' }, g); break;
      case 'giveWayRight': tri(); el('path', { d: `M${-r * 0.3} ${-r * 0.1} L${r * 0.3} ${r * 0.5} M${r * 0.3} ${-r * 0.1} L${-r * 0.3} ${r * 0.5}`, stroke: '#111', 'stroke-width': s * 0.1 }, g); break;
      case 'warnPed': tri(); el('circle', { cx: 0, cy: -r * 0.2, r: s * 0.06, fill: '#111' }, g); el('path', { d: `M0 ${-r * 0.08} L0 ${r * 0.28} M0 ${r * 0.28} L${-r * 0.16} ${r * 0.55} M0 ${r * 0.28} L${r * 0.16} ${r * 0.55} M${-r * 0.2} ${r * 0.05} L${r * 0.2} ${r * 0.1}`, stroke: '#111', 'stroke-width': s * 0.06 }, g); break;
      case 'warnGeneric': tri(); el('rect', { x: -s * 0.04, y: -r * 0.3, width: s * 0.08, height: r * 0.55, fill: '#111' }, g); el('circle', { cx: 0, cy: r * 0.45, r: s * 0.045, fill: '#111' }, g); break;
      case 'warnSignals': tri(); el('rect', { x: -s * 0.09, y: -r * 0.38, width: s * 0.18, height: r * 0.98, rx: 2, fill: '#111' }, g);[COL.red, COL.yellow, '#2fa84f'].forEach((c, i) => el('circle', { cx: 0, cy: -r * 0.22 + i * r * 0.3, r: s * 0.055, fill: c }, g)); break;
      case 'warnRound': tri(); el('circle', { r: r * 0.28, cy: r * 0.15, fill: 'none', stroke: '#111', 'stroke-width': s * 0.06 }, g); break;
      case 'works': tri('#f6d21b'); el('path', { d: `M${-r * 0.35} ${r * 0.5} L${r * 0.1} ${-r * 0.05} M${-r * 0.05} ${-r * 0.2} l${r * 0.25} 0`, stroke: '#111', 'stroke-width': s * 0.07 }, g); el('circle', { cx: r * 0.2, cy: -r * 0.3, r: s * 0.05, fill: '#111' }, g); break;
      case 'noOvertake': circ(); car(-r * 0.25, 0, COL.red, s / 30); car(r * 0.25, 0, '#111', s / 30); break;
      case 'endNoOvertake': circ('#fff', '#999'); car(-r * 0.25, 0, '#999', s / 30); car(r * 0.25, 0, '#999', s / 30); el('line', { x1: -r * 0.7, y1: r * 0.7, x2: r * 0.7, y2: -r * 0.7, stroke: '#333', 'stroke-width': s * 0.06 }, g); break;
      case 'speed': circ(); txt(String(opt.value || 50), s * 0.42); break;
      case 'endSpeed': circ('#fff', '#999'); txt(String(opt.value || 50), s * 0.42, '#888'); el('line', { x1: -r * 0.7, y1: r * 0.7, x2: r * 0.7, y2: -r * 0.7, stroke: '#333', 'stroke-width': s * 0.06 }, g); break;
      case 'noEntry': circ(COL.red, 'none'); el('rect', { x: -r * 0.6, y: -r * 0.15, width: r * 1.2, height: r * 0.3, fill: '#fff' }, g); break;
      case 'noParking': circ(COL.blue); el('line', { x1: -r * 0.6, y1: -r * 0.6, x2: r * 0.6, y2: r * 0.6, stroke: COL.red, 'stroke-width': s * 0.12 }, g); break;
      case 'noStopping': circ(COL.blue); el('path', { d: `M${-r * 0.6} ${-r * 0.6} L${r * 0.6} ${r * 0.6} M${r * 0.6} ${-r * 0.6} L${-r * 0.6} ${r * 0.6}`, stroke: COL.red, 'stroke-width': s * 0.12 }, g); break;
      case 'turnRight': circ(COL.blue, 'none'); el('path', { d: `M${-r * 0.2} ${r * 0.55} L${-r * 0.2} ${-r * 0.05} Q${-r * 0.2} ${-r * 0.25} 0 ${-r * 0.25} L${r * 0.35} ${-r * 0.25} M${r * 0.15} ${-r * 0.45} L${r * 0.4} ${-r * 0.25} L${r * 0.15} ${-r * 0.05}`, stroke: '#fff', 'stroke-width': s * 0.11, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g); break;
      case 'ahead': circ(COL.blue, 'none'); arrow(0); break;
      case 'keepRight': circ(COL.blue, 'none'); arrow(135); break;
      case 'roundabout': circ(COL.blue, 'none');[0, 120, 240].forEach(a => { const p = el('path', { d: `M${r * 0.45} 0 A${r * 0.45} ${r * 0.45} 0 0 0 ${r * 0.45 * Math.cos(-1.6)} ${r * 0.45 * Math.sin(-1.6)}`, stroke: '#fff', 'stroke-width': s * 0.09, fill: 'none' }, g); p.setAttribute('transform', `rotate(${a})`); }); break;
      case 'priority': el('rect', { x: -r * 0.66, y: -r * 0.66, width: r * 1.32, height: r * 1.32, fill: '#fff', stroke: '#222', 'stroke-width': 1, transform: 'rotate(45)' }, g); el('rect', { x: -r * 0.44, y: -r * 0.44, width: r * 0.88, height: r * 0.88, fill: COL.yellow, transform: 'rotate(45)' }, g); break;
      case 'endPriority': el('rect', { x: -r * 0.66, y: -r * 0.66, width: r * 1.32, height: r * 1.32, fill: '#fff', stroke: '#222', 'stroke-width': 1, transform: 'rotate(45)' }, g); el('rect', { x: -r * 0.44, y: -r * 0.44, width: r * 0.88, height: r * 0.88, fill: '#ccc', transform: 'rotate(45)' }, g); el('line', { x1: -r * 0.6, y1: r * 0.6, x2: r * 0.6, y2: -r * 0.6, stroke: '#222', 'stroke-width': s * 0.06 }, g); break;
      case 'laneClosed': el('rect', { x: -r, y: -r * 0.8, width: s, height: s * 0.8, rx: 3, fill: '#f6d21b', stroke: '#222', 'stroke-width': 1 }, g); el('path', { d: `M${-r * 0.4} ${r * 0.6} L${-r * 0.4} ${-r * 0.5} M${r * 0.4} ${r * 0.6} L${r * 0.4} 0 L${-r * 0.1} ${-r * 0.5}`, stroke: '#111', 'stroke-width': s * 0.08, fill: 'none' }, g); el('rect', { x: r * 0.25, y: -r * 0.05, width: r * 0.3, height: s * 0.08, fill: COL.red }, g); break;
      case 'motorway': el('rect', { x: -r, y: -r * 0.8, width: s, height: s * 0.8, rx: 4, fill: '#138a3d' }, g); el('path', { d: `M${-r * 0.5} ${r * 0.6} L${-r * 0.15} ${-r * 0.55} M${r * 0.5} ${r * 0.6} L${r * 0.15} ${-r * 0.55} M0 ${r * 0.6} L0 ${r * 0.3} M0 ${r * 0.05} L0 ${-r * 0.2}`, stroke: '#fff', 'stroke-width': s * 0.07 }, g); break;
      case 'parking': el('rect', { x: -r * 0.8, y: -r * 0.8, width: s * 0.8, height: s * 0.8, rx: 4, fill: COL.blue }, g); txt('P', s * 0.6, '#fff'); break;
      case 'panel': el('rect', { x: -r, y: -r * 0.32, width: s, height: s * 0.32 * 2, fill: '#fff', stroke: '#222', 'stroke-width': 1.2 }, g); txt(opt.text || '', s * 0.3); break;
      case 'town': el('rect', { x: -r * 1.4, y: -r * 0.55, width: s * 1.4, height: s * 0.55 * 2, fill: '#fff', stroke: '#222', 'stroke-width': 2 }, g); txt(opt.text || 'ROMA', s * 0.32); if (opt.end) el('line', { x1: -r * 1.3, y1: r * 0.45, x2: r * 1.3, y2: -r * 0.45, stroke: COL.red, 'stroke-width': s * 0.08 }, g); break;
    }
  }
  function drawSign(parent, x) {
    const g = el('g', { transform: `translate(${x.x} ${x.y})` }, parent);
    const s = x.s || 34;
    if (x.post !== false) el('rect', { x: -1.5, y: 0, width: 3, height: s * 0.9, fill: '#777' }, g);
    signShape(g, x.kind, s, x);
    if (x.panel) { const pg = el('g', { transform: `translate(0 ${s * 0.85})` }, g); signShape(pg, 'panel', s, { text: x.panel }); }
    return g;
  }

  // ---------- actors ----------
  const SIZES = { car: [44, 22], truck: [86, 28], bike: [24, 9], moto: [28, 11], ped: [14, 14], ambulance: [52, 24], police: [46, 22], tram: [150, 28], officer: [18, 18] };
  function drawActor(g, a) {
    const [L, Wd] = SIZES[a.kind] || SIZES.car;
    const hl = L / 2, hw = Wd / 2;
    const parts = {};
    parts.beam = el('path', { d: '', fill: 'rgba(255,238,150,0.33)', stroke: 'none' }, g);
    // soft shadow, and wheels peeking out at the corners of four-wheeled vehicles
    if (a.kind === 'ped' || a.kind === 'officer') el('ellipse', { cx: 2, cy: 3, rx: 7, ry: 7, fill: 'rgba(0,0,0,.2)' }, g);
    else el('rect', { x: -hl + 2, y: -hw + 3, width: L, height: Wd, rx: 6, fill: 'rgba(0,0,0,.22)' }, g);
    if (!['ped', 'officer', 'bike', 'moto'].includes(a.kind)) {
      const wl = Math.min(10, L * 0.2), xs = a.kind === 'tram' ? [-hl + 14, hl - 14 - wl] : [-hl + L * 0.14, hl - L * 0.14 - wl];
      for (const x of xs) for (const y of [-hw - 1.5, hw - 2.5]) el('rect', { x, y, width: wl, height: 4, rx: 1.5, fill: '#1b1b1b' }, g);
    }
    const body = el('g', {}, g);
    if (a.kind === 'ped') {
      el('ellipse', { rx: 6, ry: 8, fill: a.color || '#e07a2f' }, body);
      el('circle', { r: 5, cx: 1, fill: '#6b4a2b' }, body);
    } else if (a.kind === 'officer') {
      parts.arms = el('rect', { x: -2.5, y: -17, width: 5, height: 34, rx: 2.5, fill: '#fff' }, body);
      el('ellipse', { rx: 6, ry: 10, fill: '#1c2f55' }, body);
      el('circle', { r: 5.5, fill: '#fff', stroke: '#1c2f55', 'stroke-width': 2 }, body);
    } else if (a.kind === 'bike' || a.kind === 'moto') {
      el('rect', { x: -hl, y: -1.5, width: L, height: 3, rx: 1.5, fill: '#222' }, body);
      el('ellipse', { cx: -2, rx: 6, ry: hw, fill: a.color || '#2a7de1' }, body);
      el('circle', { cx: -1, r: 4, fill: '#333' }, body);
    } else {
      const color = a.color || (a.kind === 'ambulance' ? '#ffffff' : a.kind === 'police' ? '#1f3f8f' : a.kind === 'tram' ? '#f08a24' : a.kind === 'truck' ? '#3f7fbf' : '#d7263d');
      el('rect', { x: -hl, y: -hw, width: L, height: Wd, rx: a.kind === 'tram' ? 8 : 6, fill: color, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 1 }, body);
      el('rect', { x: -hl, y: -hw, width: L, height: Wd, rx: a.kind === 'tram' ? 8 : 6, fill: 'url(#scShine)' }, body);
      if (a.kind !== 'tram') for (const y of [-hw + 2, hw - 5]) el('rect', { x: hl - 3, y, width: 2.5, height: 3, rx: 1, fill: '#fff6c8' }, body);
      if (a.kind === 'truck') {
        el('rect', { x: hl - 20, y: -hw + 1, width: 19, height: Wd - 2, rx: 4, fill: '#e9e9e9' }, body);
        el('rect', { x: hl - 8, y: -hw + 3, width: 6, height: Wd - 6, rx: 2, fill: '#2b3a4a' }, body);
      } else if (a.kind === 'tram') {
        for (let x = -hl + 12; x < hl - 10; x += 26) el('rect', { x, y: -hw + 4, width: 18, height: Wd - 8, rx: 3, fill: '#ffe4b8' }, body);
      } else {
        el('rect', { x: hl * 0.18, y: -hw + 2.5, width: hl * 0.32, height: Wd - 5, rx: 3, fill: '#22303d' }, body);
        el('rect', { x: -hl * 0.7, y: -hw + 3, width: hl * 0.28, height: Wd - 6, rx: 3, fill: '#22303d', opacity: 0.85 }, body);
        if (a.kind === 'ambulance') { el('rect', { x: -hl + 4, y: -2, width: L * 0.45, height: 4, fill: COL.red }, body); el('rect', { x: -hl + 4 + L * 0.2, y: -hw + 2, width: 4, height: Wd - 4, fill: COL.red }, body); }
        if (a.kind === 'police') el('rect', { x: -hl + 2, y: -2.5, width: L - 4, height: 5, fill: '#fff', opacity: 0.85 }, body);
      }
      if (a.kind === 'ambulance' || a.kind === 'police') {
        parts.siren1 = el('rect', { x: -2, y: -hw + 2, width: 6, height: hw - 2, fill: '#3a7bff', opacity: 0.25 }, body);
        parts.siren2 = el('rect', { x: -2, y: 0, width: 6, height: hw - 2, fill: '#3a7bff', opacity: 0.25 }, body);
      }
      // lights: indicators at the four corners, brake lights at the back
      parts.ind = {
        FL: el('circle', { cx: hl - 3, cy: -hw + 2, r: 3.4, fill: '#ffb000', opacity: 0 }, body),
        FR: el('circle', { cx: hl - 3, cy: hw - 2, r: 3.4, fill: '#ffb000', opacity: 0 }, body),
        RL: el('circle', { cx: -hl + 3, cy: -hw + 2, r: 3.4, fill: '#ffb000', opacity: 0 }, body),
        RR: el('circle', { cx: -hl + 3, cy: hw - 2, r: 3.4, fill: '#ffb000', opacity: 0 }, body),
      };
      parts.brake = [el('rect', { x: -hl - 1, y: -hw + 2, width: 3, height: 6, fill: '#ff2a2a', opacity: 0 }, body), el('rect', { x: -hl - 1, y: hw - 8, width: 3, height: 6, fill: '#ff2a2a', opacity: 0 }, body)];
    }
    parts.body = body;
    return parts;
  }
  function inRanges(ranges, t) {
    if (!ranges) return null;
    for (const r of ranges) if (t >= r[0] && t < r[1]) return r;
    return null;
  }
  function stepValue(seq, t, dflt) {
    let v = dflt;
    if (seq) for (const s of seq) if (t >= s[0]) v = s[1];
    return v;
  }
  function posAt(keys, t) {
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 1; i < keys.length; i++) {
      const k0 = keys[i - 1], k1 = keys[i];
      if (t <= k1[0]) {
        const f = k1[0] === k0[0] ? 1 : (t - k0[0]) / (k1[0] - k0[0]);
        return [lerp(k0[1], k1[1], f), lerp(k0[2], k1[2], f)];
      }
    }
    const k = keys[keys.length - 1];
    return [k[1], k[2]];
  }
  function headingAt(keys, t) {
    // Explicit heading (4th value) wins, e.g. for officers or parked cars.
    let explicit = null;
    for (const k of keys) if (k.length > 3 && t >= k[0]) explicit = k[3];
    if (explicit === null && keys[0].length > 3) explicit = keys[0][3];
    const p0 = posAt(keys, t - 0.05), p1 = posAt(keys, t + 0.05);
    if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.05) return Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180 / Math.PI;
    if (explicit !== null) return explicit;
    for (let i = keys.length - 1; i > 0; i--) {               // last movement before t
      const k0 = keys[i - 1], k1 = keys[i];
      if (k1[0] <= t + 1e-6 && (k1[1] !== k0[1] || k1[2] !== k0[2])) return Math.atan2(k1[2] - k0[2], k1[1] - k0[1]) * 180 / Math.PI;
    }
    for (let i = 1; i < keys.length; i++) {                   // or the first movement after it
      const k0 = keys[i - 1], k1 = keys[i];
      if (k1[1] !== k0[1] || k1[2] !== k0[2]) return Math.atan2(k1[2] - k0[2], k1[1] - k0[1]) * 180 / Math.PI;
    }
    return 0;
  }

  // ---------- player ----------
  let fullPlayer = null;   // exits the player that is full screen, if any
  function create(container, sc) {
    container.innerHTML = '';
    container.classList.add('scene');
    const stage = document.createElement('div');
    stage.className = 'scene-stage';
    container.appendChild(stage);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': tl(sc.title) }, stage);
    const layers = {};
    for (const n of ['base', 'marks', 'night', 'under', 'actors', 'over', 'labels']) layers[n] = el('g', {}, svg);
    ensureDefs();
    (LAYOUTS[sc.layout] || LAYOUTS.diagram)(layers.base, sc.opts || {});
    // a light asphalt texture over every piece of road
    for (const r of [...layers.base.children]) if (r.getAttribute('fill') === COL.road) {
      const c = r.cloneNode(); c.setAttribute('fill', 'url(#scAsphalt)'); r.after(c);
    }
    decorate(layers.base, sc);
    if (sc.night) { el('rect', { x: 0, y: 0, width: W, height: H, fill: COL.night, opacity: 0.72 }, layers.night); layers.night.style.pointerEvents = 'none'; }

    const timed = [];
    const lights = [];
    const helpers = { el, svg, layers, W, H, COL, drawSign, signShape, state: {} };
    for (const x of sc.extras || []) {
      let node = null;
      const layer = x.layer ? layers[x.layer] : (x.type === 'label' || x.type === 'measure' || x.type === 'arrow' ? layers.labels : layers.marks);
      switch (x.type) {
        case 'sign': node = drawSign(layer, x); break;
        case 'zebra': {
          node = el('g', {}, layer);
          const n = Math.floor((x.dir === 'h' ? x.w : x.h) / 12);
          for (let i = 0; i < n; i++) {
            if (x.dir === 'h') el('rect', { x: x.x + i * 12, y: x.y, width: 7, height: x.h, fill: '#fff' }, node);
            else el('rect', { x: x.x, y: x.y + i * 12, width: x.w, height: 7, fill: '#fff' }, node);
          }
          break;
        }
        case 'rect': node = el('rect', { x: x.x, y: x.y, width: x.w, height: x.h, fill: x.fill || 'none', stroke: x.stroke || 'none', 'stroke-width': x.sw || 2, 'stroke-dasharray': x.dash || '', rx: x.rx || 0, opacity: x.opacity ?? 1 }, layer); break;
        case 'line': node = el('line', { x1: x.x1, y1: x.y1, x2: x.x2, y2: x.y2, stroke: x.color || '#fff', 'stroke-width': x.w || 3, 'stroke-dasharray': x.dash || '' }, layer); break;
        case 'cone': node = el('g', { transform: `translate(${x.x} ${x.y})` }, layer); el('circle', { r: 6, fill: '#ff6a00' }, node); el('circle', { r: 2.5, fill: '#fff' }, node); break;
        case 'zone': {
          node = el('g', {}, layer);
          el('rect', { x: x.x, y: x.y, width: x.w, height: x.h, fill: x.fill || 'rgba(215,38,61,0.28)', stroke: x.stroke || COL.red, 'stroke-width': 2, 'stroke-dasharray': '6 4', rx: 4 }, node);
          if (x.text) { const t = el('text', { x: x.x + x.w / 2, y: x.y + x.h / 2 + 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#fff', 'font-family': 'sans-serif', 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.6)', 'stroke-width': 3 }, node); t.textContent = tl(x.text); }
          break;
        }
        case 'label': {
          node = el('g', { transform: `translate(${x.x} ${x.y})` }, layer);
          const t = el('text', { 'text-anchor': x.anchor || 'middle', 'font-size': x.size || 15, 'font-weight': 700, 'font-family': 'system-ui, sans-serif', fill: x.color || '#111' }, node);
          t.textContent = tl(x.text);
          if (x.bg !== false) {
            requestAnimationFrame(() => {
              try {
                const b = t.getBBox();
                const r = el('rect', { x: b.x - 6, y: b.y - 3, width: b.width + 12, height: b.height + 6, rx: 6, fill: x.bg || 'rgba(255,255,255,0.92)', stroke: 'rgba(0,0,0,.15)' });
                node.insertBefore(r, t);
              } catch { /* not rendered yet */ }
            });
          }
          break;
        }
        case 'arrow': {
          const d = x.points.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
          node = el('g', {}, layer);
          el('path', { d, fill: 'none', stroke: x.color || '#ffd23f', 'stroke-width': x.w || 5, 'stroke-dasharray': x.dash || '', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.95 }, node);
          const [pa, pb] = [x.points[x.points.length - 2], x.points[x.points.length - 1]];
          const ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) * 180 / Math.PI;
          el('path', { d: 'M0 0 L-14 -8 L-14 8 Z', fill: x.color || '#ffd23f', transform: `translate(${pb[0]} ${pb[1]}) rotate(${ang})` }, node);
          break;
        }
        case 'measure': {
          node = el('g', {}, layer);
          const c = x.color || '#ffd23f';
          el('line', { x1: x.x1, y1: x.y1, x2: x.x2, y2: x.y2, stroke: c, 'stroke-width': 3 }, node);
          for (const [px, py] of [[x.x1, x.y1], [x.x2, x.y2]]) el('line', { x1: px, y1: py - 8, x2: px, y2: py + 8, stroke: c, 'stroke-width': 3 }, node);
          const t = el('text', { x: (x.x1 + x.x2) / 2, y: (x.y1 + x.y2) / 2 - 10, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: c, 'font-family': 'system-ui, sans-serif', 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.65)', 'stroke-width': 3 }, node);
          t.textContent = tl(x.text || '');
          break;
        }
        case 'light': {
          node = el('g', { transform: `translate(${x.x} ${x.y}) rotate(${x.rot || 0})` }, layer);
          el('rect', { x: -9, y: -26, width: 18, height: 52, rx: 4, fill: '#1d1d1d', stroke: '#000' }, node);
          const bulbs = { r: el('circle', { cy: -15, r: 6.5 }, node), y: el('circle', { cy: 0, r: 6.5 }, node), g: el('circle', { cy: 15, r: 6.5 }, node) };
          lights.push({ x, bulbs });
          break;
        }
      }
      if (node && (x.t0 !== undefined || x.t1 !== undefined)) timed.push({ node, t0: x.t0 ?? -1, t1: x.t1 ?? Infinity });
    }

    const actors = (sc.actors || []).map(a => {
      const g = el('g', {}, layers.actors);
      const parts = drawActor(g, a);
      let label = null;
      if (a.label) {
        label = el('g', {}, layers.labels);
        el('circle', { r: 10, fill: '#fff', stroke: '#111', 'stroke-width': 1.5 }, label);
        const t = el('text', { y: 4.5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800, 'font-family': 'system-ui, sans-serif', fill: '#111' }, label);
        t.textContent = a.label;
      }
      return { a, g, parts, label };
    });

    if (sc.build) sc.build(helpers);

    // ---------- controls ----------
    const cap = document.createElement('div');
    cap.className = 'scene-caption';
    container.appendChild(cap);
    const bar = document.createElement('div');
    bar.className = 'scene-controls';
    bar.innerHTML = `
      <button class="sc-btn" data-a="restart" title="${tx('Restart', 'من الأول')}" aria-label="${tx('Restart', 'من الأول')}">⏮</button>
      <button class="sc-btn" data-a="prev" title="${tx('Previous step', 'الخطوة اللي قبلها')}" aria-label="${tx('Previous step', 'الخطوة اللي قبلها')}">◀</button>
      <button class="sc-btn sc-play" data-a="play" title="${tx('Play / pause', 'شغّل / وقّف')}" aria-label="${tx('Play or pause', 'شغّل أو وقّف')}">▶</button>
      <button class="sc-btn" data-a="next" title="${tx('Next step', 'الخطوة اللي بعدها')}" aria-label="${tx('Next step', 'الخطوة اللي بعدها')}">▶|</button>
      <div class="sc-track" role="slider" aria-label="${tx('Timeline', 'الوقت')}"><div class="sc-fill"></div></div>
      <button class="sc-btn sc-speed" data-a="speed" title="${tx('Speed', 'السرعة')}">1×</button>
      <button class="sc-btn sc-audio" data-a="audio" title="${tx('Voice and sound', 'الصوت')}" aria-label="${tx('Voice and sound on or off', 'شغّل أو اقفل الصوت')}">${audioOn() ? '🔊' : '🔇'}</button>
      <button class="sc-btn sc-full" data-a="full" title="${tx('Full screen', 'ملء الشاشة')}" aria-label="${tx('Full screen', 'ملء الشاشة')}">⛶</button>`;
    container.appendChild(bar);
    const overlay = document.createElement('button');
    overlay.className = 'scene-overlay';
    overlay.innerHTML = `<span>▶</span><small>${tx('Watch the scenario', 'اتفرّج على السيناريو')}</small>`;
    stage.appendChild(overlay);
    const fill = bar.querySelector('.sc-fill');
    const track = bar.querySelector('.sc-track');
    const playBtn = bar.querySelector('.sc-play');
    const speedBtn = bar.querySelector('.sc-speed');
    const steps = sc.steps || [];
    for (const s of steps) {
      const m = document.createElement('i');
      m.style.left = (100 * s.t / sc.duration) + '%';
      track.appendChild(m);
    }

    let t = 0, playing = false, speed = 1, last = 0, raf = 0, destroyed = false;
    let sound = null, spoken = -1, talking = false, talkUntil = 0, full = false;

    function render() {
      let spd = 0, siren = false;
      for (const it of timed) it.node.style.opacity = (t >= it.t0 && t < it.t1) ? 1 : 0;
      for (const L of lights) {
        const st = stepValue(L.x.seq, t, 'r');
        const blink = Math.floor(t * 2) % 2 === 0;
        L.bulbs.r.setAttribute('fill', st === 'r' ? '#ff3030' : '#4a1414');
        L.bulbs.y.setAttribute('fill', st === 'y' || (st === 'fy' && blink) ? '#ffc400' : '#4a3a10');
        L.bulbs.g.setAttribute('fill', st === 'g' ? '#2ee86b' : '#123a1f');
      }
      for (const A of actors) {
        const { a, g, parts, label } = A;
        const vis = !a.show || (t >= a.show[0] && t < a.show[1]);
        g.style.display = vis ? '' : 'none';
        if (label) label.style.display = vis ? '' : 'none';
        if (!vis) continue;
        const [x, y] = posAt(a.keys, t);
        const ang = headingAt(a.keys, t);
        A.pos = { x, y, a: ang };
        if (!['ped', 'officer', 'bike'].includes(a.kind)) {
          const [x0, y0] = posAt(a.keys, t - 0.05), [x1, y1] = posAt(a.keys, t + 0.05);
          spd = Math.max(spd, Math.hypot(x1 - x0, y1 - y0) * 10);
        }
        g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
        if (label) label.setAttribute('transform', `translate(${x.toFixed(1)} ${(y - 22).toFixed(1)})`);
        if (parts.ind) {
          const r = inRanges(a.blink, t);
          const on = r && Math.floor((t - r[0]) * 3) % 2 === 0;
          const L = on && (r[2] === 'L' || r[2] === 'H'), R = on && (r[2] === 'R' || r[2] === 'H');
          if (!!on !== !!A.blinkOn) { A.blinkOn = on; if (playing && sound) sound.click(); }
          parts.ind.FL.setAttribute('opacity', L ? 1 : 0); parts.ind.RL.setAttribute('opacity', L ? 1 : 0);
          parts.ind.FR.setAttribute('opacity', R ? 1 : 0); parts.ind.RR.setAttribute('opacity', R ? 1 : 0);
          const br = inRanges(a.brake, t) ? 1 : 0;
          parts.brake.forEach(b => b.setAttribute('opacity', br));
        }
        if (parts.siren1) {
          const on = inRanges(a.siren, t);
          if (on) siren = true;
          const ph = Math.floor(t * 6) % 2;
          parts.siren1.setAttribute('opacity', on ? (ph ? 1 : 0.2) : 0.25);
          parts.siren2.setAttribute('opacity', on ? (ph ? 0.2 : 1) : 0.25);
        }
        const beam = stepValue(a.beam, t, 'off');
        const [Lc] = SIZES[a.kind] || SIZES.car;
        if (beam === 'low') parts.beam.setAttribute('d', `M${Lc / 2} -9 L${Lc / 2 + 120} -30 L${Lc / 2 + 120} 34 L${Lc / 2} 9 Z`);
        else if (beam === 'high') parts.beam.setAttribute('d', `M${Lc / 2} -9 L${Lc / 2 + 300} -70 L${Lc / 2 + 300} 70 L${Lc / 2} 9 Z`);
        else parts.beam.setAttribute('d', '');
        if (parts.arms) parts.arms.setAttribute('transform', `rotate(${stepValue(a.arms, t, 0)})`);
      }
      if (sc.update) sc.update(t, helpers, Object.fromEntries(actors.filter(A => A.a.id).map(A => [A.a.id, A.pos])));
      if (sound) { if (playing) sound.update(spd > 3, spd, siren, Math.floor(t * 1.6) % 2 === 1); else sound.silence(); }
      fill.style.width = (100 * t / sc.duration) + '%';
      let idx = 0;
      for (let i = 0; i < steps.length; i++) if (t >= steps[i].t - 1e-6) idx = i;
      const s = steps[idx];
      const html = s ? `<b>${tx(`Step ${idx + 1} of ${steps.length}`, `خطوة ${idx + 1} من ${steps.length}`)}</b> ${tl(s.text)}` : '';
      if (cap.dataset.html !== html) {
        cap.innerHTML = html; cap.dataset.html = html;
        cap.classList.remove('fresh'); void cap.offsetWidth; cap.classList.add('fresh');
      }
      if (playing && idx !== spoken) narrate(idx);
    }
    // Reads the caption of step i aloud. While it is being read the animation waits at the start of the
    // next step, so voice and picture stay together (with a time limit in case the voice never reports back).
    function narrate(i) {
      spoken = i;
      if (!audioOn() || !window.Native || !Native.canSpeak || !steps[i]) return;
      const text = tl(steps[i].text).replace(/<[^>]+>/g, ' ');
      const lang = window.I18N && window.I18N.ar && text !== steps[i].text.replace(/<[^>]+>/g, ' ') ? 'ar' : 'en';
      if (sound && i > 0) sound.chime();
      talking = true;
      talkUntil = performance.now() + 4000 + text.length * 110;
      Native.speak(text, lang, () => { if (spoken === i) talking = false; });
    }
    function frame(now) {
      if (destroyed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playing) {
        if (talking && now > talkUntil) talking = false;
        let nt = t + dt * speed;
        const nextT = steps[spoken + 1] ? steps[spoken + 1].t : null;
        if (talking && nextT !== null && nt >= nextT - 0.02) nt = Math.max(t, nextT - 0.02);
        t = nt;
        if (t >= sc.duration) { t = sc.duration; setPlaying(false); }
        render();
      }
      raf = requestAnimationFrame(frame);
    }
    function syncOverlay() {
      overlay.style.display = playing ? 'none' : (t >= sc.duration || t === 0 ? 'flex' : 'none');
      overlay.querySelector('span').textContent = t >= sc.duration ? '↻' : '▶';
      overlay.querySelector('small').textContent = t >= sc.duration ? tx('Watch again', 'اتفرّج تاني') : tx('Watch the scenario', 'اتفرّج على السيناريو');
    }
    function setPlaying(p) {
      const was = playing;
      playing = p;
      playBtn.textContent = p ? '⏸' : '▶';
      if (p && !sound && audioOn()) sound = makeSound();
      if (!p) {
        if (sound) sound.silence();
        // keep the last caption talking when the scenario simply reached its end
        if (was && t < sc.duration && talking) Native.stop();
        talking = false; spoken = -1;
      }
      syncOverlay();
      last = performance.now();
    }
    function seek(nt) { t = clamp(nt, 0, sc.duration); render(); syncOverlay(); }
    function stepIndex() { let i = 0; for (let k = 0; k < steps.length; k++) if (t >= steps[k].t - 1e-6) i = k; return i; }

    // ---------- full screen (landscape on phones) ----------
    function onFsChange() { if (full && !document.fullscreenElement && !container.classList.contains('scene-pseudo')) setFull(false); }
    function setFull(on) {
      if (on === full) return;
      full = on;
      container.classList.toggle('scene-full', on);
      fullBtn.textContent = on ? '✕' : '⛶';
      fullBtn.title = on ? tx('Exit full screen', 'اخرج من ملء الشاشة') : tx('Full screen', 'ملء الشاشة');
      document.documentElement.classList.toggle('has-full-scene', on);
      fullPlayer = on ? () => setFull(false) : null;
      if (window.Native && Native.inApp) {
        // The app's WebView has no Fullscreen API: fill the window and turn the phone to landscape natively.
        container.classList.toggle('scene-pseudo', on);
        Native.setLandscape(on);
        return;
      }
      if (on) {
        const req = container.requestFullscreen || container.webkitRequestFullscreen;
        const p = req ? req.call(container) : null;
        if (p && p.then) {
          p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}))
            .catch(() => container.classList.add('scene-pseudo'));
        } else if (!req) container.classList.add('scene-pseudo');
      } else {
        container.classList.remove('scene-pseudo');
        if (screen.orientation && screen.orientation.unlock) try { screen.orientation.unlock(); } catch { /* not locked */ }
        if (document.fullscreenElement === container) document.exitFullscreen().catch(() => {});
      }
    }
    document.addEventListener('fullscreenchange', onFsChange);
    const fullBtn = bar.querySelector('.sc-full');
    const audioBtn = bar.querySelector('.sc-audio');

    bar.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const act = b.dataset.a;
      if (act === 'play') { if (t >= sc.duration) seek(0); setPlaying(!playing); }
      if (act === 'restart') { setPlaying(false); seek(0); setPlaying(true); }
      if (act === 'prev') { const i = stepIndex(); const target = (t - steps[i].t > 0.6 || i === 0) ? steps[i].t : steps[i - 1].t; setPlaying(false); seek(target); }
      if (act === 'next') { const i = stepIndex(); setPlaying(false); if (i + 1 < steps.length) seek(steps[i + 1].t); else seek(sc.duration); }
      if (act === 'speed') { speed = speed === 1 ? 0.5 : speed === 0.5 ? 1.5 : 1; speedBtn.textContent = speed + '×'; }
      if (act === 'audio') {
        const on = !audioOn();
        if (window.AppSettings) window.AppSettings.set('sceneAudio', on);
        audioBtn.textContent = on ? '🔊' : '🔇';
        if (!on) { if (talking) Native.stop(); talking = false; if (sound) { sound.close(); sound = null; } }
        else { if (playing) { sound = makeSound(); narrate(stepIndex()); } }
      }
      if (act === 'full') setFull(!full);
    });
    track.addEventListener('click', e => {
      const r = track.getBoundingClientRect();
      setPlaying(false);
      seek(sc.duration * (e.clientX - r.left) / r.width);
    });
    overlay.addEventListener('click', () => { if (t >= sc.duration) seek(0); setPlaying(true); });
    // tap the picture to play or pause, double-tap for full screen
    svg.addEventListener('click', () => { if (t >= sc.duration) seek(0); setPlaying(!playing); });
    svg.addEventListener('dblclick', () => setFull(!full));

    render();
    setPlaying(false);
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return {
      destroy() {
        destroyed = true; cancelAnimationFrame(raf);
        setFull(false);
        document.removeEventListener('fullscreenchange', onFsChange);
        if (talking) Native.stop();
        if (sound) sound.close();
      },
      pause() { setPlaying(false); },
    };
  }

  window.Scenes = { create, bez, arc, tl, W, H, exitFull: () => (fullPlayer ? (fullPlayer(), true) : false) };
})();
