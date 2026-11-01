// Animated scenarios, one or more per chapter (see lessons.js -> scenarios).
// Coordinates are in an 800x450 scene. Italy drives on the right:
//   road/cross/tee layouts: eastbound lane y=250, westbound y=200, northbound x=425, southbound x=375.
// Actor keys are [time, x, y] (optional 4th value = fixed heading in degrees).
(function () {
  'use strict';
  const { bez, arc, tl } = window.Scenes;
  const K = (...parts) => [].concat(...parts.map(p => (typeof p[0] === 'number' ? [p] : p)));
  const VEST = '#d4f000';

  // Small side-view car used by the diagram scenarios.
  function sideCar(el, parent, color) {
    const c = el('g', {}, parent);
    el('path', { d: 'M-70 0 L-70 -28 L-32 -32 L-12 -54 L38 -54 L58 -30 L80 -25 L80 0 Z', fill: color, stroke: 'rgba(0,0,0,.35)' }, c);
    el('path', { d: 'M-26 -33 L-9 -50 L33 -50 L49 -33 Z', fill: '#bfe3ff', opacity: 0.85 }, c);
    el('circle', { cx: -44, cy: 0, r: 12, fill: '#222' }, c);
    el('circle', { cx: 54, cy: 0, r: 12, fill: '#222' }, c);
    return c;
  }
  function text(el, parent, x, y, str, opts = {}) {
    const t = el('text', { x, y, 'text-anchor': opts.anchor || 'start', 'font-size': opts.size || 16, 'font-weight': opts.weight || 700, fill: opts.fill || '#1b1b1b', 'font-family': 'system-ui, sans-serif' }, parent);
    t.textContent = tl(str);
    return t;
  }
  const piece = (seq, t) => { let v = seq[0][1]; for (const [k, val] of seq) if (t >= k) v = val; return v; };

  const S = {};

  // ---------------- 1. Definitions ----------------
  S.roadParts = {
    title: 'Parts of the road', layout: 'road', duration: 18,
    extras: [
      { type: 'zone', x: 4, y: 177, w: 380, h: 96, fill: 'rgba(255,210,63,.25)', stroke: '#ffd23f', t0: 0, t1: 4 },
      { type: 'label', x: 200, y: 140, text: 'Carriageway (carreggiata)', t0: 0, t1: 4 },
      { type: 'zone', x: 4, y: 227, w: 380, h: 44, fill: 'rgba(31,95,191,.3)', stroke: '#1f5fbf', t0: 4, t1: 8 },
      { type: 'label', x: 200, y: 330, text: 'Your lane (corsia) – keep right', t0: 4, t1: 8 },
      { type: 'label', x: 200, y: 140, text: 'Oncoming lane', t0: 4, t1: 8 },
      { type: 'label', x: 150, y: 140, text: 'Pavement (marciapiede)', t0: 8, t1: 11 },
      { type: 'arrow', points: [[150, 148], [150, 162]], t0: 8, t1: 11 },
      { type: 'label', x: 420, y: 330, text: 'Edge line – the strip outside it is the banchina', t0: 8, t1: 11 },
      { type: 'arrow', points: [[300, 318], [300, 274]], t0: 8, t1: 11 },
      { type: 'zebra', x: 560, y: 178, w: 40, h: 94, dir: 'v' },
      { type: 'label', x: 600, y: 140, text: 'Pedestrian crossing (strisce pedonali)', t0: 11 },
    ],
    actors: [
      { id: 'me', kind: 'car', color: '#d7263d', keys: K([0, -40, 250], [10, 420, 250], [11.6, 515, 250], [15.4, 515, 250], [18, 860, 250]), brake: [[10, 15.4]] },
      { kind: 'car', color: '#2a7de1', keys: K([0, 860, 200], [7, -60, 200]) },
      { kind: 'ped', color: '#7b3fa0', keys: K([0, 580, 290], [11.8, 580, 290], [15.2, 580, 160], [18, 640, 160]) },
    ],
    steps: [
      { t: 0, text: 'The part of the road used by vehicles is the <b>carriageway</b> (<i>carreggiata</i>). A road can have one or more carriageways.' },
      { t: 4, text: 'The carriageway is divided into <b>lanes</b> (<i>corsie</i>). In Italy you drive on the <b>right</b>, in your own lane.' },
      { t: 8, text: '<b>Pavements</b> (<i>marciapiedi</i>) are for pedestrians. The strip beyond the edge line is the <b>banchina</b> (verge/shoulder) – not a lane for normal driving.' },
      { t: 11, text: 'At a <b>pedestrian crossing</b> pedestrians who are crossing or about to cross have priority: slow down and stop.' },
      { t: 15.4, text: 'Once the pedestrian has crossed completely, continue carefully.' },
    ],
  };

  // ---------------- 2. Warning signs ----------------
  S.warningSign = {
    title: 'A warning sign before a hazard', layout: 'road', duration: 13,
    extras: [
      { type: 'sign', kind: 'warnPed', x: 200, y: 300, s: 40 },
      { type: 'zebra', x: 600, y: 178, w: 40, h: 94, dir: 'v' },
      { type: 'measure', x1: 200, y1: 345, x2: 600, y2: 345, text: '≈ 150 m (outside built-up areas)', t0: 3 },
      { type: 'label', x: 200, y: 120, text: 'Red-bordered triangle = DANGER ahead', t0: 1, t1: 6 },
    ],
    actors: [
      { id: 'me', kind: 'car', keys: K([0, -40, 250], [3, 200, 250], [6.5, 460, 250], [7.6, 545, 250], [10.4, 545, 250], [13, 860, 250]), brake: [[3, 10.4]] },
      { kind: 'ped', color: '#2fa84f', keys: K([0, 620, 290], [6.6, 620, 290], [10.2, 620, 160], [13, 680, 150]) },
    ],
    steps: [
      { t: 0, text: 'Warning signs (<i>segnali di pericolo</i>) are triangles with a red border. They tell you <b>what</b> danger is coming, not what to do.' },
      { t: 3, text: 'Outside built-up areas they are placed about <b>150 m before</b> the danger (nearer inside towns). If the distance is different, a panel shows it.' },
      { t: 4.5, text: 'Your job: <b>slow down</b>, pay extra attention and be ready to stop.' },
      { t: 6.6, text: 'A pedestrian steps onto the crossing: you stop and let them cross.' },
    ],
  };

  // ---------------- 3. Prohibition signs ----------------
  S.noOvertaking = {
    title: 'No overtaking – and where it ends', layout: 'road', duration: 17,
    opts: { center: [[0, 100, 'dashed'], [100, 340, 'solid'], [340, 800, 'dashed']] },
    extras: [
      { type: 'sign', kind: 'noOvertake', x: 100, y: 300, s: 38 },
      { type: 'sign', kind: 'endNoOvertake', x: 340, y: 300, s: 38 },
      { type: 'label', x: 220, y: 130, text: 'No overtaking zone', t0: 0, t1: 10 },
      { type: 'label', x: 560, y: 130, text: 'Overtaking allowed again', t0: 9, t1: 15 },
    ],
    actors: [
      { kind: 'truck', keys: K([0, 60, 250], [17, 655, 250]) },
      { id: 'me', kind: 'car', keys: K([0, -60, 250], [2, -15 + 70, 250], [10.1, 340, 250], [11, 400, 205], [11.5, 440, 200], [13.45, 616, 200], [14.2, 680, 250], [17, 900, 250]), blink: [[10.1, 11.2, 'L'], [13.3, 14.4, 'R']] },
      { kind: 'car', color: '#2fa84f', keys: K([1, 860, 200], [7, -60, 200]) },
    ],
    steps: [
      { t: 0, text: 'Round signs with a red border are <b>prohibitions</b>. Two cars (left one red) = <b>no overtaking</b> of motor vehicles. The continuous centre line also forbids it.' },
      { t: 3, text: 'Even behind a slow truck you must stay in your lane. An oncoming car shows why: you cannot see far enough.' },
      { t: 8.5, text: 'A white sign with a black diagonal bar marks the <b>end</b> of the ban. The centre line becomes broken.' },
      { t: 10.1, text: 'Check the mirror, <b>signal left</b> and overtake, leaving enough space at the side.' },
      { t: 13.3, text: '<b>Signal right</b> and move back to your lane gradually, without cutting in front of the truck.' },
    ],
  };

  // ---------------- 4. Mandatory signs ----------------
  S.mandatoryRight = {
    title: 'Mandatory direction: turn right', layout: 'cross', duration: 11,
    extras: [
      { type: 'sign', kind: 'turnRight', x: 300, y: 300, s: 38 },
      { type: 'sign', kind: 'noEntry', x: 480, y: 300, s: 34 },
      { type: 'zebra', x: 352, y: 300, w: 96, h: 36, dir: 'h' },
      { type: 'label', x: 170, y: 130, text: 'Blue circle = you MUST do this', t0: 0, t1: 4 },
    ],
    actors: [
      { id: 'me', kind: 'car', keys: K([0, -40, 250], [2, 290, 250], bez([290, 250], [375, 250], [375, 275], 2, 3.4, 8), [6.1, 375, 275], [8, 375, 480]), blink: [[0.8, 3.6, 'R']], brake: [[2.6, 6.1]] },
      { kind: 'ped', color: '#7b3fa0', keys: K([0, 320, 318], [2.6, 320, 318], [6, 480, 318], [11, 520, 330]) },
    ],
    steps: [
      { t: 0, text: 'Round <b>blue</b> signs are <b>obligations</b> (<i>segnali di obbligo</i>). This one: you must turn right. Going straight is a no-entry street.' },
      { t: 0.8, text: 'Signal right in good time and keep close to the right edge of the road.' },
      { t: 3, text: 'While turning, give way to pedestrians crossing the road you are entering.' },
      { t: 6.1, text: 'When the crossing is free, complete the turn.' },
    ],
  };

  // ---------------- 5. Precedence signs: STOP ----------------
  S.stopSign = {
    title: 'STOP at a T-junction', layout: 'tee', opts: { stopLine: 'stop' }, duration: 12.5,
    extras: [
      { type: 'sign', kind: 'stop', x: 475, y: 300, s: 40 },
      { type: 'label', x: 600, y: 360, text: 'Stop line: stop BEFORE it', t0: 2.5, t1: 8 },
    ],
    actors: [
      { id: 'me', kind: 'car', keys: K([0, 425, 500], [3, 425, 307], [8.2, 425, 307], bez([425, 307], [425, 250], [480, 250], 8.2, 9.6, 8), [12.5, 860, 250]), blink: [[1.5, 9.6, 'R']], brake: [[2.3, 8.2]] },
      { kind: 'car', color: '#2a7de1', keys: K([0, -60, 250], [6, 860, 250]) },
      { kind: 'car', color: '#2fa84f', keys: K([2, 860, 200], [8, -60, 200]) },
    ],
    steps: [
      { t: 0, text: 'The octagonal <b>STOP</b> sign: you must <b>stop completely</b> at the stop line, even if the road looks empty.' },
      { t: 3, text: 'Stopped. Now give way to vehicles coming from <b>both</b> directions on the main road.' },
      { t: 6, text: 'Look left and right again – a car is coming from the right.' },
      { t: 8.2, text: 'When it is clear, move off and turn.' },
    ],
  };

  // ---------------- 6. Road markings ----------------
  S.lines = {
    title: 'Broken and continuous lines', layout: 'road', duration: 17,
    opts: { center: [[0, 400, 'dashed'], [400, 800, 'solid']] },
    extras: [
      { type: 'label', x: 200, y: 130, text: 'Broken line: you may cross it', t0: 0 },
      { type: 'label', x: 600, y: 130, text: 'Continuous line: never cross it', t0: 5 },
    ],
    actors: [
      { kind: 'bike', color: '#2fa84f', keys: K([0, 120, 262], [17, 630, 262]) },
      { id: 'a', kind: 'car', label: 'A', keys: K([0, -40, 250], [0.8, 60, 250], [1.5, 140, 203], [2.4, 240, 203], [3.1, 330, 250], [6, 860, 250]), blink: [[0.2, 1.6, 'L'], [2.3, 3.2, 'R']] },
      { id: 'b', kind: 'car', label: 'B', color: '#2a7de1', keys: K([4, -40, 250], [9, 345, 250], [17, 585, 250]) },
    ],
    steps: [
      { t: 0, text: 'White <b>broken</b> line (<i>striscia discontinua</i>): you may cross it to overtake or turn, when it is safe. Car A overtakes the cyclist.' },
      { t: 4, text: 'Car B also reaches the cyclist…' },
      { t: 8, text: '…but here the line is <b>continuous</b> (<i>striscia continua</i>): it must not be crossed or driven on. B stays behind, keeping a safe distance.' },
      { t: 12, text: 'Remember: <b>yellow</b> lines are temporary (roadworks) and override white ones. With a double line (one broken, one continuous) you may cross only from the broken side.' },
    ],
  };

  // ---------------- 7. Traffic lights ----------------
  S.trafficLights = {
    title: 'Green, amber, red', layout: 'cross', duration: 18,
    extras: [
      { type: 'light', x: 322, y: 305, seq: [[0, 'g'], [5, 'y'], [8, 'r'], [15, 'g']] },
      { type: 'light', x: 478, y: 318, seq: [[0, 'r'], [8.6, 'g'], [14, 'y'], [15, 'r']] },
    ],
    actors: [
      { kind: 'car', color: '#2a7de1', keys: K([0, 100, 250], [5, 860, 250]) },
      { id: 'b', kind: 'car', label: 'B', color: '#f08a24', keys: K([1.5, -60, 250], [5.2, 330, 250], [7, 600, 250], [8, 860, 250]) },
      { id: 'me', kind: 'car', label: 'C', keys: K([3.5, -60, 250], [7, 250, 250], [8.3, 316, 250], [15.3, 316, 250], [18, 860, 250]), brake: [[6.4, 15.3]] },
      { kind: 'car', color: '#2fa84f', keys: K([0, 425, 307], [8.9, 425, 307], [11, 425, -60]) },
    ],
    steps: [
      { t: 0, text: '<b>Green</b>: you may go – but only if you can clear the junction without stopping inside it.' },
      { t: 5, text: '<b>Amber</b> (<i>giallo</i>): stop, unless you are so close that you cannot stop safely. Car B is too close, so it continues.' },
      { t: 6.4, text: 'Car C is further back: it must brake and stop.' },
      { t: 8, text: '<b>Red</b>: stop behind the stop line. Cross traffic gets green.' },
      { t: 15, text: 'Green again for C. Always give way to pedestrians still crossing.' },
    ],
  };

  S.officer = {
    title: 'Signals from a traffic officer', layout: 'cross', duration: 15,
    extras: [
      { type: 'label', x: 400, y: 40, text: 'Arms outstretched east–west', t0: 0, t1: 8 },
      { type: 'label', x: 400, y: 40, text: 'Officer turned: arms north–south', t0: 8, t1: 12.5 },
      { type: 'label', x: 400, y: 40, text: 'Arm raised = like AMBER', t0: 12.5 },
    ],
    actors: [
      { kind: 'officer', keys: [[0, 400, 225, 90], [8, 400, 225, 0]] },
      { kind: 'car', color: '#2a7de1', keys: K([0, -40, 250], [5, 860, 250]) },
      { kind: 'car', color: '#2fa84f', keys: K([1, 860, 200], [6, -60, 200]) },
      { kind: 'car', color: '#d7263d', keys: K([5.5, -40, 250], [7.8, 316, 250], [15, 316, 250]), brake: [[7, 15]] },
      { kind: 'car', color: '#f08a24', keys: K([0, 425, 307], [8.6, 425, 307], [11, 425, -60]) },
      { kind: 'car', color: '#7b3fa0', keys: K([0, 375, 143], [8.9, 375, 143], [11.5, 375, 520]) },
    ],
    steps: [
      { t: 0, text: 'Officer with arms outstretched: traffic coming from the sides of the arms (east–west) may <b>go</b> – like green.' },
      { t: 2, text: 'Traffic facing the officer\'s <b>chest or back</b> (north–south) must <b>stop</b> – like red.' },
      { t: 8, text: 'The officer turns 90°: now north–south traffic goes and east–west traffic stops.' },
      { t: 12.5, text: 'Arm raised vertically = like amber: clear the junction or stop. <b>Officer signals override</b> traffic lights, signs and normal rules.' },
    ],
  };

  // ---------------- 8. Direction signs: colours ----------------
  S.signColours = {
    title: 'Direction sign colours', layout: 'diagram', duration: 13,
    build(h) {
      const cards = [
        ['#138a3d', '#fff', 'A1 MILANO', 'Motorway', 0],
        ['#1f5fbf', '#fff', 'SS 1 PISA', 'Extra-urban roads', 2],
        ['#ffffff', '#111', 'Centro', 'Urban roads', 4],
        ['#7a4a22', '#fff', 'Museo', 'Tourist sights', 6],
        ['#f6d21b', '#111', 'Deviazione', 'Temporary / roadworks', 8],
      ];
      h.state.cards = cards.map(([bg, fg, sign, label, t0], i) => {
        const g = h.el('g', { transform: `translate(${30 + i * 152} 110)` }, h.layers.over);
        h.el('rect', { width: 136, height: 70, rx: 8, fill: bg, stroke: '#333', 'stroke-width': 2 }, g);
        text(h.el, g, 68, 43, sign, { anchor: 'middle', fill: fg, size: 18 });
        text(h.el, g, 68, 105, label, { anchor: 'middle', size: 14 });
        return { g, t0 };
      });
      const town = h.el('g', { transform: 'translate(0 280)' }, h.layers.over);
      h.drawSign(town, { kind: 'town', x: 250, y: 40, s: 60, text: 'SIENA', post: false });
      h.drawSign(town, { kind: 'town', x: 550, y: 40, s: 60, text: 'SIENA', end: true, post: false });
      text(h.el, town, 250, 110, 'Start of built-up area', { anchor: 'middle', size: 14 });
      text(h.el, town, 550, 110, 'End of built-up area', { anchor: 'middle', size: 14 });
      h.state.town = town;
    },
    update(t, h) {
      for (const c of h.state.cards) c.g.style.opacity = t >= c.t0 ? 1 : 0.08;
      h.state.town.style.opacity = t >= 10 ? 1 : 0.08;
    },
    steps: [
      { t: 0, text: '<b>Green</b> background: directions on a <b>motorway</b> (<i>autostrada</i>).' },
      { t: 2, text: '<b>Blue</b>: directions on <b>extra-urban</b> roads (outside towns).' },
      { t: 4, text: '<b>White</b>: directions on <b>urban</b> roads (inside towns).' },
      { t: 6, text: '<b>Brown</b>: places of tourist or cultural interest.' },
      { t: 8, text: '<b>Yellow</b>: temporary signs, e.g. diversions for roadworks.' },
      { t: 10, text: 'White sign with the town name = <b>start of built-up area</b> (urban rules and 50 km/h). With a red bar = end.' },
    ],
  };

  // ---------------- 9. Roadworks ----------------
  const cones = [];
  for (let i = 0; i <= 6; i++) cones.push({ type: 'cone', x: 330 + i * 15, y: 262 - i * 7 });
  for (let x = 435; x <= 800; x += 30) cones.push({ type: 'cone', x, y: 218 });
  S.roadworks = {
    title: 'Roadworks: lane closed', layout: 'motorway', duration: 10,
    extras: [
      { type: 'sign', kind: 'works', x: 140, y: 35, s: 44, post: false },
      { type: 'sign', kind: 'laneClosed', x: 230, y: 38, s: 44, post: false },
      { type: 'line', x1: 330, y1: 266, x2: 800, y2: 266, color: '#f2c230', w: 4 },
      { type: 'line', x1: 330, y1: 214, x2: 800, y2: 214, color: '#f2c230', w: 4, dash: '20 12' },
      ...cones,
      { type: 'label', x: 620, y: 248, text: 'Works area', bg: 'rgba(255,230,120,.95)' },
    ],
    actors: [
      { id: 'me', kind: 'car', keys: K([0, -40, 240], [1.8, 170, 240], [3, 300, 190], [6, 860, 190]), blink: [[0.8, 3, 'L']] },
      { kind: 'truck', keys: K([1, -90, 240], [4.6, 250, 240], [6, 380, 190], [10, 860, 190]), blink: [[3.6, 6, 'L']] },
      { kind: 'car', color: '#2a7de1', keys: K([0.5, -40, 140], [5, 860, 140]) },
    ],
    steps: [
      { t: 0, text: 'A <b>yellow</b> triangle = roadworks. Yellow signs and markings are <b>temporary</b> and take priority over the normal white ones.' },
      { t: 0.8, text: 'The panel shows the <b>right lane is closed</b>. Slow down, signal and change lane early – don\'t wait until the cones.' },
      { t: 3.6, text: 'Let other vehicles merge too. Never drive between cones or into the works area.' },
      { t: 6, text: 'Respect lower speed limits near works: there may be workers and machines on the road.' },
    ],
  };

  // ---------------- 10. Additional panels ----------------
  S.panels = {
    title: 'Panels under signs', layout: 'road', duration: 12,
    extras: [
      { type: 'sign', kind: 'warnSignals', x: 150, y: 290, s: 38, panel: '300 m' },
      { type: 'light', x: 670, y: 305, seq: [[0, 'g'], [4.5, 'y'], [6.5, 'r']] },
      { type: 'line', x1: 640, y1: 228, x2: 640, y2: 272, w: 4 },
      { type: 'measure', x1: 150, y1: 395, x2: 640, y2: 395, text: 'Danger is 300 m after the sign', t0: 2 },
      { type: 'sign', kind: 'noParking', x: 330, y: 45, s: 34, post: false, panel: '8–20', t0: 7 },
      { type: 'label', x: 330, y: 115, text: 'Times', size: 13, t0: 7 },
      { type: 'sign', kind: 'noOvertake', x: 470, y: 45, s: 34, post: false, panel: '2 km', t0: 8 },
      { type: 'label', x: 470, y: 115, text: 'Extent', size: 13, t0: 8 },
      { type: 'sign', kind: 'stop', x: 610, y: 45, s: 34, post: false, panel: '150 m', t0: 9 },
      { type: 'label', x: 610, y: 115, text: 'Distance', size: 13, t0: 9 },
    ],
    actors: [
      { id: 'me', kind: 'car', keys: K([0, -40, 250], [3, 200, 250], [6.5, 560, 250], [7.6, 616, 250], [12, 616, 250]), brake: [[5.5, 12]] },
    ],
    steps: [
      { t: 0, text: 'Small white rectangles under a sign are <b>additional panels</b> (<i>pannelli integrativi</i>). They complete the meaning of the sign.' },
      { t: 2, text: 'This panel gives the <b>distance</b>: the traffic lights are 300 m ahead, not the usual 150 m.' },
      { t: 6.5, text: 'You arrive prepared and stop at the red light.' },
      { t: 7, text: 'Other panels show <b>times</b> when a rule applies, its <b>extent</b> (how long it lasts), or which <b>vehicles</b> it concerns or exempts.' },
    ],
  };

  // ---------------- 11. Speed limits ----------------
  S.speedLimits = {
    title: 'General speed limits in Italy', layout: 'road', duration: 19,
    opts: { center: [[0, 400, 'dashed'], [400, 600, 'double'], [600, 800, 'solid']] },
    extras: [
      { type: 'sign', kind: 'speed', value: 50, x: 25, y: 295, s: 34 },
      { type: 'sign', kind: 'speed', value: 90, x: 205, y: 295, s: 34 },
      { type: 'sign', kind: 'speed', value: 110, x: 405, y: 295, s: 34 },
      { type: 'sign', kind: 'motorway', x: 605, y: 290, s: 36 },
      { type: 'label', x: 100, y: 345, text: 'Built-up area 50', size: 13 },
      { type: 'label', x: 300, y: 345, text: 'Secondary road 90', size: 13 },
      { type: 'label', x: 500, y: 345, text: 'Main extra-urban 110', size: 13 },
      { type: 'label', x: 700, y: 345, text: 'Motorway 130', size: 13 },
      { type: 'label', x: 400, y: 410, text: 'Rain: motorway 110 · main extra-urban 90', bg: '#d8ecff', t0: 14 },
      { type: 'label', x: 400, y: 410, text: 'New drivers (first 3 years): motorway 100 · main extra-urban 90', bg: '#ffe9c2', t0: 11, t1: 14 },
    ],
    actors: [{ id: 'me', kind: 'car', keys: K([0, -30, 250], [4, 190, 250], [7, 390, 250], [10, 590, 250], [13, 800, 250], [19, 800, 250]) }],
    build(h) {
      const g = h.el('g', { transform: 'translate(400 92)' }, h.layers.over);
      h.el('circle', { r: 66, fill: '#1e2430', stroke: '#9aa3ad', 'stroke-width': 4 }, g);
      for (let v = 0; v <= 150; v += 10) {
        const a = (210 - v * 1.6) * Math.PI / 180, big = v % 50 === 0;
        h.el('line', { x1: Math.cos(a) * (big ? 46 : 52), y1: -Math.sin(a) * (big ? 46 : 52), x2: Math.cos(a) * 60, y2: -Math.sin(a) * 60, stroke: '#fff', 'stroke-width': big ? 3 : 1.5 }, g);
        if (big) text(h.el, g, Math.cos(a) * 34, -Math.sin(a) * 34 + 5, String(v), { anchor: 'middle', size: 12, fill: '#fff' });
      }
      h.state.needle = h.el('line', { x1: 0, y1: 0, x2: 54, y2: 0, stroke: '#ff4d4d', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
      h.el('circle', { r: 6, fill: '#ff4d4d' }, g);
      h.state.val = text(h.el, g, 0, 42, '0 km/h', { anchor: 'middle', fill: '#fff', size: 14 });
    },
    update(t, h, P) {
      const x = P.me ? P.me.x : 0;
      const zones = [[200, 50], [400, 90], [600, 110], [Infinity, 130]];
      let v = 50, prev = 50;
      for (const [edge, lim] of zones) { if (x < edge) { v = lim; break; } prev = lim; }
      // blend smoothly just after each zone boundary
      for (const edge of [200, 400, 600]) if (x >= edge && x < edge + 40) { const f = (x - edge) / 40; v = prev + (v - prev) * f; }
      if (x < 0) v = 50 * Math.max(0, (x + 30) / 30);
      const a = 210 - v * 1.6;
      h.state.needle.setAttribute('transform', `rotate(${-a})`);
      h.state.val.textContent = Math.round(v) + ' km/h';
    },
    steps: [
      { t: 0, text: 'Inside a <b>built-up area</b>: max <b>50 km/h</b> (some urban roads may allow up to 70 if signed).' },
      { t: 4, text: '<b>Secondary extra-urban</b> roads: max <b>90 km/h</b>.' },
      { t: 7, text: '<b>Main extra-urban</b> roads (separate carriageways): max <b>110 km/h</b>.' },
      { t: 10, text: '<b>Motorway</b>: max <b>130 km/h</b>.' },
      { t: 11, text: '<b>New drivers</b> (first 3 years): max 100 km/h on motorways and 90 km/h on main extra-urban roads.' },
      { t: 14, text: 'In <b>rain or snow</b>: 110 on motorways, 90 on main extra-urban roads. In fog with visibility under 100 m: max 50. Limits are maximums – always adapt to conditions.' },
    ],
  };

  // ---------------- 12. Safety distance ----------------
  S.safeDistance = {
    title: 'Reaction + braking = stopping distance', layout: 'road', duration: 12,
    extras: [
      { type: 'measure', x1: 452, y1: 315, x2: 552, y2: 315, text: 'Reaction distance', color: '#ffb000', t0: 4 },
      { type: 'measure', x1: 552, y1: 345, x2: 600, y2: 345, text: 'Braking', color: '#ff4d4d', t0: 5.4 },
      { type: 'measure', x1: 452, y1: 380, x2: 600, y2: 380, text: 'Stopping distance', color: '#ffffff', t0: 6 },
    ],
    actors: [
      { kind: 'car', color: '#2a7de1', label: '1', keys: K([0, 250, 250], [3, 550, 250], [3.8, 600, 250], [4.6, 625, 250], [12, 625, 250]), brake: [[3, 12]] },
      { id: 'me', kind: 'car', label: '2', keys: K([0, 130, 250], [3, 430, 250], [4, 530, 250], [4.6, 560, 250], [5.4, 578, 250], [12, 578, 250]), brake: [[4, 12]] },
    ],
    steps: [
      { t: 0, text: 'Keep a <b>safety distance</b> (<i>distanza di sicurezza</i>) so you can stop if the vehicle ahead brakes suddenly.' },
      { t: 3, text: 'Car 1 brakes hard. You need about <b>1 second to react</b> – during that time your car keeps going at full speed.' },
      { t: 4, text: 'Now you brake: the car needs a <b>braking distance</b> to stop.' },
      { t: 6, text: '<b>Stopping distance = reaction distance + braking distance.</b> In 1 s you travel about (speed ÷ 10) × 3 metres: 15 m at 50 km/h, 27 m at 90 km/h.' },
      { t: 8.5, text: 'Double the speed = about <b>four times</b> the braking distance. Increase the gap in rain, fog, with worn tyres, a heavy load or when tired.' },
    ],
  };

  // ---------------- 13. Traffic rules: turning ----------------
  S.turning = {
    title: 'Turning left and right correctly', layout: 'cross', duration: 10,
    actors: [
      { kind: 'car', color: '#2a7de1', label: 'B', keys: K([0, 375, -40], [4, 375, 480]) },
      { id: 'me', kind: 'car', label: 'A', keys: K([0, 425, 500], [2.5, 425, 315], [3.6, 425, 315], bez([425, 315], [422, 215], [330, 200], 3.6, 5.2, 12), [7, -60, 200]), blink: [[0.4, 5.2, 'L']], brake: [[2, 3.6]] },
      { kind: 'car', color: '#2fa84f', label: 'C', keys: K([4.5, -40, 250], [6.5, 300, 250], bez([300, 250], [372, 250], [375, 320], 6.5, 7.8, 10), [9.5, 375, 480]), blink: [[5, 7.8, 'R']] },
    ],
    steps: [
      { t: 0, text: 'Always keep to the <b>right</b>. To turn left on a two-way road, signal early and move as close as possible to the <b>centre line</b>.' },
      { t: 2.5, text: 'A must <b>give way to oncoming</b> vehicle B, which is going straight on.' },
      { t: 3.6, text: 'Then A turns near the <b>centre of the junction</b>, keeping it on its right, and enters the correct lane.' },
      { t: 5, text: 'To turn <b>right</b>: signal, keep close to the <b>right edge</b> and make a tight turn (car C).' },
    ],
  };

  // ---------------- 14. Precedence at intersections ----------------
  S.giveWayRight = {
    title: 'No signs: give way to the right', layout: 'cross', opts: { stopLines: false }, duration: 11,
    extras: [
      { type: 'label', x: 520, y: 165, text: '1st', bg: '#c9f2d4', t0: 3.2, t1: 5 },
      { type: 'label', x: 470, y: 340, text: '2nd', bg: '#c9f2d4', t0: 5, t1: 7.5 },
      { type: 'label', x: 280, y: 300, text: '3rd', bg: '#c9f2d4', t0: 7.5 },
    ],
    actors: [
      { id: 'a', kind: 'car', label: 'A', keys: K([0, 425, 500], [2.5, 425, 318], [5, 425, 318], [7.5, 425, -60]), brake: [[2, 5]] },
      { id: 'b', kind: 'car', label: 'B', color: '#2a7de1', keys: K([0, -60, 250], [2.5, 318, 250], [7.5, 318, 250], [10, 860, 250]), brake: [[2, 7.5]] },
      { id: 'c', kind: 'car', label: 'C', color: '#2fa84f', keys: K([0, 860, 200], [2.5, 482, 200], [3.5, 482, 200], [6, -60, 200]), brake: [[2, 3.5]] },
    ],
    steps: [
      { t: 0, text: 'A junction with no signs, lights or officer. The general rule: <b>give way to vehicles coming from your right</b>.' },
      { t: 2.5, text: 'Who has nobody on their right? <b>C</b> (coming from the east): it goes first.' },
      { t: 5, text: 'Now nobody is on A\'s right any more: <b>A</b> goes second.' },
      { t: 7.5, text: 'Finally <b>B</b>. Exam tip: in the intersection pictures, apply this rule one vehicle at a time.' },
    ],
  };

  S.roundabout = {
    title: 'Entering and leaving a roundabout', layout: 'roundabout', duration: 9,
    extras: [{ type: 'sign', kind: 'yield', x: 232, y: 300, s: 36 }],
    actors: [
      { kind: 'car', color: '#2a7de1', keys: K(arc(400, 225, 112, 110, 262, 0, 3.6, 18), [4.2, 377, 380], [5, 375, 480]), blink: [[2.6, 4, 'R']] },
      { id: 'me', kind: 'car', keys: K([0, -60, 250], [2, 226, 250], [3.4, 226, 250], bez([226, 250], [272, 262], [295, 263], 3.4, 4.1, 6), arc(400, 225, 112, 200, 350, 4.1, 6.6, 18), [7.2, 600, 250], [9, 860, 250]), blink: [[5.8, 7.1, 'R']], brake: [[1.5, 3.4]] },
    ],
    steps: [
      { t: 0, text: 'Approaching a roundabout, slow down. Usually a <b>give way</b> sign means vehicles <b>already in the roundabout have priority</b>.' },
      { t: 2, text: 'Wait at the give-way line while a car is circulating.' },
      { t: 3.4, text: 'Enter when it is clear, turning right. In Italy you go round <b>anticlockwise</b>.' },
      { t: 5.8, text: 'Signal <b>right</b> before your exit and watch for pedestrians and cyclists.' },
    ],
  };

  S.emergency = {
    title: 'Emergency vehicle with siren', layout: 'road', duration: 10,
    actors: [
      { kind: 'ambulance', keys: K([0.5, -60, 250], [2.5, 200, 250], [3.3, 300, 226], [5, 560, 226], [6, 700, 250], [7, 860, 250]), siren: [[0, 10]] },
      { id: 'me', kind: 'car', keys: K([0, 200, 250], [2, 330, 250], [3, 390, 261], [6.5, 390, 261], [9, 860, 250]), blink: [[1.2, 3, 'R']], brake: [[2, 6.5]] },
      { kind: 'car', color: '#2fa84f', keys: K([0, 860, 200], [2.5, 600, 200], [3.3, 560, 190], [6.5, 560, 190], [10, -60, 190]), brake: [[2.5, 6.5]] },
    ],
    steps: [
      { t: 0, text: 'An ambulance comes with <b>blue flashing light and siren</b> together: you must give way.' },
      { t: 1.2, text: 'Signal, move to the right and slow down or stop to leave it room. Oncoming traffic does the same.' },
      { t: 5, text: 'Don\'t follow it closely to take advantage of the free road.' },
      { t: 6.5, text: 'When it has passed, check the mirror and move off carefully.' },
    ],
  };

  // ---------------- 15. Overtaking ----------------
  S.overtaking = {
    title: 'How to overtake safely', layout: 'road', duration: 12,
    actors: [
      { kind: 'truck', keys: K([0, 80, 250], [17, 675, 250]) },
      { id: 'me', kind: 'car', keys: K([0, -60, 250], [1.5, 57, 250], [6, 215, 250], [7, 300, 204], [8.6, 480, 200], [9.5, 560, 250], [12, 860, 250]), blink: [[5, 6.8, 'L'], [8.4, 9.6, 'R']] },
      { kind: 'car', color: '#2fa84f', keys: K([0, 860, 200], [6.5, -60, 200]) },
    ],
    steps: [
      { t: 0, text: 'Before overtaking ask: is it allowed here (no ban, no continuous line, not near a crest, bend, junction or zebra crossing)?' },
      { t: 2, text: 'Is the road ahead clear for long enough? An oncoming car is coming: <b>wait</b>.' },
      { t: 4.8, text: 'Check the <b>mirror</b>: nobody behind you must already be overtaking you. The vehicle ahead must not be signalling to overtake.' },
      { t: 5, text: '<b>Signal left</b> and pull out. Overtake on the <b>left</b>, leaving enough side space.' },
      { t: 8.4, text: '<b>Signal right</b> and return gradually to the right lane, without forcing the overtaken vehicle to brake.' },
    ],
  };

  // ---------------- 16. Stopping and parking ----------------
  S.parking = {
    title: 'Fermata, sosta, arresto', layout: 'tee', duration: 14,
    extras: [
      { type: 'zone', x: 290, y: 252, w: 58, h: 22, text: '5 m', t0: 11 },
      { type: 'zone', x: 452, y: 252, w: 58, h: 22, text: '5 m', t0: 11 },
      { type: 'label', x: 215, y: 330, text: 'SOSTA (parked)', bg: '#d8ecff', t0: 3.5 },
      { type: 'label', x: 600, y: 330, text: 'FERMATA (brief stop)', bg: '#ffe9c2', t0: 7.2, t1: 10 },
    ],
    actors: [
      { kind: 'car', color: '#2a7de1', keys: K([0, -40, 250], [2.5, 150, 250], [3.5, 215, 262], [14, 215, 262]), blink: [[1.5, 3.5, 'R']], brake: [[2.5, 3.5]] },
      { id: 'me', kind: 'car', keys: K([4, -40, 250], [6.5, 560, 250], [7.2, 600, 262], [9.5, 600, 262], [10.5, 680, 250], [12, 860, 250]), blink: [[5.8, 7.2, 'R'], [8.8, 10, 'L']], brake: [[6.5, 9.5]] },
      { kind: 'ped', color: '#7b3fa0', show: [7.5, 14], keys: K([7.5, 600, 282], [8.6, 610, 292], [11, 720, 290]) },
    ],
    steps: [
      { t: 0, text: '<b>Sosta</b> = parking: leaving the vehicle for a longer time; the driver may go away.' },
      { t: 4, text: '<b>Fermata</b> = a brief stop to let people get in or out. The driver stays ready to move.' },
      { t: 9.5, text: '<b>Arresto</b> = stopping because traffic requires it (red light, queue, give way).' },
      { t: 11, text: 'Parking is forbidden within <b>5 m of a junction</b>, on zebra crossings, in front of driveways, at bus stops and on pavements.' },
    ],
  };

  // ---------------- 17. Motorway ----------------
  S.motorwayEntry = {
    title: 'Joining the motorway', layout: 'motorway', duration: 8,
    actors: [
      { id: 'me', kind: 'car', keys: K(bez([40, 445], [150, 330], [300, 286], 0, 2.6, 12), [4.2, 520, 285], [5.2, 610, 240], [8, 860, 240]), blink: [[3.3, 5.2, 'L']] },
      { kind: 'truck', keys: K([0, -90, 240], [7, 560, 240], [8, 640, 240]) },
      { kind: 'car', color: '#2a7de1', keys: K([0, -40, 190], [4, 860, 190]) },
    ],
    steps: [
      { t: 0, text: 'Enter using the <b>acceleration lane</b> (<i>corsia di accelerazione</i>).' },
      { t: 2.6, text: 'Use it to reach a speed similar to the traffic on the motorway.' },
      { t: 3.3, text: '<b>Signal left</b>, check mirrors and blind spot. Vehicles already on the motorway have priority.' },
      { t: 5.2, text: 'Merge into the right lane. Never reverse or make U-turns on a motorway.' },
    ],
  };

  S.breakdown = {
    title: 'Breakdown on the motorway', layout: 'motorway', duration: 12,
    extras: [
      { type: 'sign', kind: 'triangle', x: 612, y: 282, s: 22, post: false, t0: 7.5 },
      { type: 'measure', x1: 612, y1: 330, x2: 680, y2: 330, text: '≥ 50 m', t0: 7.5 },
      { type: 'label', x: 640, y: 380, text: 'Visible from at least 100 m', t0: 8 },
    ],
    actors: [
      { id: 'me', kind: 'car', keys: K([0, -40, 240], [2, 400, 240], [3.4, 620, 282], [4.2, 680, 285], [12, 680, 285]), blink: [[1, 12, 'H']], brake: [[2, 4.2]] },
      { kind: 'ped', color: VEST, show: [4.8, 12], keys: K([4.8, 690, 302], [7.4, 612, 296], [8, 612, 300], [11, 720, 322]) },
      { kind: 'car', color: '#2a7de1', keys: K([1, -40, 190], [5, 860, 190]) },
      { kind: 'car', color: '#2fa84f', keys: K([6, -40, 140], [9.5, 860, 140]) },
      { kind: 'truck', keys: K([7, -90, 190], [12, 860, 190]) },
    ],
    steps: [
      { t: 0, text: 'Breakdown: switch on the <b>hazard lights</b> (<i>quattro frecce</i>) and move into the <b>emergency lane</b>.' },
      { t: 4.2, text: 'Put on the <b>high-visibility vest</b> before getting out of the car.' },
      { t: 5, text: 'Place the <b>warning triangle</b> at least <b>50 m behind</b> the vehicle, visible from at least 100 m.' },
      { t: 8, text: 'Then get behind the guard rail, away from traffic, and call for help.' },
    ],
  };

  // ---------------- 18. Lights ----------------
  S.nightLights = {
    title: 'High and dipped beams at night', layout: 'road', night: true, duration: 10,
    actors: [
      { id: 'me', kind: 'car', keys: K([0, -40, 250], [10, 860, 250]), beam: [[0, 'high'], [3, 'low'], [7.5, 'high']] },
      { kind: 'car', color: '#2a7de1', keys: K([1.5, 860, 200], [9, -60, 200]), beam: [[0, 'low']] },
    ],
    extras: [
      { type: 'label', x: 400, y: 80, text: 'High beams (abbaglianti)', bg: '#fff3b0', t0: 0, t1: 3 },
      { type: 'label', x: 400, y: 80, text: 'Dipped beams (anabbaglianti)', bg: '#fff3b0', t0: 3, t1: 7.5 },
      { type: 'label', x: 400, y: 80, text: 'High beams again', bg: '#fff3b0', t0: 7.5 },
    ],
    steps: [
      { t: 0, text: 'Outside built-up areas at night, <b>high beams</b> light the road far ahead – use them when you won\'t dazzle anyone.' },
      { t: 3, text: 'A vehicle is coming towards you: switch to <b>dipped beams</b> in good time so you don\'t dazzle its driver.' },
      { t: 5.5, text: 'Also use dipped beams when following close behind another vehicle, and inside towns.' },
      { t: 7.5, text: 'Once it has passed you may use high beams again. Rear fog light only with visibility under 50 m.' },
    ],
  };

  // ---------------- 19. Seat belts ----------------
  S.seatbelt = {
    title: 'Why the seat belt matters', layout: 'diagram', duration: 10,
    build(h) {
      const g = h.layers.under;
      for (const y of [172, 382]) h.el('rect', { x: 0, y, width: 800, height: 10, fill: '#8f8f8f' }, g);
      h.el('rect', { x: 640, y: 40, width: 30, height: 350, fill: '#9aa0a8', stroke: '#6b7078' }, g);
      text(h.el, g, 20, 40, 'With seat belt', { size: 18 });
      text(h.el, g, 20, 250, 'Without seat belt', { size: 18 });
      h.state.rows = [160, 370].map((y, i) => {
        const car = sideCar(h.el, h.layers.actors, i ? '#2a7de1' : '#d7263d');
        const d = h.el('g', {}, h.layers.over);
        h.el('rect', { x: -8, y: -30, width: 16, height: 26, rx: 6, fill: '#f0b35c' }, d);
        h.el('circle', { cx: 2, cy: -40, r: 9, fill: '#f0b35c' }, d);
        if (!i) h.el('line', { x1: -8, y1: -28, x2: 8, y2: -6, stroke: '#111', 'stroke-width': 4 }, d);
        const boom = text(h.el, h.layers.over, 0, 0, '💥', { size: 30 });
        return { y, car, d, boom, belted: !i };
      });
    },
    update(t, h) {
      const cx = t < 3 ? 80 + 160 * t : 560;
      for (const r of h.state.rows) {
        r.car.setAttribute('transform', `translate(${cx} ${r.y})`);
        let dx = 0, rot = 0;
        if (t > 3) {
          if (r.belted) { const f = Math.min(1, (t - 3) / 0.5); dx = 9 * Math.sin(Math.PI * f); rot = 12 * Math.sin(Math.PI * f); }
          else { const f = Math.min(1, (t - 3) / 0.3); dx = 42 * f; rot = 35 * f; }
        }
        r.d.setAttribute('transform', `translate(${cx - 4 + dx} ${r.y - 4}) rotate(${rot})`);
        const show = !r.belted && t > 3.3;
        r.boom.setAttribute('x', cx + 40); r.boom.setAttribute('y', r.y - 52);
        r.boom.style.opacity = show ? 1 : 0;
      }
    },
    steps: [
      { t: 0, text: 'Two identical cars travel at <b>50 km/h</b>.' },
      { t: 3, text: 'Crash: the car stops in a fraction of a second. The belted driver is held in the seat.' },
      { t: 3.4, text: 'Without a belt the body keeps moving at 50 km/h and hits the steering wheel and windscreen – like falling from about the <b>3rd floor</b> (≈10 m).' },
      { t: 6, text: 'Belts are compulsory <b>front and rear</b>. Children under 1.50 m need a suitable child seat. Never fit a rear-facing child seat in front of an active airbag.' },
    ],
  };

  // ---------------- 20. Licence points ----------------
  S.points = {
    title: 'The points licence', layout: 'diagram', duration: 13,
    build(h) {
      const rows = [['Experienced driver', 70, [[0, 20], [2.5, 15], [6, 17]]], ['New driver (first 3 years)', 230, [[0, 20], [2.5, 10], [6, 12]]]];
      h.state.rows = rows.map(([name, y, seq]) => {
        const g = h.el('g', { transform: `translate(30 ${y})` }, h.layers.over);
        text(h.el, g, 0, 0, name, { size: 17 });
        const boxes = [];
        for (let i = 0; i < 30; i++) boxes.push(h.el('rect', { x: i * 22, y: 16, width: 18, height: 30, rx: 3, stroke: '#7a7a7a', 'stroke-width': 1 }, g));
        const num = text(h.el, g, 700, 42, '20', { size: 30 });
        const note = text(h.el, g, 0, 82, '', { size: 15, weight: 600, fill: '#7a1220' });
        return { boxes, num, note, seq };
      });
      h.state.final = text(h.el, h.layers.over, 30, 410, '', { size: 16, fill: '#7a1220' });
    },
    update(t, h) {
      const notes = [
        [[0, 'Everyone starts with 20 points.'], [2.5, 'Example offence: −5 points'], [6, '+2 points after 2 years without offences'], [9, 'Maximum: 30 points']],
        [[0, 'Everyone starts with 20 points.'], [2.5, 'Same offence: points lost are DOUBLED → −10'], [6, '+1 point per clean year in the first 3 years']],
      ];
      h.state.rows.forEach((r, i) => {
        const n = piece(r.seq, t);
        r.boxes.forEach((b, k) => b.setAttribute('fill', k < n ? (n <= 10 ? '#f2a33a' : '#2fa84f') : '#eee'));
        r.num.textContent = String(n);
        r.note.textContent = tl(piece(notes[i], t));
      });
      h.state.final.textContent = t >= 10 ? tl('At 0 points you must retake the theory and practical exams (revisione).') : '';
    },
    steps: [
      { t: 0, text: 'Your licence starts with <b>20 points</b>.' },
      { t: 2.5, text: 'Offences remove points (the exact number depends on the offence). For <b>new drivers</b> in their first 3 years, points lost are <b>doubled</b>.' },
      { t: 6, text: 'Driving without offences gives points back: <b>+2 every 2 years</b> (new drivers: +1 per clean year for the first 3 years).' },
      { t: 9, text: 'You can reach up to <b>30 points</b>.' },
      { t: 10, text: 'If you reach <b>0</b>, your licence goes to <b>revisione</b>: you must pass the exams again.' },
    ],
  };

  // ---------------- 21. Accidents ----------------
  S.accident = {
    title: 'You arrive at an accident', layout: 'road', duration: 13,
    extras: [
      { type: 'sign', kind: 'triangle', x: 190, y: 250, s: 22, post: false, t0: 6.6 },
      { type: 'label', x: 600, y: 120, text: '📞 112', size: 20, t0: 7.2 },
    ],
    actors: [
      { kind: 'car', color: '#2fa84f', keys: [[0, 520, 252, 25]], blink: [[0, 13, 'H']] },
      { kind: 'car', color: '#2a7de1', keys: [[0, 572, 228, -150]], blink: [[0, 13, 'H']] },
      { id: 'me', kind: 'car', keys: K([0, -40, 250], [2.6, 300, 250], [3.4, 340, 250], [13, 340, 250]), blink: [[2.6, 13, 'H']], brake: [[2.2, 13]] },
      { kind: 'ped', color: VEST, show: [4, 13], keys: K([4, 345, 282], [6.4, 192, 270], [7, 200, 286], [9.6, 500, 290], [13, 505, 290]) },
    ],
    steps: [
      { t: 0, text: 'You come across an accident.' },
      { t: 2.6, text: 'Slow down, stop safely, switch on the <b>hazard lights</b> and put on the <b>high-visibility vest</b>.' },
      { t: 4.5, text: 'Warn approaching traffic with the <b>warning triangle</b>.' },
      { t: 7.2, text: 'Call <b>112</b>: say where you are, how many vehicles and injured people there are.' },
      { t: 9.6, text: 'Help the injured. Don\'t move them unless they are in immediate danger (e.g. fire). Don\'t give them anything to drink.' },
    ],
  };

  // ---------------- 22. Alcohol ----------------
  S.alcohol = {
    title: 'Alcohol and driving', layout: 'diagram', duration: 13,
    build(h) {
      const g = h.layers.over;
      const X = v => 100 + 300 * v;
      text(h.el, g, 100, 50, 'Blood alcohol level (g/l)', { size: 17 });
      [[0, 0.5, '#f6d21b'], [0.5, 0.8, '#f2a33a'], [0.8, 1.5, '#e04a3a'], [1.5, 2, '#8e1b2b']].forEach(([a, b, c]) => h.el('rect', { x: X(a), y: 70, width: X(b) - X(a), height: 30, fill: c }, g));
      [0, 0.5, 0.8, 1.5].forEach(v => { h.el('line', { x1: X(v), y1: 64, x2: X(v), y2: 106, stroke: '#111', 'stroke-width': 2 }, g); text(h.el, g, X(v), 124, v.toFixed(1), { anchor: 'middle', size: 13 }); });
      h.state.marker = h.el('path', { d: 'M0 0 L-9 -14 L9 -14 Z', fill: '#111' }, g);
      h.state.val = text(h.el, g, 400, 160, '', { anchor: 'middle', size: 18 });
      h.state.msg = text(h.el, g, 400, 188, '', { anchor: 'middle', size: 15, weight: 600, fill: '#7a1220' });
      h.state.cone = h.el('path', { d: '', fill: 'rgba(31,95,191,.22)', stroke: '#1f5fbf', 'stroke-width': 2 }, h.layers.under);
      h.el('circle', { cx: 400, cy: 430, r: 10, fill: '#f0b35c' }, g);
      text(h.el, g, 400, 250, 'Field of vision', { anchor: 'middle', size: 14 });
      h.state.react = h.el('rect', { x: 560, y: 330, height: 18, rx: 4, fill: '#e04a3a' }, g);
      text(h.el, g, 560, 320, 'Reaction time', { size: 14 });
    },
    update(t, h) {
      const v = Math.max(0, Math.min(1.8, (t - 1) * 0.18));
      h.state.marker.setAttribute('transform', `translate(${100 + 300 * v} 68)`);
      h.state.val.textContent = `BAC ${v.toFixed(2)} g/l`;
      h.state.msg.textContent = tl(v === 0 ? 'The only safe level. Compulsory for new drivers, under-21s and professional drivers.'
        : v < 0.5 ? 'Allowed for experienced drivers – but reflexes are already slower.'
          : v < 0.8 ? 'Over the limit: fine, licence suspension, points lost.'
            : v < 1.5 ? 'Criminal offence: higher fines, arrest possible, longer suspension.'
              : 'Serious crime: arrest, long suspension, vehicle may be confiscated.');
      const half = (55 - v * 20) * Math.PI / 180, R = 190;
      h.state.cone.setAttribute('d', `M400 430 L${400 - R * Math.sin(half)} ${430 - R * Math.cos(half)} A${R} ${R} 0 0 1 ${400 + R * Math.sin(half)} ${430 - R * Math.cos(half)} Z`);
      h.state.react.setAttribute('width', 60 + v * 80);
    },
    steps: [
      { t: 0, text: 'The legal limit is <b>0.5 g/l</b>. For drivers in their <b>first 3 years</b>, under 21 or professional drivers it is <b>zero</b>.' },
      { t: 2, text: 'Even a small amount slows your <b>reactions</b>, narrows your <b>field of vision</b> and makes you overconfident.' },
      { t: 5.5, text: 'Above 0.5 g/l: fines, suspension of the licence and loss of points. Above 0.8 g/l it is a <b>crime</b>.' },
      { t: 10, text: 'Coffee, fresh air or food do <b>not</b> lower the level – only time does. Drugs are always forbidden.' },
    ],
  };

  // ---------------- 23. Insurance ----------------
  S.bonusMalus = {
    title: 'Bonus-malus insurance classes', layout: 'diagram', duration: 11,
    build(h) {
      const g = h.layers.over;
      text(h.el, g, 400, 40, 'Merit class (1 = cheapest, 18 = most expensive)', { anchor: 'middle', size: 16 });
      h.state.cols = [];
      for (let c = 1; c <= 18; c++) {
        const x = 70 + (c - 1) * 37, hgt = 30 + c * 12;
        h.state.cols.push(h.el('rect', { x: x - 14, y: 380 - hgt, width: 28, height: hgt, rx: 3, fill: '#c9d6e8' }, g));
        text(h.el, g, x, 400, String(c), { anchor: 'middle', size: 13 });
      }
      h.state.marker = h.el('g', {}, g);
      h.el('path', { d: 'M0 0 L-10 -16 L10 -16 Z', fill: '#d7263d' }, h.state.marker);
      h.state.lbl = text(h.el, g, 400, 90, '', { anchor: 'middle', size: 17, fill: '#7a1220' });
    },
    update(t, h) {
      const cls = piece([[0, 14], [2.5, 13], [4, 12], [5.5, 11], [7.5, 13]], t);
      const x = 70 + (cls - 1) * 37, hgt = 30 + cls * 12;
      h.state.marker.setAttribute('transform', `translate(${x} ${380 - hgt - 6})`);
      h.state.cols.forEach((c, i) => c.setAttribute('fill', i + 1 === cls ? '#d7263d' : '#c9d6e8'));
      h.state.lbl.textContent = tl(piece([[0, 'New policy: usually class 14'], [2.5, 'Year without accidents: −1 class'], [4, 'Another clean year: −1 class'], [5.5, 'And another: class 11'], [7.5, 'Accident mainly your fault: +2 classes']], t));
    },
    steps: [
      { t: 0, text: '<b>RCA</b> third-party insurance is <b>compulsory</b>: it pays for damage you cause to other people and their property.' },
      { t: 2.5, text: 'Under the <b>bonus-malus</b> system, every year without a claim where you are at fault moves you <b>down one class</b> → cheaper.' },
      { t: 7.5, text: 'A claim mainly your fault moves you <b>up two classes</b> → more expensive.' },
      { t: 9, text: 'Victims of unidentified or uninsured vehicles are paid by the <b>Fondo di garanzia vittime della strada</b>.' },
    ],
  };

  // ---------------- 24. Environment ----------------
  S.ecoDriving = {
    title: 'Smooth driving saves fuel', layout: 'diagram', duration: 10,
    build(h) {
      const g = h.layers.under;
      for (const y of [172, 382]) h.el('rect', { x: 0, y, width: 640, height: 10, fill: '#8f8f8f' }, g);
      text(h.el, g, 20, 40, 'Smooth: steady speed, early gear changes', { size: 16 });
      text(h.el, g, 20, 250, 'Aggressive: hard acceleration and braking', { size: 16 });
      h.state.rows = [160, 370].map((y, i) => {
        const car = sideCar(h.el, h.layers.actors, i ? '#e04a3a' : '#2fa84f');
        car.setAttribute('transform', `translate(100 ${y}) scale(.7)`);
        const fuelBg = h.el('rect', { x: 690, y: y - 120, width: 40, height: 120, rx: 6, fill: '#eee', stroke: '#888' }, h.layers.over);
        const fuel = h.el('rect', { x: 692, rx: 4, width: 36, fill: i ? '#e04a3a' : '#2fa84f' }, h.layers.over);
        text(h.el, h.layers.over, 710, y + 20, 'fuel', { anchor: 'middle', size: 13 });
        return { y, car, fuel, fuelBg, aggressive: !!i };
      });
    },
    update(t, h) {
      for (const r of h.state.rows) {
        let x;
        if (!r.aggressive) x = 100 + 46 * t;
        else { const p = t % 2.5; const lap = Math.floor(t / 2.5); x = 100 + lap * 115 + (p < 1 ? 70 * p * p : p < 1.6 ? 70 + 75 * (p - 1) : 115 - 0 * p); x = Math.min(x, 100 + 46 * t + 10); }
        r.car.setAttribute('transform', `translate(${Math.min(x, 600)} ${r.y}) scale(.7)`);
        const left = Math.max(0, 116 - t * (r.aggressive ? 10 : 4.5));
        r.fuel.setAttribute('y', r.y - 2 - left); r.fuel.setAttribute('height', left);
      }
    },
    steps: [
      { t: 0, text: 'Both cars arrive at about the same time, but the aggressive driver uses much more fuel and pollutes more.' },
      { t: 3, text: 'Drive at a steady speed, change up early, anticipate traffic and avoid sudden acceleration or braking.' },
      { t: 6, text: 'Keep tyres at the right pressure, remove roof racks when not needed, don\'t keep the engine running when stopped for a long time.' },
      { t: 8, text: 'Regular maintenance (filters, injectors, catalytic converter) reduces pollution. Never dump oil or batteries.' },
    ],
  };

  // ---------------- 25. Vehicle: grip ----------------
  S.wetBraking = {
    title: 'Braking on dry and wet roads', layout: 'road', opts: { centerType: 'dashed' }, duration: 9,
    extras: [
      { type: 'rect', x: 0, y: 226, w: 800, h: 48, fill: 'rgba(80,160,255,.35)' },
      { type: 'label', x: 80, y: 140, text: 'DRY', bg: '#fff3b0' },
      { type: 'label', x: 80, y: 330, text: 'WET', bg: '#d8ecff' },
      { type: 'measure', x1: 322, y1: 160, x2: 442, y2: 160, text: 'braking distance', t0: 4.6 },
      { type: 'measure', x1: 322, y1: 300, x2: 552, y2: 300, text: 'about twice as long', t0: 6.2 },
    ],
    actors: [
      { kind: 'car', color: '#2fa84f', keys: K([0, -40, 200, 0], [3, 300, 200], [3.8, 380, 200], [4.6, 420, 200], [9, 420, 200]), brake: [[3, 9]] },
      { id: 'me', kind: 'car', keys: K([0, -40, 250], [3, 300, 250], [4.2, 420, 250], [5.4, 500, 250], [6.2, 530, 250], [9, 530, 250]), brake: [[3, 9]] },
    ],
    steps: [
      { t: 0, text: 'Grip (<i>aderenza</i>) depends on the <b>tyres</b>, the <b>road surface</b> and the <b>speed</b>. Here two cars go at the same speed, one on a wet road.' },
      { t: 3, text: 'Both brake at the same point…' },
      { t: 4.6, text: '…on a wet road the braking distance can be about <b>twice as long</b>.' },
      { t: 6.5, text: 'In heavy rain, worn tyres can <b>aquaplane</b> (float on water). Minimum tread depth: <b>1.6 mm</b>. Check tyre pressure when the tyres are cold.' },
    ],
  };

  window.SCENARIOS = S;
})();
