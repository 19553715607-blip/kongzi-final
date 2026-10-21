"""数艺（math）场景文案的多语数据。

被 `seed_scenario_i18n.py` 导入。单列成文件是因为数艺的文案量远大于乐/御
（7 个场景 / 27 个明细项，共约 412 条译文），混在主模块里会让那个文件难以阅读。
命名与项目既有的 `seed_math_scenarios.py` 分文件风格一致。

## 结构

```python
{
  "<中文 title>": {
      "title":      {lang: 译文},     # 场景级普通字段，存 {field}_i18n 列
      "kind_label": {lang: 译文},
      "setting":    {lang: 译文},
      "hint":       {lang: 译文},
      "unit":       {lang: 译文},
      "items": {                       # 明细行，存 items_i18n 列
          "<中文 name>": {             # ← 以中文 name 为键
              "name":      {lang: 译名},   # 显示用译名（响应里叫 name_display）
              "attrs":     {lang: 译文},
              "principle": {lang: 译文},
          },
          ...
      },
  },
  ...
}
```

## 两个关键约束

1. **明细行的中文 `name` 是前后端协议键，不译。** `allocations` 以它为键、
   后端 `solve` 还用它校验入参（见 `routers/math.py` 的 `valid_names`）。
   译名单独放在 `name_display`，前端渲染用 `name_display ?? name`，
   **所有查表仍用中文 `name`**。

2. **`metrics` / `metric_labels` / `default_weights` 不译。** 它们是中文键的
   数值字典，前端目前**从不渲染**（只有 `name` / `attrs` / `principle` / `unit` 上屏）。
   翻译死代码是无用功；若日后前端要显示它们，需按同样思路补一份键映射。

## 单位译法

`unit` 是**有语义的量词**，按意译处理（担→piculs、工日→man-days、车→cartloads…），
与「五御」名目的处理同理 —— 它们承载可理解的语义，不是纯标识。
"""
from __future__ import annotations

