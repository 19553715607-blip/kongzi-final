"""补齐缺失的中文（现代汉语）译文。

## 背景

`Translation` 表里 zh 行是**现代汉语译文**（translator="原文" 的那条是古文本身）。
39 条已发布经文中曾有 15 条只有外语译文、没有 zh 行，导致中文阅读页的「译文」层
整层空白（`_to_passage_out` 按 `t.lang == lang` 过滤，zh 下取不到 en 回落）。

本模块只做「缺则补」：已存在 zh 行的条目一律不动。

## 译文原则

- 直译为主，保留原文的排比与语气；
- 专名（官爵、地名、乐名）保留原字，不硬译；
- 数量词按原文照录，不改写、不估算。
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Translation

ZH_TRANSLATIONS: dict[str, str] = {
    "liji.yueji.1": "一切声音的产生，都源于人的内心。人心的波动，是外物触动才这样的。",
    "lunyu.bayi.3.20": "《关雎》这首诗，快乐而不放纵，哀怨而不伤身。",
    "lunyu.bayi.3.25": (
        "孔子评论《韶》乐：美到了极处，也善到了极处。评论《武》乐：美到了极处，"
        "却还没有善到极处。"
    ),
    "lunyu.shuer.7.14": (
        "孔子在齐国听到《韶》乐，很长时间尝不出肉的滋味。他说：没想到音乐之美能到这种地步。"
    ),
    "lunyu.taibo.8.8": "人的修养从《诗》开始感发，依礼而立身，最终在乐中完成。",
    "lunyu.jishi.16.1": (
        "我听说，拥有国家和采邑的人，不愁人少而愁分配不均，不愁贫穷而愁不安定。"
        "因为分配均平就无所谓贫穷，上下和睦就无所谓人少，安定就不会倾覆。"
    ),
    "zhouli.junshu.1": (
        "均人掌管均衡土地税赋、均衡山林川泽的守备负担、均衡各类土地上的职事，"
        "以及均衡百姓、牛马、车辇的劳役负担。"
    ),
    "jiuzhang.junshu.1": (
        "现有按均输法运送的粟米：甲县一万户，运路八日；乙县九千五百户，十日；"
        "丙县一万二千三百五十户，十三日；丁县一万二千二百户，二十日，都要运到缴纳处。"
        "四县应缴赋粮共二十五万斛。"
    ),
    "jiuzhang.cuifen.1": (
        "现有大夫、不更、簪袅、上造、公士共五人，一起猎得五头鹿。要按爵位高低依次分配，"
        "问各得多少？"
    ),
    "guanzi.chengma.1": (
        "土地是政事的根本。所以凭借土地可以匡正政事。土地若不能均平调和，政事就无法匡正。"
    ),
    "zhouli.baoshi.1": (
        "于是教他们六艺：一是五礼，二是六乐，三是五射，四是五驭，五是六书，六是九数。"
        "五驭是：鸣和鸾、逐水曲、过君表、舞交衢、逐禽左。"
    ),
    "lunyu.zihan.9.2": (
        "达巷这个地方的人说：孔子真伟大啊！学问广博，却没有哪一门专长可称名。"
        "孔子听到这话，对门下弟子说：我专做什么呢？专驾车吗？专射箭吗？我还是专驾车吧。"
    ),
    "lunyu.xianwen.14.5": (
        "南宫适问孔子：羿擅长射箭，奡擅长水战，都没能得好死；禹和稷亲自耕种，却得到了天下。"
        "孔子没有回答。南宫适出去后，孔子说：这人真是君子啊！这人真是崇尚德行啊！"
    ),
    "mengzi.tengwengong.xia.6": (
        "驾车的人尚且羞于与（品行不端的）射箭者为伍；即使结伴能猎得堆积如山的禽兽，"
        "他也不肯做。"
    ),
    "xunzi.jundao.1": "君主是船，百姓是水。水能承载船，也能倾覆船。",
}


def apply_zh_translations(db: Session) -> dict:
    """为缺失 zh 译文的经文补一条。已存在的不动。"""
    counts = {"checked": 0, "added": 0}
    for pid, text in ZH_TRANSLATIONS.items():
        counts["checked"] += 1
        exists = db.execute(
            select(Translation.id).where(
                Translation.passage_id == pid, Translation.lang == "zh"
            )
        ).first()
        if exists:
            continue
        db.add(Translation(passage_id=pid, lang="zh", text=text, translator="编者"))
        counts["added"] += 1
    db.commit()
    return counts
