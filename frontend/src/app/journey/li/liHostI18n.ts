/** 礼艺「执礼 · 宾至如归」场景文案的多语表。
 *
 * ## 为什么是「以中文原文为键」
 *
 * 本场景的文案（标题/情境/宾客名/事件名）存放在**前端数据文件** `liHostData.ts` 里，
 * 而不是数据库 —— 它同时承载 3D 场景的布局与计时参数，属**游戏配置**，
 * 搬到后端会多一次取数、并让配置与渲染逻辑分离，得不偿失。
 *
 * 因此不照搬后端那套 `*_i18n` 列，而是**以中文原文为身份键**建一张平行译表：
 *
 * - `liHostData.ts` **一行不用改**（结构、字段名、游戏状态流转全部不动）；
 * - 渲染处只把 `{cfg.title}` 换成 `{lt(cfg.title, lang)}`；
 * - 缺译时回落中文原文 —— 与后端 `pick_i18n` 同一策略。
 *
 * 这与数艺明细行的处理思路一致（「身份保持原文、显示另走一层」），
 * 区别只是身份键从「中文 name」换成了「中文原文本身」。
 *
 * ## 维护提示
 *
 * 键是**中文原文**：若日后修改了 `liHostData.ts` 里的中文文案，必须同步改这里的键，
 * 否则该条译文会静默失效（回落中文）。`npm run` 无自动校验，改动时请留意。
 */
import type { Lang } from "@/lib/i18n";

type Tr = Partial<Record<Lang, string>>;

