"""离线批量生成跨文明对话案例库（申报书目标②的硬指标 ≥500 条）。

策略
- 每议题准备 25 个真实世界问题
- 每问题 × 4-5 个语境/角度 = ≥100 案例/议题
- 5 议题 × ≥100 = ≥500 案例总量
- 答案不调用 LLM：从 DB 中已审议过的「跨文明立场」+「经典证据」可证据
  化拼装，**每条都可溯源**，全部标 ai_generated=True 等待人审。

用法：
    python -m app.generate_cases             # 增量（已有数据不重复）
    python -m app.generate_cases --reset     # 清空重建
"""
from __future__ import annotations

import sys

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from .db import SessionLocal, init_db
from .models import CrossCivView, DialogCase, Passage, Topic
from .seed import seed_if_empty

# ── 25 个高质量问题 / 议题 ────────────────────────────────────────────────────
QUESTIONS = {
    "climate": [
        "如何应对全球气候变化？",
        "发达国家与发展中国家在减排上的责任如何划分？",
        "碳中和目标是否会牺牲穷人的发展权？",
        "个人应当承担怎样的气候责任？",
        "气候难民应如何在国际伦理上被对待？",
        "极端气候事件下，富国是否有义务援助？",
        "为后代留下宜居星球，是当代人的什么义务？",
        "经济增长与生态保护之间能否调和？",
        "碳税与碳排交易，是否真能达成正义？",
        "畜牧业排放与饮食方式，个体如何选择？",
        "气候教育应纳入学校核心课程吗？",
        "企业 ESG 是真改变还是绿洗？",
        "面对气候焦虑，年轻人如何安顿身心？",
        "国家公园与原住民权利如何平衡？",
        "技术解决方案（地球工程）的伦理边界？",
        "化石燃料补贴是否应即刻取消？",
        "气候诉讼能否成为正义工具？",
        "森林、海洋等公共资源的全球治理框架？",
        "气候难题中的代际正义如何理解？",
        "城市生活方式如何向低碳过渡？",
        "气候议题中宗教传统能贡献什么？",
        "极简主义生活是道德选择还是个人偏好？",
        "可再生能源转型中，能源贫困如何避免？",
        "海平面上升威胁的岛国，国际社会该如何回应？",
        "面对气候不平等，正义优先还是效率优先？",
    ],
    "tech_ethics": [
        "AI 算法监控是否侵犯隐私？",
        "面部识别技术应被全面禁止吗？",
        "生成式 AI 创作的版权归谁？",
        "AI 替代人类工作，社会该如何回应？",
        "基因编辑婴儿的伦理红线在哪里？",
        "脑机接口模糊了人机边界吗？",
        "算法推荐如何避免极化与成瘾？",
        "自动驾驶事故的道德选择算法（电车难题）？",
        "AI 战争武器是否应被国际禁止？",
        "数据是新的石油，还是新的人格延伸？",
        "深度伪造（Deepfake）的法律与伦理治理？",
        "AI 陪伴能替代真实关系吗？",
        "AGI（通用人工智能）的研究该不该减速？",
        "儿童的数字足迹应当如何保护？",
        "智能合约能否替代法律？",
        "AI 在医疗诊断中的责任归属？",
        "技术鸿沟会加剧全球不平等吗？",
        "VR/元宇宙对现实关系的影响？",
        "AI 招聘的偏见如何治理？",
        "开源 AI 模型的双刃剑：自由与滥用？",
        "AI 对教育的影响：辅助还是替代？",
        "无人机送货与公共空间秩序？",
        "AI 拟人化设计是否欺骗用户？",
        "可解释性是 AI 的伦理底线吗？",
        "国家在 AI 治理上该扮演什么角色？",
    ],
    "social": [
        "面对城市无家可归者，社会的责任在哪？",
        "教育公平与精英教育能兼顾吗？",
        "代际贫困如何打破？",
        "富人是否应缴纳更高比例的税？",
        "公共健康危机中个人自由与集体责任的张力？",
        "弱势群体的话语权如何保障？",
        "社会信任的修复路径？",
        "移民政策中开放与边界的伦理？",
        "性别平等的实质内涵是什么？",
        "残障人士的城市无障碍设计为何重要？",
        "邻里关系冷淡的现代社会该如何回暖？",
        "志愿精神在内卷社会的价值？",
        "代际居住矛盾如何缓解？",
        "新就业形态下劳动者权益如何保障？",
        "面对网络暴力，社会该如何回应？",
        "公益慈善的边界在哪里？",
        "宗教团体在公共生活中的角色？",
        "未成年人保护的当代挑战？",
        "老龄化社会的代际契约？",
        "动物权利与人类利益如何平衡？",
        "公共空间的多元包容设计？",
        "传统社区在城市化中的命运？",
        "工作-生活平衡是奢侈品吗？",
        "失业者的尊严如何被守护？",
        "面对自杀率上升，社会能做什么？",
    ],
    "personal": [
        "面对内卷与焦虑，年轻人如何安顿？",
        "「躺平」是消极逃避还是合理选择？",
        "自律真的能带来自由吗？",
        "如何在不确定时代寻找意义？",
        "孤独感盛行的时代，如何与自己相处？",
        "屏幕成瘾如何对治？",
        "完美主义陷阱如何走出？",
        "面对失败，如何复原？",
        "情绪管理的儒家智慧？",
        "如何在父母期待与个人理想间取舍？",
        "事业与家庭如何抉择？",
        "中年危机怎么过？",
        "晚成型人生的合法性？",
        "如何培养终身学习的习惯？",
        "数字断舍离的实践？",
        "比较心如何对治？",
        "「卷不动也躺不平」如何破局？",
        "找到真正的天命（Calling）的路径？",
        "面对死亡焦虑的安顿？",
        "亲密关系中的自我边界？",
        "财富与幸福的真实关系？",
        "如何理解「做自己」这件事？",
        "I 人在外向社会的生存策略？",
        "正念冥想对当代年轻人的价值？",
        "如何与「过去的我」和解？",
    ],
    "governance": [
        "如何评价理想的政府？",
        "腐败治理的根本路径？",
        "民主与法治的关系？",
        "公共政策中专家与民意如何平衡？",
        "选举制度的优劣比较？",
        "权力监督的有效机制？",
        "政府透明度的边界？",
        "公共财政如何回应贫富分化？",
        "应急治理中的常态与例外？",
        "数字政府的潜力与陷阱？",
        "地方自治与中央协调？",
        "公民参与政策制定的可能性？",
        "媒体在治理中的角色？",
        "政治极化如何缓解？",
        "国际治理中的主权与全球公益？",
        "政府对宗教的中立性应到何种程度？",
        "公务员伦理的现代意涵？",
        "代际正义在政策中如何体现？",
        "民族认同与多元包容的张力？",
        "革命与改良的伦理评估？",
        "面对民粹主义浪潮，治理怎么办？",
        "战争与和平的政治哲学反思？",
        "公益诉讼与公民社会？",
        "气候议题如何嵌入国家治理框架？",
        "AI 时代的治理新课题？",
    ],
}

