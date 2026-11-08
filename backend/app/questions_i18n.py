# -*- coding: utf-8 -*-
"""案例问题库五语译文(en/fr/es/ar)+ 语境模板/标签五语表。

供 generate_cases 填充 question_i18n,供 routers/cases 本地化标题与语境标签。
译文按母语习惯直译;专名(ESG/AGI/VR/Deepfake)保留原形。
"""

# 每议题: zh 问题 -> (en, fr, es, ar)
QUESTIONS_I18N: dict[str, dict[str, tuple[str, str, str, str]]] = {
    "climate": {
        "如何应对全球气候变化？": (
            "How should we respond to global climate change?",
            "Comment faire face au changement climatique mondial ?",
            "¿Cómo afrontar el cambio climático global?",
            "كيف يمكننا التصدي لتغير المناخ العالمي؟"),
        "发达国家与发展中国家在减排上的责任如何划分？": (
            "How should responsibility for emission cuts be divided between developed and developing countries?",
            "Comment répartir l'effort de réduction des émissions entre pays développés et en développement ?",
            "¿Cómo repartir la responsabilidad de reducir emisiones entre países desarrollados y en desarrollo?",
            "كيف ينبغي تقاسم مسؤولية خفض الانبعاثات بين الدول المتقدمة والنامية؟"),
        "碳中和目标是否会牺牲穷人的发展权？": (
            "Does the carbon-neutral goal sacrifice the poor's right to development?",
            "La neutralité carbone sacrifie-t-elle le droit au développement des plus pauvres ?",
            "¿La neutralidad de carbono sacrifica el derecho al desarrollo de los pobres?",
            "هل يضحي هدف الحياد الكربوني بحق الفقراء في التنمية؟"),
        "个人应当承担怎样的气候责任？": (
            "What climate responsibilities should individuals bear?",
            "Quelles responsabilités climatiques les individus doivent-ils assumer ?",
            "¿Qué responsabilidades climáticas deben asumir los individuos?",
            "ما المسؤوليات المناخية التي يتحملها الأفراد؟"),
        "气候难民应如何在国际伦理上被对待？": (
            "How should climate refugees be treated under international ethics?",
            "Comment les réfugiés climatiques devraient-ils être traités en éthique internationale ?",
            "¿Cómo deberían tratarse los refugiados climáticos según la ética internacional?",
            "كيف ينبغي معاملة اللاجئين المناخيين وفق الأخلاقيات الدولية؟"),
        "极端气候事件下，富国是否有义务援助？": (
            "Are rich countries obliged to help after extreme climate events?",
            "Les pays riches ont-ils le devoir d'aider après des événements climatiques extrêmes ?",
            "¿Tienen los países ricos la obligación de ayudar tras eventos climáticos extremos?",
            "هل يلزم الدول الغنية بتقديم العون بعد الأحداث المناخية المتطرفة؟"),
        "为后代留下宜居星球，是当代人的什么义务？": (
            "What duty do the living have to leave a livable planet to future generations?",
            "Quel devoir les vivants ont-ils de laisser une planète vivable aux générations futures ?",
            "¿Qué deber tiene la generación actual de dejar un planeta habitable a las futuras?",
            "ما واجب الأحياء في ترك كوكب صالح للعيش للأجيال القادمة؟"),
        "经济增长与生态保护之间能否调和？": (
            "Can economic growth be reconciled with ecological protection?",
            "Croissance économique et protection de l'écologie peuvent-elles se concilier ?",
            "¿Pueden conciliarse el crecimiento económico y la protección ecológica?",
            "هل يمكن التوفيق بين النمو الاقتصادي وحماية البيئة؟"),
        "碳税与碳排交易，是否真能达成正义？": (
            "Do carbon taxes and emissions trading really deliver justice?",
            "Taxe carbone et marchés du carbone atteignent-ils vraiment la justice ?",
            "¿Logran realmente la justicia los impuestos al carbono y el comercio de emisiones?",
            "هل تحقق ضرائب الكربون وتجارة الانبعاثات العدالة فعلاً؟"),
        "畜牧业排放与饮食方式，个体如何选择？": (
            "Given livestock emissions, how should individuals choose their diet?",
            "Face aux émissions de l'élevage, comment chacun devrait-il choisir son alimentation ?",
            "Dadas las emisiones ganaderas, ¿cómo debería elegir su dieta cada persona?",
            "في ضوء انبعاثات الثروة الحيوانية، كيف ينبغي للأفراد اختيار غذائهم؟"),
        "气候教育应纳入学校核心课程吗？": (
            "Should climate education be part of the core school curriculum?",
            "L'éducation au climat doit-elle entrer dans les programmes scolaires essentiels ?",
            "¿Debería la educación climática formar parte del currículo escolar básico?",
            "هل ينبغي إدراج التعليم المناخي في المناهج الدراسية الأساسية؟"),
        "企业 ESG 是真改变还是绿洗？": (
            "Is corporate ESG real change or greenwashing?",
            "L'ESG des entreprises : changement réel ou verdissage ?",
            "¿La ESG corporativa es cambio real o lavado verde?",
            "هل معايير ESG في الشركات تغيير حقيقي أم تبييض أخضر؟"),
        "面对气候焦虑，年轻人如何安顿身心？": (
            "How can young people find peace amid climate anxiety?",
            "Comment les jeunes peuvent-ils apaiser leur anxiété climatique ?",
            "¿Cómo pueden los jóvenes serenarse ante la ansiedad climática?",
            "كيف يمكن للشباب تهدئة قلقهم المناخي؟"),
        "国家公园与原住民权利如何平衡？": (
            "How should national parks be balanced with indigenous rights?",
            "Comment équilibrer parcs nationaux et droits des peuples autochtones ?",
            "¿Cómo equilibrar los parques nacionales con los derechos indígenas?",
            "كيف نوازن بين المنتزهات الوطنية وحقوق الشعوب الأصلية؟"),
        "技术解决方案（地球工程）的伦理边界？": (
            "What are the ethical limits of technological fixes such as geoengineering?",
            "Quelles sont les limites éthiques de solutions techniques comme la géo-ingénierie ?",
            "¿Cuáles son los límites éticos de soluciones técnicas como la geoingeniería?",
            "ما الحدود الأخلاقية للحلول التقنية كالهندسة الأرضية؟"),
        "化石燃料补贴是否应即刻取消？": (
            "Should fossil-fuel subsidies be abolished immediately?",
            "Les subventions aux énergies fossiles doivent-elles être supprimées immédiatement ?",
            "¿Deberían suprimirse de inmediato los subsidios a los combustibles fósiles?",
            "هل ينبغي إلغاء دعم الوقود الأحفوري فوراً؟"),
        "气候诉讼能否成为正义工具？": (
            "Can climate litigation become an instrument of justice?",
            "Le contentieux climatique peut-il devenir un instrument de justice ?",
            "¿Puede el litigio climático convertirse en un instrumento de justicia?",
            "هل يمكن أن تصبح الدعاوى المناخية أداة لتحقيق العدالة؟"),
        "森林、海洋等公共资源的全球治理框架？": (
            "What global governance framework should govern shared resources like forests and oceans?",
            "Quel cadre de gouvernance mondiale pour les biens communs que sont forêts et océans ?",
            "¿Qué marco de gobernanza global para recursos comunes como bosques y océanos?",
            "ما الإطار العالمي لحوكمة الموارد المشتركة كالغابات والمحيطات؟"),
        "气候难题中的代际正义如何理解？": (
            "How should intergenerational justice in the climate crisis be understood?",
            "Comment comprendre la justice intergénérationnelle dans la crise climatique ?",
            "¿Cómo entender la justicia intergeneracional en la crisis climática?",
            "كيف ينبغي فهم العدالة بين الأجيال في الأزمة المناخية؟"),
        "城市生活方式如何向低碳过渡？": (
            "How should urban lifestyles transition to low-carbon living?",
            "Comment les modes de vie urbains peuvent-ils passer au bas-carbone ?",
            "¿Cómo deberían los estilos de vida urbanos transitar hacia bajas emisiones?",
            "كيف تنتقل أنماط الحياة الحضرية إلى الانبعاثات المنخفضة؟"),
        "气候议题中宗教传统能贡献什么？": (
            "What can religious traditions contribute to the climate question?",
            "Que peuvent apporter les traditions religieuses à la question climatique ?",
            "¿Qué pueden aportar las tradiciones religiosas a la cuestión climática?",
            "ما الذي يمكن أن تقدمه التقاليد الدينية لقضية المناخ؟"),
        "极简主义生活是道德选择还是个人偏好？": (
            "Is minimalist living a moral choice or a personal preference?",
            "La vie minimaliste : choix moral ou simple préférence personnelle ?",
            "¿La vida minimalista es una elección moral o una preferencia personal?",
            "هل الحياة البسيطة اختيار أخلاقي أم تفضيل شخصي؟"),
        "可再生能源转型中，能源贫困如何避免？": (
            "How can energy poverty be avoided during the renewable-energy transition?",
            "Comment éviter la précarité énergétique durant la transition renouvelable ?",
            "¿Cómo evitar la pobreza energética durante la transición renovable?",
            "كيف نتجنب فقر الطاقة أثناء التحول إلى الطاقة المتجددة؟"),
        "海平面上升威胁的岛国，国际社会该如何回应？": (
            "How should the international community respond to island nations threatened by rising seas?",
            "Comment la communauté internationale doit-elle répondre aux États insulaires menacés par la montée des eaux ?",
            "¿Cómo debería responder la comunidad internacional a los Estados insulares amenazados por el aumento del mar?",
            "كيف ينبغي للمجتمع الدولي الاستجابة لجزر مهددة بارتفاع مستوى البحار؟"),
        "面对气候不平等，正义优先还是效率优先？": (
            "Facing climate inequality: justice first, or efficiency first?",
            "Face à l'inégalité climatique : la justice d'abord, ou l'efficacité d'abord ?",
            "Ante la desigualdad climática: ¿justicia primero o eficiencia primero?",
            "في مواجهة عدم المساواة المناخية: العدالة أولاً أم الكفاءة أولاً؟"),
    },
    "tech_ethics": {
        "AI 算法监控是否侵犯隐私？": (
            "Does AI-driven algorithmic surveillance violate privacy?",
            "La surveillance algorithmique par l'IA viole-t-elle la vie privée ?",
            "¿La vigilancia algorítmica de la IA invade la privacidad?",
            "هل تنتهك المراقبة الخوارزمية بالذكاء الاصطناعي الخصوصية؟"),
        "面部识别技术应被全面禁止吗？": (
            "Should facial recognition technology be banned outright?",
            "La technologie de reconnaissance faciale doit-elle être interdite totalement ?",
            "¿Debería prohibirse por completo la tecnología de reconocimiento facial?",
            "هل ينبغي حظر تقنية التعرف على الوجوه حظراً تاماً؟"),
        "生成式 AI 创作的版权归谁？": (
            "Who owns the copyright of works created by generative AI?",
            "À qui appartiennent les droits d'auteur des œuvres créées par l'IA générative ?",
            "¿A quién pertenecen los derechos de autor de las obras creadas por IA generativa?",
            "لمن تعود حقوق التأليف لأعمال الذكاء الاصطناعي التوليدي؟"),
        "AI 替代人类工作，社会该如何回应？": (
            "As AI replaces human work, how should society respond?",
            "Alors que l'IA remplace le travail humain, comment la société devrait-elle réagir ?",
            "Si la IA sustituye el trabajo humano, ¿cómo debería responder la sociedad?",
            "مع إحلال الذكاء الاصطناعي محل العمل البشري، كيف ينبغي أن تستجيب المجتمعات؟"),
        "基因编辑婴儿的伦理红线在哪里？": (
            "Where is the ethical red line for gene-edited babies?",
            "Où se trouve la ligne rouge éthique des bébés aux gènes édités ?",
            "¿Dónde está la línea roja ética de los bebés con genes editados?",
            "أين الخط الأخلاقي الأحمر لتعديل جينات الأطفال؟"),
        "脑机接口模糊了人机边界吗？": (
            "Do brain-computer interfaces blur the human-machine boundary?",
            "Les interfaces cerveau-machine estompent-elles la frontière entre humain et machine ?",
            "¿Difuminan las interfaces cerebro-computadora la frontera humano-máquina?",
            "هل تطمس واجهات الدماغ والحاسوب الحد الفاصل بين الإنسان والآلة؟"),
        "算法推荐如何避免极化与成瘾？": (
            "How can recommendation algorithms avoid polarization and addiction?",
            "Comment les algorithmes de recommandation peuvent-ils éviter polarisation et addiction ?",
            "¿Cómo pueden los algoritmos de recomendación evitar la polarización y la adicción?",
            "كيف يمكن لخوارزميات التوصية تجنب الاستقطاب والإدمان؟"),
        "自动驾驶事故的道德选择算法（电车难题）？": (
            "What moral algorithm should autonomous vehicles follow in crashes (the trolley problem)?",
            "Quel algorithme moral pour les accidents de voitures autonomes (le problème du tramway) ?",
            "¿Qué algoritmo moral deben seguir los vehículos autónomos en accidentes (el problema del tranvía)?",
            "ما الخوارزمية الأخلاقية لحوادث المركبات ذاتية القيادة (معضلة العربة)؟"),
        "AI 战争武器是否应被国际禁止？": (
            "Should AI weapons be banned internationally?",
            "Les armes dotées d'IA doivent-elles être interdites au niveau international ?",
            "¿Deberían prohibirse internacionalmente las armas con IA?",
            "هل ينبغي حظر أسلحة الذكاء الاصطناعي دولياً؟"),
        "数据是新的石油，还是新的人格延伸？": (
            "Is data the new oil, or a new extension of the person?",
            "La donnée est-elle le nouvel or, ou un nouveau prolongement de la personne ?",
            "¿Los datos son el nuevo petróleo o una nueva extensión de la persona?",
            "هل البيانات هي النفط الجديد أم امتداد جديد للشخصية؟"),
        "深度伪造（Deepfake）的法律与伦理治理？": (
            "How should deepfakes be governed legally and ethically?",
            "Comment encadrer juridiquement et éthiquement les deepfakes ?",
            "¿Cómo gobernar jurídica y éticamente los deepfakes?",
            "كيف ينبغي تنظيم التزييف العميق قانونياً وأخلاقياً؟"),
        "AI 陪伴能替代真实关系吗？": (
            "Can AI companionship replace real relationships?",
            "La compagnie offerte par l'IA peut-elle remplacer les relations réelles ?",
            "¿Puede el acompañamiento de la IA sustituir las relaciones reales?",
            "هل يمكن لرفقة الذكاء الاصطناعي أن تحل محل العلاقات الحقيقية؟"),
        "AGI（通用人工智能）的研究该不该减速？": (
            "Should research on AGI be slowed down?",
            "La recherche sur l'AGI devrait-elle ralentir ?",
            "¿Debería ralentizarse la investigación en IAG?",
            "هل ينبغي إبطاء البحث في الذكاء الاصطناعي العام؟"),
        "儿童的数字足迹应当如何保护？": (
            "How should children's digital footprints be protected?",
            "Comment protéger l'empreinte numérique des enfants ?",
            "¿Cómo debería protegerse la huella digital de los niños?",
            "كيف ينبغي حماية البصمة الرقمية للأطفال؟"),
        "智能合约能否替代法律？": (
            "Can smart contracts replace the law?",
            "Les contrats intelligents peuvent-ils remplacer la loi ?",
            "¿Pueden los contratos inteligentes sustituir a la ley?",
            "هل يمكن للعقود الذكية أن تحل محل القانون؟"),
        "AI 在医疗诊断中的责任归属？": (
            "Who is responsible when AI errs in medical diagnosis?",
            "Qui est responsable lorsque l'IA se trompe dans un diagnostic médical ?",
            "¿Quién es responsable cuando la IA se equivoca en el diagnóstico médico?",
            "من المسؤول عند أخطاء الذكاء الاصطناعي في التشخيص الطبي؟"),
        "技术鸿沟会加剧全球不平等吗？": (
            "Does the digital divide deepen global inequality?",
            "La fracture numérique aggrave-t-elle les inégalités mondiales ?",
            "¿La brecha tecnológica profundiza la desigualdad global?",
            "هل تعمق الفجوة التقنية عدم المساواة العالمية؟"),
        "VR/元宇宙对现实关系的影响？": (
            "How do VR and the metaverse affect real-world relationships?",
            "Quel effet de la VR et du métavers sur les relations réelles ?",
            "¿Qué efecto tienen la RV y el metaverso sobre las relaciones reales?",
            "ما تأثير الواقع الافتراضي والميتافيرس على العلاقات الواقعية؟"),
        "AI 招聘的偏见如何治理？": (
            "How should bias in AI hiring be governed?",
            "Comment gouverner les biais du recrutement par IA ?",
            "¿Cómo gobernar los sesgos en la contratación con IA?",
            "كيف ينبغي معالجة التحيز في التوظيف بالذكاء الاصطناعي؟"),
        "开源 AI 模型的双刃剑：自由与滥用？": (
            "Open-source AI models: freedom or abuse?",
            "Modèles d'IA open source : liberté ou abus ?",
            "Modelos de IA de código abierto: ¿libertad o abuso?",
            "نماذج الذكاء الاصطناعي مفتوحة المصدر: حرية أم إساءة؟"),
        "AI 对教育的影响：辅助还是替代？": (
            "AI in education: assistance or replacement?",
            "L'IA dans l'éducation : assistance ou remplacement ?",
            "La IA en la educación: ¿asistencia o sustitución?",
            "الذكاء الاصطناعي في التعليم: مساعدة أم إحلال؟"),
        "无人机送货与公共空间秩序？": (
            "Drone delivery and the order of public space?",
            "Livraison par drones et ordre de l'espace public ?",
            "Entrega con drones y orden del espacio público?",
            "التوصيل بالطائرات المسيّرة ونظام الفضاء العام؟"),
        "AI 拟人化设计是否欺骗用户？": (
            "Does anthropomorphic AI design deceive users?",
            "La conception anthropomorphique de l'IA trompe-t-elle les utilisateurs ?",
            "¿El diseño antropomórfico de la IA engaña a los usuarios?",
            "هل يخدع التصميم الإنسيالي للذكاء الاصطناعي المستخدمين؟"),
        "可解释性是 AI 的伦理底线吗？": (
            "Is explainability the ethical bottom line for AI?",
            "L'explicabilité est-elle la ligne éthique de base de l'IA ?",
            "¿Es la explicabilidad el límite ético de la IA?",
            "هل القابلية للتفسير هي الحد الأخلاقي الأدنى للذكاء الاصطناعي؟"),
        "国家在 AI 治理上该扮演什么角色？": (
            "What role should the state play in AI governance?",
            "Quel rôle l'État devrait-il jouer dans la gouvernance de l'IA ?",
            "¿Qué papel debería desempeñar el Estado en la gobernanza de la IA?",
            "ما الدور الذي ينبغي للدولة أن تلعبه في حوكمة الذكاء الاصطناعي؟"),
    },
    "social": {
        "面对城市无家可归者，社会的责任在哪？": (
            "What is society's responsibility toward the urban homeless?",
            "Quelle responsabilité de la société face aux sans-abri des villes ?",
            "¿Cuál es la responsabilidad de la sociedad ante las personas sin hogar?",
            "ما مسؤولية المجتمع تجاه المشردين في المدن؟"),
        "教育公平与精英教育能兼顾吗？": (
            "Can educational equity and elite education be reconciled?",
            "Équité éducative et éducation d'élite peuvent-elles se concilier ?",
            "¿Pueden conciliarse la equidad educativa y la educación de élite?",
            "هل يمكن التوفيق بين العدالة التعليمية وتعليم النخب؟"),
        "代际贫困如何打破？": (
            "How can intergenerational poverty be broken?",
            "Comment briser la pauvreté intergénérationnelle ?",
            "¿Cómo romper la pobreza intergeneracional?",
            "كيف يمكن كسر الفقر المتوارث بين الأجيال؟"),
        "富人是否应缴纳更高比例的税？": (
            "Should the rich pay a higher proportion of taxes?",
            "Les riches devraient-ils payer une part d'impôts plus élevée ?",
            "¿Deberían los ricos pagar una proporción más alta de impuestos?",
            "هل ينبغي للأغنياء دفع نسبة أعلى من الضرائب؟"),
        "公共健康危机中个人自由与集体责任的张力？": (
            "In a public-health crisis, how to weigh individual freedom against collective responsibility?",
            "En crise sanitaire, comment arbitrer entre liberté individuelle et responsabilité collective ?",
            "En crisis sanitaria, ¿cómo sopesar libertad individual y responsabilidad colectiva?",
            "في أزمة الصحة العامة، كيف نوازن بين الحرية الفردية والمسؤولية الجماعية؟"),
        "弱势群体的话语权如何保障？": (
            "How can vulnerable groups be guaranteed a voice?",
            "Comment garantir un droit de parole aux groupes vulnérables ?",
            "¿Cómo garantizar el derecho a la voz de los grupos vulnerables?",
            "كيف يمكن ضمان حق الفئات الضعيفة في التعبير؟"),
        "社会信任的修复路径？": (
            "How can social trust be repaired?",
            "Quelles voies pour réparer la confiance sociale ?",
            "¿Cómo reparar la confianza social?",
            "ما سبل إصلاح الثقة الاجتماعية؟"),
        "移民政策中开放与边界的伦理？": (
            "What is the ethics of openness and borders in migration policy?",
            "Quelle éthique de l'ouverture et des frontières dans la politique migratoire ?",
            "¿Cuál es la ética de la apertura y las fronteras en la política migratoria?",
            "ما أخلاقيات الانفتاح والحدود في سياسة الهجرة؟"),
        "性别平等的实质内涵是什么？": (
            "What is the substantive meaning of gender equality?",
            "Quel est le contenu substantiel de l'égalité des sexes ?",
            "¿Cuál es el contenido sustantivo de la igualdad de género?",
            "ما المضمون الحقيقي للمساواة بين الجنسين؟"),
        "残障人士的城市无障碍设计为何重要？": (
            "Why does accessible urban design matter for people with disabilities?",
            "Pourquoi la conception urbaine accessible est-elle essentielle pour les personnes handicapées ?",
            "¿Por qué importa el diseño urbano accesible para las personas con discapacidad?",
            "لماذا يهم التصميم العمراني الميسّر للأشخاص ذوي الإعاقة؟"),
        "邻里关系冷淡的现代社会该如何回暖？": (
            "How can neighborly warmth return in a cold modern society?",
            "Comment réchauffer le voisinage dans une société moderne distante ?",
            "¿Cómo devolver la calidez vecinal a una sociedad moderna fría?",
            "كيف يمكن إعادة الدفء للجوار في مجتمع بارد؟"),
        "志愿精神在内卷社会的价值？": (
            "What is the value of volunteering in a hyper-competitive society?",
            "Quelle valeur du bénévolat dans une société hyper-compétitive ?",
            "¿Cuál es el valor del voluntariado en una sociedad hipercompetitiva?",
            "ما قيمة العمل التطوعي في مجتمع التنافس المفرط؟"),
        "代际居住矛盾如何缓解？": (
            "How can intergenerational housing tensions be eased?",
            "Comment apaiser les tensions de logement entre générations ?",
            "¿Cómo aliviar las tensiones habitacionales entre generaciones?",
            "كيف يمكن تخفيف تناقضات السكن بين الأجيال؟"),
        "新就业形态下劳动者权益如何保障？": (
            "How can workers' rights be protected in new forms of employment?",
            "Comment protéger les droits des travailleurs des nouvelles formes d'emploi ?",
            "¿Cómo proteger los derechos laborales en las nuevas formas de empleo?",
            "كيف يمكن حماية حقوق العاملين في أشكال العمل الجديدة؟"),
        "面对网络暴力，社会该如何回应？": (
            "How should society respond to online harassment?",
            "Comment la société doit-elle répondre au harcèlement en ligne ?",
            "¿Cómo debería responder la sociedad al acoso en línea?",
            "كيف ينبغي للمجتمع الاستجابة للعنف الإلكتروني؟"),
        "公益慈善的边界在哪里？": (
            "Where are the boundaries of charity and philanthropy?",
            "Où sont les limites de la charité et du philanthropisme ?",
            "¿Dónde están los límites de la beneficencia y la filantropía?",
            "أين حدود العمل الخيري والإنساني؟"),
        "宗教团体在公共生活中的角色？": (
            "What role should religious groups play in public life?",
            "Quel rôle pour les groupes religieux dans la vie publique ?",
            "¿Qué papel deberían desempeñar los grupos religiosos en la vida pública?",
            "ما الدور الذي ينبغي للجماعات الدينية أن تلعبه في الحياة العامة؟"),
        "未成年人保护的当代挑战？": (
            "What are today's challenges in protecting minors?",
            "Quels défis contemporains pour la protection des mineurs ?",
            "¿Cuáles son los desafíos actuales de la protección de los menores?",
            "ما التحديات المعاصرة لحماية القاصرين؟"),
        "老龄化社会的代际契约？": (
            "What is the intergenerational contract in an aging society?",
            "Quel contrat intergénérationnel pour une société vieillissante ?",
            "¿Cuál es el contrato intergeneracional en una sociedad que envejece?",
            "ما العقد الاجتماعي بين الأجيال في مجتمع يشيخ؟"),
        "动物权利与人类利益如何平衡？": (
            "How should animal rights be balanced against human interests?",
            "Comment équilibrer droits des animaux et intérêts humains ?",
            "¿Cómo equilibrar los derechos de los animales con los intereses humanos?",
            "كيف نوازن بين حقوق الحيوان ومصالح البشر؟"),
        "公共空间的多元包容设计？": (
            "How should public space be designed for diversity and inclusion?",
            "Comment concevoir des espaces publics pluriels et inclusifs ?",
            "¿Cómo diseñar espacios públicos diversos e inclusivos?",
            "كيف ينبغي تصميم الفضاء العام للتنوع والشمول؟"),
        "传统社区在城市化中的命运？": (
            "What fate for traditional communities amid urbanization?",
            "Quel destin pour les communautés traditionnelles dans l'urbanisation ?",
            "¿Qué destino para las comunidades tradicionales ante la urbanización?",
            "ما مصير المجتمعات التقليدية في ظل التحضر؟"),
        "工作-生活平衡是奢侈品吗？": (
            "Is work-life balance a luxury?",
            "L'équilibre vie-travail est-il un luxe ?",
            "¿El equilibrio entre trabajo y vida es un lujo?",
            "هل توازن العمل والحياة رفاهية؟"),
        "失业者的尊严如何被守护？": (
            "How can the dignity of the unemployed be protected?",
            "Comment protéger la dignité des chômeurs ?",
            "¿Cómo proteger la dignidad de los desempleados?",
            "كيف يمكن حماية كرامة العاطلين عن العمل؟"),
        "面对自杀率上升，社会能做什么？": (
            "What can society do about rising suicide rates?",
            "Que peut faire la société face à la hausse des suicides ?",
            "¿Qué puede hacer la sociedad ante el aumento del suicidio?",
            "ما الذي يمكن للمجتمع فعله تجاه ارتفاع معدل الانتحار؟"),
    },
    "personal": {
        "面对内卷与焦虑，年轻人如何安顿？": (
            "How can young people settle themselves amid involution and anxiety?",
            "Comment les jeunes peuvent-ils se poser face à l'hyper-compétition et l'anxiété ?",
            "¿Cómo pueden los jóvenes estabilizarse ante la hipercompetencia y la ansiedad?",
            "كيف يمكن للشباب أن يستقرّوا وسط التنافس المفرط والقلق؟"),
        "「躺平」是消极逃避还是合理选择？": (
            "Is 'lying flat' passive escape or a reasonable choice?",
            "Se «coucher à plat » : fuite passive ou choix raisonnable ?",
            "«Acostarse»: ¿huida pasiva o elección razonable?",
            "«الاستلقاء»: هل هو هروب سلبي أم خيار معقول؟"),
        "自律真的能带来自由吗？": (
            "Does self-discipline really bring freedom?",
            "L'autodiscipline apporte-t-elle vraiment la liberté ?",
            "¿La autodisciplina trae realmente libertad?",
            "هل يجلب الانضباط الذاتي الحرية فعلاً؟"),
        "如何在不确定时代寻找意义？": (
            "How to search for meaning in an age of uncertainty?",
            "Comment chercher du sens à l'ère de l'incertitude ?",
            "¿Cómo buscar sentido en una era de incertidumbre?",
            "كيف نبحث عن المعنى في عصر عدم اليقين؟"),
        "孤独感盛行的时代，如何与自己相处？": (
            "In an age of loneliness, how does one live with oneself?",
            "À l'ère de la solitude, comment s'entendre avec soi-même ?",
            "En la era de la soledad, ¿cómo convivir con uno mismo?",
            "في عصر الوحدة، كيف يتعامل الإنسان مع نفسه؟"),
        "屏幕成瘾如何对治？": (
            "How can screen addiction be treated?",
            "Comment traiter l'addiction aux écrans ?",
            "¿Cómo tratar la adicción a las pantallas?",
            "كيف يعالج إدمان الشاشات؟"),
        "完美主义陷阱如何走出？": (
            "How does one escape the perfectionist trap?",
            "Comment sortir du piège perfectionniste ?",
            "¿Cómo salir de la trampa perfeccionista?",
            "كيف يمكن الخروج من فخ الكمالية؟"),
        "面对失败，如何复原？": (
            "How does one recover from failure?",
            "Comment se remettre de l'échec ?",
            "¿Cómo recuperarse del fracaso?",
            "كيف يتعافى الإنسان من الفشل؟"),
        "情绪管理的儒家智慧？": (
            "What is the Confucian wisdom of managing emotions?",
            "Quelle sagesse confucéenne pour gouverner les émotions ?",
            "¿Cuál es la sabiduría confuciana para gestionar las emociones?",
            "ما الحكمة الكونفوشيوسية لإدارة المشاعر؟"),
        "如何在父母期待与个人理想间取舍？": (
            "How to choose between parental expectations and personal ideals?",
            "Comment arbitrer entre attentes parentales et idéaux personnels ?",
            "¿Cómo elegir entre las expectativas de los padres y los ideales personales?",
            "كيف نختار بين توقعات الوالدين والمثالية الشخصية؟"),
        "事业与家庭如何抉择？": (
            "How does one choose between career and family?",
            "Comment choisir entre carrière et famille ?",
            "¿Cómo elegir entre carrera y familia?",
            "كيف نختار بين المسار المهني والأسرة؟"),
        "中年危机怎么过？": (
            "How does one get through the midlife crisis?",
            "Comment traverser la crise du milieu de vie ?",
            "¿Cómo atravesar la crisis de la mediana edad?",
            "كيف يعبر الإنسان أزمة منتصف العمر؟"),
        "晚成型人生的合法性？": (
            "Is a late-blooming life legitimate?",
            "Une vie tardive est-elle légitime ?",
            "¿Es legítima una vida de floración tardía?",
            "هل للحياة المتأخرة الإزهار شرعية؟"),
        "如何培养终身学习的习惯？": (
            "How does one cultivate the habit of lifelong learning?",
            "Comment cultiver l'habitude d'apprendre toute sa vie ?",
            "¿Cómo cultivar el hábito del aprendizaje permanente?",
            "كيف ننمّي عادة التعلم مدى الحياة؟"),
        "数字断舍离的实践？": (
            "How does one practice digital decluttering?",
            "Comment pratiquer le désencombrement numérique ?",
            "¿Cómo practicar la desintoxicación digital?",
            "كيف نمارس التخلي الرقمي؟"),
        "比较心如何对治？": (
            "How does one overcome the habit of comparing oneself?",
            "Comment soigner le réflexe de la comparaison ?",
            "¿Cómo superar la costumbre de compararse?",
            "كيف يعالج عادة المقارنة بالنفس؟"),
        "「卷不动也躺不平」如何破局？": (
            "When one can neither keep competing nor lie flat, what is the way out?",
            "Ni compétition possible ni repos : quelle sortie ?",
            "Cuando no puedes competir ni rendirte, ¿cuál es la salida?",
            "حين يعجز الإنسان عن المنافسة وعن الاستلقاء، ما مخرجه؟"),
        "找到真正的天命（Calling）的路径？": (
            "What is the path to finding one's true calling?",
            "Quel chemin vers sa véritable vocation ?",
            "¿Cuál es el camino hacia la verdadera vocación?",
            "ما الطريق إلى إيجاد الدعوة الحقيقية؟"),
        "面对死亡焦虑的安顿？": (
            "How does one find peace in the face of death anxiety?",
            "Comment s'apaiser face à l'angoisse de la mort ?",
            "¿Cómo encontrar serenidad ante la ansiedad ante la muerte?",
            "كيف يجد الإنسان سكينته تجاه قلق الموت؟"),
        "亲密关系中的自我边界？": (
            "What are healthy self-boundaries in intimate relationships?",
            "Quelles limites de soi dans les relations intimes ?",
            "¿Cuáles son los límites sanos del yo en las relaciones íntimas?",
            "ما حدود الذات الصحية في العلاقات الحميمة؟"),
        "财富与幸福的真实关系？": (
            "What is the real relationship between wealth and happiness?",
            "Quelle relation réelle entre richesse et bonheur ?",
            "¿Cuál es la relación real entre riqueza y felicidad?",
            "ما العلاقة الحقيقية بين الثروة والسعادة؟"),
        "如何理解「做自己」这件事？": (
            "How should 'being yourself' be understood?",
            "Comment comprendre le fait d'« être soi-même » ?",
            "¿Cómo entender «ser uno mismo»?",
            "كيف ينبغي فهم «أن تكون نفسك»؟"),
        "I 人在外向社会的生存策略？": (
            "What are survival strategies for introverts in an extroverted society?",
            "Quelles stratégies pour les introvertis dans une société d'extravertis ?",
            "¿Qué estrategias de supervivencia tienen los introvertidos en una sociedad extrovertida?",
            "ما استراتيجيات البقاء للانطوائيين في مجتمع انبساطي؟"),
        "正念冥想对当代年轻人的价值？": (
            "What is the value of mindfulness meditation for today's youth?",
            "Quelle valeur de la méditation de pleine conscience pour la jeunesse d'aujourd'hui ?",
            "¿Cuál es el valor de la meditación mindfulness para los jóvenes actuales?",
            "ما قيمة التأمل الواعي لشباب العصر الحاضر؟"),
        "如何与「过去的我」和解？": (
            "How does one reconcile with one's past self?",
            "Comment se réconcilier avec son passé ?",
            "¿Cómo reconciliarse con el yo del pasado?",
            "كيف يتصالح الإنسان مع ذاته في الماضي؟"),
    },
    "governance": {
        "如何评价理想的政府？": (
            "How should the ideal government be evaluated?",
            "Comment évaluer le gouvernement idéal ?",
            "¿Cómo evaluar el gobierno ideal?",
            "كيف ينبغي تقييم الحكومة المثالية؟"),
        "腐败治理的根本路径？": (
            "What is the fundamental path to fighting corruption?",
            "Quelle est la voie fondamentale contre la corruption ?",
            "¿Cuál es el camino fundamental contra la corrupción?",
            "ما المسار الجذري لمحاربة الفساد؟"),
        "民主与法治的关系？": (
            "What is the relationship between democracy and the rule of law?",
            "Quelle relation entre démocratie et État de droit ?",
            "¿Cuál es la relación entre democracia y estado de derecho?",
            "ما العلاقة بين الديمقراطية وسيادة القانون؟"),
        "公共政策中专家与民意如何平衡？": (
            "In public policy, how should expert judgment and popular will be balanced?",
            "Dans les politiques publiques, comment équilibrer experts et opinion populaire ?",
            "En política pública, ¿cómo equilibrar expertos y voluntad popular?",
            "في السياسات العامة، كيف نوازن بين الخبراء والإرادة الشعبية؟"),
        "选举制度的优劣比较？": (
            "How do different electoral systems compare?",
            "Comment comparer les mérites des systèmes électoraux ?",
            "¿Cómo comparar los méritos de los sistemas electorales?",
            "كيف نقارن مزايا الأنظمة الانتخابية؟"),
        "权力监督的有效机制？": (
            "What are effective mechanisms for overseeing power?",
            "Quels mécanismes efficaces pour contrôler le pouvoir ?",
            "¿Cuáles son los mecanismos eficaces para supervisar el poder?",
            "ما الآليات الفعالة لمراقبة السلطة؟"),
        "政府透明度的边界？": (
            "Where are the limits of government transparency?",
            "Où sont les limites de la transparence gouvernementale ?",
            "¿Dónde están los límites de la transparencia gubernamental?",
            "ما حدود شفافية الحكومة؟"),
        "公共财政如何回应贫富分化？": (
            "How should public finance respond to the wealth gap?",
            "Comment la finance publique doit-elle répondre à la polarisation des richesses ?",
            "¿Cómo debería responder la hacienda pública a la polarización de la riqueza?",
            "كيف تستجيب المالية العامة للانقسام بين الغنى والفقر؟"),
        "应急治理中的常态与例外？": (
            "What is the place of normality and exception in emergency governance?",
            "Normalité et exception dans la gouvernance d'urgence ?",
            "¿Qué lugar ocupan la normalidad y la excepción en la gobernanza de emergencias?",
            "ما مكانة القاعدة والاستثناء في حوكمة الطوارئ؟"),
        "数字政府的潜力与陷阱？": (
            "What are the potentials and pitfalls of digital government?",
            "Quels potentiels et pièges pour le gouvernement numérique ?",
            "¿Cuáles son el potencial y las trampas del gobierno digital?",
            "ما إمكانات الحكومة الرقمية ومزالقه؟"),
        "地方自治与中央协调？": (
            "How should local autonomy and central coordination be balanced?",
            "Comment équilibrer autonomie locale et coordination centrale ?",
            "¿Cómo equilibrar la autonomía local y la coordinación central?",
            "كيف نوازن بين الحكم المحلي والتنسيق المركزي؟"),
        "公民参与政策制定的可能性？": (
            "What are the possibilities of citizen participation in policymaking?",
            "Quelles possibilités de participation citoyenne à l'élaboration des politiques ?",
            "¿Qué posibilidades de participación ciudadana en la elaboración de políticas?",
            "ما إمكانات مشاركة المواطنين في صياغة السياسات؟"),
        "媒体在治理中的角色？": (
            "What role should the media play in governance?",
            "Quel rôle pour les médias dans la gouvernance ?",
            "¿Qué papel deberían desempeñar los medios en la gobernanza?",
            "ما الدور الذي ينبغي للإعلام أن تلعبه في الحوكمة؟"),
        "政治极化如何缓解？": (
            "How can political polarization be eased?",
            "Comment atténuer la polarisation politique ?",
            "¿Cómo mitigar la polarización política?",
            "كيف يمكن تخفيف الاستقطاب السياسي؟"),
        "国际治理中的主权与全球公益？": (
            "How should sovereignty and global public goods be weighed in international governance?",
            "Comment arbitrer souveraineté et bien public mondial dans la gouvernance internationale ?",
            "¿Cómo sopesar soberanía y bien público global en la gobernanza internacional?",
            "كيف نوازن بين السيادة والمصلحة العامة العالمية في الحوكمة الدولية؟"),
        "政府对宗教的中立性应到何种程度？": (
            "To what extent should the state be neutral toward religion?",
            "Jusqu'où l'État doit-il être neutre à l'égard de la religion ?",
            "¿Hasta qué punto debería el Estado ser neutral frente a la religión?",
            "إلى أي مدى ينبغي للدولة أن تكون محايدة تجاه الدين؟"),
        "公务员伦理的现代意涵？": (
            "What does public-service ethics mean today?",
            "Que signifie aujourd'hui l'éthique du fonctionnaire ?",
            "¿Qué significa hoy la ética del servidor público?",
            "ما المقصود اليوم بأخلاقيات الموظف العام؟"),
        "代际正义在政策中如何体现？": (
            "How should intergenerational justice be embodied in policy?",
            "Comment incarner la justice intergénérationnelle dans les politiques ?",
            "¿Cómo encarnar la justicia intergeneracional en las políticas?",
            "كيف تتجسد العدالة بين الأجيال في السياسات؟"),
        "民族认同与多元包容的张力？": (
            "What is the tension between national identity and pluralist inclusion?",
            "Quelle tension entre identité nationale et inclusion pluraliste ?",
            "¿Cuál es la tensión entre identidad nacional e inclusión pluralista?",
            "ما التوتر بين الهوية القومية والشمول التعددي؟"),
        "革命与改良的伦理评估？": (
            "How should revolution and reform be judged ethically?",
            "Comment juger éthiquement révolution et réforme ?",
            "¿Cómo evaluar éticamente revolución y reforma?",
            "كيف ينبغي التقييم الأخلاقي للثورة والإصلاح؟"),
        "面对民粹主义浪潮，治理怎么办？": (
            "How should governance respond to the wave of populism?",
            "Face à la vague populiste, que doit faire la gouvernance ?",
            "Ante la ola populista, ¿qué debe hacer la gobernanza?",
            "في مواجهة موجة الشعبوية، ماذا ينبغي أن تفعل الحوكمة؟"),
        "战争与和平的政治哲学反思？": (
            "What is the political-philosophical reflection on war and peace?",
            "Quelle réflexion philosophico-politique sur la guerre et la paix ?",
            "¿Qué reflexión filosófico-política sobre la guerra y la paz?",
            "ما التأمل الفلسفي السياسي حول الحرب والسلام؟"),
        "公益诉讼与公民社会？": (
            "What is the place of public-interest litigation in civil society?",
            "Quelle place pour le contentieux d'intérêt public dans la société civile ?",
            "¿Qué lugar ocupa el litigio de interés público en la sociedad civil?",
            "ما مكانة الدعاوى المصلحية في المجتمع المدني؟"),
        "气候议题如何嵌入国家治理框架？": (
            "How should the climate question be embedded in national governance?",
            "Comment intégrer la question climatique dans la gouvernance nationale ?",
            "¿Cómo integrar la cuestión climática en la gobernanza nacional?",
            "كيف تُدمج قضية المناخ في الإطار الحوكمي الوطني؟"),
        "AI 时代的治理新课题？": (
            "What are the new governance questions of the AI era?",
            "Quelles nouvelles questions de gouvernance à l'ère de l'IA ?",
            "¿Cuáles son las nuevas cuestiones de gobernanza en la era de la IA?",
            "ما القضايا الحوكمية الجديدة في عصر الذكاء الاصطناعي؟"),
    },
}

