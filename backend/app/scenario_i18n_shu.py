"""书艺（shu）卡片文案的多语数据。

被 `seed_scenario_i18n.py` 导入。书艺是六个艺中译文量最大的一个
（30 张卡 × 210 条源文本 = 840 条译文），故单列成数据模块，
与项目既有的 `seed_shu_cards.py` 分文件风格一致。

## 结构

```python
{
  "<汉字 char>": {                    # ← 以汉字本身为键（唯一，且是身份）
      "benyi": {lang: 译文},          # 本义
      "jinyi": {lang: 译文},          # 今义
      "story": {lang: 译文},          # 字源故事
      "options": {                    # 选项，存 options_i18n 列
          "A": {"text": {lang: 译文}},  # ← 以 ASCII 选项 key 为键（身份，不译）
          ...
      },
  },
  ...
}
```

## 刻意不译的两类字段

1. **`char`（汉字本身）** —— 卡片要教的就是这个字，它是**被学习对象**，
   不是可翻译的界面文案。与 `JourneyTrail` 的六艺字形徽记同理。
2. **`components`（如「亻+二」）** —— 字的**构造部件**，同样是学习对象。
   与 `shu/assemble` 的 `PARTS` 部件库同理（那里已注明「刻意保留」）。

`pinyin` 本就是拉丁转写，无需翻译。

## 六书术语的译法

`method`（象形/指事/会意/形声/转注/假借）是**汉文字学的标准术语**，
英文有公认对应（pictographic / indicative / compound ideograph / phono-semantic /
reciprocal gloss / phonetic loan），故按标准术语翻译，不做音译。
"""
from __future__ import annotations

