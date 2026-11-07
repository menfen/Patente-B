// Chapter 1: definitions of the road and of vehicles, and the driver's duties. See topic-scenes.js for the format.
window.TOPIC_SCRIPTS = window.TOPIC_SCRIPTS || {};
window.TOPIC_SCRIPTS['definizioni-generali-doveri-strada'] = {
  'classi-strade': { extra: ['The six types of road', 'الست أنواع بتوع الطرق', 'Classificazione delle strade'], v: ['card', { bg: 'sky', road: true }], s: [
    ['Italian law sorts roads into six types. Outside towns: <b>A autostrada, B extraurbana principale, C extraurbana secondaria</b>.', 'القانون الإيطالي بيقسم الطرق لست أنواع. بره المدن: <b>A autostrada و B extraurbana principale و C extraurbana secondaria</b>.', '🛣️'],
    ['Inside towns: <b>D urbana di scorrimento, E urbana di quartiere</b>. Small roads of either kind are <b>F, strada locale</b>.', 'جوه المدن: <b>D urbana di scorrimento و E urbana di quartiere</b>. والطرق الصغيرة من أي نوع هي <b>F، strada locale</b>.', '🏙️'],
  ] },
  'extraurbana-secondaria': { extra: ['Secondary extra-urban road (type C)', 'الطريق الثانوي بره المدن (النوع C)', 'Strada extraurbana secondaria'], v: ['road', { l: '1+1', side: 'shoulder', limit: 90 }], s: [
    ['The <b>extraurbana secondaria</b> has one carriageway with at least one lane in each direction, and a shoulder on both sides.', 'الـ <b>extraurbana secondaria</b> فيها نهر طريق واحد، وحارة على الأقل في كل اتجاه، وكتف من الناحيتين.', 'cw'],
    ['Oncoming traffic shares your carriageway with no divider, so overtaking needs great care. The general limit is <b>90 km/h</b>.', 'العربيات الجاية عكسك معاك في نفس النهر من غير فاصل، فالتخطي عايز حرص كبير. الحد العام <b>90 كم/س</b>.', 'shoulder'],
  ] },
  'urbana-scorrimento': { extra: ['Urban through road (type D)', 'طريق سريع جوه المدينة (النوع D)', 'Strada urbana di scorrimento'], v: ['road', { l: '2|2', side: 'walk', limit: 50 }], s: [
    ['The <b>urbana di scorrimento</b> is a town road with separate carriageways, at least two lanes each way, and pavements.', 'الـ <b>urbana di scorrimento</b> طريق جوه المدينة بنهرين منفصلين، وحارتين على الأقل في كل اتجاه، ورصيف.', 'div'],
    ['Level junctions here are <b>controlled by traffic lights</b>, and parking is only in separate areas.', 'التقاطعات هنا <b>بإشارات مرور</b>، والركن في أماكن منفصلة بس.', 'walk'],
  ] },
  'urbana-quartiere': { extra: ['Neighbourhood road (type E)', 'طريق الحي (النوع E)', 'Strada urbana di quartiere'], v: ['road', { l: '1+1', side: 'walk', limit: 50 }], s: [
    ['The <b>urbana di quartiere</b> has one carriageway with at least two lanes, plus pavements.', 'الـ <b>urbana di quartiere</b> فيها نهر واحد وحارتين على الأقل ورصيف.', 'cw'],
    ['Any parking is <b>outside the carriageway</b>, in bays with their own manoeuvring lane.', 'الركن بيبقى <b>بره نهر الطريق</b>، في أماكن ليها حارة دخول وخروج.', 'walk'],
  ] },
  'strada-locale': { extra: ['Local road (type F)', 'الطريق المحلي (النوع F)', 'Strada locale'], v: ['road', { l: '1+1', side: 'shoulder', traffic: 'bike' }], s: [
    ['A <b>strada locale</b> is any road, in town or outside, that does not belong to the other five types. These are the small roads.', 'الـ <b>strada locale</b> هو أي طريق، جوه المدينة أو بره، مش من الخمس أنواع التانيين. دي الطرق الصغيرة.', 'cw'],
  ] },
  'carreggiata-doppio-senso': { v: ['road', { l: '2+2', side: 'shoulder' }], s: [
    ['This is <b>one carriageway with two-way traffic</b> and two lanes each way. No divider: only a line separates the directions.', 'ده <b>نهر طريق واحد باتجاهين</b> وحارتين في كل اتجاه. مفيش فاصل، بس خط بيفصل الاتجاهين.', 'cw'],
    ['Outside towns you <b>keep to the right lane</b>. The inner lanes are normally for overtaking, which you may do even on a bend.', 'بره المدن <b>بتمشي في الحارة اليمين</b>. الحارات الداخلية عادةً للتخطي، وده مسموح حتى في المنحنى.', 'inner'],
  ] },
  'strada-sei-corsie': { v: ['road', { l: '3+3', side: 'shoulder' }], s: [
    ['Six lanes, three each way, but only <b>one carriageway</b>. Count the carriageways by the dividers, not by the lanes.', 'ست حارات، تلاتة في كل اتجاه، لكن <b>نهر طريق واحد بس</b>. عد الأنهار بالفواصل مش بالحارات.', 'cw'],
    ['In each direction the <b>right-hand lane</b> is for ordinary driving. The others are for overtaking.', 'في كل اتجاه <b>الحارة اليمين</b> للسواقة العادية. والباقي للتخطي.', 'right'],
  ] },
  'strada-tre-carreggiate': { v: ['road', { l: '2|2+2|2', side: 'shoulder' }], s: [
    ['Three <b>carriageways</b> separated by dividers, and eight lanes in all. Do not confuse lanes with carriageways.', 'تلات <b>أنهار طريق</b> بينهم فواصل، وتمن حارات في المجموع. ماتلخبطش بين الحارة والنهر.', 'central'],
    ['The <b>side carriageways</b> are normally one-way. You never meet oncoming traffic, so overtaking is normally allowed even on bends.', '<b>الأنهار الجانبية</b> عادةً اتجاه واحد. مش هتقابل حد جاي عكسك، فالتخطي عادةً مسموح حتى في المنحنيات.', 'side'],
  ] },
  'attraversamento-pedonale': { v: ['drive', { obj: 'zebra', act: 'stop' }], s: [
    ['A <b>pedestrian crossing</b> is marked by parallel white stripes, and it is part of the carriageway.', '<b>عبور المشاة</b> عبارة عن خطوط بيضا متوازية، وهو جزء من نهر الطريق.'],
    ['When someone is crossing or about to cross, you <b>stop and let them go</b>, then continue.', 'لما حد يكون بيعدي أو هيعدي، <b>بتقف وتسيبه يعدي</b>، وبعدين تكمل.'],
  ] },
  'strade-extraurbane-principali': { v: ['road', { l: '2|2', side: 'shoulder', limit: 110 }], s: [
    ['The <b>extraurbana principale</b> has separate carriageways, at least two lanes each way and a paved shoulder. The general limit is 110 km/h.', 'الـ <b>extraurbana principale</b> فيها أنهار منفصلة، وحارتين على الأقل في كل اتجاه، وكتف مرصوف. الحد العام 110 كم/س.', 'div'],
    ['It has <b>no level junctions</b> and has lay-bys for stopping. Mopeds cannot use it, and you enter and leave by special lanes.', '<b>مفيهاش تقاطعات في نفس المستوى</b> وفيها أماكن للوقوف. الموتوسيكلات الصغيرة ممنوعة، والدخول والخروج بحارات مخصوصة.', 'shoulder'],
  ] },
  'isola-traffico': { v: ['drive', { act: 'around', obj: 'island' }], s: [
    ['A <b>traffic island</b> (<i>isola di traffico</i>) guides vehicles onto the right path. It is part of the road.', '<b>الجزيرة المرورية</b> (<i>isola di traffico</i>) بتوجه العربيات للمسار الصح، وهي جزء من الطريق.'],
    ['It can be raised, or <b>flush with the road</b> and painted with white zebra markings. Either way, you do not drive over it.', 'ممكن تبقى مرفوعة، أو <b>في مستوى الأسفلت</b> ومرسومة بخطوط بيضا. في الحالتين ماتمشيش عليها.'],
  ] },
  'intersezione-livelli-sfalsati': { v: ['ramp', { dir: 'out' }], s: [
    ['At a <b>grade-separated junction</b> the roads cross at different heights, by flyovers or underpasses, joined by ramps.', 'في <b>التقاطع متعدد المستويات</b> الطرق بتتقاطع على ارتفاعات مختلفة، بكباري أو أنفاق، وبينهم منحدرات.'],
    ['Traffic never crosses at the same level, so there are no conflicts. It is not a level crossing with a railway.', 'العربيات مابتتقابلش في نفس المستوى، فمفيش تعارض. وده مش مزلقان سكة حديد.'],
  ] },
  'intersezione-raso': { v: ['cross', { lay: 'cross', cars: [['W', 'E', 1], ['S', 'N', 0]] }], s: [
    ['At an <b>at-grade junction</b> two or more roads meet at the same level, so vehicles really cross each other\'s paths.', 'في <b>التقاطع في نفس المستوى</b> طريقين أو أكتر بيتقابلوا على نفس الارتفاع، فالعربيات بتقطع طريق بعض فعلاً.'],
    ['That is why priority matters here. It may be controlled by signs or by <b>traffic lights</b>.', 'عشان كده الأولوية مهمة هنا. وممكن تتنظم بعلامات أو <b>بإشارات مرور</b>.'],
  ] },
  'zona-traffico-limitato': { v: ['drive', { act: 'stop', obj: 'junction' }], s: [
    ['In a <b>limited traffic zone</b> (<i>zona a traffico limitato</i>, ZTL) only authorised vehicles may circulate, at set times.', 'في <b>منطقة المرور المحدود</b> (<i>zona a traffico limitato</i>، ZTL) العربيات المصرح لها بس هي اللي تدخل، في أوقات محددة.'],
    ['Signs mark where the zone <b>begins and ends</b>. Without a permit, you do not enter.', 'فيه علامات بتحدد <b>بداية ونهاية</b> المنطقة. من غير تصريح ماتدخلش.'],
  ] },
  'passaggio-livello': { v: ['drive', { obj: 'train', act: 'stop' }], s: [
    ['A <b>level crossing</b> (<i>passaggio a livello</i>) is where road and railway cross at the same level. It may have barriers.', '<b>المزلقان</b> (<i>passaggio a livello</i>) هو المكان اللي الطريق والسكة الحديد بيتقاطعوا فيه في نفس المستوى، وممكن يبقى فيه حواجز.'],
    ['Distance marker panels warn you it is coming. Stop while the barrier is down, and <b>never queue on the tracks</b>.', 'فيه لوحات بتنبهك قبله. اقف طول ما الحاجز نازل، و<b>ماتقفش أبداً على القضبان</b>.'],
  ] },
  'aree-pedonali': { v: ['drive', { act: 'stop', obj: 'kids' }], s: [
    ['A <b>pedestrian area</b> (<i>area pedonale</i>) is closed to motor traffic. Pedestrians and bicycles may move through it.', '<b>منطقة المشاة</b> (<i>area pedonale</i>) ممنوع فيها العربيات. المشاة والعجل بس اللي يعدوا.'],
    ['Exceptions include vehicles serving <b>disabled people</b> and emergency vehicles. Mopeds are not allowed, day or night.', 'الاستثناءات زي العربيات اللي بتخدم <b>ذوي الإعاقة</b> وعربيات الطوارئ. والموتوسيكلات الصغيرة ممنوعة بالليل والنهار.'],
  ] },
  'strada-definizione': { v: ['road', { l: '1+1', side: 'walk', cycle: true }], s: [
    ['The <b>road</b> is the whole area open to traffic: carriageway, shoulders, pavements and cycle paths.', '<b>الطريق</b> هو كل المساحة المفتوحة للمرور: نهر الطريق والأكتاف والأرصفة وحارات العجل.', 'cw'],
    ['A road can be one-way or two-way. Remember that the <b>shoulders are part of the road</b>, but not of the carriageway.', 'الطريق ممكن يبقى اتجاه واحد أو اتجاهين. وافتكر إن <b>الأكتاف جزء من الطريق</b>، لكن مش من نهر الطريق.', 'cycle'],
  ] },
  'autostrada': { v: ['road', { l: '2|2', side: 'fence', em: true, badge: ['motorway'], limit: 130 }], s: [
    ['The <b>autostrada</b> has separate carriageways, at least two lanes each way, an emergency lane, and fences along the sides. The general limit is 130 km/h.', 'الـ <b>autostrada</b> فيها أنهار منفصلة، وحارتين على الأقل في كل اتجاه، وحارة طوارئ، وسور على الجانبين. الحد العام 130 كم/س.', 'em'],
    ['It has <b>no level crossings</b>. You enter by acceleration lanes and leave by deceleration lanes. Not only cars may use it: lorries too.', '<b>مفيهاش تقاطعات في نفس المستوى</b>. بتدخل من حارة التسارع وتخرج من حارة التباطؤ. ومش العربيات الملاكي بس، النقل كمان.', 'div'],
  ] },
  'carreggiata': { v: ['road', { l: '1+1', side: 'shoulder' }], s: [
    ['The <b>carriageway</b> (<i>carreggiata</i>) is the part of the road for vehicles. It can be one-way or two-way.', '<b>نهر الطريق</b> (<i>carreggiata</i>) هو الجزء من الطريق المخصص للعربيات، وممكن يبقى اتجاه واحد أو اتجاهين.', 'cw'],
    ['It is usually divided into lanes. <b>Shoulders and lay-bys are not part of it</b>.', 'عادةً بيتقسم لحارات. <b>الأكتاف وأماكن الوقوف الجانبية مش جزء منه</b>.', 'lane'],
  ] },
  'parti-carreggiata': { v: ['road', { l: '2+2', side: 'shoulder', zebra: true }], s: [
    ['Part of the carriageway: <b>traffic lanes, overtaking lanes, and pedestrian and cycle crossings</b>.', 'جزء من نهر الطريق: <b>حارات السير وحارات التخطي وعبور المشاة والعجل</b>.', 'cw'],
    ['Not part of it: the <b>shoulder</b>, which lies outside the edge line.', 'مش جزء منه: <b>الكتف</b>، وده بره خط الحافة.', 'shoulder'],
  ] },
  'corsia': { v: ['road', { l: '2+2', side: 'shoulder' }], s: [
    ['A <b>lane</b> (<i>corsia</i>) is a strip of the carriageway wide enough for one line of vehicles.', '<b>الحارة</b> (<i>corsia</i>) شريط من نهر الطريق يكفي لصف عربيات واحد.', 'lane'],
    ['A lane may be for <b>overtaking, accelerating, slowing down</b> or reserved for certain vehicles.', 'الحارة ممكن تكون <b>للتخطي أو التسارع أو التباطؤ</b> أو مخصصة لعربيات معينة.', 'inner'],
  ] },
  'corsia-accelerazione': { v: ['ramp', { dir: 'in' }], s: [
    ['The <b>acceleration lane</b> lets you build up speed beside the traffic before you join a motorway or main extra-urban road.', '<b>حارة التسارع</b> بتخليك تزود سرعتك جنب العربيات قبل ما تدخل الأوتوستراد أو الطريق الرئيسي.', 'accel'],
    ['Signal left, match their speed, then <b>join without forcing others to brake</b>.', 'اشغل الإشارة الشمال، خد نفس سرعتهم، وبعدين <b>ادخل من غير ما تخلي حد يفرمل</b>.', 'accel'],
  ] },
  'corsia-decelerazione': { v: ['ramp', { dir: 'out' }], s: [
    ['The <b>deceleration lane</b> lets you leave a motorway or main extra-urban road without slowing the traffic behind you.', '<b>حارة التباطؤ</b> بتخليك تخرج من الأوتوستراد أو الطريق الرئيسي من غير ما تعطل اللي وراك.', 'decel'],
    ['Signal right, move across, and <b>brake only once you are in the lane</b>.', 'اشغل الإشارة اليمين، ادخل الحارة، و<b>فرمل بس وانت جواها</b>.', 'decel'],
  ] },
  'banchina': { v: ['road', { l: '1+1', side: 'shoulder' }], s: [
    ['The <b>shoulder</b> (<i>banchina</i>) is part of the road but lies outside the carriageway, beyond the edge line.', '<b>الكتف</b> (<i>banchina</i>) جزء من الطريق لكنه بره نهر الطريق، بعد خط الحافة.', 'shoulder'],
    ['Vehicles <b>do not normally travel on it</b>. Pedestrians may walk there, and you may use it for emergency stops.', 'العربيات <b>عادةً مابتمشيش عليه</b>. المشاة ممكن يمشوا عليه، وتستخدمه للوقوف في الطوارئ.', 'shoulder'],
  ] },
  'marciapiede': { v: ['road', { l: '1+1', side: 'walk' }], s: [
    ['The <b>pavement</b> (<i>marciapiede</i>) is raised or marked off, reserved for pedestrians. It is not part of the carriageway.', '<b>الرصيف</b> (<i>marciapiede</i>) مرفوع أو محدد، ومخصص للمشاة، ومش جزء من نهر الطريق.', 'walk'],
    ['You may park on it <b>only where parking markings allow it</b>.', 'الركن عليه مسموح <b>بس لما يكون فيه علامات بتسمح</b>.', 'walk'],
  ] },
  'salvagente': { v: ['drive', { act: 'slow', obj: 'ped', zebra: false }], s: [
    ['A <b>refuge</b> (<i>salvagente</i>) is a raised island in the road where pedestrians wait safely, for example at a tram stop.', '<b>جزيرة الأمان</b> (<i>salvagente</i>) مكان مرفوع في الطريق بيستنى فيه المشاة بأمان، زي عند محطة الترام.'],
    ['It may be marked by bollards with a <b>steady yellow light</b>. It is not a cycle or pedestrian route.', 'ممكن تتحدد بأعمدة بنور <b>أصفر ثابت</b>. وهي مش مسار للعجل أو المشاة.'],
  ] },
  'passo-carrabile': { v: ['drive', { act: 'park', obj: 'junction' }], s: [
    ['A <b>driveway entrance</b> (<i>passo carrabile</i>) lets vehicles reach a property or parking area beside the road.', '<b>مدخل العربيات</b> (<i>passo carrabile</i>) بيخلي العربيات توصل لمكان أو جراج جنب الطريق.'],
    ['You may make a <b>brief stop</b> in front of it, with the driver ready to move, but never park there.', 'مسموح <b>وقوف قصير</b> قدامه والسواق جاهز يتحرك، لكن الركن ممنوع تماماً.'],
  ] },
  'ciclomotori': { v: ['vehicle', { t: 'moped' }], s: [
    ['A <b>moped</b> (<i>ciclomotore</i>) has two or three wheels, a top speed of 45 km/h and a combustion engine of at most 50 cc.', '<b>الموتوسيكل الصغير</b> (<i>ciclomotore</i>) بعجلتين أو تلاتة، أقصى سرعة 45 كم/س، وموتور بنزين لحد 50 سي سي.'],
    ['Not every two-wheeler is a moped: bigger ones are motorcycles. Mopeds are <b>banned from motorways and main extra-urban roads</b>.', 'مش كل حاجة بعجلتين تبقى ciclomotore، الأكبر منها motociclo. وهي <b>ممنوعة من الأوتوستراد والطرق الرئيسية بره المدن</b>.'],
  ] },
  'tricicli-motore': { v: ['vehicle', { t: 'trike' }], s: [
    ['A <b>motor tricycle</b> (<i>triciclo a motore</i>) has three symmetrical wheels and an engine over 50 cc.', '<b>التروسيكل</b> (<i>triciclo a motore</i>) بتلات عجلات متماثلة وموتور أكبر من 50 سي سي.'],
    ['It is not a motorcycle with a sidecar. It has its first inspection after <b>four years</b>, then every two.', 'وده مش موتوسيكل بسايدكار. أول فحص ليه بعد <b>أربع سنين</b>، وبعدين كل سنتين.'],
  ] },
  'quadricicli': { v: ['vehicle', { t: 'quad' }], s: [
    ['A <b>quadricycle</b> (<i>quadriciclo</i>) has four wheels and is small and light. It is not a motor vehicle in the legal sense.', '<b>الكوادريسيكل</b> (<i>quadriciclo</i>) بأربع عجل وصغير وخفيف، وقانونياً مش autoveicolo.'],
    ['<b>Light quadricycles count as mopeds</b> for traffic rules. Both kinds need periodic inspection.', '<b>الخفيف منه بيتعامل معاملة الـ ciclomotore</b> في قواعد المرور. والنوعين لازم فحص دوري.'],
  ] },
  'macchine-agricole': { v: ['vehicle', { t: 'tractor', row: [['tractor', 1], ['plough', 1]] }], s: [
    ['<b>Agricultural machines</b> run on wheels or tracks. <b>Operating machines</b> include snowploughs.', '<b>الآلات الزراعية</b> بتمشي على عجل أو جنزير. و<b>آلات التشغيل</b> منها كاسحات التلج.'],
    ['Registered ones may use the road to move between jobs, slowly. They are not for carrying passengers.', 'المسجل منها ممكن يمشي في الطريق عشان ينتقل بين الشغل، ببطء. ومش مخصصة لنقل ركاب.'],
  ] },
  'caravan': { v: ['vehicle', { t: 'caravan' }], s: [
    ['A <b>caravan</b> is a trailer fitted out as accommodation, and it has its own number plate.', '<b>الكرفان</b> مقطورة متجهزة للإقامة، وليها لوحة أرقام خاصة بيها.'],
    ['You may stay in it <b>only when it is stationary</b>. Nobody travels inside while it is being towed.', 'تقعد فيه <b>وهو واقف بس</b>. ومحدش يركب جواه وهو بيتسحب.'],
  ] },
  'autocaravan-camper': { v: ['vehicle', { t: 'camper', c: '#2a7de1' }], s: [
    ['A <b>motorhome</b> (<i>autocaravan</i> or camper) is a motor vehicle permanently fitted out to carry and house people.', '<b>الكامبر</b> (<i>autocaravan</i>) عربية بموتور متجهزة بشكل دايم لنقل وإقامة الناس.'],
    ['It has its own engine, so it is <b>not a trailer</b>, and it needs periodic inspection.', 'ليها موتور خاص بيها، فهي <b>مش مقطورة</b>، ولازم فحص دوري.'],
  ] },
  'strisce-pannelli-retroriflettenti': { v: ['vehicle', { t: 'truck', c: '#3f7fbf' }], s: [
    ['Reflective <b>panels and strips</b> at the back make heavy vehicles visible. Those shown mark goods vehicles over 3.5 tonnes.', '<b>اللوحات والشرايط العاكسة</b> ورا بتخلي العربيات التقيلة باينة. اللي في الصورة لعربيات النقل فوق 3.5 طن.'],
    ['Strips may be <b>red or yellow</b>. An orange panel means dangerous goods: keep your distance.', 'الشرايط ممكن تبقى <b>حمرا أو صفرا</b>. واللوحة البرتقالي معناها بضاعة خطرة: خلي مسافة.'],
  ] },
  'motocicli': { v: ['vehicle', { t: 'moto', row: [['moped', 0], ['moto', 1]] }], s: [
    ['A <b>motorcycle</b> (<i>motociclo</i>) has two wheels and exceeds the moped limits. It may have an automatic gearbox.', '<b>الموتوسيكل</b> (<i>motociclo</i>) بعجلتين وأكبر من حدود الـ ciclomotore، وممكن يبقى أوتوماتيك.'],
    ['So <b>not every two-wheeler is a motorcycle</b>: mopeds are a separate category.', 'يعني <b>مش كل حاجة بعجلتين motociclo</b>: الـ ciclomotore فئة تانية.'],
  ] },
  'autoveicoli': { v: ['vehicle', { t: 'van', row: [['car', 1], ['truck', 1], ['bus', 1], ['trike', 0], ['quad', 0]] }], s: [
    ['<b>Motor vehicles</b> (<i>autoveicoli</i>) include cars, lorries and buses.', '<b>الـ autoveicoli</b> منها العربيات الملاكي والنقل والأتوبيسات.'],
    ['<b>Tricycles and quadricycles are not</b> motor vehicles in this legal sense.', '<b>التروسيكل والكوادريسيكل مش</b> autoveicoli بالمعنى القانوني ده.'],
  ] },
  'autovetture': { v: ['vehicle', { t: 'car', row: [['car', 1], ['bus', 0], ['truck', 0]] }], s: [
    ['A <b>car</b> (<i>autovettura</i>) carries people, up to nine including the driver. It may be petrol, diesel or electric.', '<b>العربية الملاكي</b> (<i>autovettura</i>) لنقل الناس، لحد تسعة بالسواق. وممكن تبقى بنزين أو ديزل أو كهربا.'],
    ['A bus or a lorry is <b>not a car</b>. Cars need periodic inspection.', 'الأتوبيس أو النقل <b>مش autovettura</b>. والعربيات لازم فحص دوري.'],
  ] },
  'rimorchi': { v: ['vehicle', { t: 'trailer', c: '#2a7de1' }], s: [
    ['A <b>trailer</b> (<i>rimorchio</i>) has no engine and is towed. A caravan is a trailer. A motorhome and an articulated vehicle are not.', '<b>المقطورة</b> (<i>rimorchio</i>) من غير موتور وبتتسحب. الكرفان مقطورة، لكن الكامبر والتريلا مش مقطورة.'],
    ['<b>Light trailers</b> have a maximum laden mass of up to 750 kg.', '<b>المقطورة الخفيفة</b> أقصى وزن ليها وهي محملة 750 كجم.'],
  ] },
  'traffico-intenso': { v: ['drive', { act: 'queue', obj: 'zebra' }], s: [
    ['In <b>heavy traffic</b>, wait before junctions and crossings until there is room to get across.', 'في <b>الزحمة</b>، استنى قبل التقاطعات والعبور لحد ما يبقى فيه مكان تعدي فيه.'],
    ['Keep <b>junctions, level crossings, tram tracks, and pedestrian and cycle crossings</b> clear. Never stop on them.', 'خلي <b>التقاطعات والمزلقانات وقضبان الترام وعبور المشاة والعجل</b> فاضية. ماتقفش عليها أبداً.'],
  ] },
  'file-veicoli': { v: ['drive', { act: 'queue' }], s: [
    ['In a <b>queue of vehicles</b> you must still keep a safe distance, even at low speed.', 'في <b>طابور العربيات</b> لازم تسيب مسافة أمان، حتى لو السرعة قليلة.'],
    ['Stay alert, and leave <b>side-street exits clear</b> so that traffic can keep flowing.', 'خليك منتبه، وسيب <b>مخارج الشوارع الجانبية فاضية</b> عشان الحركة تمشي.'],
  ] },
  'centro-abitato': { v: ['road', { l: '1+1', side: 'walk', limit: 50 }], s: [
    ['In a <b>built-up area</b> (<i>centro abitato</i>) pedestrians and cyclists mix with motor traffic, so be more attentive and tolerant.', 'في <b>المنطقة السكنية</b> (<i>centro abitato</i>) المشاة والعجل بيختلطوا بالعربيات، فخليك منتبه ومتسامح أكتر.', 'walk'],
    ['Priority at junctions <b>can change often</b>, so read every sign. The general limit is 50 km/h.', 'الأولوية في التقاطعات <b>ممكن تتغير كتير</b>، فاقرا كل علامة. الحد العام 50 كم/س.', 'cw'],
  ] },
  'segnaletica-stradale': { v: ['card', { bg: 'sand', icon: '🚧' }], s: [
    ['<b>Road signs</b> protect everyone. It is forbidden to remove, move or deface any of them.', '<b>علامات الطريق</b> بتحمي الكل. ممنوع تشيلها أو تحركها أو تشوهها، أي واحدة فيها.', '🚧'],
    ['A moved sign can cause <b>serious danger</b>, and that goes for all signs, not just danger signs.', 'علامة متحركة من مكانها ممكن تعمل <b>خطر كبير</b>، وده لكل العلامات مش علامات الخطر بس.', '⚠️'],
  ] },
  'gare-velocita': { v: ['card', { bg: 'rose', road: true }], s: [
    ['<b>Speed races on public roads are prohibited</b>, however few cars take part.', '<b>سباقات السرعة في الطريق العام ممنوعة</b>، مهما كان عدد العربيات قليل.', '🏁'],
    ['Taking part in an unauthorised race is a crime, punished with <b>imprisonment</b>.', 'الاشتراك في سباق من غير تصريح جريمة، عقوبتها <b>الحبس</b>.', '⛓️'],
  ] },
  'inquinamento-strade': { v: ['drive', { act: 'slow', obj: 'oil', fx: 'rain' }], s: [
    ['Do not dirty the road: throwing <b>paper or lit cigarettes</b> out of the window is forbidden, as is spreading mud from dirty wheels.', 'ماتوسخش الطريق: ممنوع ترمي <b>ورق أو سجاير مولعة</b> من الشباك، وممنوع توسخ الطريق بطين العجل.'],
    ['Go slowly <b>through puddles</b> so that you do not splash pedestrians.', 'امشي ببطء <b>في برك المية</b> عشان ماترشش المشاة.'],
  ] },
  'comportamento-conducente': { v: ['cross', { lay: 'tee', cars: [['W', 'E', 0], ['S', 'E', 1]] }], s: [
    ['Every driver must protect <b>their own safety and that of others</b>, and must not cause annoyance.', 'كل سواق لازم يحمي <b>نفسه والناس التانية</b>، ومايضايقش حد.'],
    ['Having priority does not excuse you from caution. <b>If in doubt, do not insist</b> on going first.', 'الأولوية مش عذر إنك ماتاخدش بالك. <b>لو شاكك، ماتصممش</b> تعدي الأول.'],
  ] },
  'attenzion-conducente': { v: ['drive', { act: 'slow', obj: 'moto' }], s: [
    ['Windscreen <b>pillars hide things</b> from view. Check your mirrors often for cyclists and motorcyclists.', '<b>أعمدة العربية بتخبي</b> حاجات عن عينيك. بص في المرايات كتير عشان العجل والموتوسيكلات.'],
    ['Even at low speed, a crash can <b>seriously injure</b> pedestrians, cyclists and motorcyclists.', 'حتى بسرعة قليلة، الحادثة ممكن <b>تصيب إصابة خطيرة</b> المشاة وراكبي العجل والموتوسيكلات.'],
  ] },
  'prudenza-conducente': { v: ['drive', { act: 'stop', obj: 'oldie' }], s: [
    ['Take <b>greater care with vulnerable road users</b>: elderly people, children, people with disabilities, and cyclists.', 'خد <b>بالك أكتر من الفئات الضعيفة</b>: كبار السن والأطفال وذوي الإعاقة وراكبي العجل.'],
  ] },
  'persone-anziane': { v: ['drive', { act: 'stop', obj: 'oldie' }], s: [
    ['<b>Elderly people</b> may misjudge your speed and may not notice vehicles. They cross slowly.', '<b>كبار السن</b> ممكن يغلطوا في تقدير سرعتك ومايخدوش بالهم من العربيات، وبيعدوا ببطء.'],
    ['Slow down early and give way, <b>whichever direction</b> they are crossing from. Do not hurry them.', 'هدي بدري وسيبهم يعدوا، <b>من أي اتجاه</b> كانوا. وماتستعجلهمش.'],
  ] },
  'conducente-precedenze': { v: ['drive', { act: 'stop', obj: 'cane' }], s: [
    ['A <b>white cane</b> means a blind person, and a white and red cane means deafblind. They have priority even away from a crossing.', '<b>العصاية البيضا</b> معناها شخص كفيف، والأبيض والأحمر معناها كفيف وأصم. ليهم الأولوية حتى بعيد عن العبور.'],
    ['Stop, and <b>do not brake suddenly or sound the horn</b>, which would frighten them.', 'اقف، و<b>ماتفرملش فجأة وماتضربش كلاكس</b>، عشان ماتخضهمش.'],
  ] },
  'vicinanza-pedonale': { v: ['drive', { act: 'stop', obj: 'zebra' }], s: [
    ['Near a <b>pedestrian crossing</b>, be ready for anything: someone may step out, or stop suddenly on the stripes.', 'قرب <b>عبور المشاة</b>، خليك جاهز لأي حاجة: حد ممكن ينزل فجأة أو يقف فجأة على الخطوط.'],
    ['Pedestrians do not need to make any hand signal before crossing.', 'المشاة مش محتاجين يشاوروا بإيدهم قبل ما يعدوا.'],
  ] },
  'bambini-semaforo': { v: ['drive', { act: 'stop', obj: 'kids' }], s: [
    ['<b>Children at a traffic light</b> may push each other and end up on the carriageway, so slow down.', '<b>الأطفال عند الإشارة</b> ممكن يزقوا بعض ويقعوا في نهر الطريق، فهدي سرعتك.'],
    ['Even when your light turns green, <b>wait until pedestrians have finished crossing</b>.', 'حتى لو إشارتك بقت خضرا، <b>استنى لحد ما المشاة يخلصوا عبور</b>.'],
  ] },
  'piazzole': { v: ['drive', { act: 'slow', obj: 'bus' }], s: [
    ['Near a <b>school bus stop</b>, slow down, especially when the bus is there.', 'قرب <b>موقف أتوبيس المدرسة</b>، هدي سرعتك، خصوصاً لو الأتوبيس واقف.'],
    ['Children may get off and run out <b>without looking</b> at the traffic.', 'الأطفال ممكن ينزلوا ويجروا <b>من غير ما يبصوا</b> على العربيات.'],
  ] },
  'taxi-conducente': { v: ['drive', { act: 'slow', obj: 'taxi' }], s: [
    ['<b>Taxi ranks</b> are reserved: other drivers may not park there.', '<b>مواقف التاكسي</b> مخصصة: أي عربية تانية ممنوع تركن فيها.'],
    ['Watch for people getting in and out. But you do not have to give way to a taxi pulling out.', 'خد بالك من الناس اللي بتركب وتنزل. لكن مش لازم تدي أولوية للتاكسي الخارج.'],
  ] },
  'ciclisti-pedoni': { v: ['drive', { act: 'around', obj: 'bike' }], s: [
    ['<b>Cyclists swerve slightly</b> as they ride, so leave plenty of room when you overtake them.', '<b>راكب العجلة بيتمايل شوية</b> وهو ماشي، فسيب مسافة كبيرة وانت بتتخطاه.'],
    ['Overtaking them is allowed with great caution. Outside towns, it is advisable to <b>sound the horn</b> first.', 'التخطي مسموح بحرص كبير. وبره المدن يستحسن <b>تضرب كلاكس</b> الأول.'],
  ] },
  'gravidanza-carrozzine': { v: ['drive', { act: 'stop', obj: 'stroller' }], s: [
    ['Take extra care with <b>pushchairs and pregnant women</b>. Let them cross without hurrying them.', 'خد بالك أكتر من <b>عربيات الأطفال والحوامل</b>. سيبهم يعدوا من غير استعجال.'],
    ['Stop well back so as not to frighten them, and <b>keep dropped kerbs clear</b>: parking in front of them is forbidden.', 'اقف بعيد شوية عشان ماتخضهمش، و<b>سيب منحدرات الرصيف فاضية</b>: الركن قدامها ممنوع.'],
  ] },
};