# 每问题 × 多角度（生成 ≥4 案例）
# 角度五语词表:(zh 名, en, fr, es, ar)+ 五语指引 —— 拼装 answer_i18n 用
ANGLES = [
    ("通识入门", "{q}", "请以面向 Z 世代年轻人的友好语气解读。"),
    ("学者视角", "{q}", "请从学术研究的视角，给出严谨的多文明对照。"),
    ("课堂教学", "若要在课堂上引导学生讨论：{q}", "请给出适合 25 分钟课堂的讨论提纲。"),
    ("跨文化沟通", "向不熟悉儒家的西方对话者解释：{q}", "请兼顾文化语境与可理解性。"),
    ("现实抉择", "在我面临具体选择时，{q}", "请给出可操作的实践智慧。"),
]

# 各角度的五语名称与五语指引(与 ANGLES 顺序一致)
ANGLE_I18N = [
    {
        "en": ("General intro", "Read this in a friendly tone for Generation Z."),
        "fr": ("Intro générale", "À lire dans un ton amical pour la génération Z."),
        "es": ("Introducción general", "Léelo con un tono cercano para la generación Z."),
        "ar": ("مدخل عام", "اقرأه بنبرة ودّة موجهة لجيل Z."),
    },
    {
        "en": ("Scholar's lens", "A rigorous multi-civilisation comparison from a research perspective."),
        "fr": ("Regard du chercheur", "Une comparaison multi-civilisations rigoureuse, en perspective de recherche."),
        "es": ("Mirada académica", "Una comparación multirregional rigurosa desde la investigación."),
        "ar": ("منظار الباحث", "مقارنة صارمة بين الحضارات من منظور بحثي."),
    },
    {
        "en": ("Classroom", "A discussion outline fit for a 25-minute seminar."),
        "fr": ("En classe", "Un plan de discussion pour un séminaire de 25 minutes."),
        "es": ("En el aula", "Un guion de debate para una clase de 25 minutos."),
        "ar": ("في الصف", "مخطط نقاش لحصة من 25 دقيقة."),
    },
    {
        "en": ("Cross-cultural", "Balance cultural context with accessibility for readers new to Confucianism."),
        "fr": ("Interculturel", "Équilibrer contexte culturel et accessibilité pour les lecteurs novices."),
        "es": ("Intercultural", "Equilibrar contexto cultural y accesibilidad para lectores no iniciados."),
        "ar": ("عبر ثقافي", "وازن السياق الثقافي مع وضوح الفهم للقارئ الجديد."),
    },
    {
        "en": ("Real decision", "Practical wisdom you can act on."),
        "fr": ("Décision réelle", "Une sagesse pratique et actionnable."),
        "es": ("Decisión real", "Una sabiduría práctica y aplicable."),
        "ar": ("قرار واقعي", "حكمة عملية قابلة للتطبيق."),
    },
]

