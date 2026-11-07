// Chapter 14: priority at junctions. See topic-scenes.js for the format.
// The exam's lettered diagrams are shown as they are, narrated with statements from the question bank:
// the order of the cars in each one comes only from those statements.
window.TOPIC_SCRIPTS = window.TOPIC_SCRIPTS || {};
(function () {
  const S = {
    'regola-destra': { extra: ['Give way to the right', 'الأولوية لليمين', 'Precedenza a destra'], v: ['cross', { cars: [['W', 'E', 1], ['S', 'N', 0]] }], s: [
      ['With no signs or lights, <b>give way to whoever comes from your right</b>. The red car waits for the car on its right.', 'من غير علامات ولا إشارات، <b>الأولوية للي جاي من يمينك</b>. العربية الحمرا مستنية اللي على يمينها.'],
      ['Once the right side is clear, you go. Always slow down, and look at <b>every</b> arm of the junction.', 'لما يمينك يفضى تعدي. ودايماً هدي، وبص على <b>كل</b> اتجاهات التقاطع.'],
    ] },
    'regola-ordine': { extra: ['How to work out the order', 'إزاي تعرف الترتيب', 'Ordine di precedenza'], v: ['cross', { cars: [['W', 'E', 2], ['S', 'N', 1], ['E', 'W', 0]] }], s: [
      ['Read in this order: <b>officer, then lights, then signs, then the rule of the right</b>. Trams on rails normally go first.', 'اقرا بالترتيب ده: <b>العسكري، وبعدين الإشارة، وبعدين العلامات، وبعدين قاعدة اليمين</b>. والترام عادةً الأول.'],
      ['Find who has <b>nobody on their right</b>: that car goes first. Then the next, in turn.', 'شوف مين <b>مفيش حد على يمينه</b>: ده يعدي الأول. وبعدين اللي بعده بالدور.'],
    ] },
    'regola-sinistra': { extra: ['Turning left at a junction', 'اللف شمال في التقاطع', 'Svolta a sinistra'], v: ['cross', { cars: [['W', 'N', 1], ['E', 'W', 0]] }], s: [
      ['A car <b>turning left</b> also gives way to oncoming vehicles going straight on or turning right.', 'العربية اللي <b>بتلف شمال</b> بتدي الأولوية كمان للي جاي عكسها على طول أو بيلف يمين.'],
      ['Move to the centre of the road, wait, and turn when the way is clear, <b>keeping the junction\'s centre on your right</b>.', 'قرب لنص الطريق، استنى، ولف لما الطريق يفضى، و<b>نص التقاطع على يمينك</b>.'],
    ] },
    'regola-segnali': { extra: ['When signs decide', 'لما العلامات هي اللي تحكم', 'Segnali di precedenza'], v: ['cross', { lay: 'tee', stopLine: 'stop', cars: [['S', 'E', 1], ['W', 'E', 0]] }], s: [
      ['A <b>STOP or give-way</b> sign overrides the rule of the right: you give way to traffic from both sides.', 'علامة <b>STOP أو الأولوية</b> فوق قاعدة اليمين: بتدي الأولوية للجايين من الناحيتين.'],
    ] },
  };
  const RULE = ['<b>Work out the order</b>: first signs and lights, then trams, then whoever has nobody on their right.', '<b>احسب الترتيب</b>: الأول العلامات والإشارات، وبعدين الترام، وبعدين اللي مفيش حد على يمينه.'];
  for (const n of [642, 608, 615, 618, 662, 659, 640, 632, 646, 637, 643, 638, 667, 668, 610, 669, 665, 647, 655, 654, 613, 648, 650, 652, 617, 639, 651, 614, 664, 631, 663, 633, 607, 604, 636, 620, 616, 657, 660, 644, 606, 634, 661]) {
    S['figura-' + n] = { v: ['figure', { m: n }], auto: true, s: [RULE] };
  }
  window.TOPIC_SCRIPTS['precedenza-incroci'] = S;
})();
