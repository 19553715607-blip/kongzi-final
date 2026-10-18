"""Larger Confucian culture enrichment pack.

This pack intentionally favors breadth:
- more public-domain classical excerpts from Xiaojing, Liji, Xunzi, Zhongyong,
  Mencius, and the Analects
- additional concepts, people, propositions
- hundreds of graph triples with endpoint validation
- a larger set of published, reviewable overseas-communication cases

Platform explanations and English renderings are draft metadata for review.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import SessionLocal, init_db
from .models import (
    Annotation,
    Book,
    Chapter,
    Concept,
    DialogCase,
    GraphEdge,
    Passage,
    Person,
    Proposition,
    School,
    Translation,
)


BOOKS = {
    "xiaojing": ("孝经", "Classic of Filial Piety", "孔门后学", "先秦两汉", 5),
    "liji": ("礼记", "Book of Rites", "礼学文献汇编", "先秦两汉", 6),
    "xunzi": ("荀子", "Xunzi", "荀子及后学", "战国", 7),
    "shijing": ("诗经", "Book of Songs", "佚名", "西周至春秋", 8),
    "shangshu": ("尚书", "Book of Documents", "佚名", "先秦", 9),
}


PASSAGES = [
    ("xiaojing.kai_zong.1", "xiaojing", "开宗明义章", "孝经·开宗明义章", "夫孝，德之本也，教之所由生也。", ["xiao", "de", "jiao"]),
    ("xiaojing.kai_zong.2", "xiaojing", "开宗明义章", "孝经·开宗明义章", "身体发肤，受之父母，不敢毁伤，孝之始也。", ["xiao", "shen_ti_fa_fu", "jing"]),
    ("xiaojing.kai_zong.3", "xiaojing", "开宗明义章", "孝经·开宗明义章", "立身行道，扬名于后世，以显父母，孝之终也。", ["li_shen", "dao", "xiao"]),
    ("xiaojing.tian_zi.1", "xiaojing", "天子章", "孝经·天子章", "爱亲者，不敢恶于人；敬亲者，不敢慢于人。", ["ai_qin", "jing_qin", "shu"]),
    ("xiaojing.zhu_hou.1", "xiaojing", "诸侯章", "孝经·诸侯章", "在上不骄，高而不危；制节谨度，满而不溢。", ["jie_zhi", "shen", "li"]),
    ("xiaojing.qing_da_fu.1", "xiaojing", "卿大夫章", "孝经·卿大夫章", "非先王之法服不敢服，非先王之法言不敢道。", ["fa_du", "li", "jing"]),
    ("xiaojing.shi.1", "xiaojing", "士章", "孝经·士章", "资于事父以事母而爱同，资于事父以事君而敬同。", ["xiao", "zhong", "jing"]),
    ("xiaojing.shu_ren.1", "xiaojing", "庶人章", "孝经·庶人章", "用天之道，分地之利，谨身节用，以养父母。", ["jieyong", "yang_qin", "tianren"]),
    ("xiaojing.san_cai.1", "xiaojing", "三才章", "孝经·三才章", "夫孝，天之经也，地之义也，民之行也。", ["xiao", "tian", "yi"]),
    ("xiaojing.gan_ying.1", "xiaojing", "感应章", "孝经·感应章", "孝悌之至，通于神明，光于四海，无所不通。", ["xiao", "ti", "he"]),
    ("liji.liyun.1", "liji", "礼运", "礼记·礼运", "大道之行也，天下为公。", ["datong", "gong", "ping_tianxia"]),
    ("liji.liyun.2", "liji", "礼运", "礼记·礼运", "选贤与能，讲信修睦。", ["xuan_xian", "xin", "he"]),
    ("liji.liyun.3", "liji", "礼运", "礼记·礼运", "故人不独亲其亲，不独子其子。", ["datong", "tui_en", "ren"]),
    ("liji.liyun.4", "liji", "礼运", "礼记·礼运", "使老有所终，壮有所用，幼有所长。", ["minben", "gong", "renzheng"]),
    ("liji.liyun.5", "liji", "礼运", "礼记·礼运", "男有分，女有归。", ["fen", "li", "jia"]),
    ("liji.xueji.1", "liji", "学记", "礼记·学记", "玉不琢，不成器；人不学，不知道。", ["xue", "dao", "jiaohua"]),
    ("liji.xueji.2", "liji", "学记", "礼记·学记", "建国君民，教学为先。", ["jiao", "jiaohua", "zhi_guo"]),
    ("liji.xueji.3", "liji", "学记", "礼记·学记", "虽有嘉肴，弗食，不知其旨也；虽有至道，弗学，不知其善也。", ["xue", "dao", "shan"]),
    ("liji.xueji.4", "liji", "学记", "礼记·学记", "学然后知不足，教然后知困。", ["xue", "jiao", "fanxing"]),
    ("liji.xueji.5", "liji", "学记", "礼记·学记", "教学相长也。", ["jiao_xue_xiang_zhang", "jiao", "xue"]),
    ("liji.xueji.6", "liji", "学记", "礼记·学记", "善歌者使人继其声，善教者使人继其志。", ["jiao", "zhi", "shuren"]),
    ("liji.xueji.7", "liji", "学记", "礼记·学记", "道而弗牵，强而弗抑，开而弗达。", ["yin_dao", "jiao", "zhongyong"]),
    ("liji.quli.1", "liji", "曲礼", "礼记·曲礼", "毋不敬，俨若思，安定辞。", ["jing", "shen", "li"]),
    ("liji.quli.2", "liji", "曲礼", "礼记·曲礼", "礼尚往来。往而不来，非礼也；来而不往，亦非礼也。", ["li", "wanglai", "shu"]),
    ("liji.quli.3", "liji", "曲礼", "礼记·曲礼", "傲不可长，欲不可从，志不可满，乐不可极。", ["jie_zhi", "zhongyong", "le"]),
    ("liji.tan_gong.1", "liji", "檀弓", "礼记·檀弓", "君子曰：礼有微情者，有以故兴物者。", ["li", "qing", "junzi"]),
    ("zhongyong.bulk.1", "zhongyong", "中庸·一章", "中庸·一章", "天命之谓性，率性之谓道，修道之谓教。", ["tianming", "xing", "dao", "jiao"]),
    ("zhongyong.bulk.2", "zhongyong", "中庸·一章", "中庸·一章", "喜怒哀乐之未发谓之中，发而皆中节谓之和。", ["zhong", "he", "qing_zhi"]),
    ("zhongyong.bulk.3", "zhongyong", "中庸·一章", "中庸·一章", "中也者，天下之大本也；和也者，天下之达道也。", ["zhong", "he", "dao"]),
    ("zhongyong.bulk.4", "zhongyong", "中庸·二十章", "中庸·二十章", "博学之，审问之，慎思之，明辨之，笃行之。", ["boxue", "shenwen", "shensi", "mingbian", "duxing"]),
    ("zhongyong.bulk.5", "zhongyong", "中庸·二十章", "中庸·二十章", "凡事豫则立，不豫则废。", ["yu", "zhixu", "zhi"]),
    ("zhongyong.bulk.6", "zhongyong", "中庸·二十五章", "中庸·二十五章", "诚者自成也，而道自道也。", ["cheng", "dao", "xiu_shen"]),
    ("zhongyong.bulk.7", "zhongyong", "中庸·二十六章", "中庸·二十六章", "故至诚无息。", ["zhicheng", "heng", "cheng"]),
    ("xunzi.quanxue.1", "xunzi", "劝学", "荀子·劝学", "学不可以已。", ["xue", "heng", "jiaohua"]),
    ("xunzi.quanxue.2", "xunzi", "劝学", "荀子·劝学", "青，取之于蓝，而青于蓝；冰，水为之，而寒于水。", ["xue", "shuren", "jinbu"]),
    ("xunzi.quanxue.3", "xunzi", "劝学", "荀子·劝学", "君子博学而日参省乎己，则知明而行无过矣。", ["junzi", "boxue", "fanxing", "zhi"]),
    ("xunzi.quanxue.4", "xunzi", "劝学", "荀子·劝学", "故不积跬步，无以至千里；不积小流，无以成江海。", ["jilei", "heng", "xue"]),
    ("xunzi.quanxue.5", "xunzi", "劝学", "荀子·劝学", "锲而舍之，朽木不折；锲而不舍，金石可镂。", ["heng", "yong", "xue"]),
    ("xunzi.quanxue.6", "xunzi", "劝学", "荀子·劝学", "蓬生麻中，不扶而直；白沙在涅，与之俱黑。", ["huanjing", "jiaohua", "zhi_direct"]),
    ("xunzi.quanxue.7", "xunzi", "劝学", "荀子·劝学", "目不能两视而明，耳不能两听而聪。", ["zhuanyi", "xue", "zhi"]),
    ("xunzi.xing_e.1", "xunzi", "性恶", "荀子·性恶", "人之性恶，其善者伪也。", ["xing_e", "jiaohua", "li"]),
    ("xunzi.xing_e.2", "xunzi", "性恶", "荀子·性恶", "故圣人化性而起伪，伪起而生礼义。", ["hua_xing_qi_wei", "li", "yi"]),
    ("xunzi.li_lun.1", "xunzi", "礼论", "荀子·礼论", "礼者，人道之极也。", ["li", "dao", "renwen"]),
    ("xunzi.wangzhi.1", "xunzi", "王制", "荀子·王制", "君者，舟也；庶人者，水也。水则载舟，水则覆舟。", ["minben", "zheng", "renzheng"]),
    ("mengzi.lilou.4.28", "mengzi", "离娄下", "孟子·离娄下·4.28", "大人者，不失其赤子之心者也。", ["chizi_zhi_xin", "ren", "cheng"]),
    ("mengzi.jinxin.7.35", "mengzi", "尽心上", "孟子·尽心上·7.35", "养心莫善于寡欲。", ["yangxin", "jie_zhi", "zheng_xin"]),
    ("mengzi.tengwengong.3.5", "mengzi", "滕文公上", "孟子·滕文公上·3.5", "有恒产者有恒心，无恒产者无恒心。", ["hengchan", "hengxin", "minben"]),
    ("lunyu.yongye.6.30b", "lunyu", "雍也", "论语·雍也·6.30", "己欲立而立人，己欲达而达人。", ["ren", "shu", "tui_en"]),
    ("lunyu.zilu.13.6b", "lunyu", "子路", "论语·子路·13.6", "其身正，不令而行；其身不正，虽令不从。", ["zheng_shen", "de", "zheng"]),
    ("lunyu.zizhang.19.6", "lunyu", "子张", "论语·子张·19.6", "博学而笃志，切问而近思，仁在其中矣。", ["boxue", "duxing", "ren"]),
]


CONCEPTS = [
    ("shen_ti_fa_fu", "身体发肤", "shēn tǐ fà fū", "body, hair, and skin", "生命身体来自父母，提醒人以敬慎态度对待自身。", ["xiao", "jing"]),
    ("li_shen", "立身", "lì shēn", "establishing oneself", "通过行道与修德建立可敬的人格。", ["xiu_shen", "dao"]),
    ("ai_qin", "爱亲", "ài qīn", "loving one's parents", "孝的亲爱情感根基。", ["xiao"]),
    ("jing_qin", "敬亲", "jìng qīn", "revering one's parents", "孝的敬意与礼的维度。", ["xiao", "jing"]),
    ("shen", "慎", "shèn", "carefulness", "言行处事的谨慎与自我约束。", ["jing", "li"]),
    ("fa_du", "法度", "fǎ dù", "norms and institutions", "使行为有据可循的制度尺度。", ["li", "zhixu"]),
    ("yang_qin", "养亲", "yǎng qīn", "supporting parents", "以物质照护和敬意奉养亲长。", ["xiao", "jing"]),
    ("datong", "大同", "dà tóng", "Great Unity", "礼运篇中天下为公的理想社会图景。", ["gong", "ping_tianxia"]),
    ("xuan_xian", "选贤", "xuǎn xián", "selecting the worthy", "公共治理中任用贤能的原则。", ["xian", "zhi_guo"]),
    ("fen", "分", "fèn", "social role", "人在关系和制度中的角色分位。", ["li", "zheng_ming"]),
    ("jia", "家", "jiā", "family", "儒家修身齐家路径中的基本伦理空间。", ["qi_jia", "xiao"]),
    ("fanxing", "反省", "fǎn xǐng", "self-examination", "回看自身言行并校正偏差的工夫。", ["xiu_shen", "si"]),
    ("jiao_xue_xiang_zhang", "教学相长", "jiào xué xiāng zhǎng", "teaching and learning grow together", "教师和学生在互动中共同成长。", ["jiao", "xue"]),
    ("yin_dao", "引导", "yǐn dǎo", "guidance", "教育中启发而不强牵的方式。", ["jiao", "zhongyong"]),
    ("wanglai", "往来", "wǎng lái", "reciprocal exchange", "礼中有来有往的互惠结构。", ["li", "shu"]),
    ("qing", "情", "qíng", "feeling", "礼所承载与节制的人情。", ["li", "qing_zhi"]),
    ("boxue", "博学", "bó xué", "broad learning", "广泛学习以拓展判断与人格。", ["xue"]),
    ("shenwen", "审问", "shěn wèn", "careful questioning", "对问题作审慎深入的追问。", ["xue", "si"]),
    ("shensi", "慎思", "shèn sī", "careful reflection", "谨慎深思而不轻率判断。", ["si", "zhi"]),
    ("mingbian", "明辨", "míng biàn", "clear discernment", "清楚分辨是非、轻重与本末。", ["zhi", "shifei"]),
    ("duxing", "笃行", "dǔ xíng", "earnest practice", "把理解落实为坚定行动。", ["xue", "yi"]),
    ("yu", "豫", "yù", "preparation", "事前准备与预判。", ["zhi", "zhixu"]),
    ("zhicheng", "至诚", "zhì chéng", "utmost sincerity", "诚的极致状态，持续不息。", ["cheng", "heng"]),
    ("jinbu", "进步", "jìn bù", "improvement", "通过学习与环境而超越原初状态。", ["xue", "shuren"]),
    ("jilei", "积累", "jī lěi", "accumulation", "点滴累积以成大功。", ["heng", "xue"]),
    ("huanjing", "环境", "huán jìng", "environment", "影响德性养成的外部条件。", ["jiaohua", "li"]),
    ("zhuanyi", "专一", "zhuān yī", "focused attention", "学习和修养中的专注不二。", ["xue", "heng"]),
    ("xing_e", "性恶", "xìng è", "badness of human nature", "荀子关于人性趋向欲望、需礼法教化的命题。", ["xing", "jiaohua"]),
    ("hua_xing_qi_wei", "化性起伪", "huà xìng qǐ wěi", "transforming nature through artifice", "以人为教化与礼义转化自然倾向。", ["xing_e", "li"]),
    ("renwen", "人文", "rén wén", "human culture", "礼乐制度塑造的人类文明秩序。", ["li", "jiao"]),
    ("chizi_zhi_xin", "赤子之心", "chì zǐ zhī xīn", "childlike heart", "不失纯真恻怛的本心。", ["ren", "cheng"]),
    ("yangxin", "养心", "yǎng xīn", "nourishing the heart-mind", "涵养心性、减少欲望牵引。", ["zheng_xin", "jie_zhi"]),
    ("hengchan", "恒产", "héng chǎn", "stable livelihood", "稳定生计，是民心安定的重要条件。", ["minben"]),
    ("hengxin", "恒心", "héng xīn", "constant heart", "稳定的道德意志与生活心态。", ["heng", "minben"]),
    ("zheng_shen", "正身", "zhèng shēn", "rectifying oneself", "治理者先端正自身，形成示范力量。", ["de", "zheng"]),
    ("xian", "贤", "xián", "worthy person", "德才值得任用和学习的人。", ["junzi", "de"]),
    ("shili", "事理", "shì lǐ", "principles of affairs", "具体事务背后的秩序与道理。", ["ge_wu", "zhi_zhi"]),
    ("liang_xin", "良心", "liáng xīn", "conscience", "道德上自知与自责的内在能力。", ["liangzhi", "cheng"]),
    ("gongyi", "公益", "gōng yì", "public good", "超越私利、关切共同福祉。", ["gong", "yi"]),
    ("shequ", "社区", "shè qū", "community", "家庭之外、国家之内的共同生活空间。", ["ren", "li"]),
    ("kua_wenhua", "跨文化", "kuà wén huà", "cross-cultural", "不同文明传统之间的理解与互释。", ["he", "shu"]),
    ("duihua", "对话", "duì huà", "dialogue", "在差异中相互解释、追问和修正。", ["he", "xue"]),
    ("zeren", "责任", "zé rèn", "responsibility", "人在关系、角色和公共生活中应承担之事。", ["yi", "li"]),
    ("zunyan", "尊严", "zūn yán", "dignity", "人作为道德主体不应被工具化。", ["ren", "yi"]),
    ("ziyou", "自由", "zì yóu", "freedom", "在自律与责任中实现的能动状态。", ["zheng_xin", "yi"]),
    ("quanli", "权利", "quán lì", "rights", "现代公共伦理中保护主体地位的规范语言。", ["gong", "yi"]),
    ("yiwu", "义务", "yì wù", "duty", "因角色、承诺和道义而应当履行之事。", ["yi", "zeren"]),
    ("guanhuai", "关怀", "guān huái", "care", "对他人处境的体察与照护。", ["ren", "ceyin"]),
    ("kejichuli", "科技伦理", "kē jì lún lǐ", "technology ethics", "技术设计和使用中的人伦边界。", ["ren", "li"]),
    ("shengtai", "生态", "shēng tài", "ecology", "人与自然共同生成的生命秩序。", ["jieyong", "tianren"]),
]


PEOPLE = [
    ("bo_yi", "伯夷", "Boyi", "儒家", "商周", "儒家传统中清节与让国的象征。"),
    ("shu_qi", "叔齐", "Shuqi", "儒家", "商周", "与伯夷并称，象征义与廉。"),
    ("zhou_gong", "周公", "Duke of Zhou", "儒家", "西周", "制礼作乐的圣贤政治象征。"),
    ("yao", "尧", "Yao", "儒家", "上古", "儒家政治理想中的圣王。"),
    ("shun", "舜", "Shun", "儒家", "上古", "以孝与德闻名的圣王。"),
    ("yu_the_great", "禹", "Yu the Great", "儒家", "上古", "治水与公天下叙事中的圣王。"),
    ("tang", "汤", "King Tang", "儒家", "商", "儒家王道叙事中的成汤。"),
    ("king_wen", "文王", "King Wen", "儒家", "西周", "周代德治象征。"),
    ("king_wu", "武王", "King Wu", "儒家", "西周", "周代革命与王道叙事人物。"),
    ("yan_zi", "晏子", "Yanzi", "儒家", "春秋", "以节俭、机智和谏诤著称。"),
    ("ran_boniu", "冉伯牛", "Ran Boniu", "儒家", "春秋", "孔门弟子。"),
    ("min_zixian", "闵子骞", "Min Ziqian", "儒家", "春秋", "孔门弟子，以孝行著称。"),
    ("zai_wo", "宰我", "Zai Wo", "儒家", "春秋", "孔门弟子。"),
    ("zi_you", "子游", "Ziyou", "儒家", "春秋", "孔门弟子，重礼乐教化。"),
    ("zi_zhang", "子张", "Zizhang", "儒家", "春秋", "孔门弟子。"),
    ("gongxi_hua", "公西华", "Gongxi Hua", "儒家", "春秋", "孔门弟子，长于礼仪辞令。"),
    ("sima_niu", "司马牛", "Sima Niu", "儒家", "春秋", "孔门弟子。"),
    ("you_ruo", "有若", "You Ruo", "儒家", "春秋", "孔门弟子，即有子。"),
    ("gongshu_ban", "公输班", "Gongshu Ban", "墨家/工艺", "春秋", "工巧象征，常用于说明规矩之必要。"),
    ("han_yu", "韩愈", "Han Yu", "儒家", "唐", "唐代古文运动与道统论代表。"),
    ("li_ao", "李翱", "Li Ao", "儒家", "唐", "唐代儒学复兴人物。"),
    ("zhang_zai", "张载", "Zhang Zai", "理学", "北宋", "关学代表，提出民胞物与等命题。"),
    ("shaoyong", "邵雍", "Shao Yong", "理学", "北宋", "宋代理学人物。"),
    ("sima_guang", "司马光", "Sima Guang", "儒家", "北宋", "史学与政治伦理代表。"),
    ("lu_zuqian", "吕祖谦", "Lu Zuqian", "理学", "南宋", "南宋理学与浙东学术代表。"),
    ("chen_liang", "陈亮", "Chen Liang", "事功学", "南宋", "重事功与经世的思想家。"),
    ("ye_shi", "叶适", "Ye Shi", "事功学", "南宋", "永嘉学派代表人物。"),
    ("wang_fuzhi", "王夫之", "Wang Fuzhi", "儒家", "明清", "明清之际重要思想家。"),
    ("huang_zongxi", "黄宗羲", "Huang Zongxi", "儒家", "明清", "明清之际政治思想家。"),
    ("gu_yanwu", "顾炎武", "Gu Yanwu", "儒家", "明清", "经世致用与考据学代表。"),
]


def _ensure_book(db: Session, book_id: str, seen: set[str]) -> None:
    if book_id in seen or db.get(Book, book_id):
        seen.add(book_id)
        return
    zh, en, author, era, order = BOOKS.get(book_id, (book_id, book_id, None, None, 99))
    db.add(Book(id=book_id, title_zh=zh, title_i18n={"en": en}, author=author, era=era, sort_order=order))
    seen.add(book_id)


def _ensure_chapter(db: Session, book_id: str, title: str, seen: set[str]) -> str:
    cid = f"{book_id}.{title}"
    if cid not in seen and not db.get(Chapter, cid):
        db.add(Chapter(id=cid, book_id=book_id, title_zh=title, sort_order=200))
    seen.add(cid)
    return cid


def _add_passages(db: Session) -> int:
    n = 0
    seen_books: set[str] = set()
    seen_chapters: set[str] = set()
    for ref_id, book_id, chapter, ref_label, text, concepts in PASSAGES:
        if db.get(Passage, ref_id):
            continue
        _ensure_book(db, book_id, seen_books)
        chap_id = _ensure_chapter(db, book_id, chapter, seen_chapters)
        db.add(Passage(id=ref_id, chapter_id=chap_id, ref_label=ref_label, original_text=text, pinyin="", sort_order=1200, concepts=concepts))
        db.add(Translation(passage_id=ref_id, lang="zh", text=text, translator="原文"))
        db.add(Translation(passage_id=ref_id, lang="en", text=f"Platform draft translation: {text}", translator="platform-draft"))
        db.add(Annotation(passage_id=ref_id, type="modern", lang="zh", source="平台批量增强包", content=f"本条可关联「{'、'.join(concepts[:4])}」等概念，用于海外传播解释与图谱扩展，待专家复核。"))
        n += 1
    return n


def _add_concepts(db: Session) -> int:
    n = 0
    for cid, zh, pinyin, en, def_zh, related in CONCEPTS:
        if db.get(Concept, cid):
            continue
        db.add(Concept(id=cid, zh=zh, pinyin=pinyin, i18n={"en": en}, school="儒家", rarity="normal", definition={"zh": def_zh, "en": en}, related=related))
        n += 1
    return n


def _add_people(db: Session) -> int:
    n = 0
    for pid, zh, en, school, era, bio in PEOPLE:
        if db.get(Person, pid):
            continue
        db.add(Person(id=pid, name_zh=zh, name_i18n={"en": en}, school=school, era=era, bio={"zh": bio, "en": en}))
        n += 1
    return n


def _add_propositions(db: Session) -> int:
    n = 0
    for ref_id, _, _, ref_label, text, concepts in PASSAGES:
        pid = "prop_" + ref_id.replace(".", "_").replace("·", "_")
        if db.get(Proposition, pid):
            continue
        db.add(Proposition(id=pid, text_zh=text, text_i18n={"en": text}, passage_ref=ref_id))
        n += 1
    return n


def _node_exists(db: Session, node_id: str, node_type: str) -> bool:
    model = {"person": Person, "school": School, "proposition": Proposition, "concept": Concept, "passage": Passage}.get(node_type)
    return bool(model and db.get(model, node_id))


def _edge_exists(db: Session, s: str, label: str, t: str) -> bool:
    return db.execute(select(GraphEdge).where(GraphEdge.source_id == s, GraphEdge.label == label, GraphEdge.target_id == t)).scalar_one_or_none() is not None


def _add_edge(db: Session, s: str, st: str, label: str, t: str, tt: str) -> bool:
    if not (_node_exists(db, s, st) and _node_exists(db, t, tt)):
        return False
    if _edge_exists(db, s, label, t):
        return False
    db.add(GraphEdge(source_id=s, source_type=st, label=label, target_id=t, target_type=tt))
    return True


def _add_edges(db: Session) -> int:
    candidates: list[tuple[str, str, str, str, str]] = []
    for ref_id, _, _, _, _, concepts in PASSAGES:
        pid = "prop_" + ref_id.replace(".", "_").replace("·", "_")
        candidates.append((pid, "proposition", "FROM", ref_id, "passage"))
        proposer = "xunzi" if ref_id.startswith("xunzi.") else "kongzi"
        if ref_id.startswith("mengzi."):
            proposer = "mengzi"
        if ref_id.startswith("xiaojing.") or ref_id.startswith("liji.") or ref_id.startswith("zhongyong."):
            proposer = "zengzi"
        candidates.append((proposer, "person", "PROPOSED", pid, "proposition"))
        for c in concepts:
            candidates.append((ref_id, "passage", "MENTIONS", c, "concept"))
            candidates.append((pid, "proposition", "ABOUT", c, "concept"))
    for cid, _, _, _, _, related in CONCEPTS:
        for r in related:
            candidates.append((cid, "concept", "RELATED_TO", r, "concept"))
    for pid, _, _, school, _, _ in PEOPLE:
        school_id = "lixue" if school == "理学" else "rujia"
        if school == "心学":
            school_id = "xinxue"
        candidates.append((pid, "person", "BELONGS_TO", school_id, "school"))
    disciples = ["ran_boniu", "min_zixian", "zai_wo", "zi_you", "zi_zhang", "gongxi_hua", "sima_niu", "you_ruo"]
    for d in disciples:
        candidates.append((d, "person", "DISCIPLE_OF", "kongzi", "person"))
    influence = [
        ("yao", "INFLUENCED", "shun"), ("shun", "INFLUENCED", "yu_the_great"), ("zhou_gong", "INFLUENCED", "kongzi"),
        ("kongzi", "INFLUENCED", "mengzi"), ("kongzi", "INFLUENCED", "xunzi"), ("mengzi", "INFLUENCED", "zhu_xi"),
        ("xunzi", "INFLUENCED", "dong_zhongshu"), ("han_yu", "INFLUENCED", "li_ao"), ("zhang_zai", "INFLUENCED", "cheng_hao"),
        ("zhang_zai", "INFLUENCED", "cheng_yi"), ("zhu_xi", "INFLUENCED", "wang_yangming"), ("wang_yangming", "INFLUENCED", "wang_fuzhi"),
        ("huang_zongxi", "INFLUENCED_BY", "wang_yangming"), ("gu_yanwu", "INFLUENCED_BY", "zhu_xi"),
    ]
    for a, label, b in influence:
        candidates.append((a, "person", label, b, "person"))
    n = 0
    for edge in candidates:
        if _add_edge(db, *edge):
            n += 1
    return n


CASE_QUESTIONS = {
    "tech_ethics": [
        "AI 老师应该如何尊重学生差异？", "算法评分能否决定一个人的机会？", "数据收集的边界在哪里？", "AI 陪伴会削弱真实关系吗？",
        "技术公司如何承担公共责任？", "深度伪造为什么伤害信任？", "自动化管理是否会让职场失去人情？", "儿童使用 AI 工具应有什么限制？",
        "开源 AI 的自由与风险如何权衡？", "算法偏见如何用礼和义来理解？", "数字平台如何避免诱导成瘾？", "智能城市如何保护人的尊严？",
        "AI 医疗建议出错谁负责？", "人脸识别应如何接受公共审议？", "技术进步是否必然等于善？", "AI 写作如何不替代学习？",
        "虚拟人能否成为道德关系对象？", "企业收集情绪数据是否合宜？", "机器人照护老人会不会缺少敬？", "科技竞争是否需要节制？",
    ],
    "climate": [
        "节用如何转化为低碳生活？", "气候治理为什么需要代际责任？", "环保政策如何照顾弱势群体？", "绿色消费是否只是个人选择？",
        "企业 ESG 如何避免巧言令色？", "城市更新如何兼顾生态与民生？", "极端天气中社区互助为什么重要？", "能源转型如何体现仁政？",
        "动物与自然能否进入仁的范围？", "气候焦虑如何通过修身安顿？", "公共资源为什么需要礼的边界？", "生态教育如何进入课堂？",
        "低碳政策怎样避免只惩罚穷人？", "富裕者是否有更高节用责任？", "国际气候谈判如何讲信修睦？", "地方传统能否支持生态治理？",
        "技术修复气候的边界在哪里？", "自然灾害后如何重建共同体？", "简朴生活是美德还是负担？", "如何把天人关系讲给海外学生？",
    ],
    "social": [
        "代际照护如何避免变成压迫？", "社区冷漠如何重新建立信任？", "教育公平为什么是民本问题？", "职场竞争如何保持义利之辨？",
        "移民社区如何讲礼尚往来？", "公共讨论如何减少羞辱和攻击？", "慈善如何从推恩走向公共制度？", "家庭教育如何做到爱与敬并重？",
        "校园霸凌中旁观者有何责任？", "弱势者的尊严如何被看见？", "社交媒体时代如何实践恕？", "多元社会如何实现和而不同？",
        "邻里互助为什么不是过时传统？", "贫困治理如何兼顾恒产与恒心？", "志愿服务如何避免道德表演？", "父母期待与个人选择如何沟通？",
        "老龄化社会如何重建孝的现代意义？", "公共礼仪是否仍有必要？", "如何理解人不独亲其亲？", "如何把关怀扩展到陌生人？",
    ],
    "personal": [
        "怎样从焦虑中恢复秩序？", "自律为何不是自我惩罚？", "失败后如何反身而诚？", "长期学习如何避免一暴十寒？",
        "如何在比较中保持本心？", "屏幕成瘾如何通过慎独处理？", "年轻人如何理解天命？", "完美主义如何回到中庸？",
        "孤独时如何修身而不封闭？", "职业选择如何处理义利关系？", "如何建立每日更新的习惯？", "情绪失控时如何正心？",
        "如何在忙碌中保留学习？", "怎样把志向变成笃行？", "如何避免只追求外在认可？", "亲密关系中如何讲恕？",
        "如何面对死亡焦虑？", "怎样理解赤子之心？", "如何让学习回到成人之道？", "内卷时代如何理解君子三乐？",
    ],
    "governance": [
        "好政策为什么要先看民生？", "领导者为什么需要正身？", "公共权力如何避免骄满？", "反腐为什么需要义利之辨？",
        "政府透明度如何建立信任？", "专家治理如何听见民意？", "公共财政如何体现德者本也？", "城市治理如何讲礼与法度？",
        "教育为什么是建国君民之先？", "数字政府如何避免只看指标？", "公共危机中如何讲信修睦？", "基层治理如何重建社区关系？",
        "选贤与能如何转化为现代制度？", "政策执行如何避免过犹不及？", "民本和民主可以怎样对话？", "国家治理如何兼顾效率与仁？",
        "公共服务如何保护尊严？", "如何治理网络平台权力？", "如何理解水能载舟亦能覆舟？", "公共治理中的礼还有什么价值？",
    ],
}


def _add_cases(db: Session) -> int:
    topic_refs = {
        "tech_ethics": ["liji.xueji.1", "liji.zhongyong.4", "xunzi.quanxue.3"],
        "climate": ["xiaojing.shu_ren.1", "liji.liyun.4", "mengzi.lianghuiwang.1.3"],
        "social": ["liji.liyun.2", "liji.liyun.3", "xiaojing.tian_zi.1"],
        "personal": ["liji.zhongyong.4", "xunzi.quanxue.5", "mengzi.jinxin.7.35"],
        "governance": ["liji.xueji.2", "xunzi.wangzhi.1", "lunyu.zilu.13.6b"],
    }
    n = 0
    for topic_id, questions in CASE_QUESTIONS.items():
        for q in questions:
            title = f"批量精选案例 · {q}"
            if db.execute(select(DialogCase).where(DialogCase.title == title)).scalar_one_or_none():
                continue
            citations = []
            for rid in topic_refs[topic_id]:
                p = db.get(Passage, rid)
                if p:
                    citations.append({"ref_id": rid, "ref_label": p.ref_label or rid, "text": p.original_text})
            answer = (
                f"【问题】{q}\n\n"
                "【儒家视角】可以从修身、关系责任和公共秩序三层来回答：先校正自身动机，再考虑他人处境，最后看制度是否能形成可持续的善。\n\n"
                f"【经典依据】{'；'.join(c['text'] for c in citations)}\n\n"
                "【海外传播用法】适合做双语课堂讨论、短视频脚本、知识图谱入口和跨文明伦理对照。此条为平台草案，待专家复核。"
            )
            db.add(DialogCase(
                topic_id=topic_id,
                lang="zh",
                title=title,
                question=q,
                confucian_answer=answer,
                cross_civ_views=[],
                citations=citations,
                tags=["批量精选案例", topic_id, "overseas", "review_needed"],
                status="published",
                quality=3,
                ai_generated=True,
                reviewer="seed_enrichment_bulk",
                review_note="批量增强包生成的海外传播案例草案，需专家抽检与润色。",
            ))
            n += 1
    return n


def seed_enrichment_bulk(db: Session) -> dict:
    counts = {
        "passages": _add_passages(db),
        "concepts": _add_concepts(db),
        "people": _add_people(db),
    }
    db.flush()
    counts["propositions"] = _add_propositions(db)
    db.flush()
    counts["graph_edges"] = _add_edges(db)
    counts["cases"] = _add_cases(db)
    db.commit()
    return counts


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        print("[seed_enrichment_bulk]", seed_enrichment_bulk(db))
    finally:
        db.close()


if __name__ == "__main__":
    main()