# 答案模板的五语段头
SECTIONS = {
    "zh": {"topic": "议题", "reason": "儒家价值推理", "basis": "经典依据", "practice": "实践指向"},
    "en": {"topic": "Topic", "reason": "Confucian value reasoning", "basis": "Classical basis", "practice": "Practical direction"},
    "fr": {"topic": "Thème", "reason": "Raisonnement confucéen", "basis": "Fondement classique", "practice": "Orientation pratique"},
    "es": {"topic": "Tema", "reason": "Razonamiento confuciano", "basis": "Fundamento clásico", "practice": "Orientación práctica"},
    "ar": {"topic": "الموضوع", "reason": "الاستدلال الكونفوشيوسي", "basis": "الأساس النصي", "practice": "التوجيه العملي"},
}


# ── 问题关键词 → 经文提示(选证用): 词表只指向 passages 表内真实经文 ──
KEYWORD_HINTS: dict[str, list[str]] = {
    # 治理/权力
    "lunyu.weizheng.2.1": ["治理", "政府", "领导", "德治", "示范", "气候治理", "全球治理", "施政", "为政"],
    "lunyu.weizheng.2.3": ["法律", "刑罚", "立法", "监管", "禁令", "道德", "制度", "法治"],
    "xunzi.jundao.1": ["民意", "政权", "监督", "腐败", "民粹", "革命", "合法性", "人民", "覆舟"],
    "lunyu.yanyuan.12.7": ["信任", "信用", "公信", "诚信", "承诺", "立信"],
    # 公平/分配
    "lunyu.jishi.16.1": ["均衡", "公平", "分配", "贫富", "差距", "不平等", "正义", "减排", "责任划分", "共享"],
    "guanzi.chengma.1": ["土地", "资源", "生态", "环境", "国土", "开发", "自然"],
    "zhouli.junshu.1": ["负担", "赋税", "劳役", "义务", "分担", "均"],
    "jiuzhang.junshu.1": ["算法", "配额", "碳交易", "均输", "测算"],
    "jiuzhang.cuifen.1": ["比例", "分配", "份额", "分级", "按劳"],
    # 义利/换位
    "lunyu.liren.4.16": ["利益", "利润", "盈利", "商业", "经济", "功利", "利弊", "权衡", "资本"],
    "lunyu.yanyuan.12.2": ["换位", "将心比心", "同理", "尊重", "包容", "冒犯", "隐私", "监控", "代际", "后代"],
    "lunyu.liren.4.15": ["忠恕", "宽容", "体谅", "推己及人"],
    # 学习/教育
    "lunyu.shuer.7.21": ["榜样", "借鉴", "合作", "他人", "跨文化", "对话"],
    "lunyu.liren.4.17": ["自省", "进步", "竞争", "嫉妒", "比较心", "内卷", "见贤思齐"],
    "lunyu.xueer.1.4": ["反思", "复盘", "习惯", "自律", "日常", "省身"],
    "lunyu.xueer.1.1": ["终身学习", "复习", "朋友", "认同", "被误解", "学习"],
    "lunyu.xueer.1.6": ["教育", "教养", "儿童", "青少年", "家庭", "课程", "德育"],
    "lunyu.shuer.7.8": ["课堂", "启发", "讨论", "提问", "引导", "教学"],
    "lunyu.weizheng.2.11": ["创新", "传统", "历史", "经验", "传承", "温故"],
    "lunyu.weizheng.2.15": ["思考", "批判", "独立思考", "信息", "媒体", "谣言", "盲从"],
    "lunyu.weizheng.2.17": ["诚实", "无知", "谦逊", "科学", "边界", "承认"],
    "lunyu.yongye.6.20": ["兴趣", "热爱", "动力", "内驱", "心流", "热情"],
    "lunyu.zihan.9.2": ["博学", "专才", "通才", "标签", "成名", "做自己"],
    "zhouli.baoshi.1": ["六艺", "素养", "体育", "美育", "通识", "全面发展"],
    # 人生/情感
    "lunyu.weizheng.2.4": ["人生", "成长", "阶段", "年龄", "规划", "中年", "天命", "职业", "意义", "立志"],
    "lunyu.liren.4.2": ["逆境", "焦虑", "处困", "贫穷", "富足", "韧性", "复原", "约"],
    "lunyu.liren.4.8": ["理想", "真理", "追求", "价值", "信仰", "闻道"],
    "lunyu.liren.4.1": ["邻居", "社区", "圈层", "择友", "居住", "城市化", "环境"],
    "lunyu.bayi.3.20": ["情感", "节制", "适度", "放纵", "娱乐", "成瘾", "中和"],
    "lunyu.bayi.3.25": ["完美", "尽善尽美", "完美主义", "评价", "艺术"],
    "liji.yueji.1": ["情绪", "情感", "共鸣", "表达", "心动", "哀乐"],
    "lunyu.shuer.7.14": ["沉浸", "专注", "审美", "体验", "痴迷"],
    "lunyu.taibo.8.8": ["诗", "乐", "人格", "素养", "美育"],
    "lunyu.bayi.3.3": ["礼", "形式", "诚意", "仪式", "本质", "表演"],
    # 家庭/孝
    "lunyu.xueer.1.2": ["家庭", "父母", "长辈", "亲情", "孝顺", "代际", "弟"],
    "lunyu.weizheng.2.7": ["孝", "养老", "老龄化", "赡养", "陪伴", "敬"],
    # 事业/技术
    "lunyu.xianwen.14.5": ["技术", "实干", "勤劳", "实力", "逞强", "成功", "失败"],
    "mengzi.tengwengong.xia": ["竞争", "攀比", "对手", "尊严", "正当"],
}