MATH_SCENARIO_I18N: dict[str, dict] = {
    "均输三乡赋税": {
        "title": {
            "en": "Proportional Tax on Three Villages",
            "fr": "Impôt proportionnel des trois villages",
            "es": "Impuesto proporcional de las tres aldeas",
            "ar": "ضريبة تناسبية على القرى الثلاث",
        },
        "kind_label": {
            "en": "Proportional Levy",
            "fr": "Répartition proportionnelle",
            "es": "Reparto proporcional",
            "ar": "التوزيع التناسبي",
        },
        "setting": {
            "en": "A county must deliver 90 piculs of tax rice, to be shared fairly among three villages in proportion to their fields.",
            "fr": "Un district doit livrer 90 piculs de riz d'impôt, à répartir équitablement entre trois villages selon leurs terres.",
            "es": "Un distrito debe entregar 90 piculs de arroz de impuesto, repartidos con equidad entre tres aldeas según sus tierras.",
            "ar": "على قضاء أن يسلّم ٩٠ قنطارًا من أرز الضريبة، تُوزَّع بالعدل على ثلاث قرى بحسب مساحة أراضيها.",
        },
        "hint": {
            "en": "\"Proportional levy\" divides in direct proportion to weight: the more fields, the greater the share. Total 33 mu → about 2.73 piculs per mu.",
            "fr": "La « répartition proportionnelle » divise selon le poids : plus de terres, plus de charge. Total 33 mu → environ 2,73 piculs par mu.",
            "es": "El «reparto proporcional» divide en proporción directa al peso: más tierras, mayor carga. Total 33 mu → unos 2,73 piculs por mu.",
            "ar": "«التوزيع التناسبي» يقسم بالتناسب الطردي مع الوزن: كلما زادت الأرض زاد النصيب. المجموع ٣٣ مو → نحو ٢٫٧٣ قنطار للمو.",
        },
        "unit": {
            "en": "piculs",
            "fr": "piculs",
            "es": "piculs",
            "ar": "قنطار",
        },
        "items": {
            "甲乡": {
                "name": {"en": "Village A", "fr": "Village A", "es": "Aldea A", "ar": "القرية أ"},
                "attrs": {
                    "en": "5 households · 4 mu per household = 20 mu",
                    "fr": "5 foyers · 4 mu par foyer = 20 mu",
                    "es": "5 hogares · 4 mu por hogar = 20 mu",
                    "ar": "٥ أسر · ٤ مو للأسرة = ٢٠ مو",
                },
                "principle": {
                    "en": "First apportion by the land's capacity to bear; then see whether the hard-pressed need relief.",
                    "fr": "Répartissez d'abord selon la capacité des terres ; voyez ensuite si les plus démunis ont besoin d'aide.",
                    "es": "Reparte primero según la capacidad de las tierras; luego mira si los más necesitados requieren alivio.",
                    "ar": "وزّع أولًا بحسب قدرة الأرض على التحمل، ثم انظر هل يحتاج المعوزون إلى مراعاة.",
                },
            },
            "乙乡": {
                "name": {"en": "Village B", "fr": "Village B", "es": "Aldea B", "ar": "القرية ب"},
                "attrs": {
                    "en": "3 households · 3 mu per household = 9 mu",
                    "fr": "3 foyers · 3 mu par foyer = 9 mu",
                    "es": "3 hogares · 3 mu por hogar = 9 mu",
                    "ar": "٣ أسر · ٣ مو للأسرة = ٩ مو",
                },
            },
            "丙乡": {
                "name": {"en": "Village C", "fr": "Village C", "es": "Aldea C", "ar": "القرية ج"},
                "attrs": {
                    "en": "2 households · 2 mu per household = 4 mu",
                    "fr": "2 foyers · 2 mu par foyer = 4 mu",
                    "es": "2 hogares · 2 mu por hogar = 4 mu",
                    "ar": "٢ أسر · ٢ مو للأسرة = ٤ مو",
                },
            },
        },
    },
    "五子衰分父遗": {
        "title": {
            "en": "A Father's Bequest to Five Sons",
            "fr": "Le legs d'un père à cinq fils",
            "es": "El legado de un padre a cinco hijos",
            "ar": "تركة أب لخمسة أبناء",
        },
        "kind_label": {
            "en": "Ranked Distribution",
            "fr": "Répartition par rang",
            "es": "Distribución por rangos",
            "ar": "التوزيع بالمراتب",
        },
        "setting": {
            "en": "A father leaves 100 in gold, to be divided among five sons in decreasing shares by seniority (5:4:3:2:1). How much does each receive?",
            "fr": "Un père laisse 100 d'or, à partager entre cinq fils selon l'ordre de naissance, en parts décroissantes (5:4:3:2:1). Combien chacun reçoit-il ?",
            "es": "Un padre deja 100 en oro, para repartir entre cinco hijos en partes decrecientes por orden de nacimiento (5:4:3:2:1). ¿Cuánto recibe cada uno?",
            "ar": "يترك الأب ١٠٠ من الذهب تُقسم على خمسة أبناء بنسب متناقصة بحسب السن (٥:٤:٣:٢:١). فكم ينال كلٌّ منهم؟",
        },
        "hint": {
            "en": "\"Ranked distribution\" decreases by rank or seniority. The ratio 5:4:3:2:1 gives 15 parts → 100 ÷ 15 ≈ 6.67 gold per part.",
            "fr": "La « répartition par rang » décroît selon le rang ou l'âge. Le rapport 5:4:3:2:1 donne 15 parts → 100 ÷ 15 ≈ 6,67 d'or par part.",
            "es": "La «distribución por rangos» decrece según el rango o la edad. La razón 5:4:3:2:1 da 15 partes → 100 ÷ 15 ≈ 6,67 de oro por parte.",
            "ar": "«التوزيع بالمراتب» يتناقص بحسب المرتبة أو السن. والنسبة ٥:٤:٣:٢:١ تعطي ١٥ سهمًا → ١٠٠ ÷ ١٥ ≈ ٦٫٦٧ من الذهب للسهم.",
        },
        "unit": {
            "en": "gold",
            "fr": "or",
            "es": "oro",
            "ar": "ذهب",
        },
        "items": {
            "长子": {
                "name": {"en": "Eldest son", "fr": "Fils aîné", "es": "Hijo mayor", "ar": "الابن الأكبر"},
                "attrs": {"en": "share 5", "fr": "part 5", "es": "parte 5", "ar": "سهم ٥"},
                "principle": {
                    "en": "Ranked distribution honours precedence of status; yet in modern discussion one may also weigh need and care.",
                    "fr": "La répartition par rang respecte la préséance du statut ; mais la discussion moderne peut aussi peser le besoin et le soin.",
                    "es": "La distribución por rangos honra la precedencia del estatus; mas la discusión moderna puede también pesar la necesidad y el cuidado.",
                    "ar": "التوزيع بالمراتب يراعي تقدّم المكانة، غير أن النقاش الحديث قد يوازن أيضًا بين الحاجة والرعاية.",
                },
            },
            "次子": {
                "name": {"en": "Second son", "fr": "Deuxième fils", "es": "Segundo hijo", "ar": "الابن الثاني"},
                "attrs": {"en": "share 4", "fr": "part 4", "es": "parte 4", "ar": "سهم ٤"},
            },
            "三子": {
                "name": {"en": "Third son", "fr": "Troisième fils", "es": "Tercer hijo", "ar": "الابن الثالث"},
                "attrs": {"en": "share 3", "fr": "part 3", "es": "parte 3", "ar": "سهم ٣"},
            },
            "四子": {
                "name": {"en": "Fourth son", "fr": "Quatrième fils", "es": "Cuarto hijo", "ar": "الابن الرابع"},
                "attrs": {"en": "share 2", "fr": "part 2", "es": "parte 2", "ar": "سهم ٢"},
            },
            "幼子": {
                "name": {"en": "Youngest son", "fr": "Fils cadet", "es": "Hijo menor", "ar": "الابن الأصغر"},
                "attrs": {"en": "share 1", "fr": "part 1", "es": "parte 1", "ar": "سهم ١"},
            },
        },
    },
    "四州分赈灾粮": {
        "title": {
            "en": "Relief Grain for Four Provinces",
            "fr": "Grain de secours pour quatre provinces",
            "es": "Grano de socorro para cuatro provincias",
            "ar": "غلال الإغاثة لأربع ولايات",
        },
        "kind_label": {
            "en": "Proportional Levy",
            "fr": "Répartition proportionnelle",
            "es": "Reparto proporcional",
            "ar": "التوزيع التناسبي",
        },
        "setting": {
            "en": "The provincial office releases 200 bushels of relief grain, shared among four provinces by \"population × damage rate\". The more populous and the harder hit receive more.",
            "fr": "L'administration provinciale libère 200 boisseaux de grain de secours, répartis entre quatre provinces selon « population × taux de dégâts ». Les plus peuplées et les plus sinistrées reçoivent davantage.",
            "es": "La oficina provincial libera 200 fanegas de grano de socorro, repartidas entre cuatro provincias según «población × tasa de daños». Las más pobladas y las más castigadas reciben más.",
            "ar": "تفرج الإدارة الولائية عن ٢٠٠ كيل من غلال الإغاثة، تُوزَّع على أربع ولايات بحسب «السكان × نسبة الأضرار». فالأكثر سكانًا وأشد تضررًا ينال أكثر.",
        },
        "hint": {
            "en": "Weight = population × damage rate. Total weight = 10×0.8 + 6×0.5 + 4×0.3 + 5×0.4 = 13.2.",
            "fr": "Poids = population × taux de dégâts. Poids total = 10×0,8 + 6×0,5 + 4×0,3 + 5×0,4 = 13,2.",
            "es": "Peso = población × tasa de daños. Peso total = 10×0,8 + 6×0,5 + 4×0,3 + 5×0,4 = 13,2.",
            "ar": "الوزن = السكان × نسبة الأضرار. الوزن الإجمالي = ١٠×٠٫٨ + ٦×٠٫٥ + ٤×٠٫٣ + ٥×٠٫٤ = ١٣٫٢.",
        },
        "unit": {
            "en": "bushels",
            "fr": "boisseaux",
            "es": "fanegas",
            "ar": "كيل",
        },
        "items": {
            "东州": {
                "name": {"en": "Eastern Province", "fr": "Province de l'Est", "es": "Provincia del Este", "ar": "الولاية الشرقية"},
                "attrs": {
                    "en": "100,000 people · 80% damage",
                    "fr": "100 000 habitants · 80 % de dégâts",
                    "es": "100.000 habitantes · 80 % de daños",
                    "ar": "١٠٠٬٠٠٠ نسمة · ٨٠٪ أضرار",
                },
                "principle": {
                    "en": "Relief grain looks first to population and disaster; distance affects only logistics and must not outweigh the urgency of the people's survival.",
                    "fr": "Le grain de secours privilégie la population et le désastre ; la distance ne touche que la logistique et ne doit pas primer sur l'urgence vitale.",
                    "es": "El grano de socorro atiende primero a la población y al desastre; la distancia solo afecta la logística y no debe pesar más que la urgencia vital.",
                    "ar": "غلال الإغاثة تنظر أولًا إلى السكان والكارثة، والمسافة تؤثر في التنظيم فقط ولا ينبغي أن تسبق ضرورة بقاء الناس.",
                },
            },
            "南州": {
                "name": {"en": "Southern Province", "fr": "Province du Sud", "es": "Provincia del Sur", "ar": "الولاية الجنوبية"},
                "attrs": {
                    "en": "60,000 people · 50% damage",
                    "fr": "60 000 habitants · 50 % de dégâts",
                    "es": "60.000 habitantes · 50 % de daños",
                    "ar": "٦٠٬٠٠٠ نسمة · ٥٠٪ أضرار",
                },
            },
            "西州": {
                "name": {"en": "Western Province", "fr": "Province de l'Ouest", "es": "Provincia del Oeste", "ar": "الولاية الغربية"},
                "attrs": {
                    "en": "40,000 people · 30% damage",
                    "fr": "40 000 habitants · 30 % de dégâts",
                    "es": "40.000 habitantes · 30 % de daños",
                    "ar": "٤٠٬٠٠٠ نسمة · ٣٠٪ أضرار",
                },
            },
            "北州": {
                "name": {"en": "Northern Province", "fr": "Province du Nord", "es": "Provincia del Norte", "ar": "الولاية الشمالية"},
                "attrs": {
                    "en": "50,000 people · 40% damage",
                    "fr": "50 000 habitants · 40 % de dégâts",
                    "es": "50.000 habitantes · 40 % de daños",
                    "ar": "٥٠٬٠٠٠ نسمة · ٤٠٪ أضرار",
                },
            },
        },
    },
    "三班分劳役": {
        "title": {
            "en": "Corvée Shared by Three Squads",
            "fr": "Corvée répartie entre trois équipes",
            "es": "Carga repartida entre tres cuadrillas",
            "ar": "الأعمال الشاقة على ثلاث فرق",
        },
        "kind_label": {
            "en": "Ranked Distribution",
            "fr": "Répartition par rang",
            "es": "Distribución por rangos",
            "ar": "التوزيع بالمراتب",
        },
        "setting": {
            "en": "30 man-days of corvée, shared among three squads by \"able-bodied men ÷ fitness factor\" — squads with more men and better fitness bear more.",
            "fr": "30 jours-homme de corvée, répartis entre trois équipes selon « hommes valides ÷ facteur de vigueur » — les équipes plus nombreuses et plus robustes en portent davantage.",
            "es": "30 jornales de corvée, repartidos entre tres cuadrillas según «hombres aptos ÷ factor de vigor»: las cuadrillas con más hombres y mejor forma cargan más.",
            "ar": "ثلاثون يوم عمل من الأعمال الشاقة، تُوزَّع على ثلاث فرق بحسب «عدد الأقوياء ÷ معامل الجَلَد» — فالفرق الأكثر عددًا والأقوى تتحمل أكثر.",
        },
        "hint": {
            "en": "Weight = able-bodied men ÷ fitness factor. Squad A: 20÷1=20, B: 15÷2=7.5, C: 10÷3=3.33. Total 30.83.",
            "fr": "Poids = hommes valides ÷ facteur de vigueur. Équipe A : 20÷1=20, B : 15÷2=7,5, C : 10÷3=3,33. Total 30,83.",
            "es": "Peso = hombres aptos ÷ factor de vigor. Cuadrilla A: 20÷1=20, B: 15÷2=7,5, C: 10÷3=3,33. Total 30,83.",
            "ar": "الوزن = الأقوياء ÷ معامل الجَلَد. الفرقة أ: ٢٠÷١=٢٠، ب: ١٥÷٢=٧٫٥، ج: ١٠÷٣=٣٫٣٣. المجموع ٣٠٫٨٣.",
        },
        "unit": {
            "en": "man-days",
            "fr": "jours-homme",
            "es": "jornales",
            "ar": "أيام عمل",
        },
        "items": {
            "甲班": {
                "name": {"en": "Squad A", "fr": "Équipe A", "es": "Cuadrilla A", "ar": "الفرقة أ"},
                "attrs": {
                    "en": "20 able-bodied · fitness 1 (strongest)",
                    "fr": "20 hommes valides · vigueur 1 (les plus forts)",
                    "es": "20 aptos · vigor 1 (los más fuertes)",
                    "ar": "٢٠ قويًّا · جَلَد ١ (الأقوى)",
                },
                "principle": {
                    "en": "Corvée is apportioned by numbers and by capacity to bear; care for the weaker may serve as a correction.",
                    "fr": "La corvée se répartit selon le nombre et la capacité à supporter ; le soin des plus faibles peut servir de correctif.",
                    "es": "La corvée se reparte según el número y la capacidad de aguante; el cuidado de los más débiles puede servir de corrección.",
                    "ar": "تُوزَّع الأعمال بحسب العدد والقدرة على التحمل، ومراعاة الأضعف قد تكون عامل تصحيح.",
                },
            },
            "乙班": {
                "name": {"en": "Squad B", "fr": "Équipe B", "es": "Cuadrilla B", "ar": "الفرقة ب"},
                "attrs": {
                    "en": "15 able-bodied · fitness 2",
                    "fr": "15 hommes valides · vigueur 2",
                    "es": "15 aptos · vigor 2",
                    "ar": "١٥ قويًّا · جَلَد ٢",
                },
            },
            "丙班": {
                "name": {"en": "Squad C", "fr": "Équipe C", "es": "Cuadrilla C", "ar": "الفرقة ج"},
                "attrs": {
                    "en": "10 able-bodied · fitness 3 (weaker)",
                    "fr": "10 hommes valides · vigueur 3 (plus faibles)",
                    "es": "10 aptos · vigor 3 (más débiles)",
                    "ar": "١٠ أقوياء · جَلَد ٣ (الأضعف)",
                },
            },
        },
    },
    "五县分驻军": {
        "title": {
            "en": "Garrison Troops for Five Counties",
            "fr": "Troupes de garnison pour cinq districts",
            "es": "Tropas de guarnición para cinco distritos",
            "ar": "حامية عسكرية لخمس مقاطعات",
        },
        "kind_label": {
            "en": "Proportional Levy",
            "fr": "Répartition proportionnelle",
            "es": "Reparto proporcional",
            "ar": "التوزيع التناسبي",
        },
        "setting": {
            "en": "The Ministry of War sends 500 soldiers to garrison five counties, allocated by \"recruitment base + strategic weight × 2\".",
            "fr": "Le ministère de la Guerre envoie 500 soldats tenir garnison dans cinq districts, répartis selon « base de recrutement + poids stratégique × 2 ».",
            "es": "El Ministerio de la Guerra envía 500 soldados a guarnecer cinco distritos, repartidos según «base de reclutamiento + peso estratégico × 2».",
            "ar": "ترسل وزارة الحرب ٥٠٠ جندي لحامية خمس مقاطعات، تُوزَّع بحسب «مصدر التجنيد + الثقل الاستراتيجي × ٢».",
        },
        "hint": {
            "en": "Weight = recruitment base + strategic weight×2. County A: 8+3×2=14. Total weight = 14+10+8+12+6 = 50, i.e. 10 soldiers per unit weight.",
            "fr": "Poids = base de recrutement + poids stratégique×2. District A : 8+3×2=14. Poids total = 14+10+8+12+6 = 50, soit 10 soldats par unité.",
            "es": "Peso = base de reclutamiento + peso estratégico×2. Distrito A: 8+3×2=14. Peso total = 14+10+8+12+6 = 50, es decir 10 soldados por unidad.",
            "ar": "الوزن = مصدر التجنيد + الثقل الاستراتيجي×٢. المقاطعة أ: ٨+٣×٢=١٤. الوزن الإجمالي = ١٤+١٠+٨+١٢+٦ = ٥٠، أي ١٠ جنود لكل وحدة وزن.",
        },
        "unit": {
            "en": "soldiers",
            "fr": "soldats",
            "es": "soldados",
            "ar": "جنود",
        },
        "items": {
            "A 县": {
                "name": {"en": "County A", "fr": "District A", "es": "Distrito A", "ar": "المقاطعة أ"},
                "attrs": {
                    "en": "base 8 · strategic weight 3",
                    "fr": "base 8 · poids stratégique 3",
                    "es": "base 8 · peso estratégico 3",
                    "ar": "التجنيد ٨ · الثقل الاستراتيجي ٣",
                },
                "principle": {
                    "en": "Garrison allocation must weigh both recruitment base and strategic position, while avoiding too heavy a burden on the populace.",
                    "fr": "La répartition des garnisons doit concilier base de recrutement et position stratégique, tout en évitant de trop peser sur les habitants.",
                    "es": "El reparto de guarniciones ha de conciliar base de reclutamiento y posición estratégica, evitando a la vez gravitar en exceso sobre los habitantes.",
                    "ar": "توزيع الحاميات يوازن بين مصدر التجنيد والموقع الاستراتيجي، مع تجنّب إثقال كاهل الأهالي.",
                },
            },
            "B 县": {
                "name": {"en": "County B", "fr": "District B", "es": "Distrito B", "ar": "المقاطعة ب"},
                "attrs": {
                    "en": "base 6 · strategic weight 2",
                    "fr": "base 6 · poids stratégique 2",
                    "es": "base 6 · peso estratégico 2",
                    "ar": "التجنيد ٦ · الثقل الاستراتيجي ٢",
                },
            },
            "C 县": {
                "name": {"en": "County C", "fr": "District C", "es": "Distrito C", "ar": "المقاطعة ج"},
                "attrs": {
                    "en": "base 4 · strategic weight 2",
                    "fr": "base 4 · poids stratégique 2",
                    "es": "base 4 · peso estratégico 2",
                    "ar": "التجنيد ٤ · الثقل الاستراتيجي ٢",
                },
            },
            "D 县": {
                "name": {"en": "County D", "fr": "District D", "es": "Distrito D", "ar": "المقاطعة د"},
                "attrs": {
                    "en": "base 6 · strategic weight 3",
                    "fr": "base 6 · poids stratégique 3",
                    "es": "base 6 · peso estratégico 3",
                    "ar": "التجنيد ٦ · الثقل الاستراتيجي ٣",
                },
            },
            "E 县": {
                "name": {"en": "County E", "fr": "District E", "es": "Distrito E", "ar": "المقاطعة هـ"},
                "attrs": {
                    "en": "base 4 · strategic weight 1",
                    "fr": "base 4 · poids stratégique 1",
                    "es": "base 4 · peso estratégico 1",
                    "ar": "التجنيد ٤ · الثقل الاستراتيجي ١",
                },
            },
        },
    },
    "水渠工料筹算": {
        "title": {
            "en": "Materials for the Water Channels",
            "fr": "Matériaux pour les canaux",
            "es": "Materiales para los canales",
            "ar": "مواد لقنوات الماء",
        },
        "kind_label": {
            "en": "Waterworks Calculation",
            "fr": "Calcul des ouvrages hydrauliques",
            "es": "Cálculo de obras hidráulicas",
            "ar": "حساب أعمال الماء",
        },
        "setting": {
            "en": "Before the rains, 120 cartloads of stone must be shared among four channel sections. You must weigh danger, population and difficulty of works.",
            "fr": "Avant les pluies, 120 charretées de pierre doivent être réparties entre quatre tronçons de canal. Il faut peser le danger, la population et la difficulté des travaux.",
            "es": "Antes de las lluvias hay que repartir 120 carretadas de piedra entre cuatro tramos de canal. Has de sopesar el peligro, la población y la dificultad de la obra.",
            "ar": "قبل الأمطار يجب توزيع ١٢٠ عربة حجارة على أربعة مقاطع من القناة. وعليك أن توازن بين الخطر والسكان وصعوبة العمل.",
        },
        "hint": {
            "en": "It is advised to give priority to danger and population; the harder the works, the more they need — but no section may be left undefended.",
            "fr": "Il est conseillé de privilégier le danger et la population ; plus les travaux sont difficiles, plus il faut y investir — sans laisser aucun tronçon à l'abandon.",
            "es": "Se aconseja dar prioridad al peligro y a la población; cuanto más difícil la obra, más inversión requiere, pero ningún tramo puede quedar desatendido.",
            "ar": "يُنصح بإيلاء الأولوية للخطر والسكان؛ وكلما صعُب العمل احتاج مزيدًا، على ألا يُترك أي مقطع دون حماية.",
        },
        "unit": {
            "en": "cartloads",
            "fr": "charretées",
            "es": "carretadas",
            "ar": "عربات",
        },
        "items": {
            "上游险段": {
                "name": {"en": "Upper Danger Reach", "fr": "Tronçon amont exposé", "es": "Tramo alto en riesgo", "ar": "المقطع الخطر الأعلى"},
                "attrs": {
                    "en": "danger 9 · people protected 6 · difficulty 5",
                    "fr": "danger 9 · population protégée 6 · difficulté 5",
                    "es": "peligro 9 · población protegida 6 · dificultad 5",
                    "ar": "الخطر ٩ · حماية الأهالي ٦ · الصعوبة ٥",
                },
                "principle": {
                    "en": "Waterworks reckoning looks beyond sheer volume: first preserve lives, then seek lasting stability.",
                    "fr": "Le calcul des ouvrages hydrauliques ne se limite pas au volume : d'abord préserver les vies, ensuite viser une stabilité durable.",
                    "es": "El cálculo de las obras hidráulicas no se limita al volumen: primero preservar las vidas, luego buscar una estabilidad duradera.",
                    "ar": "حساب أعمال الماء لا يقف عند حجم العمل: أولًا حفظ الأرواح، ثم طلب الاستقرار الدائم.",
                },
            },
            "东村渠口": {
                "name": {"en": "East Village Intake", "fr": "Prise du village de l'Est", "es": "Toma de la aldea del Este", "ar": "مأخذ القرية الشرقية"},
                "attrs": {
                    "en": "danger 6 · people protected 8 · difficulty 3",
                    "fr": "danger 6 · population protégée 8 · difficulté 3",
                    "es": "peligro 6 · población protegida 8 · dificultad 3",
                    "ar": "الخطر ٦ · حماية الأهالي ٨ · الصعوبة ٣",
                },
            },
            "西田支渠": {
                "name": {"en": "West Field Branch", "fr": "Bief des champs de l'Ouest", "es": "Ramal del campo del Oeste", "ar": "الفرع الغربي للحقول"},
                "attrs": {
                    "en": "danger 4 · people protected 5 · difficulty 4",
                    "fr": "danger 4 · population protégée 5 · difficulté 4",
                    "es": "peligro 4 · población protegida 5 · dificultad 4",
                    "ar": "الخطر ٤ · حماية الأهالي ٥ · الصعوبة ٤",
                },
            },
            "南堤尾闸": {
                "name": {"en": "South Dyke Sluice", "fr": "Écluse du sud de la digue", "es": "Compuerta sur del dique", "ar": "هويس السد الجنوبي"},
                "attrs": {
                    "en": "danger 3 · people protected 4 · difficulty 2",
                    "fr": "danger 3 · population protégée 4 · difficulté 2",
                    "es": "peligro 3 · población protegida 4 · dificultad 2",
                    "ar": "الخطر ٣ · حماية الأهالي ٤ · الصعوبة ٢",
                },
            },
        },
    },
    "市井平价断案": {
        "title": {
            "en": "Price Stabilisation in the Market",
            "fr": "Stabilisation des prix au marché",
            "es": "Estabilización de precios en el mercado",
            "ar": "تثبيت الأسعار في السوق",
        },
        "kind_label": {
            "en": "Judgment from the Nine Chapters",
            "fr": "Jugement selon les Neuf Chapitres",
            "es": "Sentencia según los Nueve Capítulos",
            "ar": "حكم من الفصول التسعة",
        },
        "setting": {
            "en": "Grain prices at the market are fluctuating; the county releases 300 strings of cash as a price-levelling fund, shared among three markets by grain shortage, population and obstruction of trade.",
            "fr": "Les prix du grain fluctuent au marché ; le district débloque 300 cordes de sapèques comme fonds de régulation, réparties entre trois marchés selon la pénurie, la population et l'entrave au commerce.",
            "es": "Los precios del grano fluctúan en el mercado; el distrito destina 300 cuerdas de cash como fondo de nivelación, repartidas entre tres mercados según la escasez, la población y el bloqueo del comercio.",
            "ar": "تتقلب أسعار الغلال في السوق، فيُفرج القضاء عن ٣٠٠ سلسلة نقود صندوقًا لموازنة الأسعار، تُوزَّع على ثلاثة أسواق بحسب شح الغلال والسكان وتعطّل التجارة.",
        },
        "hint": {
            "en": "This is a case in arithmetic judgment: too even a split shortchanges the hardest-hit market; too skewed a one breeds resentment.",
            "fr": "C'est un cas de jugement arithmétique : un partage trop égal pénalise le marché le plus sinistré ; un partage trop inégal suscite le ressentiment.",
            "es": "Es un caso de juicio aritmético: un reparto demasiado igual perjudica al mercado más castigado; uno demasiado sesgado engendra resentimiento.",
            "ar": "هذه مسألة حكم حسابي: القسمة الأكثر تساويًا تُجحف بالسوق الأشد تضررًا، والقسمة المائلة تثير السخط.",
        },
        "unit": {
            "en": "strings of cash",
            "fr": "cordes de sapèques",
            "es": "cuerdas de cash",
            "ar": "سلاسل نقود",
        },
        "items": {
            "北市": {
                "name": {"en": "North Market", "fr": "Marché du Nord", "es": "Mercado del Norte", "ar": "السوق الشمالي"},
                "attrs": {
                    "en": "shortage 9 · population 7 · obstruction 6",
                    "fr": "pénurie 9 · population 7 · entrave 6",
                    "es": "escasez 9 · población 7 · bloqueo 6",
                    "ar": "الشح ٩ · السكان ٧ · التعطّل ٦",
                },
                "principle": {
                    "en": "Levelling prices is not about forcing all prices down, but about bringing stability first to where distress is greatest.",
                    "fr": "Réguler les prix, ce n'est pas les abaisser tous, mais apporter d'abord la stabilité là où la détresse est la plus grande.",
                    "es": "Nivelar los precios no es rebajarlos todos, sino llevar estabilidad primero donde la angustia es mayor.",
                    "ar": "موازنة الأسعار ليست خفضها كلها، بل إيصال الاستقرار أولًا إلى موضع الضرورة الأشد.",
                },
            },
            "东市": {
                "name": {"en": "East Market", "fr": "Marché de l'Est", "es": "Mercado del Este", "ar": "السوق الشرقي"},
                "attrs": {
                    "en": "shortage 5 · population 9 · obstruction 3",
                    "fr": "pénurie 5 · population 9 · entrave 3",
                    "es": "escasez 5 · población 9 · bloqueo 3",
                    "ar": "الشح ٥ · السكان ٩ · التعطّل ٣",
                },
            },
            "西市": {
                "name": {"en": "West Market", "fr": "Marché de l'Ouest", "es": "Mercado del Oeste", "ar": "السوق الغربي"},
                "attrs": {
                    "en": "shortage 4 · population 4 · obstruction 8",
                    "fr": "pénurie 4 · population 4 · entrave 8",
                    "es": "escasez 4 · población 4 · bloqueo 8",
                    "ar": "الشح ٤ · السكان ٤ · التعطّل ٨",
                },
            },
        },
    },
}