SHU_CARD_I18N: dict[str, dict] = {
    "仁": {
        "benyi": {
            "en": "The love and respect owed between two people in their dealings",
            "fr": "L'amour et le respect dus entre deux personnes dans leurs rapports",
            "es": "El amor y el respeto que se deben dos personas en su trato",
            "ar": "المحبة والاحترام الواجبان بين شخصين في تعاملهما",
        },
        "jinyi": {
            "en": "Benevolence, compassion, magnanimity",
            "fr": "Bienveillance, compassion, magnanimité",
            "es": "Benevolencia, compasión, magnanimidad",
            "ar": "الإحسان والرحمة وسعة الصدر",
        },
        "story": {
            "en": "\"Ren\" is written with \"person\" and \"two\"; in bronze script it looks like two people standing side by side. The ancients held that one living alone has no occasion for ren: only when people deal with one another does that heart of mutual care count as ren. Mencius said, \"Ren is the human heart\" — ren is not an external rule but the innate virtue of the human heart.",
            "fr": "« Ren » s'écrit avec « homme » et « deux » ; en écriture sur bronze, il figure deux personnes côte à côte. Les anciens tenaient qu'un homme vivant seul n'a pas matière à ren : c'est seulement dans les rapports entre personnes que ce cœur de sollicitude mutuelle est ren. Mencius a dit : « Ren, c'est le cœur de l'homme » — ren n'est pas une règle extérieure, mais la vertu innée du cœur humain.",
            "es": "«Ren» se escribe con «persona» y «dos»; en escritura de bronce figura dos personas lado a lado. Los antiguos sostenían que quien vive solo no tiene ocasión de ren: solo en el trato entre personas ese corazón de mutuo cuidado es ren. Mencio dijo: «Ren es el corazón del hombre» — ren no es una norma externa, sino la virtud innata del corazón humano.",
            "ar": "«رِن» تُكتب بـ«إنسان» و«اثنان»، وفي كتابة البرونز تمثّل شخصين يقفان جنبًا إلى جنب. ورأى القدماء أن المنفرد وحده لا محلّ له من رِن؛ فحين يتعامل الناس فيما بينهم يصير ذلك القلب المتعاهد رِن. قال منسيوس: «رِن قلب الإنسان» — فهي ليست قاعدة خارجية بل فضيلة القلب الإنساني الفطرية.",
        },
        "options": {
            "A": {"text": {
                "en": "The serenity of being alone",
                "fr": "La quiétude de la solitude",
                "es": "La serenidad de la soledad",
                "ar": "صفاء الخلوة",
            }},
            "B": {"text": {
                "en": "The love and respect owed between two people",
                "fr": "L'amour et le respect dus entre deux personnes",
                "es": "El amor y el respeto que se deben dos personas",
                "ar": "المحبة والاحترام بين شخصين",
            }},
            "C": {"text": {
                "en": "The arts by which a ruler governs the people",
                "fr": "Les artifices par lesquels un souverain gouverne le peuple",
                "es": "Las artes con que un soberano gobierna al pueblo",
                "ar": "فنون الحاكم في تسيير الرعية",
            }},
            "D": {"text": {
                "en": "Reverence during sacrifice",
                "fr": "La révérence durant le sacrifice",
                "es": "La reverencia durante el sacrificio",
                "ar": "الخشوع في الطقوس",
            }},
        },
    },
    "义": {
        "benyi": {
            "en": "Fitting and proper; acting in accord with what is right",
            "fr": "Ce qui convient et se doit ; agir selon ce qui est juste",
            "es": "Lo conveniente y debido; obrar conforme a lo recto",
            "ar": "ما يليق وينبغي؛ والعمل وفق الصواب",
        },
        "jinyi": {
            "en": "Justice, moral rightness, loyalty among friends",
            "fr": "Justice, droiture morale, loyauté entre amis",
            "es": "Justicia, rectitud moral, lealtad entre amigos",
            "ar": "العدل والاستقامة والوفاء",
        },
        "story": {
            "en": "The traditional form of \"yi\" joins \"sheep\" and \"I\": the sheep was a sacrificial animal of good omen, \"I\" a weapon — together, \"I take up arms to guard the auspicious rite\". By extension it means acting fittingly, in accord with the right way. Mencius said, \"Yi is the straight road for man\".",
            "fr": "La forme traditionnelle de « yi » réunit « mouton » et « moi » : le mouton était une victime sacrificielle de bon augure, « moi » une arme — ensemble : « je prends les armes pour garder le rite propice ». Par extension, agir avec justesse, selon la voie droite. Mencius a dit : « Yi est le droit chemin de l'homme ».",
            "es": "La forma tradicional de «yi» une «oveja» y «yo»: la oveja era víctima propiciatoria de buen augurio, «yo» un arma; juntas: «tomo las armas para guardar el rito propicio». Por extensión, obrar con rectitud, conforme al camino recto. Mencio dijo: «Yi es el camino recto del hombre».",
            "ar": "الشكل التقليدي لـ«يي» يجمع «الخروف» و«أنا»: فالخروف قربان مبارك، و«أنا» سلاح؛ ومعًا: «أحمل السلاح حمايةً للطقس الميمون». ثم اتسع المعنى إلى العمل بما يليق وفق الطريق المستقيم. قال منسيوس: «يي طريق الإنسان المستقيم».",
        },
        "options": {
            "A": {"text": {
                "en": "Benefit and profit",
                "fr": "L'avantage et le profit",
                "es": "El beneficio y la ganancia",
                "ar": "المنفعة والمصلحة",
            }},
            "B": {"text": {
                "en": "What is fitting and due; acting in accord with the right way",
                "fr": "Ce qui convient et se doit ; agir selon la voie droite",
                "es": "Lo conveniente y debido; obrar conforme al camino recto",
                "ar": "ما يليق وينبغي؛ والعمل وفق الطريق المستقيم",
            }},
            "C": {"text": {
                "en": "Deep brotherly loyalty among sworn friends",
                "fr": "La loyauté fraternelle profonde entre amis jurés",
                "es": "La lealtad fraterna profunda entre amigos jurados",
                "ar": "الوفاء الأخوي العميق",
            }},
            "D": {"text": {
                "en": "Keeping one's word",
                "fr": "Tenir sa parole",
                "es": "Cumplir la palabra dada",
                "ar": "الوفاء بالوعد",
            }},
        },
    },
    "礼": {
        "benyi": {
            "en": "Ritual in sacrifice; by extension, the norms of human intercourse",
            "fr": "Le rituel du sacrifice ; par extension, les normes des relations humaines",
            "es": "El rito del sacrificio; por extensión, las normas del trato humano",
            "ar": "الطقس في القربان؛ ثم اتسع إلى آداب التعامل بين الناس",
        },
        "jinyi": {
            "en": "Courtesy, etiquette, ceremony",
            "fr": "Politesse, étiquette, cérémonie",
            "es": "Cortesía, etiqueta, ceremonia",
            "ar": "الأدب واللياقة والمراسم",
        },
        "story": {
            "en": "The traditional form of \"li\" joins \"altar\" and the vessel holding offerings (in oracle bone script, a stand bearing jade). Its original sense is sacrificial ritual. Confucius extended li from sacrifice to all the norms of human relations: \"Without learning li, one has no ground to stand on.\"",
            "fr": "La forme traditionnelle de « li » réunit l'autel et le vase des offrandes (en écriture ossécaille, un support portant du jade). Son sens premier est le rituel sacrificiel. Confucius étendit li du sacrifice à toutes les normes des relations humaines : « Sans apprendre li, on n'a pas où se tenir. »",
            "es": "La forma tradicional de «li» une el altar y el vaso de las ofrendas (en hueso oracular, un soporte con jade). Su sentido primero es el rito sacrificial. Confucio extendió li del sacrificio a todas las normas del trato humano: «Sin aprender li, uno no tiene donde afirmarse».",
            "ar": "الشكل التقليدي لـ«لي» يجمع المذبح وإناء القرابين (وفي كتابة العظام حاملٌ عليه يشم). ومعناه الأول الطقس القرباني. ثم وسّع كونفوشيوس لي من القربان إلى كل آداب التعامل: «من لا يتعلّم لي لا مقام له».",
        },
        "options": {
            "A": {"text": {
                "en": "The custom of giving gifts",
                "fr": "La coutume d'offrir des cadeaux",
                "es": "La costumbre de hacer regalos",
                "ar": "عادة الإهداء",
            }},
            "B": {"text": {
                "en": "The sovereign's edicts",
                "fr": "Les édits du souverain",
                "es": "Los edictos del soberano",
                "ar": "مراسيم الحاكم",
            }},
            "C": {"text": {
                "en": "Ritual in sacrifice; by extension, the norms of human relations",
                "fr": "Le rituel du sacrifice ; par extension, les normes des relations humaines",
                "es": "El rito del sacrificio; por extensión, las normas del trato humano",
                "ar": "الطقس في القربان؛ ثم آداب التعامل",
            }},
            "D": {"text": {
                "en": "Song-and-dance performance",
                "fr": "Spectacle de chant et de danse",
                "es": "Espectáculo de canto y danza",
                "ar": "عرض الغناء والرقص",
            }},
        },
    },
    "智": {
        "benyi": {
            "en": "The capacity to see things clearly and tell right from wrong",
            "fr": "La capacité de voir clair dans les choses et de distinguer le juste de l'injuste",
            "es": "La capacidad de ver claro en las cosas y distinguir el bien del mal",
            "ar": "القدرة على إبصار الأمور وتمييز الصواب من الخطأ",
        },
        "jinyi": {
            "en": "Wisdom, intelligence",
            "fr": "Sagesse, intelligence",
            "es": "Sabiduría, inteligencia",
            "ar": "الحكمة والذكاء",
        },
        "story": {
            "en": "\"Zhi\" was anciently written with the character for \"to know\", to which \"sun\" was added to convey clear discernment. Its original sense is the power to distinguish the principles of things. The Confucian \"zhi\" is not mere cleverness but the great wisdom that \"knows others\", \"knows words\" and \"knows fate\" — \"the wise are not perplexed\".",
            "fr": "« Zhi » s'écrivait anciennement avec le caractère « savoir », auquel on ajouta « soleil » pour marquer le discernement clair. Son sens premier est le pouvoir de discerner les principes des choses. Le « zhi » confucéen n'est pas une simple astuce, mais la grande sagesse qui « connaît les autres », « connaît les mots » et « connaît le destin » — « le sage ne s'égare pas ».",
            "es": "«Zhi» se escribía antiguamente con el carácter de «saber», al que se añadió «sol» para indicar claro discernimiento. Su sentido primero es la potencia de discernir los principios de las cosas. El «zhi» confuciano no es mera astucia, sino la gran sabiduría que «conoce a los demás», «conoce las palabras» y «conoce el destino»: «el sabio no se desconcierta».",
            "ar": "كانت «تشي» تُكتب قديمًا بحرف «العلم»، وأُضيف إليه «الشمس» للدلالة على الإبصار الواضح. ومعناها الأول قوة التمييز في حقائق الأمور. و«تشي» الكونفوشية ليست دهاءً صغيرًا، بل الحكمة الكبرى التي «تعرف الناس» و«تعرف القول» و«تعرف القدر» — «الحكيم لا يتحيّر».",
        },
        "options": {
            "A": {"text": {
                "en": "The capacity to see things clearly and tell right from wrong",
                "fr": "La capacité de voir clair et de distinguer le juste de l'injuste",
                "es": "La capacidad de ver claro y distinguir el bien del mal",
                "ar": "القدرة على إبصار الأمور وتمييز الصواب",
            }},
            "B": {"text": {
                "en": "A strong memory and wide learning",
                "fr": "Une mémoire forte et un vaste savoir",
                "es": "Memoria fuerte y amplio saber",
                "ar": "قوة الحفظ وسعة المعرفة",
            }},
            "C": {"text": {
                "en": "Eloquence and skill in argument",
                "fr": "L'éloquence et l'art de l'argumentation",
                "es": "Elocuencia y destreza en el debate",
                "ar": "الفصاحة وحسن الجدال",
            }},
            "D": {"text": {
                "en": "Statecraft and expedient cunning",
                "fr": "L'art de gouverner et la ruse opportuniste",
                "es": "La astucia política y el ardid",
                "ar": "المكيدة والدهاء",
            }},
        },
    },
    "信": {
        "benyi": {
            "en": "A person's word is xin — being as good as one's word",
            "fr": "La parole de l'homme est xin — tenir ce qu'on dit",
            "es": "La palabra del hombre es xin: cumplir lo que se dice",
            "ar": "قول المرء هو «شين» — أن يفي بما يقول",
        },
        "jinyi": {
            "en": "Credit, good faith, trust",
            "fr": "Crédit, bonne foi, confiance",
            "es": "Crédito, buena fe, confianza",
            "ar": "الاعتبار والصدق والثقة",
        },
        "story": {
            "en": "\"Xin\" joins \"person\" and \"speech\": when a person's words can be relied upon, that is xin. Confucius said, \"If a man has no xin, I do not know what he can amount to\" — if he cannot be believed, one hardly knows what he can do at all. Xin is the basic covenant of social relations.",
            "fr": "« Xin » réunit « homme » et « parole » : quand la parole d'un homme est fiable, c'est xin. Confucius a dit : « Si un homme manque de xin, je ne sais ce qu'il peut valoir » — s'il ne peut être cru, on ne sait guère ce qu'il peut faire. Xin est le pacte fondamental des relations sociales.",
            "es": "«Xin» une «persona» y «palabra»: cuando la palabra de alguien es fiable, eso es xin. Confucio dijo: «Si un hombre no tiene xin, no sé de qué puede valer»: si no se le puede creer, apenas se sabe qué puede lograr. Xin es el pacto básico de las relaciones sociales.",
            "ar": "«شين» تجمع «الإنسان» و«القول»: فإذا كان قول المرء موثوقًا فذلك شين. قال كونفوشيوس: «من لا شين له لا أدري ما يُعتدّ به» — فإن لم يُصدَّق فلا يُدرى ما يستطيع. وشين عقد العلاقات الاجتماعية الأساسي.",
        },
        "options": {
            "A": {"text": {
                "en": "Writing letters, correspondence",
                "fr": "Écrire des lettres, correspondre",
                "es": "Escribir cartas, correspondencia",
                "ar": "المراسلة",
            }},
            "B": {"text": {
                "en": "Religious faith",
                "fr": "La foi religieuse",
                "es": "La fe religiosa",
                "ar": "الإيمان الديني",
            }},
            "C": {"text": {
                "en": "Certainty, firm conviction",
                "fr": "La certitude, la conviction ferme",
                "es": "La certeza, la convicción firme",
                "ar": "اليقين والاعتقاد الجازم",
            }},
            "D": {"text": {
                "en": "A person's word is xin — being as good as one's word",
                "fr": "La parole de l'homme est xin — tenir ce qu'on dit",
                "es": "La palabra del hombre es xin: cumplir lo dicho",
                "ar": "قول المرء هو شين — الوفاء بالقول",
            }},
        },
    },
    "德": {
        "benyi": {
            "en": "The inner character of a straight heart and upright conduct, in accord with the great Way",
            "fr": "Le caractère intérieur d'un cœur droit et d'une conduite droite, en accord avec la grande Voie",
            "es": "El carácter interior de corazón recto y conducta recta, conforme al gran Camino",
            "ar": "الخُلُق الباطن لقلب مستقيم وسلوك قويم موافق للطريق الأكبر",
        },
        "jinyi": {
            "en": "Morality, virtue, kindness received",
            "fr": "Moralité, vertu, bienfait reçu",
            "es": "Moralidad, virtud, beneficio recibido",
            "ar": "الأخلاق والفضيلة والجميل",
        },
        "story": {
            "en": "\"De\" joins \"to walk\", \"straight\" and \"heart\": \"to walk with the heart made straight\". Its original sense is the character cultivated by an upright heart and correct conduct. The ancients prized de above talent — \"Virtue is the root; wealth is the branch.\"",
            "fr": "« De » réunit « marcher », « droit » et « cœur » : « marcher le cœur redressé ». Son sens premier est le caractère formé par un cœur droit et une conduite correcte. Les anciens prisaient de plus que le talent — « La vertu est la racine ; la richesse est la branche. »",
            "es": "«De» une «caminar», «recto» y «corazón»: «caminar con el corazón enderezado». Su sentido primero es el carácter formado por un corazón recto y una conducta correcta. Los antiguos apreciaban de más que el talento: «La virtud es la raíz; la riqueza, la rama».",
            "ar": "«دِه» تجمع «السير» و«الاستقامة» و«القلب»: «أن يسير وقد استقام قلبه». ومعناها الأول الخُلُق المتكوّن من استقامة القلب وصواب السلوك. وكان القدماء يقدّمون دِه على الموهبة — «الفضيلة أصل والمال فرع».",
        },
        "options": {
            "A": {"text": {
                "en": "Obtaining advantage or a favour",
                "fr": "Obtenir un avantage ou une faveur",
                "es": "Obtener una ventaja o un favor",
                "ar": "نيل المنفعة أو الجميل",
            }},
            "B": {"text": {
                "en": "The inner character of a straight heart and upright conduct, in accord with the great Way",
                "fr": "Le caractère intérieur d'un cœur droit et d'une conduite droite, en accord avec la grande Voie",
                "es": "El carácter interior de corazón y conducta rectos, conforme al gran Camino",
                "ar": "الخُلُق الباطن لقلب مستقيم وسلوك قويم موافق للطريق الأكبر",
            }},
            "C": {"text": {
                "en": "The laws of the state",
                "fr": "Les lois de l'État",
                "es": "Las leyes del Estado",
                "ar": "قوانين الدولة",
            }},
            "D": {"text": {
                "en": "Ancestral property handed down",
                "fr": "Le patrimoine transmis par les ancêtres",
                "es": "El patrimonio transmitido por los antepasados",
                "ar": "الميراث الموروث عن الأجداد",
            }},
        },
    },
    "孝": {
        "benyi": {
            "en": "A child bearing up / supporting the aged",
            "fr": "L'enfant portant / soutenant les vieillards",
            "es": "El hijo que carga con / sustenta a los mayores",
            "ar": "الولد يحمل / يعول المسنّين",
        },
        "jinyi": {
            "en": "Filial devotion, filial respect",
            "fr": "Piété filiale, respect filial",
            "es": "Piedad filial, respeto filial",
            "ar": "البِرّ بالوالدين",
        },
        "story": {
            "en": "\"Xiao\" is the aged (abbreviated) above and \"child\" below; in oracle bone script it shows a child supporting an elder. Its original sense is to provide for and respectfully serve one's parents. The Analects: \"Filial piety nowadays means merely being able to feed them\" — feeding alone is not enough; only with respect does it count as xiao.",
            "fr": "« Xiao » a « le vieillard » (abrégé) en haut et « l'enfant » en bas ; en écriture ossécaille, un enfant soutenant un aîné. Son sens premier : nourrir et servir respectueusement ses parents. Les Entretiens : « La piété filiale d'aujourd'hui, c'est pouvoir les nourrir » — nourrir ne suffit pas ; seul le respect fait le xiao.",
            "es": "«Xiao» tiene «el anciano» (abreviado) arriba y «hijo» abajo; en hueso oracular, un niño sosteniendo a un mayor. Su sentido primero: sustentar y servir con respeto a los padres. Las Analectas: «La piedad filial hoy es poder alimentarlos»: alimentar no basta; solo con respeto cuenta como xiao.",
            "ar": "«شياو» فيها «المسنّ» (مختصرة) في الأعلى و«الولد» في الأسفل؛ وفي كتابة العظام طفل يسند شيخًا. ومعناها الأول رعاية الوالدين وخدمتهما بإجلال. وفي المحاورات: «البِرّ اليوم أن تطعمهم» — والإطعام وحده لا يكفي، ولا يكون شياو إلا بالإجلال.",
        },
        "options": {
            "A": {"text": {
                "en": "Wearing mourning and keeping the mourning term",
                "fr": "Porter le deuil et observer la période de deuil",
                "es": "Vestir luto y guardar el tiempo de duelo",
                "ar": "لبس الحداد وإقامة مدّته",
            }},
            "B": {"text": {
                "en": "A child bearing up / supporting the aged",
                "fr": "L'enfant portant / soutenant les vieillards",
                "es": "El hijo que carga con / sustenta a los mayores",
                "ar": "الولد يحمل / يعول المسنّين",
            }},
            "C": {"text": {
                "en": "Carrying on the father's undertaking",
                "fr": "Poursuivre l'œuvre du père",
                "es": "Continuar la obra del padre",
                "ar": "متابعة عمل الآباء",
            }},
            "D": {"text": {
                "en": "Sacrificing to the ancestors",
                "fr": "Sacrifier aux ancêtres",
                "es": "Sacrificar a los antepasados",
                "ar": "تقديم القربان للأجداد",
            }},
        },
    },
    "悌": {
        "benyi": {
            "en": "Loving and respecting one's elder brothers",
            "fr": "Aimer et respecter ses frères aînés",
            "es": "Amar y respetar a los hermanos mayores",
            "ar": "محبة الأخ الأكبر وإجلاله",
        },
        "jinyi": {
            "en": "Harmony among brothers",
            "fr": "L'harmonie entre frères",
            "es": "La armonía entre hermanos",
            "ar": "وئام الإخوة",
        },
        "story": {
            "en": "\"Ti\" is \"heart\" with \"younger brother\", which also gives the sound. Its original sense is the younger brother's love and respect for the elder. Confucians pair it with xiao as \"xiao-ti\": serving parents with xiao, respecting elders with ti — the root of ren. \"Filial piety and brotherly respect — are they not the root of ren?\"",
            "fr": "« Ti » est « cœur » avec « frère cadet », qui donne aussi le son. Son sens premier : l'amour et le respect du cadet pour l'aîné. Les confucéens l'associent à xiao sous le nom de « xiao-ti » : servir ses parents par xiao, respecter ses aînés par ti — la racine de ren. « Piété filiale et respect fraternel, ne sont-ils pas la racine de ren ? »",
            "es": "«Ti» es «corazón» con «hermano menor», que da el sonido. Su sentido primero: el amor y respeto del menor al mayor. Los confucianos lo unen a xiao como «xiao-ti»: servir a los padres con xiao, respetar a los mayores con ti: la raíz de ren. «¿No son la piedad filial y el respeto fraterno la raíz de ren?»",
            "ar": "«تي» هي «القلب» مع «الأخ الأصغر» الذي يفيد الصوت أيضًا. ومعناها الأول محبة الأصغر للأكبر وإجلاله. ويقرنها الكونفوشيون بـ«شياو» في «شياو-تي»: برّ الوالدين بشياو وإجلال الأكبر بتي — وهما أصل رِن. «أوَليس البِرّ وإجلال الأخ الأكبر أصل رِن؟»",
        },
        "options": {
            "A": {"text": {
                "en": "Brothers dividing the household",
                "fr": "Les frères partageant le patrimoine",
                "es": "Los hermanos repartiéndose la casa",
                "ar": "قسمة الإخوة للمال",
            }},
            "B": {"text": {
                "en": "Loving and respecting one's elder brothers",
                "fr": "Aimer et respecter ses frères aînés",
                "es": "Amar y respetar a los hermanos mayores",
                "ar": "محبة الأخ الأكبر وإجلاله",
            }},
            "C": {"text": {
                "en": "Replacing, taking turns",
                "fr": "Remplacer, alterner",
                "es": "Reemplazar, alternar",
                "ar": "التبديل والتناوب",
            }},
            "D": {"text": {
                "en": "A disciple taking a master",
                "fr": "Un disciple prenant un maître",
                "es": "Un discípulo tomando maestro",
                "ar": "تلميذ يتّخذ أستاذًا",
            }},
        },
    },
    "忠": {
        "benyi": {
            "en": "Exerting one's whole heart, without partiality",
            "fr": "Y mettre tout son cœur, sans partialité",
            "es": "Poner todo el corazón, sin parcialidad",
            "ar": "بذل الوسع بالقلب كله دون محاباة",
        },
        "jinyi": {
            "en": "Loyalty, devotedness",
            "fr": "Loyauté, dévouement",
            "es": "Lealtad, entrega",
            "ar": "الولاء والإخلاص",
        },
        "story": {
            "en": "\"Zhong\" is \"centre\" with \"heart\". \"Centre\" here does not mean \"middle\" but \"centred and unbiased\". Its original sense is to set the heart straight and give one's all in dealing with people and affairs. Zengzi examined himself thrice daily: \"In counselling others, have I failed in zhong?\" — that is, did I give my true heart? This is the original sense of zhong; it did not mean loyalty to a ruler alone.",
            "fr": "« Zhong » est « centre » avec « cœur ». Ici « centre » ne signifie pas « milieu » mais « centré, sans parti pris ». Son sens premier : redresser son cœur et tout donner dans ses rapports avec les gens et les choses. Zengzi s'examinait trois fois par jour : « En conseillant autrui, ai-je manqué de zhong ? » — ai-je donné mon vrai cœur ? Tel est le sens premier de zhong ; il ne désignait pas seulement la loyauté au souverain.",
            "es": "«Zhong» es «centro» con «corazón». Aquí «centro» no significa «medio» sino «centrado y sin parcialidad». Su sentido primero: enderezar el corazón y darlo todo en el trato con personas y cosas. Zengzi se examinaba tres veces al día: «Al aconsejar a otros, ¿falté a zhong?»: ¿di mi verdadero corazón? Ese es el sentido primero de zhong; no designaba solo la lealtad al soberano.",
            "ar": "«تشونغ» هي «الاعتدال» مع «القلب». و«الاعتدال» هنا لا تعني «الوسط» بل «التمركز بلا انحياز». ومعناها الأول تقويم القلب وبذل الجهد في التعامل مع الناس والأمور. وكان تسنغ تسي يحاسب نفسه ثلاثًا كل يوم: «هل قصّرت في تشونغ عند مشاورة غيري؟» أي هل بذلت قلبي حقًّا؟ فهذا أصل معنى تشونغ، ولم تكن وقفًا على الولاء للحاكم.",
        },
        "options": {
            "A": {"text": {
                "en": "Exerting one's whole heart, without partiality",
                "fr": "Y mettre tout son cœur, sans partialité",
                "es": "Poner todo el corazón, sin parcialidad",
                "ar": "بذل الوسع بالقلب كله دون محاباة",
            }},
            "B": {"text": {
                "en": "Absolute obedience to the sovereign",
                "fr": "L'obéissance absolue au souverain",
                "es": "La obediencia absoluta al soberano",
                "ar": "الطاعة المطلقة للحاكم",
            }},
            "C": {"text": {
                "en": "Honest and simple-hearted",
                "fr": "Honnête et simple de cœur",
                "es": "Honrado y sencillo",
                "ar": "الصدق وسلامة الصدر",
            }},
            "D": {"text": {
                "en": "Concentrating the mind, undistracted",
                "fr": "Concentrer son esprit, sans distraction",
                "es": "Concentrar la mente, sin distraerse",
                "ar": "جمع الذهن دون شرود",
            }},
        },
    },
    "恕": {
        "benyi": {
            "en": "Measuring others by oneself — do not impose on others what you do not want",
            "fr": "Mesurer autrui à soi-même — ne pas imposer à autrui ce qu'on ne veut pas pour soi",
            "es": "Medir a los demás por uno mismo: no impongas a otros lo que no quieres para ti",
            "ar": "قياس الناس على النفس — لا تفرض على غيرك ما لا تريده لنفسك",
        },
        "jinyi": {
            "en": "Forgiveness, pardon",
            "fr": "Pardon, indulgence",
            "es": "Perdón, indulgencia",
            "ar": "العفو والصفح",
        },
        "story": {
            "en": "\"Shu\" is \"like\" with \"heart\": \"as my heart\" — weighing another's heart by one's own. When Zigong asked for a single word to practise lifelong, Confucius answered, \"Is it not shu? Do not impose on others what you yourself do not want.\" Shu is the Confucian golden rule, shaping two thousand years thereafter.",
            "fr": "« Shu » est « comme » avec « cœur » : « comme mon cœur » — peser le cœur d'autrui au poids du sien. Zigong demandant un mot à pratiquer toute sa vie, Confucius répondit : « N'est-ce pas shu ? Ne pas imposer à autrui ce qu'on ne veut pas pour soi. » Shu est la règle d'or confucéenne, qui marqua deux mille ans.",
            "es": "«Shu» es «como» con «corazón»: «como mi corazón»: pesar el corazón ajeno con el propio. Cuando Zigong pidió una sola palabra para practicar toda la vida, Confucio respondió: «¿No es shu? No impongas a otros lo que tú no quieres.» Shu es la regla de oro confuciana, que marcó dos mil años.",
            "ar": "«شو» هي «الكاف» مع «القلب»: «كقلبي» — أي وزن قلب غيرك بقلبك. وسأل تسي-كونغ عن كلمة واحدة يعمل بها العمر كله، فأجاب كونفوشيوس: «أليست شو؟ لا تفرض على غيرك ما لا تريده لنفسك». وشو قاعدة كونفوشيوس الذهبية التي أثّرت ألفي عام.",
        },
        "options": {
            "A": {"text": {
                "en": "Pardoning others' faults",
                "fr": "Pardonner les fautes d'autrui",
                "es": "Perdonar las faltas ajenas",
                "ar": "العفو عن زلّات الآخرين",
            }},
            "B": {"text": {
                "en": "Measuring others by oneself — do not impose what you do not want",
                "fr": "Mesurer autrui à soi-même — ne pas imposer ce qu'on ne veut pas",
                "es": "Medir a los demás por uno mismo: no impongas lo que no quieres",
                "ar": "قياس الناس على النفس — لا تفرض ما لا تريده",
            }},
            "C": {"text": {
                "en": "Being generous in disposition",
                "fr": "Être d'un naturel généreux",
                "es": "Ser de natural generoso",
                "ar": "سعة الصدر",
            }},
            "D": {"text": {
                "en": "Asking forgiveness",
                "fr": "Demander pardon",
                "es": "Pedir perdón",
                "ar": "طلب العفو",
            }},
        },
    },
    "君": {
        "benyi": {
            "en": "One who holds the brush and issues orders — a ruler",
            "fr": "Celui qui tient le pinceau et émet les ordres — le gouvernant",
            "es": "Quien empuña el pincel y dicta órdenes: el gobernante",
            "ar": "من يُمسك القلم ويصدر الأمر — الحاكم",
        },
        "jinyi": {
            "en": "Sovereign, the noble man, a respectful form of address",
            "fr": "Souverain, l'homme noble, appellation respectueuse",
            "es": "Soberano, el hombre noble, tratamiento respetuoso",
            "ar": "السيّد، والرجل النبيل، ولفظ تكريم",
        },
        "story": {
            "en": "\"Jun\" has a hand holding a brush above and \"mouth\" below: originally a ruler who issues commands. Confucius transformed the term \"junzi\" from a matter of noble birth into one of moral cultivation — regardless of station, whoever combines benevolence and virtue may be a junzi.",
            "fr": "« Jun » a une main tenant le pinceau en haut et « bouche » en bas : à l'origine, le gouvernant qui donne ses ordres. Confucius transforma le terme « junzi » : d'une naissance noble, il en fit une affaire de cultivation morale — quelles que soient ses origines, qui réunit bienveillance et vertu peut être junzi.",
            "es": "«Jun» tiene una mano con el pincel arriba y «boca» abajo: originalmente el gobernante que dicta órdenes. Confucio transformó el término «junzi»: de la cuna noble lo convirtió en cultivo moral; sea cual sea su origen, quien une benevolencia y virtud puede ser junzi.",
            "ar": "«جون» فيها يد تُمسك القلم في الأعلى و«الفم» في الأسفل: أي الحاكم الذي يُصدر الأوامر. ثم نقل كونفوشيوس معنى «جونزي» من النسب النبيل إلى التربية الخلقية — فمهما كان المنبت، من جمع الإحسان والفضيلة فهو جونزي.",
        },
        "options": {
            "A": {"text": {
                "en": "Wife, spouse",
                "fr": "Épouse, conjointe",
                "es": "Esposa, cónyuge",
                "ar": "الزوجة والقرين",
            }},
            "B": {"text": {
                "en": "One who holds the brush and issues orders — a ruler",
                "fr": "Celui qui tient le pinceau et émet les ordres — le gouvernant",
                "es": "Quien empuña el pincel y dicta órdenes: el gobernante",
                "ar": "من يُمسك القلم ويصدر الأمر — الحاكم",
            }},
            "C": {"text": {
                "en": "A gathering of many people",
                "fr": "Une réunion de nombreuses personnes",
                "es": "Una reunión de muchas personas",
                "ar": "اجتماع الناس",
            }},
            "D": {"text": {
                "en": "A respectful address, \"sir\"",
                "fr": "Appellation respectueuse, « monsieur »",
                "es": "Tratamiento respetuoso, «señor»",
                "ar": "لفظ تكريم، «سيدي»",
            }},
        },
    },
    "友": {
        "benyi": {
            "en": "Two hands clasped — those of one purpose who hold each other dear are friends",
            "fr": "Deux mains jointes — ceux qui partagent un même dessein et s'aiment sont amis",
            "es": "Dos manos estrechadas: quienes comparten un propósito y se aprecian son amigos",
            "ar": "يدان متعانقتان — من جمعهم غرض واحد وتحابّوا فهم الأصدقاء",
        },
        "jinyi": {
            "en": "Friend, friendship",
            "fr": "Ami, amitié",
            "es": "Amigo, amistad",
            "ar": "الصديق والصداقة",
        },
        "story": {
            "en": "In oracle bone script \"you\" shows two right hands clasped; its original sense is two people of one mind aiding each other. The ancients chose friends strictly — \"Do not befriend those not your equal\"; \"Three friendships are profitable: with the straight, the sincere, and the well-informed.\"",
            "fr": "En écriture ossécaille, « you » figure deux mains droites jointes ; son sens premier : deux personnes d'un même esprit s'entraidant. Les anciens choisissaient leurs amis avec rigueur — « Ne prends pas pour ami qui ne t'égale » ; « Trois amitiés sont profitables : avec le droit, le sincère et l'homme d'un vaste savoir. »",
            "es": "En hueso oracular «you» figura dos manos derechas estrechadas; su sentido primero: dos personas de una misma voluntad que se ayudan. Los antiguos elegían con rigor: «No tomes por amigo a quien no te iguale»; «Tres amistades aprovechan: con el recto, el sincero y el de vasto saber».",
            "ar": "في كتابة العظام تمثّل «يوي» يدين يمنيين متعانقتين؛ ومعناها الأول شخصان على غرض واحد يتعاونان. وكان القدماء يتشدّدون في اختيار الأصدقاء — «لا تصادق من ليس نظيرك»، و«ثلاث صداقات نافعة: مع المستقيم، والصادق، وواسع المعرفة».",
        },
        "options": {
            "A": {"text": {
                "en": "To have, to possess",
                "fr": "Avoir, posséder",
                "es": "Tener, poseer",
                "ar": "الملك والحيازة",
            }},
            "B": {"text": {
                "en": "Two hands clasped — those of one purpose who hold each other dear",
                "fr": "Deux mains jointes — ceux d'un même dessein qui s'aiment",
                "es": "Dos manos estrechadas: quienes comparten propósito y se aprecian",
                "ar": "يدان متعانقتان — من جمعهم غرض واحد وتحابّوا",
            }},
            "C": {"text": {
                "en": "Neighbours helping one another",
                "fr": "Voisins s'entraidant",
                "es": "Vecinos que se ayudan",
                "ar": "تعاون الجيران",
            }},
            "D": {"text": {
                "en": "Brothers",
                "fr": "Frères",
                "es": "Hermanos",
                "ar": "الإخوة",
            }},
        },
    },
    "中": {
        "benyi": {
            "en": "Dead centre, leaning neither way",
            "fr": "Le juste milieu, sans incliner d'aucun côté",
            "es": "El centro exacto, sin inclinarse a ningún lado",
            "ar": "الوسط التام دون ميل",
        },
        "jinyi": {
            "en": "Middle, middling, fitting",
            "fr": "Milieu, moyen, convenable",
            "es": "Medio, mediano, adecuado",
            "ar": "الوسط والمتوسط والمناسب",
        },
        "story": {
            "en": "In oracle bone script \"zhong\" shows a flagpole passing through the exact centre of an object. Its original sense is neither leaning nor erring, hitting just right. This is the \"zhong\" of the Confucian Doctrine of the Mean — not averaging, not compromise, but \"timely zhong\": fitting at every moment. When joy, anger, sorrow and pleasure arise all in due measure, that is called harmony.",
            "fr": "En écriture ossécaille, « zhong » figure un mât traversant le centre exact d'un objet. Son sens premier : ne pencher ni errer, tomber juste. C'est le « zhong » de la Doctrine du Milieu — ni moyenne, ni compromis, mais « zhong opportun » : juste à chaque instant. Quand joie, colère, tristesse et plaisir naissent tous à la mesure voulue, c'est l'harmonie.",
            "es": "En hueso oracular «zhong» figura un mástil que atraviesa el centro exacto de un objeto. Su sentido primero: no inclinarse ni errar, dar justo en el punto. Este es el «zhong» de la Doctrina del Medio: ni promedio ni componenda, sino «zhong oportuno»: justo en cada momento. Cuando alegría, ira, tristeza y placer brotan todos en su justa medida, eso es armonía.",
            "ar": "في كتابة العظام تمثّل «تشونغ» سارية تمرّ بمركز الجسم تمامًا. ومعناها الأول ألّا تميل ولا تخطئ بل تصيب الحدّ. وهذه هي «تشونغ» في مذهب الوسط — لا متوسطًا حسابيًا ولا تسوية، بل «تشونغ في وقتها»: مناسبة في كل لحظة. وإذا صدر الفرح والغضب والحزن واللذة على قدرها فذلك الانسجام.",
        },
        "options": {
            "A": {"text": {
                "en": "A middle position",
                "fr": "Une position médiane",
                "es": "Una posición media",
                "ar": "الموضع الأوسط",
            }},
            "B": {"text": {
                "en": "Dead centre, leaning neither way",
                "fr": "Le juste milieu, sans incliner",
                "es": "El centro exacto, sin inclinarse",
                "ar": "الوسط التام دون ميل",
            }},
            "C": {"text": {
                "en": "China",
                "fr": "La Chine",
                "es": "China",
                "ar": "الصين",
            }},
            "D": {"text": {
                "en": "Hitting the target",
                "fr": "Atteindre la cible",
                "es": "Dar en el blanco",
                "ar": "إصابة الهدف",
            }},
        },
    },
    "和": {
        "benyi": {
            "en": "Sounds answering one another, blending in accord",
            "fr": "Des sons se répondant, s'accordant en harmonie",
            "es": "Sonidos que se responden y se acuerdan",
            "ar": "تجاوب الأصوات وتناغمها",
        },
        "jinyi": {
            "en": "Harmony, peace, gentleness",
            "fr": "Harmonie, paix, douceur",
            "es": "Armonía, paz, dulzura",
            "ar": "الانسجام والسلم واللطف",
        },
        "story": {
            "en": "The old form of \"he\" was built from a multi-pipe instrument and \"grain\": its original sense is many sounds blending in harmony. By extension, concord and living together amicably. Confucius said, \"The junzi seeks harmony, not sameness\" — he is not uniformity but accord amid difference.",
            "fr": "L'ancienne forme de « he » était bâtie d'un instrument à plusieurs tuyaux et de « grain » : son sens premier est l'accord de multiples sons. Par extension, la concorde et la vie amiable. Confucius a dit : « Le junzi cherche l'harmonie, non l'identité » — he n'est pas uniformité mais accord dans la différence.",
            "es": "La forma antigua de «he» se componía de un instrumento de varios tubos y «grano»: su sentido primero es el acuerdo de múltiples sonidos. Por extensión, la concordia y la convivencia amable. Confucio dijo: «El junzi busca la armonía, no la identidad»: he no es uniformidad sino acuerdo en la diferencia.",
            "ar": "كان الشكل القديم لـ«هي» مؤلفًا من آلة متعددة الأنابيب و«الحبّ»: ومعناها الأول تناغم أصوات متعددة. ثم اتسع إلى الوفاق وحسن العشرة. قال كونفوشيوس: «الجونزي يطلب الانسجام لا التماثل» — فليس تماثلًا بل وفاقًا في الاختلاف.",
        },
        "options": {
            "A": {"text": {
                "en": "Sounds answering one another, blending in accord",
                "fr": "Des sons se répondant, s'accordant",
                "es": "Sonidos que se responden y se acuerdan",
                "ar": "تجاوب الأصوات وتناغمها",
            }},
            "B": {"text": {
                "en": "Good humour brings wealth",
                "fr": "La bonne humeur apporte la richesse",
                "es": "El buen talante trae riqueza",
                "ar": "الطلاقة تجلب المال",
            }},
            "C": {"text": {
                "en": "Suing for peace, negotiating peace",
                "fr": "Demander la paix, négocier la paix",
                "es": "Pedir la paz, negociar la paz",
                "ar": "طلب الصلح والمساومة عليه",
            }},
            "D": {"text": {
                "en": "Sum, addition",
                "fr": "Somme, addition",
                "es": "Suma, adición",
                "ar": "المجموع والجمع",
            }},
        },
    },
    "敬": {
        "benyi": {
            "en": "Vigilant care, single-mindedness, daring no slight",
            "fr": "Vigilance, application sans partage, ne pas oser la négligence",
            "es": "Cuidado vigilante, concentración, no osar la negligencia",
            "ar": "التحرّز والتفرد بالنية وألّا تجسر على الاستهانة",
        },
        "jinyi": {
            "en": "Respect, reverence",
            "fr": "Respect, révérence",
            "es": "Respeto, reverencia",
            "ar": "الإجلال والتوقير",
        },
        "story": {
            "en": "The original sense of \"jing\" is vigilant care and unremitting single-mindedness. Zhu Xi glossed it as \"holding to the one without wandering\" — the mind fixed on one thing, not straying. Jing is the master pivot of Confucian self-cultivation: \"cultivate oneself with jing\", \"act with earnest jing\", \"discharge one's duties with jing\".",
            "fr": "Le sens premier de « jing » est la vigilance et l'application constante. Zhu Xi le glose par « tenir à l'un sans vagabonder » — l'esprit fixé sur une chose, sans dispersion. Jing est le pivot de la cultivation de soi confucéenne : « se cultiver avec jing », « agir avec un jing fervent », « accomplir sa charge avec jing ».",
            "es": "El sentido primero de «jing» es el cuidado vigilante y la concentración incesante. Zhu Xi lo glosa como «atenerse al uno sin divagar»: la mente fija en una cosa, sin dispersarse. Jing es el eje maestro del cultivo confuciano de sí: «cultivarse con jing», «obrar con jing ferviente», «desempeñar el cargo con jing».",
            "ar": "المعنى الأول لـ«جينغ» التحرّز والتفرد بالنية دون توان. وفسّرها تشو شي بـ«التعلق بالواحد دون شرود» — أي ثبات الذهن على أمر دون تفرّق. وجينغ محور التربية الكونفوشية للنفس: «ربِّ نفسك بجينغ»، و«اعمل بجينغ صادق»، و«أدِّ عملك بجينغ».",
        },
        "options": {
            "A": {"text": {
                "en": "Toasting, paying respects",
                "fr": "Porter un toast, saluer",
                "es": "Brindar, rendir honores",
                "ar": "الشرب تحية والتحية",
            }},
            "B": {"text": {
                "en": "Fear, dread",
                "fr": "Crainte, peur",
                "es": "Temor, miedo",
                "ar": "الخوف والرهبة",
            }},
            "C": {"text": {
                "en": "Vigilant care, single-mindedness, daring no slight",
                "fr": "Vigilance, application, ne pas oser la négligence",
                "es": "Cuidado vigilante, concentración, no osar la negligencia",
                "ar": "التحرّز والتفرد بالنية وألّا تجسر على الاستهانة",
            }},
            "D": {"text": {
                "en": "Honouring the old and the worthy",
                "fr": "Honorer les anciens et les sages",
                "es": "Honrar a los mayores y a los sabios",
                "ar": "إجلال الشيوخ والحكماء",
            }},
        },
    },
    "诚": {
        "benyi": {
            "en": "Words that come true — true and without falsehood",
            "fr": "Des paroles qui s'accomplissent — vrai et sans mensonge",
            "es": "Palabras que se cumplen: verdadero y sin falsedad",
            "ar": "قول يتحقّق — صدق بلا زيف",
        },
        "jinyi": {
            "en": "Honesty, sincerity",
            "fr": "Honnêteté, sincérité",
            "es": "Honestidad, sinceridad",
            "ar": "الصدق والإخلاص",
        },
        "story": {
            "en": "\"Cheng\" is \"speech\" with \"to complete\": words that are made good, neither empty nor false. The Doctrine of the Mean makes cheng the Way of Heaven — \"Cheng is the Way of Heaven; to make oneself cheng is the Way of man.\" Cheng is not merely \"not lying\" but a state of being whole within and without, transparent inside and out.",
            "fr": "« Cheng » est « parole » avec « accomplir » : des paroles menées à bien, ni vaines ni fausses. La Doctrine du Milieu fait de cheng la Voie du Ciel — « Cheng est la Voie du Ciel ; se rendre cheng est la Voie de l'homme. » Cheng n'est pas seulement « ne pas mentir », mais un état d'être un au-dedans comme au-dehors, transparent de part en part.",
            "es": "«Cheng» es «palabra» con «completar»: palabras llevadas a término, ni vanas ni falsas. La Doctrina del Medio hace de cheng la Vía del Cielo: «Cheng es la Vía del Cielo; hacerse cheng es la Vía del hombre.» Cheng no es solo «no mentir», sino un estado de ser uno por dentro y por fuera, transparente de parte a parte.",
            "ar": "«تشنغ» هي «القول» مع «الإتمام»: قولٌ يُنجَز، لا باطل ولا زائف. ويجعل مذهب الوسط تشنغ طريق السماء — «تشنغ طريق السماء، وأن تجعل نفسك تشنغ طريق الإنسان». وتشنغ ليست «عدم الكذب» فحسب، بل حالُ كونٍ واحدٍ ظاهرًا وباطنًا، شفّافًا في كل طبقة.",
        },
        "options": {
            "A": {"text": {
                "en": "A promise made to another",
                "fr": "Une promesse faite à autrui",
                "es": "Una promesa hecha a otro",
                "ar": "وعدٌ قُطِع لغيرك",
            }},
            "B": {"text": {
                "en": "Words that come true — true and without falsehood",
                "fr": "Des paroles qui s'accomplissent — vrai et sans mensonge",
                "es": "Palabras que se cumplen: verdadero y sin falsedad",
                "ar": "قول يتحقّق — صدق بلا زيف",
            }},
            "C": {"text": {
                "en": "Trembling with awe",
                "fr": "Trembler de crainte respectueuse",
                "es": "Temblar de temor reverente",
                "ar": "الوجل والخوف",
            }},
            "D": {"text": {
                "en": "A good-faith deposit",
                "fr": "Un acompte de bonne foi",
                "es": "Un depósito de buena fe",
                "ar": "عربون حسن النية",
            }},
        },
    },
    "省": {
        "benyi": {
            "en": "Close examination, self-scrutiny",
            "fr": "Examen attentif, introspection",
            "es": "Examen atento, introspección",
            "ar": "التفحّص ومحاسبة النفس",
        },
        "jinyi": {
            "en": "Reflection, omission, and the administrative \"province\"",
            "fr": "Réflexion, omission, et la « province » administrative",
            "es": "Reflexión, omisión y la «provincia» administrativa",
            "ar": "المراجعة والحذف و«المقاطعة» الإدارية",
        },
        "story": {
            "en": "\"Sheng\" has \"eye\" for looking and \"few\" as the sound. Its original sense is close examination, extended to self-scrutiny — Zengzi's \"I examine myself on three counts each day\". Read xǐng it means to scrutinise and reflect; read shěng it means to reduce and economise (a later sense).",
            "fr": "« Sheng » a « œil » pour le regard et « peu » pour le son. Son sens premier est l'examen attentif, étendu à l'introspection — le « je m'examine trois fois par jour » de Zengzi. Lu xǐng, il signifie scruter et réfléchir ; lu shěng, réduire et économiser (sens tardif).",
            "es": "«Sheng» tiene «ojo» para mirar y «poco» como sonido. Su sentido primero es el examen atento, extendido a la introspección: el «me examino tres veces al día» de Zengzi. Leído xǐng significa escudriñar y reflexionar; leído shěng, reducir y economizar (sentido tardío).",
            "ar": "«شِنغ» فيها «العين» للنظر و«القليل» للصوت. ومعناها الأول التفحّص الدقيق، ثم محاسبة النفس — «أحاسب نفسي ثلاثًا كل يوم» لتسنغ تسي. وتُقرأ شينغ بمعنى التفحّص والمراجعة، وشِنغ بمعنى التقليل والاقتصاد (معنى متأخر).",
        },
        "options": {
            "A": {"text": {
                "en": "Saving, economising",
                "fr": "Économiser, épargner",
                "es": "Ahorrar, economizar",
                "ar": "التوفير والاقتصاد",
            }},
            "B": {"text": {
                "en": "Provincial capital, administrative division",
                "fr": "Chef-lieu de province, division administrative",
                "es": "Capital provincial, división administrativa",
                "ar": "عاصمة المقاطعة والتقسيم الإداري",
            }},
            "C": {"text": {
                "en": "Close examination, self-scrutiny",
                "fr": "Examen attentif, introspection",
                "es": "Examen atento, introspección",
                "ar": "التفحّص ومحاسبة النفس",
            }},
            "D": {"text": {
                "en": "So as to avoid, lest",
                "fr": "Pour éviter, afin que",
                "es": "Para evitar, no sea que",
                "ar": "تجنّبًا ولئلا",
            }},
        },
    },
    "勇": {
        "benyi": {
            "en": "Having vigour, daring to act",
            "fr": "Avoir de la vigueur, oser agir",
            "es": "Tener vigor, osar actuar",
            "ar": "قوة البأس والجسارة على الفعل",
        },
        "jinyi": {
            "en": "Bravery, courage",
            "fr": "Bravoure, courage",
            "es": "Valentía, coraje",
            "ar": "الشجاعة والجرأة",
        },
        "story": {
            "en": "\"Yong\" takes \"strength\" for sense and \"yong\" for sound. The Confucian yong divides into great and small — \"To see what is right and not do it is want of yong\" (act only when it accords with right); \"Yong without li leads to disorder\" (yong must be governed by li). \"The benevolent are sure to have yong; the yong need not have benevolence.\"",
            "fr": "« Yong » prend « force » pour le sens et « yong » pour le son. Le yong confucéen se divise en grand et petit — « Voir ce qui est juste et ne pas le faire, c'est manquer de yong » (agir seulement quand cela s'accorde au juste) ; « Le yong sans li mène au désordre » (le yong doit être réglé par li). « Les bienveillants ont sûrement du yong ; les yong n'ont pas forcément la bienveillance. »",
            "es": "«Yong» toma «fuerza» para el sentido y «yong» para el sonido. El yong confuciano se divide en grande y pequeño: «Ver lo justo y no hacerlo es falta de yong» (obrar solo cuando concuerda con lo recto); «El yong sin li lleva al desorden» (el yong debe regirse por li). «Los benevolentes tienen ciertamente yong; los yong no necesariamente la benevolencia.»",
            "ar": "«يونغ» تأخذ «القوة» للمعنى و«يونغ» للصوت. وينقسم يونغ الكونفوشي عندهم إلى كبير وصغير — «أن ترى الحق فلا تفعله فذلك فقدان يونغ» (أي لا تعمل إلا بما يوافق الحق)، و«يونغ بلا لي يفضي إلى الفوضى» (فلا بد أن يضبطه لي). «وأهل الإحسان لا بد لهم من يونغ، وأهل يونغ قد لا يكونون أهل إحسان».",
        },
        "options": {
            "A": {"text": {
                "en": "Having vigour, daring to act",
                "fr": "Avoir de la vigueur, oser agir",
                "es": "Tener vigor, osar actuar",
                "ar": "قوة البأس والجسارة على الفعل",
            }},
            "B": {"text": {
                "en": "Eagerness to win",
                "fr": "L'empressement à vaincre",
                "es": "El afán de vencer",
                "ar": "التلهف على الغلبة",
            }},
            "C": {"text": {
                "en": "Loving bravado and brawling",
                "fr": "Aimer la bravade et la querelle",
                "es": "Amar la bravata y la reyerta",
                "ar": "حبّ التبجّح والمشاجرة",
            }},
            "D": {"text": {
                "en": "To well up, to gush forth",
                "fr": "Jaillir, sourdre",
                "es": "Brotar, manar",
                "ar": "التفجّر والنبع",
            }},
        },
    },
    "学": {
        "benyi": {
            "en": "A child receiving instruction in a house — to learn, to emulate",
            "fr": "Un enfant recevant l'enseignement dans une maison — apprendre, imiter",
            "es": "Un niño recibiendo enseñanza en una casa: aprender, emular",
            "ar": "طفل يتلقى التعليم في بيت — التعلّم والاقتداء",
        },
        "jinyi": {
            "en": "Learning, scholarship, school",
            "fr": "Apprentissage, savoir, école",
            "es": "Aprendizaje, saber, escuela",
            "ar": "التعلّم والعلم والمدرسة",
        },
        "story": {
            "en": "In the traditional form, the top element stands for counting rods or writing, the side element for two hands holding something, and under the roof is \"child\": together, \"a child in a house being taught with things held by a teacher\". Its original sense is learning and emulating. \"To learn and in due time practise it — is that not a joy?\" opens the Analects.",
            "fr": "Dans la forme traditionnelle, l'élément du haut figure les bâtonnets de calcul ou l'écriture, celui de côté deux mains portant quelque chose, et sous le toit se tient « enfant » : ensemble, « un enfant dans une maison, instruit par un maître tenant des objets ». Son sens premier est apprendre et imiter. « Apprendre et, en temps voulu, le mettre en pratique — n'est-ce pas une joie ? » ouvre les Entretiens.",
            "es": "En la forma tradicional, el elemento superior figura las varillas de cálculo o la escritura, el lateral dos manos que sostienen algo, y bajo el techo está «niño»: juntos, «un niño en una casa, instruido por un maestro que sostiene cosas». Su sentido primero es aprender y emular. «Aprender y, a su tiempo, practicarlo, ¿no es una alegría?» abre las Analectas.",
            "ar": "في الشكل التقليدي، العنصر الأعلى رمز لعصيّ الحساب أو الكتابة، والجانبي ليدين تحملان شيئًا، وتحت السقف يقف «الطفل»: ومجموعها «طفل في بيت يعلّمه أستاذ بما يحمله». ومعناها الأول التعلّم والاقتداء. و«أن تتعلّم وتطبّق في حينه — أليس ذلك فرحًا؟» هي فاتحة المحاورات.",
        },
        "options": {
            "A": {"text": {
                "en": "School, seat of learning",
                "fr": "École, lieu d'étude",
                "es": "Escuela, centro de saber",
                "ar": "المدرسة والمعهد",
            }},
            "B": {"text": {
                "en": "A child receiving instruction in a house — to learn, to emulate",
                "fr": "Un enfant recevant l'enseignement — apprendre, imiter",
                "es": "Un niño recibiendo enseñanza: aprender, emular",
                "ar": "طفل يتلقى التعليم في بيت — التعلّم والاقتداء",
            }},
            "C": {"text": {
                "en": "Scholarship, knowledge",
                "fr": "Savoir, connaissance",
                "es": "Saber, conocimiento",
                "ar": "العلم والمعرفة",
            }},
            "D": {"text": {
                "en": "To imitate",
                "fr": "Imiter",
                "es": "Imitar",
                "ar": "المحاكاة",
            }},
        },
    },
    "习": {
        "benyi": {
            "en": "A fledgling practising flight again and again — to review, to put into practice",
            "fr": "L'oisillon s'exerçant au vol encore et encore — réviser, mettre en pratique",
            "es": "El polluelo que ensaya el vuelo una y otra vez: repasar, poner en práctica",
            "ar": "الفرخ يكرّر تمرين الطيران — المراجعة والممارسة",
        },
        "jinyi": {
            "en": "Habit, practice, learning",
            "fr": "Habitude, exercice, apprentissage",
            "es": "Hábito, práctica, aprendizaje",
            "ar": "العادة والتمرين والتعلّم",
        },
        "story": {
            "en": "In the traditional form, \"wings\" is above and \"white\" (some say \"sun\") below. Its original sense is a fledgling practising flight again and again in the sunlight. \"Xue\" is first knowing; \"xi\" is repeated practice until it becomes second nature. Confucius's \"to learn and in due time practise it\" means what is learned must be constantly reviewed and lived.",
            "fr": "Dans la forme traditionnelle, « ailes » est en haut et « blanc » (pour certains « soleil ») en bas. Son sens premier : l'oisillon s'exerçant au vol à maintes reprises au soleil. « Xue » est le premier savoir ; « xi » l'exercice répété jusqu'à la maîtrise. Le « apprendre et en temps voulu le pratiquer » de Confucius signifie réviser et vivre sans cesse ce qu'on a appris.",
            "es": "En la forma tradicional, «alas» está arriba y «blanco» (según algunos «sol») abajo. Su sentido primero: el polluelo que ensaya el vuelo una y otra vez bajo el sol. «Xue» es el primer saber; «xi» el ejercicio repetido hasta dominarlo. El «aprender y a su tiempo practicarlo» de Confucio significa repasar y vivir sin cesar lo aprendido.",
            "ar": "في الشكل التقليدي، «الأجنحة» في الأعلى و«الأبيض» (وقيل «الشمس») في الأسفل. ومعناها الأول فرخ يكرّر تمرين الطيران في ضوء الشمس. و«شويه» أول العلم، و«شي» تكرار التمرين حتى الإتقان. وقول كونفوشيوس «تعلّم وطبّق في حينه» يعني مراجعة ما تعلّمته والعمل به دائمًا.",
        },
        "options": {
            "A": {"text": {
                "en": "Habit becoming second nature",
                "fr": "L'habitude devenue seconde nature",
                "es": "El hábito hecho segunda naturaleza",
                "ar": "العادة تصير طبعًا",
            }},
            "B": {"text": {
                "en": "A fledgling practising flight again and again — to review, to practise",
                "fr": "L'oisillon s'exerçant au vol — réviser, pratiquer",
                "es": "El polluelo ensayando el vuelo: repasar, practicar",
                "ar": "الفرخ يكرّر الطيران — المراجعة والممارسة",
            }},
            "C": {"text": {
                "en": "Probation, internship",
                "fr": "Stage, apprentissage pratique",
                "es": "Prácticas, pasantía",
                "ar": "التدريب العملي",
            }},
            "D": {"text": {
                "en": "Feathers",
                "fr": "Plumes",
                "es": "Plumas",
                "ar": "الريش",
            }},
        },
    },
    "思": {
        "benyi": {
            "en": "Head and heart working together — deep reflection",
            "fr": "La tête et le cœur œuvrant ensemble — réflexion profonde",
            "es": "Cabeza y corazón obrando juntos: reflexión profunda",
            "ar": "الرأس والقلب معًا — التفكر العميق",
        },
        "jinyi": {
            "en": "Thinking, longing",
            "fr": "Penser, regretter",
            "es": "Pensar, añorar",
            "ar": "التفكير والحنين",
        },
        "story": {
            "en": "\"Si\" has the fontanelle (standing for the brain) above and \"heart\" below. The ancients held that thought comes from the heart, and added the fontanelle to stress the mind's part. Its original sense is deep thinking. Confucius: \"Learning without thought is bewildering; thought without learning is perilous\" — the two must go together.",
            "fr": "« Si » a la fontanelle (pour le cerveau) en haut et « cœur » en bas. Les anciens tenaient la pensée pour issue du cœur, et ajoutèrent la fontanelle pour marquer la part de l'esprit. Son sens premier est la réflexion profonde. Confucius : « Apprendre sans penser est confusion ; penser sans apprendre est péril » — les deux vont de pair.",
            "es": "«Si» tiene la fontanela (por el cerebro) arriba y «corazón» abajo. Los antiguos tenían el pensamiento por obra del corazón, y añadieron la fontanela para marcar la parte de la mente. Su sentido primero es la reflexión profunda. Confucio: «Aprender sin pensar es confusión; pensar sin aprender es peligro»: ambos han de ir juntos.",
            "ar": "«سي» فيها اليافوخ (كناية عن الدماغ) في الأعلى و«القلب» في الأسفل. ورأى القدماء أن التفكير من القلب، فأضافوا اليافوخ للتأكيد على مشاركة الدماغ. ومعناها الأول التفكر العميق. قال كونفوشيوس: «التعلّم بلا تفكير حيرة، والتفكير بلا تعلّم خطر» — فلا بد من اقترانهما.",
        },
        "options": {
            "A": {"text": {
                "en": "Longing for an absent friend",
                "fr": "Le regret d'un ami absent",
                "es": "La añoranza de un amigo ausente",
                "ar": "الحنين إلى صديق غائب",
            }},
            "B": {"text": {
                "en": "Mood, frame of mind",
                "fr": "État d'âme, humeur",
                "es": "Ánimo, temple",
                "ar": "الخاطر والمزاج",
            }},
            "C": {"text": {
                "en": "Head and heart working together — deep reflection",
                "fr": "La tête et le cœur œuvrant ensemble — réflexion profonde",
                "es": "Cabeza y corazón obrando juntos: reflexión profunda",
                "ar": "الرأس والقلب معًا — التفكر العميق",
            }},
            "D": {"text": {
                "en": "Nostalgia for the past",
                "fr": "La nostalgie du passé",
                "es": "La nostalgia del pasado",
                "ar": "الحنين إلى الماضي",
            }},
        },
    },
    "问": {
        "benyi": {
            "en": "Opening one's mouth to ask at the door",
            "fr": "Ouvrir la bouche pour s'enquérir à la porte",
            "es": "Abrir la boca para preguntar en la puerta",
            "ar": "فتح الفم للسؤال عند الباب",
        },
        "jinyi": {
            "en": "To ask, to send greetings",
            "fr": "Interroger, saluer",
            "es": "Preguntar, saludar",
            "ar": "السؤال والتحية",
        },
        "story": {
            "en": "The traditional form is \"mouth\" with \"gate\" (which also gives the sound). Coming to a stranger's house, the ancients had first to speak and ask at the door. By extension, all asking and inquiry. \"Eager and fond of learning, not ashamed to ask below him\" — Confucius praised Zigong as a good learner unashamed to seek instruction.",
            "fr": "La forme traditionnelle est « bouche » avec « porte » (qui donne aussi le son). Arrivant chez un inconnu, les anciens devaient d'abord parler et s'enquérir à la porte. Par extension, toute interrogation et recherche. « Ardent et ami du savoir, sans honte de s'enquérir en bas » — Confucius loua Zigong comme un bon étudiant sans honte de demander.",
            "es": "La forma tradicional es «boca» con «puerta» (que da el sonido). Al llegar a casa de un desconocido, los antiguos debían primero hablar y preguntar en la puerta. Por extensión, toda pregunta e indagación. «Ávido y amante del saber, sin vergüenza de preguntar a los de abajo»: Confucio elogió a Zigong como buen estudioso sin vergüenza de pedir enseñanza.",
            "ar": "الشكل التقليدي هو «الفم» مع «الباب» (وهي تفيد الصوت أيضًا). وكان القدماء عند مجيئهم بيت غريب يتكلمون ويسألون عند الباب أولًا. ثم اتسع إلى كل سؤال واستقصاء. و«حريص على العلم لا يستحيي أن يسأل من دونه» — أثنى كونفوشيوس على تسي-كونغ بأنه متعلّم لا يستحيي من طلب العلم.",
        },
        "options": {
            "A": {"text": {
                "en": "Opening one's mouth to ask at the door",
                "fr": "Ouvrir la bouche pour s'enquérir à la porte",
                "es": "Abrir la boca para preguntar en la puerta",
                "ar": "فتح الفم للسؤال عند الباب",
            }},
            "B": {"text": {
                "en": "Asking after someone's health",
                "fr": "Prendre des nouvelles de la santé",
                "es": "Interesarse por la salud",
                "ar": "السؤال عن الصحة",
            }},
            "C": {"text": {
                "en": "Interrogating a criminal",
                "fr": "Interroger un criminel",
                "es": "Interrogar a un criminal",
                "ar": "استجواب المجرم",
            }},
            "D": {"text": {
                "en": "To hear, to learn by hearsay",
                "fr": "Entendre, apprendre par ouï-dire",
                "es": "Oír, saber por referencias",
                "ar": "السماع والنبأ",
            }},
        },
    },
    "知": {
        "benyi": {
            "en": "Out of the mouth like an arrow — what one knows one can say at once",
            "fr": "De la bouche comme une flèche — ce qu'on sait, on le dit d'emblée",
            "es": "De la boca como una flecha: lo que uno sabe lo dice al punto",
            "ar": "يخرج من الفم كالسهم — ما تعرفه تقوله في الحال",
        },
        "jinyi": {
            "en": "To know, knowledge, mutual understanding",
            "fr": "Savoir, connaissance, entente mutuelle",
            "es": "Saber, conocimiento, entendimiento mutuo",
            "ar": "المعرفة والعلم والتفاهم",
        },
        "story": {
            "en": "\"Zhi\" is \"arrow\" with \"mouth\": swift from the mouth as an arrow — one who truly knows speaks without hesitation and hits the mark. Anciently \"to know\" and \"wisdom\" were interchangeable. Confucius said, \"To know what you know and not know what you do not know — that is wisdom\" — to admit ignorance is itself great wisdom.",
            "fr": "« Zhi » est « flèche » avec « bouche » : prompt de la bouche comme une flèche — qui sait vraiment parle sans hésiter et touche juste. Anciennement « savoir » et « sagesse » étaient interchangeables. Confucius a dit : « Savoir ce qu'on sait et ignorer ce qu'on ignore, voilà la sagesse » — reconnaître son ignorance est déjà grande sagesse.",
            "es": "«Zhi» es «flecha» con «boca»: raudo de la boca como una flecha: quien de verdad sabe habla sin vacilar y acierta. Antiguamente «saber» y «sabiduría» eran intercambiables. Confucio dijo: «Saber lo que se sabe e ignorar lo que se ignora, eso es sabiduría»: reconocer la propia ignorancia es ya gran sabiduría.",
            "ar": "«تشي» هي «السهم» مع «الفم»: سرعةٌ من الفم كالسهم — فمن يعلم حقًّا يتكلم بلا تردّد ويصيب. وكانت «يعلم» و«حكمة» متبادلتين قديمًا. قال كونفوشيوس: «أن تعلم ما تعلم وتجهل ما لا تعلم فتلك الحكمة» — والاعتراف بالجهل حكمة كبرى.",
        },
        "options": {
            "A": {"text": {
                "en": "To know, knowledge",
                "fr": "Savoir, connaissance",
                "es": "Saber, conocimiento",
                "ar": "المعرفة والعلم",
            }},
            "B": {"text": {
                "en": "Out of the mouth like an arrow — what one knows one can say at once",
                "fr": "De la bouche comme une flèche — dire d'emblée ce qu'on sait",
                "es": "De la boca como una flecha: decir al punto lo que se sabe",
                "ar": "يخرج من الفم كالسهم — تقول ما تعرفه في الحال",
            }},
            "C": {"text": {
                "en": "To notify, to inform",
                "fr": "Notifier, informer",
                "es": "Notificar, informar",
                "ar": "الإبلاغ والإخبار",
            }},
            "D": {"text": {
                "en": "A county magistrate",
                "fr": "Un magistrat de district",
                "es": "Un magistrado de distrito",
                "ar": "حاكم المقاطعة",
            }},
        },
    },
    "行": {
        "benyi": {
            "en": "A crossroads — road, to walk",
            "fr": "Un carrefour — la route, marcher",
            "es": "Un cruce de caminos: la ruta, caminar",
            "ar": "ملتقى الطرق — الطريق والسير",
        },
        "jinyi": {
            "en": "To walk, conduct, to be acceptable",
            "fr": "Marcher, conduite, être acceptable",
            "es": "Caminar, conducta, ser aceptable",
            "ar": "السير والسلوك والجواز",
        },
        "story": {
            "en": "In oracle bone script \"xing\" looks like a crossroads; its original sense is road and walking, extended to conduct and practice. Confucians prized \"knowing and doing\": \"The junzi is slow of speech and quick to act\"; \"In word, sure; in deed, resolute.\" Read háng, it means a row or line (an extension from \"road\").",
            "fr": "En écriture ossécaille, « xing » figure un carrefour ; son sens premier : la route et la marche, étendu à la conduite et à la pratique. Les confucéens prisaient le « savoir et agir » : « Le junzi est lent à parler et prompt à agir » ; « En parole, sûr ; en acte, résolu. » Lu háng, il désigne une rangée (extension de « route »).",
            "es": "En hueso oracular «xing» figura un cruce; su sentido primero: ruta y caminar, extendido a conducta y práctica. Los confucianos apreciaban el «saber y obrar»: «El junzi es tardo en hablar y pronto en obrar»; «En palabra, seguro; en obra, resuelto». Leído háng, designa una fila (extensión de «ruta»).",
            "ar": "في كتابة العظام تمثّل «شينغ» ملتقى طرق؛ ومعناها الأول الطريق والسير، ثم اتسع إلى السلوك والممارسة. وأعظم ما عند الكونفوشيين «العلم والعمل»: «الجونزي بطيء القول سريع الفعل»، و«صادق في القول حاسم في العمل». وتُقرأ هانغ بمعنى الصفّ (اتساعًا من «الطريق»).",
        },
        "options": {
            "A": {"text": {
                "en": "Trade, profession",
                "fr": "Métier, profession",
                "es": "Gremio, profesión",
                "ar": "المهنة والصنعة",
            }},
            "B": {"text": {
                "en": "Acceptable, permissible",
                "fr": "Acceptable, permis",
                "es": "Aceptable, admisible",
                "ar": "الجواز والإمكان",
            }},
            "C": {"text": {
                "en": "A crossroads — road, to walk",
                "fr": "Un carrefour — la route, marcher",
                "es": "Un cruce: la ruta, caminar",
                "ar": "ملتقى الطرق — الطريق والسير",
            }},
            "D": {"text": {
                "en": "Forming a single row",
                "fr": "Se ranger en une ligne",
                "es": "Formar una sola fila",
                "ar": "الاصطفاف في صف واحد",
            }},
        },
    },
    "道": {
        "benyi": {
            "en": "The direction a person's head faces — a road; by extension, the fundamental principle",
            "fr": "La direction que regarde la tête de l'homme — la route ; par extension, le principe fondamental",
            "es": "La dirección hacia la que mira la cabeza: la ruta; por extensión, el principio fundamental",
            "ar": "الوجهة التي يتجه إليها الرأس — الطريق، ثم اتسع إلى المبدأ الجوهري",
        },
        "jinyi": {
            "en": "Road, reason, doctrine",
            "fr": "Route, raison, doctrine",
            "es": "Ruta, razón, doctrina",
            "ar": "الطريق والحكمة والمذهب",
        },
        "story": {
            "en": "\"Dao\" is \"to walk\" with \"head\". Its original sense is the direction a person's head faces — a road; extended to method, fundamental principle, and highest truth. The Confucian \"my Way is threaded on one strand\" and the Daoist \"the Dao that can be told is not the constant Dao\" — dao is the highest category of Chinese philosophy.",
            "fr": "« Dao » est « marcher » avec « tête ». Son sens premier : la direction que regarde la tête de l'homme — la route ; étendu à la méthode, au principe fondamental et à la vérité suprême. Le « ma Voie est d'un seul fil » confucéen et le « le Dao qu'on peut dire n'est pas le Dao constant » taoïste — dao est la catégorie suprême de la philosophie chinoise.",
            "es": "«Dao» es «caminar» con «cabeza». Su sentido primero: la dirección hacia la que mira la cabeza: la ruta; extendido a método, principio fundamental y verdad suprema. El «mi Vía está ensartada en un solo hilo» confuciano y el «el Dao que puede decirse no es el Dao constante» taoísta: dao es la categoría suprema de la filosofía china.",
            "ar": "«داو» هي «السير» مع «الرأس». ومعناها الأول الوجهة التي يتجه إليها الرأس — الطريق، ثم اتسعت إلى المنهج والمبدأ الجوهري والحقيقة العليا. ومن الكونفوشية «طريقي منتظم على خيط واحد»، ومن الطاوية «الداو الذي يُقال ليس الداو الدائم» — والداو أرفع مقولة في الفلسفة الصينية.",
        },
        "options": {
            "A": {"text": {
                "en": "Roadway, street",
                "fr": "Chaussée, rue",
                "es": "Calzada, calle",
                "ar": "الشارع والطريق",
            }},
            "B": {"text": {
                "en": "The direction a person's head faces — a road; by extension, the fundamental principle",
                "fr": "La direction que regarde la tête — la route ; par extension, le principe fondamental",
                "es": "La dirección hacia la que mira la cabeza: la ruta; por extensión, el principio fundamental",
                "ar": "الوجهة التي يتجه إليها الرأس — الطريق، ثم المبدأ الجوهري",
            }},
            "C": {"text": {
                "en": "To speak, to narrate",
                "fr": "Parler, raconter",
                "es": "Hablar, narrar",
                "ar": "الكلام والسرد",
            }},
            "D": {"text": {
                "en": "A Daoist priest, Daoism",
                "fr": "Un prêtre taoïste, le taoïsme",
                "es": "Un sacerdote taoísta, el taoísmo",
                "ar": "الكاهن الطاوي والطاوية",
            }},
        },
    },
    "性": {
        "benyi": {
            "en": "What a person has from birth — innate nature",
            "fr": "Ce que l'homme a dès la naissance — la nature innée",
            "es": "Lo que el hombre tiene desde el nacimiento: la naturaleza innata",
            "ar": "ما للإنسان منذ ولادته — الطبيعة الفطرية",
        },
        "jinyi": {
            "en": "Character, nature, sex",
            "fr": "Caractère, nature, sexe",
            "es": "Carácter, naturaleza, sexo",
            "ar": "الطبع والخصيصة والجنس",
        },
        "story": {
            "en": "\"Xing\" is \"heart\" with \"birth\": \"what the human heart has from birth\". From this the Confucians developed the debate between Mencius's \"nature is good\" and Xunzi's \"nature is evil\". The Doctrine of the Mean: \"What Heaven decrees is called nature; to follow nature is called the Way; to cultivate the Way is called teaching\" — xing is the innate given.",
            "fr": "« Xing » est « cœur » avec « naissance » : « ce que le cœur humain a dès la naissance ». De là le débat confucéen entre la « nature bonne » de Mencius et la « nature mauvaise » de Xunzi. La Doctrine du Milieu : « Ce que le Ciel décrète est la nature ; suivre sa nature est la Voie ; cultiver la Voie est l'enseignement » — xing est le donné inné.",
            "es": "«Xing» es «corazón» con «nacimiento»: «lo que el corazón humano tiene desde el nacimiento». De ahí el debate confuciano entre la «naturaleza buena» de Mencio y la «naturaleza mala» de Xunzi. La Doctrina del Medio: «Lo que el Cielo decreta es la naturaleza; seguir la naturaleza es la Vía; cultivar la Vía es la enseñanza»: xing es el don innato.",
            "ar": "«شينغ» هي «القلب» مع «الميلاد»: «ما للقلب الإنساني منذ الولادة». ومن هنا نشأ الخلاف الكونفوشي بين «الطبيعة صالحة» عند منسيوس و«الطبيعة شريرة» عند شيون تسي. وفي مذهب الوسط: «ما يقضيه السماء هو الطبيعة، واتباع الطبيعة هو الطريق، وتهذيب الطريق هو التعليم» — فشينغ هي المعطى الفطري.",
        },
        "options": {
            "A": {"text": {
                "en": "Temper, character",
                "fr": "Tempérament, caractère",
                "es": "Temperamento, carácter",
                "ar": "الطبع والشمائل",
            }},
            "B": {"text": {
                "en": "Sex",
                "fr": "Sexe",
                "es": "Sexo",
                "ar": "الجنس",
            }},
            "C": {"text": {
                "en": "What a person has from birth — innate nature",
                "fr": "Ce que l'homme a dès la naissance — nature innée",
                "es": "Lo que el hombre tiene al nacer: naturaleza innata",
                "ar": "ما للإنسان منذ ولادته — الطبيعة الفطرية",
            }},
            "D": {"text": {
                "en": "The property of a thing",
                "fr": "La propriété d'une chose",
                "es": "La propiedad de una cosa",
                "ar": "خصيصة الشيء",
            }},
        },
    },
    "命": {
        "benyi": {
            "en": "An instruction from above — Heaven's mandate, a command",
            "fr": "Une instruction d'en haut — le mandat du Ciel, un ordre",
            "es": "Una instrucción de arriba: el mandato del Cielo, una orden",
            "ar": "أمرٌ من الأعلى — القضاء الإلهي والأمر",
        },
        "jinyi": {
            "en": "Command, life, fate",
            "fr": "Ordre, vie, destin",
            "es": "Orden, vida, destino",
            "ar": "الأمر والحياة والقدر",
        },
        "story": {
            "en": "\"Ming\" is \"mouth\" with \"to order\" (which also gives the sound): originally a spoken instruction from above, extended to what Heaven bestows — mandate, lifespan, fate. \"Without knowing ming, one cannot be a junzi\" — to know ming is not fatalism but knowing what to do and where to stop.",
            "fr": "« Ming » est « bouche » avec « ordonner » (qui donne aussi le son) : à l'origine, une instruction orale d'en haut, étendue à ce que le Ciel accorde — mandat, durée de vie, destin. « Sans connaître ming, on ne peut être junzi » — connaître ming n'est pas fatalisme, mais savoir ce qu'il faut faire et où s'arrêter.",
            "es": "«Ming» es «boca» con «ordenar» (que da el sonido): originalmente una instrucción oral de arriba, extendida a lo que el Cielo otorga: mandato, duración de la vida, destino. «Sin conocer ming, no se puede ser junzi»: conocer ming no es fatalismo, sino saber qué hacer y dónde detenerse.",
            "ar": "«مينغ» هي «الفم» مع «الأمر» (وهي تفيد الصوت أيضًا): في الأصل أمرٌ منطوق من الأعلى، ثم اتسع إلى ما يمنحه السماء — القضاء والعمر والقدر. «من لا يعرف مينغ لا يكون جونزي» — ومعرفة مينغ ليست جبرية بل معرفة ما ينبغي فعله وما ينبغي الكفّ عنه.",
        },
        "options": {
            "A": {"text": {
                "en": "An instruction from above — Heaven's mandate, a command",
                "fr": "Une instruction d'en haut — mandat du Ciel, ordre",
                "es": "Una instrucción de arriba: el mandato del Cielo, una orden",
                "ar": "أمرٌ من الأعلى — القضاء والأمر",
            }},
            "B": {"text": {
                "en": "Life, one's life",
                "fr": "La vie, l'existence",
                "es": "La vida, la existencia",
                "ar": "الحياة والنفس",
            }},
            "C": {"text": {
                "en": "To name",
                "fr": "Nommer",
                "es": "Nombrar",
                "ar": "التسمية",
            }},
            "D": {"text": {
                "en": "Fate, luck",
                "fr": "Destin, chance",
                "es": "Destino, suerte",
                "ar": "القدر والحظ",
            }},
        },
    },
    "天": {
        "benyi": {
            "en": "The highest place above a person's head",
            "fr": "Le lieu le plus haut au-dessus de la tête de l'homme",
            "es": "El lugar más alto sobre la cabeza del hombre",
            "ar": "أعلى موضع فوق رأس الإنسان",
        },
        "jinyi": {
            "en": "Sky, nature, Heaven's mandate",
            "fr": "Ciel, nature, mandat du Ciel",
            "es": "Cielo, naturaleza, mandato del Cielo",
            "ar": "السماء والطبيعة والقضاء",
        },
        "story": {
            "en": "In oracle bone script \"tian\" is an upright human figure with a line above the head marking the crown. Its original sense is \"above a person's head\" — the highest sky, extended to nature, heavenly principle, the sovereign power. \"As Heaven moves with vigour, so the junzi strives without ceasing\" — Heaven's course is the highest model for Confucian self-cultivation.",
            "fr": "En écriture ossécaille, « tian » est une figure humaine debout avec un trait au-dessus de la tête marquant le sommet. Son sens premier : « au-dessus de la tête » — le ciel le plus haut, étendu à la nature, au principe céleste, à la puissance souveraine. « Comme le Ciel se meut avec vigueur, le junzi s'efforce sans cesse » — la course du Ciel est le modèle suprême de la cultivation de soi.",
            "es": "En hueso oracular «tian» es una figura humana erguida con una raya sobre la cabeza que marca la coronilla. Su sentido primero: «sobre la cabeza»: el cielo más alto, extendido a la naturaleza, el principio celeste, el poder soberano. «Como el Cielo se mueve con vigor, el junzi se esfuerza sin cesar»: la marcha del Cielo es el modelo supremo del cultivo de sí.",
            "ar": "في كتابة العظام «تيان» شكل إنسان منتصب وفوق رأسه خطّ يدل على اليافوخ. ومعناها الأول «فوق الرأس» — أعلى السماء، ثم اتسعت إلى الطبيعة والقانون السماوي والسلطان. و«كما يسير السماء بقوة يجتهد الجونزي بلا انقطاع» — فسير السماء أعلى قدوة في التربية الكونفوشية.",
        },
        "options": {
            "A": {"text": {
                "en": "The sky",
                "fr": "Le ciel",
                "es": "El cielo",
                "ar": "السماء",
            }},
            "B": {"text": {
                "en": "Weather",
                "fr": "Le temps",
                "es": "El tiempo",
                "ar": "الطقس",
            }},
            "C": {"text": {
                "en": "The highest place above a person's head",
                "fr": "Le lieu le plus haut au-dessus de la tête",
                "es": "El lugar más alto sobre la cabeza",
                "ar": "أعلى موضع فوق رأس الإنسان",
            }},
            "D": {"text": {
                "en": "A day, days",
                "fr": "Un jour, les jours",
                "es": "Un día, los días",
                "ar": "اليوم والأيام",
            }},
        },
    },
    "圣": {
        "benyi": {
            "en": "Keen of ear and eloquent of mouth — one who hears and understands, speaks and can act",
            "fr": "L'oreille fine et la bouche éloquente — qui entend et comprend, parle et peut agir",
            "es": "Oído fino y boca elocuente: quien oye y comprende, habla y puede obrar",
            "ar": "حِدّة السمع وبلاغة الفم — من يسمع فيفهم ويتكلم فيقدر على الفعل",
        },
        "jinyi": {
            "en": "The sage, the sacred",
            "fr": "Le sage, le sacré",
            "es": "El sabio, lo sagrado",
            "ar": "القدّيس والمقدّس",
        },
        "story": {
            "en": "The traditional form joins \"ear\", \"mouth\" and a person standing erect. Its original sense is one keen of ear, able to speak so as to awaken others, and upright in conduct — the \"sage\". The Confucian sage is not a god but \"the utmost of men\": virtue, wisdom and conduct all at their peak.",
            "fr": "La forme traditionnelle réunit « oreille », « bouche » et un homme debout. Son sens premier : qui a l'oreille fine, sait parler pour éveiller autrui et se tient droit en sa conduite — le « sage ». Le sage confucéen n'est pas un dieu mais « le comble de l'humain » : vertu, sagesse et conduite à leur sommet.",
            "es": "La forma tradicional une «oreja», «boca» y una persona erguida. Su sentido primero: quien tiene oído fino, sabe hablar para despertar a otros y se mantiene recto en su conducta: el «sabio». El sabio confuciano no es un dios sino «el colmo de lo humano»: virtud, sabiduría y conducta en su cúspide.",
            "ar": "الشكل التقليدي يجمع «الأذن» و«الفم» وإنسانًا منتصبًا. ومعناها الأول من حَدّ سمعه، وأحسن القول لينبّه غيره، واستقام في سلوكه — «القدّيس». وقدّيس الكونفوشية ليس إلهًا بل «أقصى ما يبلغه الإنسان»: فضيلة وحكمة وسلوكًا في الذروة.",
        },
        "options": {
            "A": {"text": {
                "en": "The sacred in religion",
                "fr": "Le sacré dans la religion",
                "es": "Lo sagrado en la religión",
                "ar": "المقدّس في الدين",
            }},
            "B": {"text": {
                "en": "Keen of ear and eloquent of mouth — one who hears and understands, speaks and can act",
                "fr": "Oreille fine et bouche éloquente — qui entend, comprend, parle et agit",
                "es": "Oído fino y boca elocuente: quien oye, comprende, habla y obra",
                "ar": "حِدّة السمع وبلاغة الفم — يسمع فيفهم ويتكلم فيفعل",
            }},
            "C": {"text": {
                "en": "An imperial edict",
                "fr": "Un édit impérial",
                "es": "Un edicto imperial",
                "ar": "المرسوم الإمبراطوري",
            }},
            "D": {"text": {
                "en": "Scoring high in an exam",
                "fr": "Obtenir une note élevée à l'examen",
                "es": "Sacar alta nota en un examen",
                "ar": "النجاح بدرجات عالية",
            }},
        },
    },
    "心": {
        "benyi": {
            "en": "Shaped like the heart",
            "fr": "Figurant la forme du cœur",
            "es": "Que figura la forma del corazón",
            "ar": "مرسومة على شكل القلب",
        },
        "jinyi": {
            "en": "Heart, thoughts, centre",
            "fr": "Cœur, pensées, centre",
            "es": "Corazón, pensamientos, centro",
            "ar": "القلب والخواطر والمركز",
        },
        "story": {
            "en": "In oracle bone script \"xin\" is drawn in the shape of the heart. The ancients held the heart to be the organ of thought, hence \"thought\", \"to think\", \"to remember\" and \"forbearance\" all take it as radical. The Confucian \"four sprouts of the heart\" — commiseration, shame, deference, and the sense of right and wrong — are the beginnings of benevolence, righteousness, propriety and wisdom.",
            "fr": "En écriture ossécaille, « xin » figure la forme du cœur. Les anciens tenaient le cœur pour l'organe de la pensée, d'où « pensée », « penser », « se souvenir » et « indulgence » qui le prennent pour radical. Les « quatre germes du cœur » confucéens — commisération, honte, déférence et sens du juste et de l'injuste — sont les commencements de la bienveillance, de la justice, de la propriété et de la sagesse.",
            "es": "En hueso oracular «xin» se dibuja con la forma del corazón. Los antiguos tenían el corazón por órgano del pensamiento; de ahí que «pensamiento», «pensar», «recordar» y «tolerancia» lo tomen por radical. Los «cuatro brotes del corazón» confucianos —conmiseración, vergüenza, deferencia y sentido de lo justo— son los comienzos de la benevolencia, la rectitud, la propiedad y la sabiduría.",
            "ar": "في كتابة العظام رُسمت «شين» على هيئة القلب. ورأى القدماء أن القلب عضو التفكير، ولذلك اتخذت «الفكر» و«التفكير» و«التذكر» و«التسامح» منه مقطعًا جذريًا. و«براعم القلب الأربعة» عند الكونفوشيين — الشفقة والحياء والإيثار وتمييز الصواب — هي منابت الإحسان والاستقامة واللياقة والحكمة.",
        },
        "options": {
            "A": {"text": {
                "en": "Centre, core",
                "fr": "Centre, noyau",
                "es": "Centro, núcleo",
                "ar": "المركز واللبّ",
            }},
            "B": {"text": {
                "en": "Shaped like the heart",
                "fr": "Figurant la forme du cœur",
                "es": "Que figura la forma del corazón",
                "ar": "مرسومة على شكل القلب",
            }},
            "C": {"text": {
                "en": "Mood, emotion",
                "fr": "Humeur, émotion",
                "es": "Ánimo, emoción",
                "ar": "المزاج والعاطفة",
            }},
            "D": {"text": {
                "en": "To apply oneself, to concentrate",
                "fr": "S'appliquer, se concentrer",
                "es": "Aplicarse, concentrarse",
                "ar": "الإخلاص والتركيز",
            }},
        },
    },
}