# 全题兜底对(与问题词无关时的通用证据), 按问题稳定散列轮转
UNIVERSAL_POOL = [
    "lunyu.yanyuan.12.2", "lunyu.liren.4.16", "lunyu.weizheng.2.4",
    "lunyu.xueer.1.1", "lunyu.liren.4.15", "lunyu.weizheng.2.1",
]


def _select_citations(db: Session, topic: Topic, question: str) -> list[dict]:
    """按问题关键词在 39 条经文池中打分选 2 条; 零命中时按稳定散列取通用对。
    引文一律取 passages 原文与 ref_label, 不改动一字(事实完整性)。"""
    texts: dict[str, tuple[str, str]] = {}
    for rid in set(list(topic.related_passages or []) + list(KEYWORD_HINTS.keys()) + UNIVERSAL_POOL):
        t_, l_ = _passage_text(db, rid)
        if t_:
            texts[rid] = (t_, l_)
    scores: dict[str, int] = {}
    for rid, hints in KEYWORD_HINTS.items():
        if rid not in texts:
            continue
        s = sum(1 for k in hints if k in question)
        if s:
            scores[rid] = s
    ranked = sorted(scores.items(), key=lambda x: (-x[1], x[0]))
    picked = [rid for rid, _ in ranked[:2]]
    if len(picked) < 2:  # 零命中/不足: 主题关联 + 稳定散列轮转兜底
        seed = sum(ord(ch) for ch in question)
        pool = list(topic.related_passages or []) + [u for u in UNIVERSAL_POOL if u in texts]
        for rid in pool[seed % max(1, len(pool)):] + pool:
            if rid in texts and rid not in picked:
                picked.append(rid)
            if len(picked) == 2:
                break
    return [
        {"ref_id": rid, "ref_label": texts[rid][1], "text": texts[rid][0]}
        for rid in picked[:2]
        if rid in texts
    ]


