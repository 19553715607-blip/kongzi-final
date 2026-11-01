"""5 议题 × 5 文明 跨文明对话语料种子。

立场内容均为申报书演示用、标注 AI 协助生成 + 待人审。每条立场都标注思想源流，
便于后续学术专家覆盖与扩充。
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import CrossCivView, Topic

CIVS = {
    "confucian":     {"zh": "儒家", "en": "Confucian"},
    "christian":     {"zh": "基督教伦理", "en": "Christian Ethics"},
    "enlightenment": {"zh": "启蒙理性", "en": "Enlightenment Reason"},
    "kantian":       {"zh": "康德义务论", "en": "Kantian Deontology"},
    "buddhist":      {"zh": "佛教/印度思想", "en": "Buddhist / Indian Thought"},
}

TOPICS = [
    {
        "id": "climate", "name_zh": "气候治理",
        "name_i18n": {"en": "Climate Governance"},
        "description": {
            "zh": "面对气候危机，人类该如何承担责任、协调利益、约束自身？",
            "en": "How should humanity bear responsibility, coordinate interests, and self-restrain in the climate crisis?",
        },
        "color": "#0F6E56",
        "keywords": ["气候", "环境", "环保", "碳排", "全球变暖", "可持续", "climate", "carbon", "environment", "sustainability"],
        "related_concepts": ["ren", "yi", "zhongyong"],
        "related_passages": ["lunyu.yanyuan.12.1"],
        "sort_order": 1,
    },
    {
        "id": "tech_ethics", "name_zh": "科技伦理",
        "name_i18n": {"en": "Technology Ethics"},
        "description": {
            "zh": "AI、基因编辑、数字监控时代，技术的边界应在哪里？",
            "en": "In the age of AI, gene editing, and digital surveillance, where should technology's limits lie?",
        },
        "color": "#534AB7",
        "keywords": ["AI", "人工智能", "基因", "科技", "算法", "数据", "隐私", "technology", "ethics", "algorithm", "privacy"],
        "related_concepts": ["ren", "li", "junzi", "zhongyong"],
        "related_passages": ["lunyu.yanyuan.12.1", "lunyu.yanyuan.12.2"],
        "sort_order": 2,
    },
    {
        "id": "social", "name_zh": "社会责任",
        "name_i18n": {"en": "Social Responsibility"},
        "description": {
            "zh": "个体对家庭、邻里、国家、世界，分别该尽什么样的责任？",
            "en": "What responsibilities does an individual owe to family, community, nation, and world?",
        },
        "color": "#993C1D",
        "keywords": ["责任", "公益", "贫困", "教育", "公平", "正义", "responsibility", "community", "poverty", "justice"],
        "related_concepts": ["ren", "yi", "shu", "junzi"],
        "related_passages": ["lunyu.yanyuan.12.2", "lunyu.liren.4.16"],
        "sort_order": 3,
    },
    {
        "id": "personal", "name_zh": "个人发展",
        "name_i18n": {"en": "Personal Development"},
        "description": {
            "zh": "在内卷与不确定之中，年轻人该如何安顿自身、走向成熟？",
            "en": "Amid social pressure and uncertainty, how should young people anchor themselves and grow?",
        },
        "color": "#854F0B",
        "keywords": ["焦虑", "内卷", "迷茫", "成长", "自律", "意义", "anxiety", "burnout", "growth", "meaning", "self"],
        "related_concepts": ["junzi", "xue", "tianming"],
        "related_passages": ["lunyu.xueer.1.1", "lunyu.weizheng.2.4"],
        "sort_order": 4,
    },
    {
        "id": "governance", "name_zh": "公共治理",
        "name_i18n": {"en": "Public Governance"},
        "description": {
            "zh": "理想的政府与公共秩序，应如何兼顾效能、正义与民心？",
            "en": "How should ideal governance balance effectiveness, justice, and the people's trust?",
        },
        "color": "#1E5F8E",
        "keywords": ["治理", "政府", "腐败", "民主", "法治", "权力", "governance", "government", "democracy", "rule of law"],
        "related_concepts": ["ren", "li", "yi", "junzi"],
        "related_passages": ["lunyu.liren.4.16"],
        "sort_order": 5,
    },
]

# 5 议题 × 5 文明 = 25 条立场种子（精炼版，后续可扩）
# 每条结构：(topic_id, civ_key, headline_zh, headline_en, detail_zh, sources)
VIEWS_RAW = [
    # ── 气候治理 ──
    ("climate", "confucian",
     "天人合一，节用爱物，仁及万物",
     "Heaven-and-humanity as one; frugality and care for all beings",
     "儒家强调人与自然非对立关系，「钓而不纲，弋不射宿」（《论语·述而》）。治理气候应回到「仁」的扩展——爱人之心推及万物，节制人欲、克己复礼，方能万物并育而不相害（《中庸》）。",
     [{"label": "《论语·述而》", "citation": "钓而不纲，弋不射宿"},
      {"label": "《中庸》", "citation": "万物并育而不相害"}]),
    ("climate", "christian",
     "受托管家：人对受造世界负有照看之责",
     "Stewardship: humanity is entrusted to care for creation",
     "基督教伦理视人为「神的形象」与「受托管家」（创世纪 1:28；2:15）。地球非人类的私产，乃神所托付。「凡受了恩赐的，便要彼此服事」（彼前 4:10）——气候责任是信仰义务，富裕国家有更大义务帮助贫弱。",
     [{"label": "Genesis 2:15", "citation": "To till and to keep"},
      {"label": "Laudato Si'（教宗方济各）", "citation": "Care for our common home"}]),
    ("climate", "enlightenment",
     "理性协商 + 全球契约：科学—制度—合作",
     "Rational deliberation and global compact: science, institutions, cooperation",
     "启蒙理性主张以科学方法认识气候规律、以理性协商达成全球契约（巴黎协定的精神源头）。康德式「永久和平」延伸到生态领域：把人类视为可交流的理性共同体，碳排定价、机制设计、跨境法治是路径。",
     [{"label": "康德《永久和平论》", "citation": "理性共同体的延伸"},
      {"label": "Paris Agreement (2015)", "citation": "Nationally Determined Contributions"}]),
    ("climate", "kantian",
     "把自然当目的而非纯粹手段",
     "Treat nature as an end, not merely a means",
     "康德义务论可延伸：行动准则若不能普遍化为所有人能接受的法则，即不道德。过度消耗化石燃料无法普遍化（否则地球崩溃），故个人与国家有「完全义务」减排，独立于功利计算。",
     [{"label": "Kant, Groundwork of the Metaphysics of Morals", "citation": "Categorical Imperative"}]),
    ("climate", "buddhist",
     "缘起、无我、不害：减少贪欲是根本",
     "Interdependence, non-self, non-harm: reducing craving is the root",
     "佛教「缘起」（pratītyasamutpāda）——万物相依，气候即众生共业。「不害」（ahimsā）扩展到生态。根本对治是减少「贪、嗔、痴」，尤其是消费贪欲。生活的简朴本身即是修行。",
     [{"label": "《杂阿含经》", "citation": "缘起法"},
      {"label": "甘地《非暴力哲学》", "citation": "Ahimsā 与生态"}]),

    # ── 科技伦理 ──
    ("tech_ethics", "confucian",
     "「正名」与「中庸」：技术服务于人之为人",
     "Rectification of names and the Mean: technology serves humanity's flourishing",
     "儒家不反对技术（《论语》多言「器」与「艺」），但强调「君子不器」（《论语·为政》）——技术是手段，不能反过来定义人。AI、基因编辑须以「仁」为本，以「礼」节制，避免「失其本心」。",
     [{"label": "《论语·为政》", "citation": "君子不器"},
      {"label": "《孟子·告子上》", "citation": "失其本心"}]),
    ("tech_ethics", "christian",
     "人按神形象被造，技术不可僭越造物主",
     "Humans bear God's image; technology must not usurp the Creator",
     "基督教伦理对基因编辑、人体增强、人格化 AI 保持警觉：人有「神的形象」（imago Dei），其尊严不可还原为算法或基因。技术可助人，但不能再造「人」。",
     [{"label": "Genesis 1:27", "citation": "Imago Dei"},
      {"label": "WCC 文件", "citation": "Statements on Bioethics"}]),
    ("tech_ethics", "enlightenment",
     "理性自律 + 制度护栏：算法透明与问责",
     "Rational autonomy with institutional guardrails: algorithmic transparency and accountability",
     "启蒙传统支持技术发展，但要求 (1) 公共理性审议 (2) 透明、可问责 (3) 保护个人自由。欧盟 GDPR、AI Act 是这条线索的当代延伸：技术须接受民主审视。",
     [{"label": "EU AI Act (2024)", "citation": "高风险系统监管"},
      {"label": "Habermas《交往行为理论》", "citation": "公共理性"}]),
    ("tech_ethics", "kantian",
     "人是目的本身：不可把人化为数据手段",
     "Humanity as end in itself: never reduce persons to data means",
     "康德「定言令式」第二公式：永远把人当作目的本身。算法监控、数据剥削、深度伪造侵犯人格尊严。知情同意、数据自决是技术伦理的康德底线。",
     [{"label": "Kant, Groundwork", "citation": "Humanity Formula"}]),
    ("tech_ethics", "buddhist",
     "技术亦缘起：警觉「我执」与执着算法",
     "Technology too is dependently arisen; beware ego-clinging and algorithmic attachment",
     "佛教视技术为「业」与「缘」的延伸，本身中性，关键在「用心」。AI 个性化推荐若强化「我执」与贪欲，则违背「正念」与「中道」。当代「正念科技」运动即此思路。",
     [{"label": "《八正道》", "citation": "正念、正思维"},
      {"label": "Kabat-Zinn 正念", "citation": "Mindful technology"}]),

    # ── 社会责任 ──
    ("social", "confucian",
     "推己及人：「己所不欲，勿施于人」",
     "Extending oneself: do not impose on others what you do not want",
     "儒家伦理的同心圆——「修身、齐家、治国、平天下」（《大学》）——责任从近及远，但不止于近。「老吾老以及人之老，幼吾幼以及人之幼」（《孟子》）——以家庭情感为根，扩展为普遍仁爱。",
     [{"label": "《大学》", "citation": "修身齐家治国平天下"},
      {"label": "《孟子·梁惠王上》", "citation": "老吾老以及人之老"}]),
    ("social", "christian",
     "彼此相爱：爱邻如己，特别爱最小的弟兄",
     "Love one another: love neighbor as self, especially the least",
     "基督教伦理的中心是「爱」(agape)。「你们要彼此相爱」（约翰 13:34）。耶稣特别指出「这些事你们既作在我这弟兄中一个最小的身上，就是作在我身上了」（马太 25:40），社会责任的核心是关怀弱者。",
     [{"label": "Matthew 22:39", "citation": "Love your neighbor"},
      {"label": "Matthew 25:40", "citation": "The least of these"}]),
    ("social", "enlightenment",
     "公民德性 + 社会契约：权利与义务对等",
     "Civic virtue and social contract: rights and duties are mutual",
     "启蒙传统将责任置于「社会契约」框架：个体让渡部分自由换取共同体福祉（卢梭、洛克）。当代福利国家、累进税、公共教育皆此延伸。责任不靠情感，而靠制度。",
     [{"label": "卢梭《社会契约论》", "citation": "公意"},
      {"label": "罗尔斯《正义论》", "citation": "差别原则"}]),
    ("social", "kantian",
     "不完全义务：积极作为以促进他人福祉",
     "Imperfect duties: positively act to promote others' welfare",
     "康德区分「完全义务」（不可侵犯他人）与「不完全义务」（积极行善）。社会责任属后者——并非具体规定每件事，但人有义务培养行善意愿，将他人幸福纳入自身目的。",
     [{"label": "Kant, Doctrine of Virtue", "citation": "Imperfect duties"}]),
    ("social", "buddhist",
     "无缘大慈，同体大悲",
     "Boundless compassion arising from interconnectedness",
     "大乘佛教「菩萨道」以「上求佛道，下化众生」为宗旨。「无缘大慈，同体大悲」——慈悲不分亲疏，因「众生平等」。「布施」是首要修行，与儒家「老吾老」可对话亦有别。",
     [{"label": "《大智度论》", "citation": "无缘大慈，同体大悲"},
      {"label": "达赖喇嘛", "citation": "全球责任伦理"}]),

    # ── 个人发展 ──
    ("personal", "confucian",
     "志于学：终身修身，循序渐进",
     "Set your heart on learning: lifelong self-cultivation, step by step",
     "孔子「吾十有五而志于学，三十而立……七十而从心所欲不逾矩」（《论语·为政》）。儒家把人生看作一个渐进的修养过程，不焦虑结果，重视每日「学而时习之」，在关系中成就自我。",
     [{"label": "《论语·为政》", "citation": "吾十有五而志于学"},
      {"label": "《论语·学而》", "citation": "学而时习之"}]),
    ("personal", "christian",
     "在恩典中成长：放下骄傲，依靠超越者",
     "Grow in grace: release pride, lean on the transcendent",
     "基督教伦理强调「人非靠己」——成长的根本动力是恩典，而非纯粹自我奋斗。「凡劳苦担重担的人可以到我这里来，我就使你们得安息」（马太 11:28）。在内卷时代是有力的安顿。",
     [{"label": "Matthew 11:28", "citation": "Come to me"},
      {"label": "Augustine, Confessions", "citation": "Restless until rest in Thee"}]),
    ("personal", "enlightenment",
     "敢于运用自己的理性",
     "Dare to use your own reason (sapere aude)",
     "康德「什么是启蒙」: 启蒙是人从「自我招致的不成熟」中走出来。个人发展的核心是 sapere aude——敢于独立思考。当代「批判性思维」、终身学习都源于此。",
     [{"label": "Kant, What Is Enlightenment?", "citation": "Sapere aude"}]),
    ("personal", "kantian",
     "自律即自由：为自己立法",
     "Autonomy is freedom: legislate for yourself",
     "康德的「自律」（Autonomie）是真正的自由——依自己理性认可的法则行动。这与「随心所欲」的自由不同，是带着责任的自由。回应内卷：自由不在外部条件，在自我立法。",
     [{"label": "Kant, Groundwork", "citation": "Autonomy of the will"}]),
    ("personal", "buddhist",
     "正念安住当下，接受无常",
     "Mindful presence, accepting impermanence",
     "佛教「无常」(anicca) 与「正念」(sati) 直指当代焦虑：苦来自对永恒、对掌控的执着。修行从「观呼吸」开始，把每一个当下活清楚。",
     [{"label": "《阿含经》", "citation": "无常、苦、无我"},
      {"label": "一行禅师", "citation": "正念的奇迹"}]),

    # ── 公共治理 ──
    ("governance", "confucian",
     "为政以德 + 正名 + 民本",
     "Govern by virtue, rectify names, people as the foundation",
     "「为政以德，譬如北辰」（《论语·为政》）。儒家认为治理以德性为根，制度为枝。「民为贵，社稷次之，君为轻」（《孟子》），政府合法性来自民心，名分须正、责任须明。",
     [{"label": "《论语·为政》", "citation": "为政以德"},
      {"label": "《孟子·尽心下》", "citation": "民为贵"}]),
    ("governance", "christian",
     "上有权柄者皆神所立，但权力非绝对",
     "Authorities are appointed, yet power is not absolute",
     "基督教传统既肯定政府的合法性（罗马书 13:1），也强调权力须受神律与良心约束。中世纪「自然法」与现代立宪政体皆延续此线索：权力需透明、有限、可问责。",
     [{"label": "Romans 13:1", "citation": "Governing authorities"},
      {"label": "Aquinas, Summa", "citation": "Natural law"}]),
    ("governance", "enlightenment",
     "三权分立 + 人民主权 + 法治",
     "Separation of powers, popular sovereignty, rule of law",
     "启蒙的政治成果：洛克的有限政府、孟德斯鸠的三权分立、卢梭的人民主权。当代民主制度的骨架。治理合法性来自公民同意，权力须可制衡、可轮替。",
     [{"label": "孟德斯鸠《论法的精神》", "citation": "三权分立"},
      {"label": "洛克《政府论》", "citation": "有限政府"}]),
    ("governance", "kantian",
     "公开性原则：可公开的政策才是正义的",
     "Publicity principle: only what can be publicly justified is just",
     "康德「公开性原则」：一项政策若不能公开化（一旦公开就行不通），即不正义。这是当代透明治理、反腐、信息公开的哲学源头。治理的合法性建立在「可公开论证」之上。",
     [{"label": "Kant, Perpetual Peace, Appendix II", "citation": "Publicity principle"}]),
    ("governance", "buddhist",
     "无我政治：以慈悲与智慧服务众生",
     "Non-self in politics: serve sentient beings with compassion and wisdom",
     "佛教虽不直接谈政体，但孔雀王朝阿育王的「法治」(Dharma Vijaya) 与不丹「国民幸福总值」(GNH) 提供另一思路：治理的目标是减少众生之苦，权力是工具而非目的。",
     [{"label": "阿育王石刻", "citation": "Dharma 政治"},
      {"label": "GNH（不丹）", "citation": "国民幸福总值"}]),
]


def seed_topics_if_empty(db: Session) -> None:
    if db.execute(select(Topic).limit(1)).first():
        return
    for t in TOPICS:
        db.add(Topic(**t))
    for (topic_id, civ_key, h_zh, h_en, d_zh, sources) in VIEWS_RAW:
        civ = CIVS[civ_key]
        db.add(
            CrossCivView(
                topic_id=topic_id,
                civilization=civ_key,
                civ_label_zh=civ["zh"],
                civ_label_i18n={"en": civ["en"]},
                headline={"zh": h_zh, "en": h_en},
                detail={"zh": d_zh, "en": ""},  # 英文详细版后续补
                sources=sources,
                reviewed_by=None,
                ai_generated=True,
            )
        )
    db.commit()
    print(f"[seed_topics] {len(TOPICS)} topics, {len(VIEWS_RAW)} cross-civ views.")
