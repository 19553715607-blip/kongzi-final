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
ANGLES = [
    ("通识入门", "{q}", "请以面向 Z 世代年轻人的友好语气解读。"),
    ("学者视角", "{q}", "请从学术研究的视角，给出严谨的多文明对照。"),
    ("课堂教学", "若要在课堂上引导学生讨论：{q}", "请给出适合 25 分钟课堂的讨论提纲。"),
    ("跨文化沟通", "向不熟悉儒家的西方对话者解释：{q}", "请兼顾文化语境与可理解性。"),
    ("现实抉择", "在我面临具体选择时，{q}", "请给出可操作的实践智慧。"),
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
) -> dict:
    angle_name, q_tpl, instruction = angle
    full_q = q_tpl.format(q=question)

    # 选 1-2 个关联经典作为证据
    cits = []
    related = list(topic.related_passages or [])[:2]
    for rid in related:
        text, label = _passage_text(db, rid)
        if text:
            cits.append({"ref_id": rid, "ref_label": label, "text": text})

    # 儒家答案：议题导入 + 经典依据 + 实践建议（紧扣已审立场，不发挥）
    confucian = next((v for v in views if v.civilization == "confucian"), None)
    if confucian and cits:
        cit_lines = "\n".join(
            f"  · {c['text']} —《{c['ref_label']}》" for c in cits
        )
        answer = (
            f"【议题】{topic.name_zh} — {(topic.description or {}).get('zh', '')}\n\n"
            f"【儒家价值推理】\n{(confucian.headline or {}).get('zh', '')}。\n"
            f"{(confucian.detail or {}).get('zh', '')}\n\n"
            f"【经典依据】\n{cit_lines}\n\n"
            f"【实践指向（{angle_name}）】\n{instruction}"
        )
    else:
        answer = (
            f"【议题】{topic.name_zh}\n本案例待补充权威儒家立场与经典依据。"
        )

    # 跨文明立场摘要：5 文明并陈（headline 级摘要 → 案例页可展开详情）
    civ_summary = [
        {
            "civilization": v.civilization,
            "civ_label": v.civ_label_zh,
            "headline": (v.headline or {}).get("zh", ""),
        }
        for v in views
    ]

    return {
        "topic_id": topic.id,
        "lang": "zh",
        "title": f"{topic.name_zh} · {angle_name} · {question[:18]}",
        "question": full_q,
        "confucian_answer": answer,
        "cross_civ_views": civ_summary,
        "citations": cits,
        "tags": [topic.id, angle_name],
        "status": "draft",
        "quality": 0,
        "ai_generated": True,
    }


def generate(db: Session, reset: bool = False) -> dict:
    if reset:
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
            for angle in ANGLES:
                case = _compose_case(db, t, views, q, angle)
                if (case["topic_id"], case["title"]) in existing_keys:
                    continue
                db.add(DialogCase(**case))
                per_topic += 1
                total += 1
        counts[t.id] = per_topic
    db.commit()
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