def _passage_text(db: Session, ref_id: str) -> tuple[str, str]:
    p = db.get(Passage, ref_id)
    if not p:
        return "", ref_id
    return p.original_text, p.ref_label or ref_id


def _compose_case(
    db: Session,
    topic: Topic,
    views: list[CrossCivView],
    question: str,
    angle: tuple[str, str, str],
    angle_idx: int = 0,
) -> dict:
    angle_name, q_tpl, instruction = angle
    full_q = q_tpl.format(q=question)

    # 按问题关键词选 1-2 条经文作证据(条条不同, 引文取自 passages 原文)
    cits = _select_citations(db, topic, question)

    # 儒家答案：议题导入 + 经典依据 + 实践建议（紧扣已审立场，不发挥）
    confucian = next((v for v in views if v.civilization == "confucian"), None)
    if confucian and cits:
        cit_lines = "\n".join(
            f"  · {c['text']} —《{c['ref_label']}》" for c in cits
        )
        answer = (
            f"【议题】{topic.name_zh} — {(topic.description or {}).get('zh', '')}\n\n"
            f"【本问聚焦】{question}\n\n"
            f"【儒家价值推理】\n{(confucian.headline or {}).get('zh', '')}。\n"
            f"{(confucian.detail or {}).get('zh', '')}\n\n"
            f"【经典依据】\n{cit_lines}\n\n"
            f"【实践指向（{angle_name}）】\n{instruction}"
        )
    else:
        answer = (
            f"【议题】{topic.name_zh}\n本案例待补充权威儒家立场与经典依据。"
        )

    # 跨文明立场摘要：5 文明并陈（附带五语标签与五语 headline,展示端按 lang 取用）
    civ_summary = [
        {
            "civilization": v.civilization,
            "civ_label": v.civ_label_zh,
            "civ_label_i18n": dict(v.civ_label_i18n or {}),
            "headline": (v.headline or {}).get("zh", ""),
            "headline_i18n": dict(v.headline or {}),
        }
        for v in views
    ]

    # 长答案五语版:同一模板换五语素材重拼(经典原文保持中文,属可溯源原典)
    answer_i18n = {}
    ai = ANGLE_I18N[angle_idx]
    for lg in ("en", "fr", "es", "ar"):
        if not (confucian and cits):
            break
        sec = SECTIONS[lg]
        a_name, a_instr = ai[lg]
        cit_lines = "\n".join(
            f"  · {c['text']} — {c['ref_label']}" for c in cits
        )
        focus = {
            "en": f"[This question] {question}",
            "fr": f"[Cette question] {question}",
            "es": f"[Esta pregunta] {question}",
            "ar": f"[هذا السؤال] {question}",
        }
        answer_i18n[lg] = (
            f"[{sec['topic']}] {(topic.name_i18n or {}).get(lg, topic.name_zh)} — "
            f"{(topic.description or {}).get(lg, '')}\n\n"
            f"{focus[lg]}\n\n"
            f"[{sec['reason']}]\n{(confucian.headline or {}).get(lg, '')}.\n"
            f"{(confucian.detail or {}).get(lg, '')}\n\n"
            f"[{sec['basis']}]\n{cit_lines}\n\n"
            f"[{sec['practice']} · {a_name}]\n{a_instr}"
        )

    return {
        "topic_id": topic.id,
        "lang": "zh",
        "title": f"{topic.name_zh} · {angle_name} · {question[:18]}",
        "question": full_q,
        "confucian_answer": answer,
        "answer_i18n": answer_i18n,
        "cross_civ_views": civ_summary,
        "citations": cits,
        "tags": [topic.id, angle_name],
        "status": "draft",
        "quality": 0,
        "ai_generated": True,
    }