# 语境模板五语(与 ANGLES 对应; {q} 为问题译文占位)
ANGLE_TEMPLATES_I18N: list[dict[str, str]] = [
    {"en": "{q}", "fr": "{q}", "es": "{q}", "ar": "{q}"},
    {"en": "{q}", "fr": "{q}", "es": "{q}", "ar": "{q}"},
    {
        "en": "To guide a classroom discussion: {q}",
        "fr": "Pour mener une discussion en classe : {q}",
        "es": "Para guiar un debate en clase: {q}",
        "ar": "لتوجيه نقاش في الصف: {q}",
    },
    {
        "en": "Explain to a Western interlocutor unfamiliar with Confucianism: {q}",
        "fr": "Expliquer à un interlocuteur occidental peu familier du confucianisme : {q}",
        "es": "Explicar a un interlocutor occidental poco familiarizado con el confucianismo: {q}",
        "ar": "اشرح لخصم غربي غير ملم بالكونفوشيوسية: {q}",
    },
    {
        "en": "When I face a concrete choice: {q}",
        "fr": "Face à un choix concret : {q}",
        "es": "Ante una elección concreta: {q}",
        "ar": "عندما أواجه خياراً ملموساً: {q}",
    },
]

# 语境标签五语(与 ANGLES 顺序一致, 供路由本地化 tags)
ANGLE_LABELS_I18N: list[dict[str, str]] = [
    {"en": "General intro", "fr": "Intro générale", "es": "Introducción general", "ar": "مدخل عام"},
    {"en": "Scholar's lens", "fr": "Regard du chercheur", "es": "Mirada académica", "ar": "منظار الباحث"},
    {"en": "Classroom", "fr": "En classe", "es": "En el aula", "ar": "في الصف"},
    {"en": "Cross-cultural", "fr": "Interculturel", "es": "Intercultural", "ar": "عبر ثقافي"},
    {"en": "Real decision", "fr": "Décision réelle", "es": "Decisión real", "ar": "قرار واقعي"},
]

# zh 语境名 -> 五语标签(路由本地化 tags 用)
ANGLE_LABEL_BY_ZH: dict[str, dict[str, str]] = {
    "通识入门": ANGLE_LABELS_I18N[0],
    "学者视角": ANGLE_LABELS_I18N[1],
    "课堂教学": ANGLE_LABELS_I18N[2],
    "跨文化沟通": ANGLE_LABELS_I18N[3],
    "现实抉择": ANGLE_LABELS_I18N[4],
}