export const LI_HOST_I18N: Record<string, Tr> = {
  // ── 场景 1：乡饮酒礼 ──────────────────────────────────────────
  "乡饮酒礼": {
    en: "The Village Drinking Ceremony",
    fr: "La cérémonie du vin villageoise",
    es: "La ceremonia del vino aldeana",
    ar: "مجلس شراب القرية",
  },
  "教学局 · 先学迎宾与安席": {
    en: "Tutorial · learn greeting and seating first",
    fr: "Tutoriel · d'abord saluer et placer les sièges",
    es: "Tutorial: primero saludar y sentar",
    ar: "درس تعليمي · تعلّم الاستقبال وتوزيع الجلوس أولًا",
  },
  "村社学堂": {
    en: "The village school",
    fr: "L'école du village",
    es: "La escuela de la aldea",
    ar: "مدرسة القرية",
  },
  "乡里设宴敬老。你是今日主人：先依礼迎宾，再安排席位，席间照应周全。": {
    en: "The village holds a banquet to honour the aged. You are today's host: first greet the guests by the rites, then arrange the seats, and attend to all throughout the feast.",
    fr: "Le village donne un banquet en l'honneur des anciens. Vous êtes l'hôte du jour : d'abord accueillir selon les rites, puis disposer les sièges, et veiller à tout durant le festin.",
    es: "La aldea celebra un banquete en honor de los mayores. Hoy eres el anfitrión: primero recibir según el rito, luego disponer los asientos y atender a todos durante el convite.",
    ar: "تقيم القرية مأدبة لتكريم المسنّين. وأنت مضيف اليوم: استقبل الضيوف وفق الطقوس، ثم رتّب الجلوس، وتعهّد الجميع خلال المأدبة.",
  },
  "先尊后卑迎客；对长者深揖，对幼辈浅揖——过深近谄，过浅近慢。": {
    en: "Greet the honoured before the lesser; bow deep to elders, shallow to juniors — too deep verges on flattery, too shallow on disrespect.",
    fr: "Saluez les plus honorés avant les moindres ; inclinez-vous profondément devant les aînés, légèrement devant les cadets — trop profond frôle la flatterie, trop léger le manque d'égard.",
    es: "Recibe a los más honrados antes que a los menores; inclínate hondo ante los mayores, leve ante los jóvenes: demasiado hondo roza la adulación, demasiado leve el desaire.",
    ar: "استقبل الأعلى قدرًا قبل الأدنى؛ وانحنِ انحناءة عميقة للكبار وخفيفة للصغار — فالإفراط في العمق يقارب التملّق، والتفريط يقارب الاستهانة.",
  },
  "乡饮酒礼的核心是「序」：谁先谁后、谁坐哪里，排序本身就是敬意。": {
    en: "The heart of the village drinking ceremony is \"order\": who comes first, who sits where — the ordering itself is the respect.",
    fr: "Le cœur de la cérémonie du vin villageoise est l'« ordre » : qui passe d'abord, qui s'assied où — l'ordonnancement lui-même est le respect.",
    es: "El corazón de la ceremonia del vino aldeana es el «orden»: quién va primero, quién se sienta dónde: el orden mismo es el respeto.",
    ar: "مدار مجلس شراب القرية على «الترتيب»: من يتقدّم ومن يجلس أين — فالترتيب نفسه هو الإجلال.",
  },
  "里中长者·伯翁": {
    en: "Elder of the village · Old Bo",
    fr: "Ancien du village · Vieux Bo",
    es: "Mayor de la aldea · Viejo Bo",
    ar: "شيخ القرية · بو الكبير",
  },
  "拄杖而来，望之俨然": {
    en: "Comes leaning on a staff, grave to behold",
    fr: "Vient appuyé sur son bâton, d'aspect grave",
    es: "Llega apoyado en su bastón, de aspecto grave",
    ar: "يأتي متوكئًا على عصاه، مهيب المنظر",
  },
  "乡邻·仲叔": {
    en: "Neighbour · Uncle Zhong",
    fr: "Voisin · Oncle Zhong",
    es: "Vecino · Tío Zhong",
    ar: "جار · العم تشونغ",
  },
  "同辈乡邻，久未相见": {
    en: "A neighbour of your own generation, long unseen",
    fr: "Un voisin de votre génération, longtemps sans le voir",
    es: "Un vecino de tu generación, tiempo sin verlo",
    ar: "جار من جيلك، لم تلقَه منذ حين",
  },
  "后生·小季": {
    en: "Youngster · Little Ji",
    fr: "Jeune homme · Petit Ji",
    es: "Joven · Pequeño Ji",
    ar: "فتى · جي الصغير",
  },
  "初次赴宴，有些拘谨": {
    en: "Attending a banquet for the first time, somewhat ill at ease",
    fr: "À son premier banquet, un peu gauche",
    es: "En su primer banquete, algo cohibido",
    ar: "يحضر مأدبة أول مرة، وفيه بعض التحيّز",
  },
  "长者杯空了": {
    en: "The elder's cup is empty",
    fr: "La coupe de l'aîné est vide",
    es: "La copa del mayor está vacía",
    ar: "كأس الشيخ فارغ",
  },
  "仲叔举杯相邀": {
    en: "Uncle Zhong raises his cup to you",
    fr: "L'oncle Zhong lève sa coupe vers vous",
    es: "El tío Zhong alza su copa hacia ti",
    ar: "العم تشونغ يرفع كأسه إليك",
  },
  "小季插不上话": {
    en: "Little Ji cannot get a word in",
    fr: "Le petit Ji ne peut pas placer un mot",
    es: "El pequeño Ji no logra meter palabra",
    ar: "جي الصغير لا يستطيع أن يشارك في الحديث",
  },
  "长者起身欲行": {
    en: "The elder rises to leave",
    fr: "L'aîné se lève pour partir",
    es: "El mayor se levanta para irse",
    ar: "الشيخ يقوم للانصراف",
  },

  // ── 场景 2：士相见礼 ──────────────────────────────────────────
  "士相见礼": {
    en: "The Rite of Scholars Meeting",
    fr: "Le rite de la rencontre des lettrés",
    es: "El rito del encuentro de los letrados",
    ar: "آداب لقاء أهل العلم",
  },
  "初次拜会 · 分寸更严": {
    en: "First visit · measure is stricter",
    fr: "Première visite · la mesure est plus stricte",
    es: "Primera visita: la medida es más estricta",
    ar: "أول زيارة · والحدّ أضيق",
  },
  "府中正堂": {
    en: "The main hall of the mansion",
    fr: "La grande salle du manoir",
    es: "El salón principal de la casa",
    ar: "القاعة الكبرى في الدار",
  },
  "远近士人来访相见。贵宾在列，揖礼的深浅、席位的高下都更讲究了。": {
    en: "Scholars from near and far come to meet you. With a distinguished guest present, the depth of the bow and the rank of the seats matter more.",
    fr: "Des lettrés de près et de loin viennent vous rencontrer. Un hôte de marque étant présent, la profondeur de l'inclination et le rang des sièges comptent davantage.",
    es: "Letrados de cerca y de lejos vienen a verte. Con un invitado distinguido presente, la profundidad de la reverencia y el rango de los asientos importan más.",
    ar: "يأتي أهل العلم من القريب والبعيد للقائك. وبحضور ضيف كريم يصير عمق الانحناء ومرتبة الجلوس أدقّ.",
  },
  "贵宾之礼最深最严；「自卑而尊人」，但卑不是谄。": {
    en: "For the distinguished guest the rite is deepest and strictest; \"lower yourself and honour others\" — but low is not servile.",
    fr: "Pour l'hôte de marque, le rite est le plus profond et le plus strict ; « s'abaisser et honorer autrui » — mais s'abaisser n'est pas servilité.",
    es: "Para el invitado distinguido el rito es el más hondo y estricto; «bajarse uno y honrar a los demás»: pero bajarse no es servilismo.",
    ar: "وللضيف الكريم أعمق الآداب وأشدّها؛ «أن تخفض نفسك وتُعلي غيرك» — لكن الخفض ليس تذلّلًا.",
  },
  "礼者，自卑而尊人——把自己放低、把对方抬高，对任何人都如此。": {
    en: "Rite means lowering oneself and honouring others — put yourself low and the other high, toward everyone alike.",
    fr: "Le rite, c'est s'abaisser et honorer autrui — se mettre bas et élever l'autre, envers quiconque.",
    es: "El rito es bajarse y honrar a los demás: ponerte bajo y alzar al otro, con cualquiera.",
    ar: "الطقس أن تخفض نفسك وتُعلي غيرك — فتُنزل نفسك وترفع صاحبك، مع كل أحد.",
  },
  "来访国士·公孙子": {
    en: "Visiting scholar of the realm · Master Gongsun",
    fr: "Lettré du royaume en visite · Maître Gongsun",
    es: "Letrado del reino en visita · Maestro Gongsun",
    ar: "عالم زائر · السيد كونغ-سون",
  },
  "名满一方，执贽来见": {
    en: "Renowned throughout the region, comes bearing gifts of meeting",
    fr: "Renommé dans la région, vient avec les présents d'usage",
    es: "Famoso en la comarca, viene con presentes de visita",
    ar: "ذائع الصيت في الناحية، يأتي حاملًا هدايا اللقاء",
  },
  "引见长者·师叔": {
    en: "Senior who makes introductions · Uncle Shi",
    fr: "Aîné qui présente · Oncle Shi",
    es: "Mayor que presenta · Tío Shi",
    ar: "شيخ يعرّف · العم شي",
  },
  "为双方引见的前辈": {
    en: "The senior who introduces both parties",
    fr: "L'aîné qui présente les deux parties",
    es: "El mayor que presenta a ambas partes",
    ar: "الشيخ الذي يعرّف الطرفين",
  },
  "同门·子有": {
    en: "Fellow disciple · Ziyou",
    fr: "Condisciple · Ziyou",
    es: "Condiscípulo · Ziyou",
    ar: "رفيق الدرس · تسي-يوي",
  },
  "同门学友，随行而来": {
    en: "A fellow disciple, come along with him",
    fr: "Un condisciple, venu avec lui",
    es: "Un condiscípulo, venido con él",
    ar: "رفيق درس جاء معه",
  },
  "门下弟子·阿俭": {
    en: "Disciple of the house · A-Jian",
    fr: "Disciple de la maison · A-Jian",
    es: "Discípulo de la casa · A-Jian",
    ar: "تلميذ الدار · آه-جيان",
  },
  "执礼在侧的少年": {
    en: "A youth standing by with due formality",
    fr: "Un jeune homme se tenant près, avec déférence",
    es: "Un joven que asiste con deferencia",
    ar: "فتى يقف إلى الجانب بأدب",
  },
  "国士奉上贽礼": {
    en: "The scholar presents his gifts",
    fr: "Le lettré présente ses présents",
    es: "El letrado presenta sus presentes",
    ar: "العالم يقدّم هداياه",
  },
  "师叔杯空了": {
    en: "Uncle Shi's cup is empty",
    fr: "La coupe de l'oncle Shi est vide",
    es: "La copa del tío Shi está vacía",
    ar: "كأس العم شي فارغ",
  },
  "子有举杯相邀": {
    en: "Ziyou raises his cup to you",
    fr: "Ziyou lève sa coupe vers vous",
    es: "Ziyou alza su copa hacia ti",
    ar: "تسي-يوي يرفع كأسه إليك",
  },
  "阿俭受了冷落": {
    en: "A-Jian is left out",
    fr: "A-Jian est délaissé",
    es: "A-Jian queda desatendido",
    ar: "آه-جيان يُترك مهملًا",
  },
  "国士起身告辞": {
    en: "The scholar rises to take leave",
    fr: "Le lettré se lève pour prendre congé",
    es: "El letrado se levanta para despedirse",
    ar: "العالم يقوم للوداع",
  },

  // ── 场景 3：家宴 ──────────────────────────────────────────────
  "家宴": {
    en: "The Family Banquet",
    fr: "Le banquet de famille",
    es: "El banquete familiar",
    ar: "مأدبة العائلة",
  },
  "长幼齐聚 · 事件频密考「节」": {
    en: "Old and young together · many events test your \"measure\"",
    fr: "Jeunes et anciens réunis · des événements fréquents éprouvent votre « mesure »",
    es: "Mayores y jóvenes juntos: muchos sucesos ponen a prueba tu «medida»",
    ar: "الكبار والصغار مجتمعون · وكثرة الأحداث تختبر «الاعتدال»",
  },
  "自家堂屋": {
    en: "Your own main room",
    fr: "Votre propre salle",
    es: "Tu propia sala",
    ar: "قاعة بيتك",
  },
  "祖父寿辰，长幼齐聚。家人之间的礼最难：色难。": {
    en: "Your grandfather's birthday; old and young are gathered. The rites among family are the hardest of all: \"the countenance is the hard part\".",
    fr: "L'anniversaire de votre grand-père ; jeunes et anciens réunis. Les rites au sein de la famille sont les plus difficiles : « le visage est le difficile ».",
    es: "El cumpleaños de tu abuelo; mayores y jóvenes reunidos. Los ritos dentro de la familia son los más difíciles: «lo difícil es el semblante».",
    ar: "عيد ميلاد الجدّ، والكبار والصغار مجتمعون. وآداب الأهل هي أصعبها: «الصعب هو الوجه».",
  },
  "幼辈频频插话、长辈随时需要照应——沉住气，挑准时机，别忙乱。": {
    en: "The young keep cutting in and the elders need attention at any moment — keep calm, pick your moment, do not fluster.",
    fr: "Les cadets coupent sans cesse et les aînés ont besoin d'attention à tout instant — gardez votre calme, choisissez le moment, ne vous affolez pas.",
    es: "Los jóvenes interrumpen sin cesar y los mayores necesitan atención en cualquier momento: mantén la calma, elige el momento, no te azores.",
    ar: "الصغار يقاطعون دائمًا والكبار يحتاجون الرعاية في أي لحظة — فاضبط نفسك، واختر وقتك، ولا تضطرب.",
  },
  "子曰：色难。对亲人尽礼，难的不是端茶送饭，而是脸色与心意。": {
    en: "The Master said: the countenance is the hard part. In serving one's kin with due rite, the hard thing is not pouring tea but the face and the heart.",
    fr: "Le Maître dit : le visage est le difficile. En servant les siens selon le rite, le difficile n'est pas de verser le thé, mais le visage et le cœur.",
    es: "Dijo el Maestro: lo difícil es el semblante. Al servir a los tuyos según el rito, lo difícil no es servir el té, sino el semblante y el corazón.",
    ar: "قال المعلّم: الصعب هو الوجه. ففي خدمة الأهل وفق الطقس، الصعب ليس صبّ الشاي بل الوجه والقلب.",
  },
  "祖父": {
    en: "Grandfather",
    fr: "Grand-père",
    es: "Abuelo",
    ar: "الجدّ",
  },
  "今日寿星，最要紧的人": {
    en: "Today's birthday celebrant, the one who matters most",
    fr: "Le héros du jour, la personne la plus importante",
    es: "El homenajeado de hoy, la persona más importante",
    ar: "صاحب المناسبة اليوم، وأهمّ الحاضرين",
  },
  "堂兄": {
    en: "Elder cousin",
    fr: "Cousin aîné",
    es: "Primo mayor",
    ar: "ابن العم الأكبر",
  },
  "多年未见的平辈": {
    en: "A peer unseen for years",
    fr: "Un pair que vous n'avez pas vu depuis des années",
    es: "Un igual a quien no ves desde años",
    ar: "من أقرانك لم تره منذ سنوات",
  },
  "小侄": {
    en: "Little nephew",
    fr: "Petit neveu",
    es: "Sobrino pequeño",
    ar: "ابن الأخ الصغير",
  },
  "坐不住的小孩": {
    en: "A child who cannot sit still",
    fr: "Un enfant qui ne tient pas en place",
    es: "Un niño que no se está quieto",
    ar: "طفل لا يهدأ في مقعده",
  },
  "小妹": {
    en: "Younger sister",
    fr: "Petite sœur",
    es: "Hermana pequeña",
    ar: "الأخت الصغيرة",
  },
  "一直看手机的少女": {
    en: "A girl glued to her phone",
    fr: "Une adolescente rivée à son téléphone",
    es: "Una muchacha pegada al móvil",
    ar: "فتاة ملازمة لهاتفها",
  },
  "祖父杯空了": {
    en: "Grandfather's cup is empty",
    fr: "La coupe du grand-père est vide",
    es: "La copa del abuelo está vacía",
    ar: "كأس الجدّ فارغ",
  },
  "小侄打断祖父说话": {
    en: "Little nephew cuts Grandfather off",
    fr: "Le petit neveu coupe la parole au grand-père",
    es: "El sobrino interrumpe al abuelo",
    ar: "ابن الأخ يقطع حديث الجدّ",
  },
  "堂兄举杯相邀": {
    en: "Elder cousin raises his cup to you",
    fr: "Le cousin aîné lève sa coupe vers vous",
    es: "El primo mayor alza su copa hacia ti",
    ar: "ابن العم يرفع كأسه إليك",
  },
  "小妹被晾在一边": {
    en: "Younger sister is left out",
    fr: "La petite sœur est laissée de côté",
    es: "La hermana pequeña queda apartada",
    ar: "الأخت الصغيرة تُترك منبوذة",
  },
  "祖父要讲旧事": {
    en: "Grandfather wants to tell old stories",
    fr: "Le grand-père veut raconter d'anciennes histoires",
    es: "El abuelo quiere contar viejas historias",
    ar: "الجدّ يريد سرد حكايات قديمة",
  },
  "小侄又闹起来了": {
    en: "Little nephew acts up again",
    fr: "Le petit neveu s'agite de nouveau",
    es: "El sobrino vuelve a alborotar",
    ar: "ابن الأخ يعود للشغب",
  },
  "给祖父添汤": {
    en: "Refill Grandfather's soup",
    fr: "Remplir la soupe du grand-père",
    es: "Rellenar la sopa del abuelo",
    ar: "أعد ملء الحساء للجدّ",
  },

  // ── 场景 4：待远客 ────────────────────────────────────────────
  "待远客": {
    en: "Receiving a Guest from Afar",
    fr: "Recevoir un hôte de loin",
    es: "Recibir a un huésped de lejos",
    ar: "استقبال ضيف من بعيد",
  },
  "有朋自远方来 · 宽严之间": {
    en: "Friends from afar · between lenience and rigour",
    fr: "Des amis de loin · entre indulgence et rigueur",
    es: "Amigos de lejos: entre indulgencia y rigor",
    ar: "أصدقاء من بعيد · بين السعة والصرامة",
  },
  "郊居庭院": {
    en: "A courtyard in the outskirts",
    fr: "Une cour aux faubourgs",
    es: "Un patio en las afueras",
    ar: "فناء في الضاحية",
  },
  "远方友人来访，不识中土礼数。对远人当宽，对己当严。": {
    en: "A friend from far away visits, unversed in our rites. Be lenient toward the stranger, strict with yourself.",
    fr: "Un ami de loin vous rend visite, peu versé dans nos rites. Soyez indulgent envers l'étranger, strict envers vous-même.",
    es: "Un amigo de lejos te visita, poco versado en nuestros ritos. Sé indulgente con el forastero, estricto contigo mismo.",
    ar: "صديق من بعيد يزورك ولا يعرف آدابنا. فكن واسعًا مع الغريب، صارمًا مع نفسك.",
  },
  "对远客的揖礼区间更宽容；但你自己的顺序与时机，一点不能松。": {
    en: "The bow window is more forgiving for a distant guest; but your own order and timing admit no slack.",
    fr: "La fenêtre d'inclination est plus indulgente pour un hôte lointain ; mais votre propre ordre et votre timing ne tolèrent aucun relâchement.",
    es: "La ventana de reverencia es más indulgente con un huésped lejano; pero tu propio orden y tu momento no admiten laxitud.",
    ar: "نافذة الانحناء أوسع مع الضيف البعيد؛ أما ترتيبك وتوقيتك فلا يتسامحان مع أي تراخٍ.",
  },
  "有朋自远方来，不亦乐乎？礼待远人，贵在诚意而不苛求形式。": {
    en: "Is it not a joy to have friends come from afar? In receiving the distant guest, sincerity matters more than exact form.",
    fr: "N'est-ce pas une joie d'avoir des amis venus de loin ? En accueillant l'hôte lointain, la sincérité compte plus que la forme exacte.",
    es: "¿No es una alegría tener amigos que vienen de lejos? Al recibir al huésped lejano, la sinceridad importa más que la forma exacta.",
    ar: "أليس من الفرح أن يأتيك أصدقاء من بعيد؟ وفي استقبال الضيف البعيد، الصدق أرجح من الشكل الصارم.",
  },
  "远客·安岚": {
    en: "Distant guest · Anlan",
    fr: "Hôte lointain · Anlan",
    es: "Huésped lejano · Anlan",
    ar: "الضيف البعيد · آن-لان",
  },
  "跨海而来，不识中礼": {
    en: "Crossed the sea, unversed in our rites",
    fr: "A traversé la mer, peu versé dans nos rites",
    es: "Cruzó el mar, poco versado en nuestros ritos",
    ar: "عبر البحر ولا يعرف آدابنا",
  },
  "长者·伯翁": {
    en: "Elder · Old Bo",
    fr: "Ancien · Vieux Bo",
    es: "Mayor · Viejo Bo",
    ar: "الشيخ · بو الكبير",
  },
  "闻远客至，欣然赴会": {
    en: "Hearing a distant guest has come, gladly attends",
    fr: "Apprenant qu'un hôte lointain est venu, vient avec joie",
    es: "Al saber que llegó un huésped lejano, acude gustoso",
    ar: "بلغه قدوم ضيف بعيد فجاء مسرورًا",
  },
  "同窗·子敬": {
    en: "Fellow student · Zijing",
    fr: "Condisciple · Zijing",
    es: "Condiscípulo · Zijing",
    ar: "رفيق الدرس · تسي-جينغ",
  },
  "与你同窗多年": {
    en: "Your fellow student of many years",
    fr: "Votre condisciple de longues années",
    es: "Tu condiscípulo de muchos años",
    ar: "رفيق درسك منذ سنوات",
  },
  "远客不知如何举箸": {
    en: "The distant guest does not know how to use the chopsticks",
    fr: "L'hôte lointain ne sait pas tenir les baguettes",
    es: "El huésped lejano no sabe usar los palillos",
    ar: "الضيف البعيد لا يدري كيف يمسك العصيّ",
  },
  "远客说起故乡": {
    en: "The distant guest speaks of home",
    fr: "L'hôte lointain parle de son pays",
    es: "El huésped lejano habla de su tierra",
    ar: "الضيف البعيد يتحدث عن بلده",
  },
  "子敬举杯相邀": {
    en: "Zijing raises his cup to you",
    fr: "Zijing lève sa coupe vers vous",
    es: "Zijing alza su copa hacia ti",
    ar: "تسي-جينغ يرفع كأسه إليك",
  },
  "远客误了礼数很窘": {
    en: "The distant guest is embarrassed at a slip in form",
    fr: "L'hôte lointain est gêné d'un manquement",
    es: "El huésped lejano se azora por un desliz",
    ar: "الضيف البعيد يحرج لزلّة في الأدب",
  },

  // ── 场景 5：大射前宴 ──────────────────────────────────────────
  "大射前宴": {
    en: "The Banquet Before the Great Archery",
    fr: "Le banquet avant le Grand Tir",
    es: "El banquete antes del Gran Tiro",
    ar: "مأدبة ما قبل الرماية الكبرى",
  },
  "终局 · 全机制高难度": {
    en: "Finale · all mechanics, high difficulty",
    fr: "Final · tous les mécanismes, difficulté élevée",
    es: "Final: todos los mecanismos, alta dificultad",
    ar: "الختام · كل الآليات بدرجة عالية",
  },
  "射宫外庑": {
    en: "The outer gallery of the archery hall",
    fr: "La galerie extérieure du pavillon d'archerie",
    es: "La galería exterior del pabellón de tiro",
    ar: "الرواق الخارجي لقاعة الرماية",
  },
  "明日大射，今夜设宴。正宾在座，司正在侧——这是对你「执礼」的总考。": {
    en: "The great archery is tomorrow; tonight a banquet is set. The principal guest is seated and the master of rites stands by — this is the final examination of your conduct of rite.",
    fr: "Le Grand Tir est demain ; ce soir, un banquet. L'hôte principal est assis et le maître des rites se tient près — c'est l'examen final de votre tenue du rite.",
    es: "El Gran Tiro es mañana; esta noche hay banquete. El invitado principal está sentado y el maestro de ritos asiste: es el examen final de tu conducción del rito.",
    ar: "الرماية الكبرى غدًا، والليلة مأدبة. والضيف الرئيس جالس، ومراقب الطقوس إلى جانبك — وهذا امتحانك الختامي في حسن إقامة الطقس.",
  },
  "中礼区间最窄、事件最密。揖让而升，下而饮：其争也君子。": {
    en: "The window for due form is narrowest and events come thickest. Bow and yield as you ascend, drink as you descend: even in contest, a junzi.",
    fr: "La fenêtre de la juste mesure est la plus étroite et les événements les plus denses. S'incliner et céder en montant, boire en descendant : dans la joute même, un junzi.",
    es: "La ventana de la justa medida es la más estrecha y los sucesos los más densos. Inclinarse y ceder al subir, beber al bajar: aun en la contienda, un junzi.",
    ar: "نافذة الاعتدال أضيقها، والأحداث أكثفها. انحنِ وأفسح وأنت تصعد، واشرب وأنت تنزل: فحتى في المنافسة جونزي.",
  },
  "射礼与宴礼相为表里：先能敬人、序人、节己，明日才谈得上反求诸己。": {
    en: "The archery rite and the banquet rite are two sides of one thing: only when you can respect others, order them and restrain yourself does it make sense tomorrow to seek the fault in yourself.",
    fr: "Le rite du tir et le rite du banquet sont les deux faces d'une même chose : ce n'est qu'en sachant respecter, ordonner et se contenir qu'on pourra demain chercher en soi le manque.",
    es: "El rito del tiro y el del banquete son dos caras de lo mismo: solo si sabes respetar, ordenar y contenerte tiene sentido mañana buscar en ti la falta.",
    ar: "طقس الرماية وطقس المأدبة وجهان لشيء واحد: فمتى قدرتَ على إجلال الناس وترتيبهم وضبط نفسك، صحّ أن تلتمس غدًا التقصير في نفسك.",
  },
  "射礼正宾·公仪子": {
    en: "Principal guest of the archery rite · Gongyizi",
    fr: "Hôte principal du rite du tir · Gongyizi",
    es: "Invitado principal del rito del tiro · Gongyizi",
    ar: "الضيف الرئيس للرماية · كونغ-يي-تسي",
  },
  "明日大射的正宾": {
    en: "Principal guest at tomorrow's great archery",
    fr: "Hôte principal du Grand Tir de demain",
    es: "Invitado principal del Gran Tiro de mañana",
    ar: "الضيف الرئيس لرماية الغد",
  },
  "司正·老丈": {
    en: "Master of rites · Old Sir",
    fr: "Maître des rites · Vénérable",
    es: "Maestro de ritos · Buen viejo",
    ar: "مراقب الطقوس · الشيخ",
  },
  "执掌礼仪纠察的长者": {
    en: "The elder who oversees and corrects decorum",
    fr: "L'aîné qui veille et corrige la tenue",
    es: "El mayor que vela y corrige la compostura",
    ar: "الشيخ المكلّف بمراقبة الأدب وتقويمه",
  },
  "同射·子臧": {
    en: "Fellow archer · Zizang",
    fr: "Compagnon d'arc · Zizang",
    es: "Compañero de arco · Zizang",
    ar: "رفيق الرماية · تسي-تسانغ",
  },
  "明日与你同射之人": {
    en: "The one who shoots alongside you tomorrow",
    fr: "Celui qui tirera à vos côtés demain",
    es: "Quien tirará a tu lado mañana",
    ar: "من سيرمي إلى جانبك غدًا",
  },
  "观礼少年·小柯": {
    en: "Youth observing the rite · Little Ke",
    fr: "Jeune observateur du rite · Petit Ke",
    es: "Joven que observa el rito · Pequeño Ke",
    ar: "فتى يشهد الطقس · كِه الصغير",
  },
  "来观礼的少年": {
    en: "A youth come to observe the rite",
    fr: "Un jeune venu observer le rite",
    es: "Un joven venido a observar el rito",
    ar: "فتى جاء لمشاهدة الطقس",
  },
  "正宾举杯": {
    en: "The principal guest raises his cup",
    fr: "L'hôte principal lève sa coupe",
    es: "El invitado principal alza su copa",
    ar: "الضيف الرئيس يرفع كأسه",
  },
  "司正杯空了": {
    en: "The master of rites' cup is empty",
    fr: "La coupe du maître des rites est vide",
    es: "La copa del maestro de ritos está vacía",
    ar: "كأس مراقب الطقوس فارغ",
  },
  "子臧论弓矢": {
    en: "Zizang discourses on bow and arrow",
    fr: "Zizang discourt sur l'arc et la flèche",
    es: "Zizang diserta sobre arco y flecha",
    ar: "تسي-تسانغ يتحدث في القوس والسهم",
  },
  "小柯欲问不敢问": {
    en: "Little Ke wants to ask but dares not",
    fr: "Le petit Ke veut demander mais n'ose pas",
    es: "El pequeño Ke quiere preguntar mas no osa",
    ar: "كِه الصغير يريد السؤال ولا يجسر",
  },
  "正宾赠玉玦": {
    en: "The principal guest presents a jade ring",
    fr: "L'hôte principal offre un anneau de jade",
    es: "El invitado principal obsequia un anillo de jade",
    ar: "الضيف الرئيس يهدي حلقة يشم",
  },
  "司正宣宴将毕": {
    en: "The master of rites announces the feast's close",
    fr: "Le maître des rites annonce la fin du festin",
    es: "El maestro de ritos anuncia el fin del convite",
    ar: "مراقب الطقوس يعلن قرب انتهاء المأدبة",
  },
  "子臧再邀一杯": {
    en: "Zizang presses another cup on you",
    fr: "Zizang vous invite à une coupe de plus",
    es: "Zizang te invita a otra copa",
    ar: "تسي-تسانغ يدعوك إلى كأس أخرى",
  },
  "正宾起身还席": {
    en: "The principal guest rises and returns to his seat",
    fr: "L'hôte principal se lève et regagne sa place",
    es: "El invitado principal se levanta y vuelve a su asiento",
    ar: "الضيف الرئيس يقوم ويعود إلى مقعده",
  },
};

/** 取礼艺场景文案的译文；缺译（或 lang 为 zh）时回落中文原文。 */
export function lt(zh: string, lang: Lang): string {
  if (lang === "zh") return zh;
  return LI_HOST_I18N[zh]?.[lang] ?? zh;
}
