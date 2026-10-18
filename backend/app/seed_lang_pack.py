# -*- coding: utf-8 -*-
"""五语语言包（幂等补丁）。

补齐 seed_topics 遗留的翻译缺口，让 fr/es/ar/en 用户不再读到中文回落：
- Topic.name_i18n 补 fr/es/ar
- Topic.description 补 fr/es/ar
- CrossCivView.civ_label_i18n 补 fr/es/ar
- CrossCivView.detail 补 en/fr/es/ar

只填空缺键、不覆盖已有非空值；可在每次启动时安全执行。
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from .models import CrossCivView, Topic

# ── 议题名称 fr/es/ar ──────────────────────────────────────────────
TOPIC_NAMES = {
    "climate":      {"fr": "Gouvernance climatique", "es": "Gobernanza climática", "ar": "حوكمة المناخ"},
    "tech_ethics":  {"fr": "Éthique technologique", "es": "Ética tecnológica", "ar": "أخلاق التقنية"},
    "social":       {"fr": "Responsabilité sociale", "es": "Responsabilidad social", "ar": "المسؤولية الاجتماعية"},
    "personal":     {"fr": "Développement personnel", "es": "Desarrollo personal", "ar": "التنمية الشخصية"},
    "governance":   {"fr": "Gouvernance publique", "es": "Gobernanza pública", "ar": "الحوكمة العامة"},
}

# ── 议题描述 fr/es/ar ──────────────────────────────────────────────
TOPIC_DESC = {
    "climate": {
        "fr": "Face à la crise climatique, comment l'humanité doit-elle assumer ses responsabilités, coordonner ses intérêts et se maîtriser ?",
        "es": "Ante la crisis climática, ¿cómo debe la humanidad asumir responsabilidades, coordinar intereses y contenerse?",
        "ar": "في مواجهة أزمة المناخ، كيف تتحمل البشرية المسؤولية وتنسّق المصالح وتضبط نفسها؟",
    },
    "tech_ethics": {
        "fr": "À l'ère de l'IA, de l'édition génétique et de la surveillance numérique, où doivent se situer les limites de la technique ?",
        "es": "En la era de la IA, la edición genética y la vigilancia digital, ¿dónde deben estar los límites de la tecnología?",
        "ar": "في عصر الذكاء الاصطناعي وتحرير الجينات والمراقبة الرقمية، أين يجب أن تقف حدود التقنية؟",
    },
    "social": {
        "fr": "Quelles responsabilités l'individu doit-il respectivement envers sa famille, son voisinage, son pays et le monde ?",
        "es": "¿Qué responsabilidades debe el individuo a la familia, la comunidad, la nación y el mundo?",
        "ar": "ما المسؤوليات التي على الفرد تجاه الأسرة والجوار والدولة والعالم؟",
    },
    "personal": {
        "fr": "Dans la pression sociale et l'incertitude, comment les jeunes peuvent-ils s'ancrer et mûrir ?",
        "es": "Entre la presión social y la incertidumbre, ¿cómo pueden los jóvenes arraigarse y madurar?",
        "ar": "في خضم الضغط الاجتماعي وعدم اليقين، كيف يُرسّخ الشباب أنفسهم وينضجون؟",
    },
    "governance": {
        "fr": "Comment un gouvernement et un ordre public idéaux peuvent-ils conjuguer efficacité, justice et confiance du peuple ?",
        "es": "¿Cómo deben el gobierno y el orden público ideal equilibrar eficacia, justicia y la confianza del pueblo?",
        "ar": "كيف توفّق الحكومة المثالية والنظام العام المثالي بين الفاعلية والعدالة وثقة الشعب؟",
    },
}

# ── 文明名称 fr/es/ar ──────────────────────────────────────────────
CIV_LABELS = {
    "confucian":     {"fr": "Confucian", "es": "Confuciano", "ar": "الكونفوشيوسية"},
    "christian":     {"fr": "Éthique chrétienne", "es": "Ética cristiana", "ar": "الأخلاق المسيحية"},
    "enlightenment": {"fr": "Raison des Lumières", "es": "Razón ilustrada", "ar": "عصر التنوير"},
    "kantian":       {"fr": "Déontologie kantienne", "es": "Deontología kantiana", "ar": "الأخلاق الكانطية"},
    "buddhist":      {"fr": "Pensée bouddhique/indienne", "es": "Pensamiento budista/indio", "ar": "الفكر البوذي/الهندي"},
}

# ── 25 条跨文明立场详情：en/fr/es/ar ───────────────────────────────
VIEW_DETAILS = {
    # ── climate ──
    ("climate", "confucian"): {
        "en": "Confucianism holds that humans and nature are not opposed: \"Confucius fished with a line but not a dragnet, and shot but not at roosting birds\" (Analects, Shu'er). Climate governance should extend ren—care for people—to all beings; by restraining desires and disciplining ourselves, all things can flourish together without harming one another (Doctrine of the Mean).",
        "fr": "Le confucianisme affirme que l'homme et la nature ne s'opposent pas : « Il pêchait à la ligne, jamais au filet ; il ne tirait jamais sur les oiseaux au gîte » (Entretiens, Shu'er). La gouvernance climatique doit étendre le ren — l'attention aux hommes — à tous les êtres : en modérant les désirs et en se maîtrisant, tous les êtres peuvent croître sans se nuire (Juste Milieu).",
        "es": "El confucianismo sostiene que el ser humano y la naturaleza no se oponen: «Pescaba con caña, pero no con red; cazaba, pero no a aves que dormían» (Analectas, Shu'er). La gobernanza climática debe extender el ren —el cuidado a las personas— a todos los seres; moderando los deseos y cultivando la autodisciplina, todos los seres pueden florecer sin dañarse mutuamente (Doctrina del Justo Medio).",
        "ar": "تؤكد الكونفوشيوسية أن الإنسان والطبيعة ليسا في تعارض: «كان يصطاد بالسنارة لا بالشبكة، ولا يرمي الطيور في أعشاشها» (الحوارات، شو إر). يجب أن تمتد «الرن» —محبة الناس— إلى جميع الكائنات؛ وبكبح الرغبات وتهذيب النفس، تنمو الكائنات جميعًا دون أن يضر بعضها ببعض (مذهب الوسط).",
    },
    ("climate", "christian"): {
        "en": "Christian ethics sees humans as made in \"the image of God\" and as \"stewards\" (Genesis 1:28; 2:15). The earth is not private property but a divine trust. \"As each has received a gift, use it to serve one another\" (1 Peter 4:10)—climate responsibility is a duty of faith, and wealthy nations have a greater obligation to help the vulnerable.",
        "fr": "L'éthique chrétienne voit l'homme comme créé à « l'image de Dieu » et comme un « intendant » (Genèse 1:28 ; 2:15). La terre n'est pas une propriété privée mais un dépôt divin. « Mettez-vous au service les uns des autres, chacun selon la grâce reçue » (1 Pierre 4:10) — la responsabilité climatique est un devoir de foi, et les nations riches ont une plus grande obligation d'aider les plus vulnérables.",
        "es": "La ética cristiana ve al ser humano como creado a «imagen de Dios» y como un «administrador» (Génesis 1:28; 2:15). La tierra no es propiedad privada, sino un encargo divino. «Cada uno ponga al servicio de los demás el don que ha recibido» (1 Pedro 4:10): la responsabilidad climática es un deber de fe, y las naciones ricas tienen mayor obligación de ayudar a las vulnerables.",
        "ar": "ترى الأخلاق المسيحية الإنسان مخلوقًا على «صورة الله» و«وكيلًا» على الأرض (التكوين 1:28؛ 2:15). الأرض ليست ملكًا خاصًا بل أمانة إلهية. «ليخدم بعضكم بعضًا بما نال كل واحد من نعمة» (1 بطرس 4:10) — المسؤولية المناخية واجب إيماني، وعلى الدول الغنية التزام أكبر بمساعدة الضعفاء.",
    },
    ("climate", "enlightenment"): {
        "en": "Enlightenment reason urges us to understand the climate through science and to reach a global compact through rational deliberation (the spirit behind the Paris Agreement). A Kantian \"perpetual peace\" extends to the ecological sphere: treating humanity as a community capable of communication. Carbon pricing, institutional design, and cross-border rule of law are the paths forward.",
        "fr": "La raison des Lumières invite à comprendre le climat par la science et à conclure un pacte mondial par la délibération rationnelle (l'esprit de l'Accord de Paris). La « paix perpétuelle » kantienne s'étend au domaine écologique : l'humanité comme une communauté capable de communiquer. La tarification du carbone, la conception des institutions et l'état de droit transfrontalier sont les voies à suivre.",
        "es": "La razón ilustrada propone comprender el clima mediante la ciencia y alcanzar un pacto global mediante la deliberación racional (el espíritu del Acuerdo de París). La «paz perpetua» kantiana se extiende a la esfera ecológica: la humanidad como una comunidad capaz de comunicarse. La fijación de precios del carbono, el diseño institucional y el Estado de derecho transfronterizo son los caminos.",
        "ar": "يدعو عصر التنوير إلى فهم المناخ عبر العلم وإبرام ميثاق عالمي عبر التداول العقلاني (روح اتفاق باريس). تمتد «السلام الدائم» الكانطية إلى المجال البيئي: البشرية جماعة قادرة على التواصل. تسعير الكربون، وتصميم المؤسسات، وسيادة القانون العابرة للحدود هي السبل.",
    },
    ("climate", "kantian"): {
        "en": "Kantian deontology extends naturally: a maxim is immoral if it cannot be universalized into a law everyone could accept. Excessive fossil-fuel consumption cannot be universalized (the planet would collapse), so individuals and states have a \"perfect duty\" to cut emissions, independent of utilitarian calculations.",
        "fr": "La déontologie kantienne s'étend naturellement : une maxime est immorale si elle ne peut être universalisée en une loi acceptable par tous. La consommation excessive d'énergies fossiles ne peut être universalisée (la planète s'effondrerait) ; les individus comme les États ont donc un « devoir strict » de réduire les émissions, indépendamment des calculs utilitaristes.",
        "es": "La deontología kantiana se extiende con naturalidad: una máxima es inmoral si no puede universalizarse en una ley que todos puedan aceptar. El consumo excesivo de combustibles fósiles no puede universalizarse (el planeta colapsaría), por lo que individuos y Estados tienen un «deber perfecto» de reducir emisiones, con independencia de cálculos utilitaristas.",
        "ar": "تمتد أخلاق كانط الواجبية: الفعل غير أخلاقي إذا تعذّر تعميم قاعدته على الجميع. الإفراط في استهلاك الوقود الأحفوري لا يمكن تعميمه (وإلا انهار الكوكب)، لذا يقع على الأفراد والدول «واجب تام» بخفض الانبعاثات، بمعزل عن الحسابات النفعية.",
    },
    ("climate", "buddhist"): {
        "en": "Buddhism teaches \"dependent origination\" (pratītyasamutpāda)—all things are interdependent, and the climate is our shared karma. \"Non-harm\" (ahimsā) extends to the ecosystem. The root remedy is reducing greed, anger, and delusion—especially consumer craving. Simplicity of life is itself a practice.",
        "fr": "Le bouddhisme enseigne la « coproduction conditionnée » (pratītyasamutpāda) : tout est interdépendant, et le climat est notre karma commun. La « non-violence » (ahimsā) s'étend à l'écosystème. Le remède fondamental est de réduire l'avidité, la haine et l'aveuglement — surtout la soif de consommation. La simplicité de vie est elle-même une pratique.",
        "es": "El budismo enseña la «originación dependiente» (pratītyasamutpāda): todo es interdependiente, y el clima es nuestro karma compartido. La «no violencia» (ahimsā) se extiende al ecosistema. El remedio de raíz es reducir la codicia, la ira y la ignorancia —especialmente el ansia de consumo. La sencillez de vida es en sí misma una práctica.",
        "ar": "يعلّم البوذية «النشأة الارتباطية» (براتيتيا ساموتپادا): كل الأشياء مترابطة، والمناخ هو كارمنا المشترك. تمتد «اللاعنف» (أهيمسا) إلى النظام البيئي. العلاج الجذري هو تقليل الطمع والغضب والجهل —خاصة نهم الاستهلاك. وبساطة العيش هي بحد ذاتها ممارسة روحية.",
    },

    # ── tech_ethics ──
    ("tech_ethics", "confucian"): {
        "en": "Confucianism does not oppose technology (the Analects often speak of \"vessels\" and \"arts\"), but stresses that \"the junzi is not a vessel\" (Analects, Wei Zheng)—technology is a means and must not come to define the human. AI and gene editing must be rooted in ren and tempered by li, lest we \"lose our original heart.\"",
        "fr": "Le confucianisme ne s'oppose pas à la technique (les Entretiens parlent souvent d'« ustensiles » et d'« arts »), mais soulignent que « le junzi n'est pas un ustensile » (Entretiens, Wei Zheng) : la technique est un moyen et ne doit pas définir l'homme. L'IA et l'édition génétique doivent s'enraciner dans le ren et se régler par le li, sous peine de « perdre son cœur originel ».",
        "es": "El confucianismo no se opone a la tecnología (las Analectas hablan a menudo de «utensilios» y «artes»), pero subrayan que «el junzi no es un utensilio» (Analectas, Wei Zheng): la tecnología es un medio y no debe llegar a definir al ser humano. La IA y la edición genética deben arraigarse en el ren y templarse con el li, para no «perder el corazón original».",
        "ar": "لا تعارض الكونفوشيوسية التقنية (تتحدث الحوارات كثيرًا عن «الأدوات» و«الفنون»)، لكنها تؤكد أن «الجونزي ليس أداة» (الحوارات، ويي جينغ): التقنية وسيلة لا أن تحدد معنى الإنسان. يجب أن يتجذر الذكاء الاصطناعي وتحرير الجينات في «الرن» ويُضبط بـ«اللي»، مخافة أن «نضيع قلبنا الأصلي».",
    },
    ("tech_ethics", "christian"): {
        "en": "Christian ethics remains alert to gene editing, human enhancement, and personified AI: humans bear the \"image of God\" (imago Dei), and their dignity cannot be reduced to algorithms or genes. Technology may assist people, but it must not create \"human beings.\"",
        "fr": "L'éthique chrétienne reste vigilante face à l'édition génétique, à l'augmentation humaine et à l'IA personnifiée : l'homme porte l'« image de Dieu » (imago Dei), et sa dignité ne peut être réduite aux algorithmes ou aux gènes. La technique peut aider l'homme, mais elle ne doit pas fabriquer l'« homme ».",
        "es": "La ética cristiana se mantiene alerta ante la edición genética, el mejoramiento humano y la IA personificada: el ser humano lleva la «imagen de Dios» (imago Dei), y su dignidad no puede reducirse a algoritmos o genes. La tecnología puede ayudar a las personas, pero no debe «crear seres humanos».",
        "ar": "تظل الأخلاق المسيحية يقظة إزاء تحرير الجينات وتعزيز الإنسان والذكاء الاصطناعي المُجسَّد: الإنسان يحمل «صورة الله» (إيماغو داي)، وكرامته لا تُختزل إلى خوارزميات أو جينات. يمكن للتقنية أن تُعين الإنسان، لكن لا يجوز لها أن «تصنع إنسانًا».",
    },
    ("tech_ethics", "enlightenment"): {
        "en": "The Enlightenment tradition supports technological progress but demands (1) public rational deliberation, (2) transparency and accountability, and (3) protection of individual freedom. The EU's GDPR and AI Act are contemporary extensions of this line: technology must submit to democratic scrutiny.",
        "fr": "La tradition des Lumières soutient le progrès technique mais exige (1) une délibération publique et rationnelle, (2) transparence et responsabilité, (3) la protection des libertés individuelles. Le RGPD et l'AI Act de l'UE en sont les prolongements contemporains : la technique doit se soumettre à l'examen démocratique.",
        "es": "La tradición ilustrada apoya el progreso tecnológico, pero exige (1) deliberación pública racional, (2) transparencia y rendición de cuentas, y (3) protección de la libertad individual. El RGPD y la Ley de IA de la UE son extensiones contemporáneas: la tecnología debe someterse al escrutinio democrático.",
        "ar": "يدعم تقليد التنوير التقدم التقني لكنه يتطلب (1) تداولًا عامًا عقلانيًا، (2) شفافية ومساءلة، (3) حماية الحرية الفردية. تُعد اللائحة العامة لحماية البيانات وقانون الذكاء الاصطناعي في الاتحاد الأوروبي امتدادًا معاصرًا: على التقنية أن تخضع للتمحيص الديمقراطي.",
    },
    ("tech_ethics", "kantian"): {
        "en": "Kant's categorical imperative in its second formula: always treat humanity as an end in itself. Algorithmic surveillance, data exploitation, and deepfakes violate personal dignity. Informed consent and data self-determination are the Kantian floor of technology ethics.",
        "fr": "L'impératif catégorique kantien, seconde formulation : traite toujours l'humanité comme une fin en soi. La surveillance algorithmique, l'exploitation des données et les hypertrucages portent atteinte à la dignité personnelle. Le consentement éclairé et l'autodétermination des données constituent le socle kantien de l'éthique technologique.",
        "es": "El imperativo categórico kantiano en su segunda fórmula: trata siempre a la humanidad como un fin en sí misma. La vigilancia algorítmica, la explotación de datos y los deepfakes vulneran la dignidad personal. El consentimiento informado y la autodeterminación de los datos son el suelo kantiano de la ética tecnológica.",
        "ar": "الواجب الأخلاقي الكانطي بصيغته الثانية: عامل البشرية دائمًا كغاية في ذاتها. المراقبة الخوارزمية واستغلال البيانات والتزييف العميق تنتهك كرامة الشخص. الموافقة المستنيرة وتقرير المصير بشأن البيانات هما الحد الكانطي الأدنى لأخلاق التقنية.",
    },
    ("tech_ethics", "buddhist"): {
        "en": "Buddhism sees technology as an extension of \"karma\" and \"conditions\"—neutral in itself; what matters is the intention. If AI-driven personalization reinforces ego-clinging and craving, it runs counter to \"right mindfulness\" and the \"middle way.\" The contemporary \"mindful technology\" movement follows this very line.",
        "fr": "Le bouddhisme voit la technique comme un prolongement du « karma » et des « conditions » : neutre en elle-même, l'essentiel est l'intention. Si les recommandations personnalisées de l'IA renforcent l'attachement à l'ego et la convoitise, elles contredisent la « pleine conscience juste » et la « voie du milieu ». Le mouvement contemporain de la « tech consciente » suit cette voie.",
        "es": "El budismo ve la tecnología como una extensión del «karma» y las «condiciones»: neutra en sí misma; lo que importa es la intención. Si la personalización de la IA refuerza el apego al ego y la codicia, contradice la «recta atención» y el «camino medio». El movimiento contemporáneo de la «tecnología consciente» sigue esta línea.",
        "ar": "يرى البوذية التقنية امتدادًا لـ«الكارما» و«الشروط»: محايدة بذاتها، والمهم هو النية. إذا عزّز التخصيص الذكي التعلق بالأنا والطمع، فإنه يناقض «اليقظة الصحيحة» و«الطريق الأوسط». وتسير حركة «التقنية الواعية» المعاصرة على هذا النهج.",
    },

    # ── social ──
    ("social", "confucian"): {
        "en": "Confucian ethics moves in concentric circles—\"cultivate oneself, order the family, govern the state, bring peace to the world\" (Great Learning)—responsibility extends from the near to the distant but never stops at the near. \"Treat my elders as elders should be treated, and extend this to others' elders; treat my young and extend it\" (Mencius)—rooted in family affection, it expands into universal care.",
        "fr": "L'éthique confucéenne procède par cercles concentriques — « cultiver sa personne, régler sa famille, gouverner l'État, pacifier le monde » (La Grande Étude) : la responsabilité s'étend du proche au lointain sans s'arrêter au proche. « Traite mes aînés comme des aînés, et étends-le aux aînés d'autrui ; traite mes jeunes et étends-le » (Mencius) — enracinée dans l'affection familiale, elle s'élargit en bienveillance universelle.",
        "es": "La ética confuciana avanza en círculos concéntricos —«cultiva la persona, ordena la familia, gobierna el Estado, pacifica el mundo» (Gran Saber): la responsabilidad va de lo cercano a lo lejano sin detenerse en lo cercano. «Trata a mis mayores como deben ser tratados y extiéndelo a los mayores ajenos; trata a mis pequeños y extiéndelo» (Mencio): arraigada en el afecto familiar, se expande en cuidado universal.",
        "ar": "تسير الأخلاق الكونفوشيوسية في دوائر متحدة المركز —«تهذيب الذات، تنظيم الأسرة، حكم الدولة، إحلال السلام في العالم» (التعليم العظيم): تمتد المسؤولية من القريب إلى البعيد دون أن تقف عند القريب. «أكرم كباري وامتدّ بذلك إلى كبار غيري؛ أرفق بصغاري وامتدّ إلى صغار غيري» (منسيوس) — متجذرة في عاطفة الأسرة، تتسع إلى رعاية عالمية.",
    },
    ("social", "christian"): {
        "en": "At the heart of Christian ethics is \"love\" (agape). \"Love one another\" (John 13:34). Jesus specifically says, \"As you did it to one of the least of these my brothers, you did it to me\" (Matthew 25:40)—the core of social responsibility is care for the weakest.",
        "fr": "Au cœur de l'éthique chrétienne se trouve l'« amour » (agapè). « Aimez-vous les uns les autres » (Jean 13:34). Jésus précise : « Chaque fois que vous l'avez fait à l'un de ces plus petits de mes frères, c'est à moi que vous l'avez fait » (Matthieu 25:40) — le cœur de la responsabilité sociale est le soin aux plus faibles.",
        "es": "En el corazón de la ética cristiana está el «amor» (ágape). «Amaos los unos a los otros» (Juan 13:34). Jesús precisa: «Cada vez que lo hicisteis con uno de estos mis hermanos más pequeños, conmigo lo hicisteis» (Mateo 25:40): el núcleo de la responsabilidad social es el cuidado de los más débiles.",
        "ar": "في قلب الأخلاق المسيحية «المحبة» (أغابي). «أحبوا بعضكم بعضًا» (يوحنا 13:34). ويقول يسوع تحديدًا: «كل ما فعلتموه بأحد إخوتي هؤلاء الأصاغر، فبي فعلتموه» (متى 25:40) — جوهر المسؤولية الاجتماعية رعاية الأضعف.",
    },
    ("social", "enlightenment"): {
        "en": "The Enlightenment places responsibility within a \"social contract\": individuals yield some freedom in exchange for the common good (Rousseau, Locke). The modern welfare state, progressive taxation, and public education are its extensions. Responsibility rests not on feeling but on institutions.",
        "fr": "Les Lumières placent la responsabilité dans le cadre du « contrat social » : l'individu cède une part de liberté en échange du bien commun (Rousseau, Locke). L'État-providence moderne, l'impôt progressif et l'éducation publique en sont les prolongements. La responsabilité ne repose pas sur le sentiment mais sur les institutions.",
        "es": "La Ilustración sitúa la responsabilidad en el marco del «contrato social»: el individuo cede parte de su libertad a cambio del bien común (Rousseau, Locke). El Estado de bienestar moderno, los impuestos progresivos y la educación pública son sus extensiones. La responsabilidad no descansa en el sentimiento, sino en las instituciones.",
        "ar": "يضع التنوير المسؤولية في إطار «العقد الاجتماعي»: يتنازل الفرد عن قدر من حريته مقابل الصالح العام (روسو، لوك). دولة الرفاه الحديثة والضريبة التصاعدية والتعليم العام امتدادات له. المسؤولية لا تقوم على الشعور بل على المؤسسات.",
    },
    ("social", "kantian"): {
        "en": "Kant distinguishes \"perfect duties\" (do not violate others) from \"imperfect duties\" (actively do good). Social responsibility belongs to the latter—not prescribing every specific act, yet we have a duty to cultivate a will to beneficence and to make others' happiness our own end.",
        "fr": "Kant distingue les « devoirs stricts » (ne pas violer autrui) des « devoirs larges » (faire activement le bien). La responsabilité sociale relève de ces derniers : sans prescrire chaque acte précis, nous avons le devoir de cultiver une volonté bienfaisante et de faire du bonheur d'autrui notre fin.",
        "es": "Kant distingue los «deberes perfectos» (no violar a los demás) de los «imperfectos» (hacer activamente el bien). La responsabilidad social pertenece a estos últimos: sin prescribir cada acto concreto, tenemos el deber de cultivar una voluntad benéfica y hacer de la felicidad ajena nuestro fin.",
        "ar": "يميّز كانط بين «الواجبات التامة» (عدم الإضرار بالغير) و«الواجبات غير التامة» (فعل الخير بنشاط). تنتمي المسؤولية الاجتماعية إلى الثانية: دون تحديد كل فعل بعينه، علينا واجب تنمية إرادة الإحسان وجعل سعادة الآخرين غاية لنا.",
    },
    ("social", "buddhist"): {
        "en": "The Mahayana \"bodhisattva path\" aims to \"seek awakening above and liberate beings below.\" \"Great compassion without conditions, sorrow of one shared body\"—compassion makes no distinction between kin and strangers because all beings are equal. Generosity is the foremost practice; it can dialogue with Confucian care yet differs from it.",
        "fr": "La « voie du bodhisattva » du Grand Véhicule vise à « chercher l'éveil en haut et libérer les êtres en bas ». « Grande compassion sans conditions, douleur d'un seul corps partagé » : la compassion ne distingue pas proches et étrangers car tous les êtres sont égaux. Le don est la première pratique ; elle dialogue avec la bienveillance confucéenne mais s'en distingue.",
        "es": "La «vía del bodhisattva» del Mahayana busca «buscar el despertar arriba y liberar a los seres abajo». «Gran compasión sin condiciones, dolor de un solo cuerpo compartido»: la compasión no distingue parientes de extraños porque todos los seres son iguales. La generosidad es la práctica principal; dialoga con el cuidado confuciano, pero se distingue de él.",
        "ar": "يسعى «طريق البوديساتفا» في الماهايانا إلى «طلب اليقظة في الأعلى وتحرير الكائنات في الأسفل». «رحمة عظيمة بلا شروط، وألم الجسد الواحد المشترك» — الرحمة لا تفرّق بين القريب والغريب لأن الكائنات متساوية. العطاء هو الممارسة الأولى؛ يحاور الرعاية الكونفوشيوسية لكنه يختلف عنها.",
    },

    # ── personal ──
    ("personal", "confucian"): {
        "en": "Confucius: \"At fifteen I set my heart on learning; at thirty I stood firm... at seventy I could follow my heart's desires without overstepping bounds\" (Analects, Wei Zheng). Confucianism sees life as a gradual process of cultivation—not anxious about results, valuing the daily \"learning and practicing,\" and realizing the self within relationships.",
        "fr": "Confucius : « À quinze ans, je mis ma volonté dans l'étude ; à trente, je tins ferme... à soixante-dix, je suivais les désirs de mon cœur sans franchir les limites » (Entretiens, Wei Zheng). Le confucianisme voit la vie comme une culture progressive : sans anxiété de résultat, il valorise l'« étudier et pratiquer » quotidien, et réalise le soi dans les relations.",
        "es": "Confucio: «A los quince puse mi corazón en el estudio; a los treinta me afirmé... a los setenta podía seguir los deseos de mi corazón sin traspasar los límites» (Analectas, Wei Zheng). El confucianismo ve la vida como un cultivo gradual: sin ansia de resultados, valora el diario «aprender y practicar», y realiza al ser en las relaciones.",
        "ar": "يقول كونفوشيوس: «في الخامسة عشرة عقدت قلبي على التعلم؛ في الثلاثين استقمت... في السبعين أتبع رغبات قلبي دون أن أتجاوز الحدود» (الحوارات، ويي جينغ). ترى الكونفوشيوسية الحياة تنشئة متدرجة: بلا قلق من النتائج، تثمّن «التعلم والممارسة» اليومية، وتحقق الذات داخل العلاقات.",
    },
    ("personal", "christian"): {
        "en": "Christian ethics stresses that one does not rely on oneself alone—the fundamental power for growth is grace, not mere self-effort. \"Come to me, all you that are weary and carrying heavy burdens, and I will give you rest\" (Matthew 11:28)—a powerful source of comfort in an age of burnout.",
        "fr": "L'éthique chrétienne souligne qu'on ne compte pas sur soi seul : le moteur fondamental de la croissance est la grâce, non le seul effort. « Venez à moi, vous tous qui peinez et ployez sous le fardeau, et je vous donnerai le repos » (Matthieu 11:28) — un réconfort puissant à l'ère de l'épuisement.",
        "es": "La ética cristiana subraya que no se depende solo de uno mismo: el motor fundamental del crecimiento es la gracia, no el mero esfuerzo. «Venid a mí todos los que estáis cansados y cargados, y yo os haré descansar» (Mateo 11:28): un consuelo poderoso en la era del agotamiento.",
        "ar": "تؤكد الأخلاق المسيحية أن الإنسان لا يعتمد على نفسه وحدها: قوة النمو الجوهرية هي النعمة لا مجرد الجهد. «تعالوا إليّ يا جميع المتعبين الثقيل الأحمال، وأنا أريحكم» (متى 11:28) — عزاء قوي في عصر الاحتراق الوظيفي.",
    },
    ("personal", "enlightenment"): {
        "en": "Kant's What Is Enlightenment?: enlightenment is humanity's emergence from its \"self-incurred immaturity.\" The core of personal development is sapere aude—dare to think for yourself. Today's \"critical thinking\" and lifelong learning both spring from this.",
        "fr": "Dans Qu'est-ce que les Lumières ?, Kant écrit que les Lumières sont la sortie de l'homme hors de l'« état de minorité dont il est lui-même responsable ». Le cœur du développement personnel est sapere aude — ose penser par toi-même. La « pensée critique » et l'apprentissage tout au long de la vie en découlent.",
        "es": "En ¿Qué es la Ilustración?, Kant escribe que la ilustración es la salida del ser humano de su «inmadurez autoincurrida». El núcleo del desarrollo personal es sapere aude: atrévete a pensar por ti mismo. El «pensamiento crítico» y el aprendizaje permanente proceden de ahí.",
        "ar": "في «ما التنوير؟» يكتب كانط أن التنوير هو خروج الإنسان من «القصور الذي هو نفسه مسؤول عنه». جوهر التنمية الشخصية هو «سابيري أودي» — اجترئ على استخدام عقلك بنفسك. ومنه تنبع «التفكير النقدي» والتعلم مدى الحياة.",
    },
    ("personal", "kantian"): {
        "en": "Kant's \"autonomy\" is true freedom—acting according to laws your own reason has endorsed. This differs from the freedom of \"doing as you please\"; it is freedom with responsibility. A response to burnout: freedom lies not in external conditions but in self-legislation.",
        "fr": "L'« autonomie » kantienne est la vraie liberté — agir selon des lois que sa propre raison a approuvées. Elle diffère de la liberté de « faire ce qu'on veut » : c'est une liberté responsable. Réponse à l'épuisement : la liberté n'est pas dans les conditions extérieures mais dans l'auto-législation.",
        "es": "La «autonomía» kantiana es la verdadera libertad: obrar según leyes que la propia razón ha aprobado. Se distingue de la libertad de «hacer lo que uno quiere»; es una libertad con responsabilidad. Respuesta al agotamiento: la libertad no está en las condiciones externas, sino en la autonomía legisladora.",
        "ar": "«الاستقلال الذاتي» الكانطي هو الحرية الحقيقية — أن تعمل وفق قوانين أقرها عقلك بنفسك. يختلف عن حرية «فعل ما يحلو لك»؛ إنه حرية معها مسؤولية. جواب عن الاحتراق: الحرية ليست في الظروف الخارجية بل في تشريع الذات لنفسها.",
    },
    ("personal", "buddhist"): {
        "en": "Buddhist \"impermanence\" (anicca) and \"mindfulness\" (sati) point straight at modern anxiety: suffering arises from clinging to permanence and control. Practice begins with watching the breath—living each present moment clearly.",
        "fr": "L'« impermanence » (anicca) et la « pleine conscience » (sati) bouddhiques visent juste l'anxiété moderne : la souffrance naît de l'attachement à la permanence et au contrôle. La pratique commence par observer la respiration — vivre clairement chaque moment présent.",
        "es": "La «impermanencia» (anicca) y la «atención plena» (sati) budistas apuntan directo a la ansiedad moderna: el sufrimiento surge del apego a la permanencia y al control. La práctica comienza observando la respiración: vivir con claridad cada momento presente.",
        "ar": "تشير «اللادوام» (أنيكا) و«اليقظة» (ساتي) البوذيتان مباشرة إلى القلق المعاصر: المعاناة تنشأ من التعلق بالدوام والسيطرة. تبدأ الممارسة بـ«مراقبة النفس» — أن تعيش كل لحظة حاضرة بوضوح.",
    },

    # ── governance ──
    ("governance", "confucian"): {
        "en": "\"Govern by virtue, and you will be like the North Star\" (Analects, Wei Zheng). Confucianism holds that virtue is the root of governance and institutions its branches. \"The people are most precious; the altars of the state come next; the ruler is lightest\" (Mencius)—legitimacy comes from the people's hearts; names must be rectified and responsibilities clear.",
        "fr": "« Gouverne par la vertu, tu seras comme l'étoile polaire » (Entretiens, Wei Zheng). Le confucianisme tient la vertu pour racine du gouvernement et les institutions pour branches. « Le peuple est le plus précieux ; les autels de l'État viennent ensuite ; le souverain est le moindre » (Mencius) — la légitimité vient du cœur du peuple ; les noms doivent être rectifiés et les devoirs clarifiés.",
        "es": "«Gobierna con virtud y serás como la estrella polar» (Analectas, Wei Zheng). El confucianismo tiene la virtud por raíz del gobierno y las instituciones por ramas. «El pueblo es lo más precioso; luego los altares del Estado; el soberano es lo menos» (Mencio): la legitimidad nace del corazón del pueblo; los nombres deben rectificarse y los deberes aclararse.",
        "ar": "«احكم بالفضيلة تكن كنجم القطب» (الحوارات، ويي جينغ). ترى الكونفوشيوسية الفضيلة جذر الحكم والمؤسسات فروعه. «الشعب أثمن ما يكون؛ ثم معابد الدولة؛ والحاكم أهونها» (منسيوس) — الشرعية تنبع من قلوب الشعب؛ يجب تقويم الأسماء وإيضاح المسؤوليات.",
    },
    ("governance", "christian"): {
        "en": "The Christian tradition both affirms governmental legitimacy (Romans 13:1) and stresses that power must be bound by divine law and conscience. Medieval \"natural law\" and modern constitutional government continue this line: power must be transparent, limited, and accountable.",
        "fr": "La tradition chrétienne affirme la légitimité du gouvernement (Romains 13:1) tout en soulignant que le pouvoir doit être lié par la loi divine et la conscience. Le « droit naturel » médiéval et le gouvernement constitutionnel moderne prolongent cette ligne : le pouvoir doit être transparent, limité et responsable.",
        "es": "La tradición cristiana afirma la legitimidad del gobierno (Romanos 13:1) y subraya que el poder debe estar ligado por la ley divina y la conciencia. El «derecho natural» medieval y el gobierno constitucional moderno continúan esta línea: el poder debe ser transparente, limitado y responsable.",
        "ar": "يؤكد التقليد المسيحي شرعية الحكم (رومية 13:1) ويشدد على أن السلطة مقيّدة بالناموس الإلهي والضمير. يواصل «القانون الطبيعي» الوسيط والحكم الدستوري الحديث هذا الخط: على السلطة أن تكون شفافة ومحدودة وخاضعة للمساءلة.",
    },
    ("governance", "enlightenment"): {
        "en": "The political achievements of the Enlightenment: Locke's limited government, Montesquieu's separation of powers, Rousseau's popular sovereignty—the skeleton of modern democracy. Governance's legitimacy comes from citizens' consent; power must be checkable and rotate.",
        "fr": "Les acquis politiques des Lumières : le gouvernement limité de Locke, la séparation des pouvoirs de Montesquieu, la souveraineté populaire de Rousseau — la structure de la démocratie moderne. La légitimité du gouvernement vient du consentement des citoyens ; le pouvoir doit être équilibré et alterner.",
        "es": "Los logros políticos de la Ilustración: el gobierno limitado de Locke, la separación de poderes de Montesquieu, la soberanía popular de Rousseau: el esqueleto de la democracia moderna. La legitimidad del gobierno nace del consentimiento ciudadano; el poder debe ser controlable y rotativo.",
        "ar": "المكاسب السياسية للتنوير: حكومة لوك المحدودة، وفصل السلطات عند مونتسكيو، والسيادة الشعبية عند روسو — هيكل الديمقراطية الحديثة. شرعية الحكم تأتي من موافقة المواطنين؛ والسلطة يجب أن تكون قابلة للضبط والتداول.",
    },
    ("governance", "kantian"): {
        "en": "Kant's \"publicity principle\": a policy is unjust if it cannot be made public—if it would fail the moment it were disclosed. This is the philosophical source of modern transparent governance, anti-corruption, and open information. Governance's legitimacy rests on what can be publicly justified.",
        "fr": "Le « principe de publicité » kantien : une politique est injuste si elle ne peut être rendue publique — si elle échouerait dès qu'on la divulgue. Source philosophique de la gouvernance transparente, de la lutte anticorruption et de l'ouverture de l'information. La légitimité repose sur ce qui peut être justifié publiquement.",
        "es": "El «principio de publicidad» kantiano: una política es injusta si no puede hacerse pública —si fracasara en cuanto se divulgara. Es la fuente filosófica de la gobernanza transparente, la anticorrupción y la apertura informativa. La legitimidad descansa en lo que puede justificarse públicamente.",
        "ar": "«مبدأ العلانية» الكانطي: السياسة غير عادلة إذا تعذّر إشهارها —إذا كانت ستفشل لحظة إعلانها. إنه المصدر الفلسفي للحكم الشفاف ومكافحة الفساد وحرية المعلومات. تقوم الشرعية على ما يمكن تبريره علنًا.",
    },
    ("governance", "buddhist"): {
        "en": "Though Buddhism does not directly discuss regimes, Ashoka's \"rule of Dharma\" (Dharma Vijaya) in the Mauryan Empire and Bhutan's \"Gross National Happiness\" (GNH) offer another path: governance's goal is to reduce beings' suffering; power is a tool, not an end.",
        "fr": "Sans traiter directement des régimes, le « règne du Dharma » d'Ashoka (Dharma Vijaya) dans l'empire maurya et le « Bonheur national brut » du Bhoutan offrent une autre voie : le but du gouvernement est de réduire la souffrance des êtres ; le pouvoir est un outil, non une fin.",
        "es": "Aunque no trate directamente de regímenes, el «gobierno del Dharma» de Ashoka (Dharma Vijaya) en el Imperio maurya y la «Felicidad Nacional Bruta» de Bután ofrecen otro camino: la meta del gobierno es reducir el sufrimiento de los seres; el poder es una herramienta, no un fin.",
        "ar": "رغم أن البوذية لا تتناول أنظمة الحكم مباشرة، فإن «حكم الدارما» لأشوكا (دارما فيجايا) في إمبراطورية ماوريا و«السعادة الوطنية الإجمالية» في بوتان تقدم مسارًا آخر: هدف الحكم تقليل معاناة الكائنات؛ والسلطة أداة لا غاية.",
    },
}


def _fill_missing(field: dict, values: dict) -> int:
    n = 0
    for lang, text in values.items():
        if not field.get(lang):
            field[lang] = text
            n += 1
    return n


def apply_lang_pack(db: Session) -> None:
    n_topic = 0
    for t in db.execute(select(Topic)).scalars():
        names = TOPIC_NAMES.get(t.id)
        if names:
            t.name_i18n = t.name_i18n or {}
            n_topic += _fill_missing(t.name_i18n, names)
            flag_modified(t, "name_i18n")
        descs = TOPIC_DESC.get(t.id)
        if descs:
            t.description = t.description or {}
            n_topic += _fill_missing(t.description, descs)
            flag_modified(t, "description")

    n_view = 0
    for v in db.execute(select(CrossCivView)).scalars():
        civ = CIV_LABELS.get(v.civilization)
        if civ:
            v.civ_label_i18n = v.civ_label_i18n or {}
            n_view += _fill_missing(v.civ_label_i18n, civ)
            flag_modified(v, "civ_label_i18n")
        details = VIEW_DETAILS.get((v.topic_id, v.civilization))
        if details:
            v.detail = v.detail or {}
            n_view += _fill_missing(v.detail, details)
            flag_modified(v, "detail")

    db.commit()
    if n_topic or n_view:
        print(f"[seed_lang_pack] filled {n_topic} topic + {n_view} view translations.")