def generate(db: Session, reset: bool = False) -> dict:
    prior_status: dict[tuple[str, str], tuple[str, str | None, str | None]] = {}
    if reset:
        prior_status = {
            (c.topic_id, c.title): (c.status, c.reviewer, c.review_note)
            for c in db.execute(select(DialogCase)).scalars()
        }
        db.execute(delete(DialogCase))
        db.commit()

    topics = db.execute(
        select(Topic).options(selectinload(Topic.__mapper__.relationships))
    ).scalars().all() if False else db.execute(select(Topic)).scalars().all()
    if not topics:
        raise SystemExit("无议题数据。请先 seed_topics_if_empty()。")

    existing_keys = {
        (c.topic_id, c.title)
        for c in db.execute(select(DialogCase)).scalars()
    }

    counts: dict[str, int] = {}
    total = 0
    for t in topics:
        views = list(
            db.execute(
                select(CrossCivView).where(CrossCivView.topic_id == t.id)
            ).scalars()
        )
        qs = QUESTIONS.get(t.id, [])
        per_topic = 0
        for q in qs:
            for angle_idx, angle in enumerate(ANGLES):
                case = _compose_case(db, t, views, q, angle)
                if (case["topic_id"], case["title"]) in existing_keys:
                    continue
                db.add(DialogCase(**case))
                per_topic += 1
                total += 1
        counts[t.id] = per_topic
    db.commit()
    if reset and prior_status:
        restored = 0
        for c in db.execute(select(DialogCase)).scalars():
            prior = prior_status.get((c.topic_id, c.title))
            if prior:
                c.status, c.reviewer, c.review_note = prior
                restored += 1
        db.commit()
        print(f"[generate_cases] status restored for {restored}")
    return {"total_added": total, "per_topic": counts}


def main() -> None:
    reset = "--reset" in sys.argv
    init_db()
    db = SessionLocal()
    try:
        seed_if_empty()
        result = generate(db, reset=reset)
        # 汇总：库中总数
        from sqlalchemy import func as f
        total_db = db.execute(select(f.count()).select_from(DialogCase)).scalar_one()
        print(f"[generate_cases] added {result['total_added']} this run; "
              f"per_topic={result['per_topic']}; db_total={total_db}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
