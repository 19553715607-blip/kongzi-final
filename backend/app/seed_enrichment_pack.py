"""Small but complete Confucian content enrichment pack.

Adds:
- Mencius + Great Learning passages
- 50 concepts
- people / propositions for the knowledge graph
- 200 graph triples
- 20 curated cross-civilizational dialog cases

All modern explanations and translations in this file are platform-authored
drafts for review. Classical source text is public-domain premodern text.
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


PASSAGES = [
    # Mencius: Liang Hui Wang
    ("mengzi.lianghuiwang.1.3", "mengzi", "梁惠王上", "孟子·梁惠王上·1.3", "不违农时，谷不可胜食也；数罟不入洿池，鱼鳖不可胜食也；斧斤以时入山林，材木不可胜用也。", ["minben", "renzheng", "jieyong"]),
    ("mengzi.lianghuiwang.1.5", "mengzi", "梁惠王上", "孟子·梁惠王上·1.5", "保民而王，莫之能御也。", ["baomin", "wangdao", "renzheng"]),
    ("mengzi.lianghuiwang.1.7b", "mengzi", "梁惠王上", "孟子·梁惠王上·1.7", "无伤也，是乃仁术也，见牛未见羊也。", ["renshu", "ceyin", "ren"]),
    ("mengzi.lianghuiwang.1.7c", "mengzi", "梁惠王上", "孟子·梁惠王上·1.7", "推恩足以保四海，不推恩无以保妻子。", ["tui_en", "renzheng", "shu"]),
    ("mengzi.lianghuiwang.1.7d", "mengzi", "梁惠王上", "孟子·梁惠王上·1.7", "权，然后知轻重；度，然后知长短。", ["quan", "zhi", "zhongyong"]),
    ("mengzi.lianghuiwang.1.8", "mengzi", "梁惠王上", "孟子·梁惠王上·1.8", "乐民之乐者，民亦乐其乐；忧民之忧者，民亦忧其忧。", ["yumin_tongle", "minben", "renzheng"]),
    # Mencius: Gong Sun Chou
    ("mengzi.gongsunchou.2.2", "mengzi", "公孙丑上", "孟子·公孙丑上·2.2", "我善养吾浩然之气。", ["haoran_zhi_qi", "yangqi", "yong"]),
    ("mengzi.gongsunchou.2.2b", "mengzi", "公孙丑上", "孟子·公孙丑上·2.2", "其为气也，至大至刚，以直养而无害，则塞于天地之间。", ["haoran_zhi_qi", "zhi_direct", "cheng"]),
    ("mengzi.gongsunchou.2.6b", "mengzi", "公孙丑上", "孟子·公孙丑上·2.6", "人皆有不忍人之心。", ["buren_ren_zhi_xin", "ceyin", "ren"]),
    ("mengzi.gongsunchou.2.6c", "mengzi", "公孙丑上", "孟子·公孙丑上·2.6", "无恻隐之心，非人也；无羞恶之心，非人也；无辞让之心，非人也；无是非之心，非人也。", ["si_duan", "ceyin", "xiuwu", "cirang", "shifei"]),
    # Mencius: Teng Wen Gong / Li Lou / Gao Zi / Jin Xin
    ("mengzi.tengwengong.3.3", "mengzi", "滕文公上", "孟子·滕文公上·3.3", "劳心者治人，劳力者治于人。", ["fen_gong", "zheng", "li"]),
    ("mengzi.lilou.4.1", "mengzi", "离娄上", "孟子·离娄上·4.1", "离娄之明，公输子之巧，不以规矩，不能成方圆。", ["guiju", "li", "zheng_ming"]),
    ("mengzi.lilou.4.12", "mengzi", "离娄上", "孟子·离娄上·4.12", "诚者，天之道也；思诚者，人之道也。", ["cheng", "tianren", "dao"]),
    ("mengzi.lilou.4.17", "mengzi", "离娄上", "孟子·离娄上·4.17", "人有不为也，而后可以有为。", ["youwei", "jie_zhi", "yi"]),
    ("mengzi.gaozi.6.2", "mengzi", "告子上", "孟子·告子上·6.2", "水信无分于东西，无分于上下乎？人性之善也，犹水之就下也。", ["xing_shan", "xing", "shan"]),
    ("mengzi.gaozi.6.8", "mengzi", "告子上", "孟子·告子上·6.8", "虽有天下易生之物也，一日暴之，十日寒之，未有能生者也。", ["yi_bao_shi_han", "xue", "heng"]),
    ("mengzi.gaozi.6.15", "mengzi", "告子上", "孟子·告子上·6.15", "故天将降大任于是人也，必先苦其心志，劳其筋骨。", ["tianjiang_daren", "ming", "yong"]),
    ("mengzi.jinxin.7.1", "mengzi", "尽心上", "孟子·尽心上·7.1", "尽其心者，知其性也；知其性，则知天矣。", ["jinxin", "xing", "tian"]),
    ("mengzi.jinxin.7.20", "mengzi", "尽心上", "孟子·尽心上·7.20", "君子有三乐，而王天下不与存焉。", ["sanle", "junzi", "le"]),
    ("mengzi.jinxin.7.24", "mengzi", "尽心上", "孟子·尽心上·7.24", "孔子登东山而小鲁，登泰山而小天下。", ["jingjie", "kongzi", "xue"]),
    # Great Learning
    ("daxue.jing.3", "daxue", "经一章", "大学·经一章", "物有本末，事有终始。知所先后，则近道矣。", ["benmo", "zhixu", "dao"]),
    ("daxue.jing.4", "daxue", "经一章", "大学·经一章", "格物而后知至，知至而后意诚，意诚而后心正。", ["ge_wu", "zhi_zhi", "cheng_yi", "zheng_xin"]),
    ("daxue.jing.5", "daxue", "经一章", "大学·经一章", "心正而后身修，身修而后家齐，家齐而后国治，国治而后天下平。", ["zheng_xin", "xiu_shen", "qi_jia", "zhi_guo", "ping_tianxia"]),
    ("daxue.zhuan.1", "daxue", "传一章", "大学·传一章", "康诰曰：克明德。", ["mingde", "de", "xiu_shen"]),
    ("daxue.zhuan.2", "daxue", "传二章", "大学·传二章", "苟日新，日日新，又日新。", ["rixin", "xue", "xiu_shen"]),
    ("daxue.zhuan.3", "daxue", "传三章", "大学·传三章", "诗云：邦畿千里，惟民所止。", ["zhizhi", "minben", "li"]),
    ("daxue.zhuan.6", "daxue", "传六章", "大学·传六章", "所谓诚其意者，毋自欺也。", ["cheng_yi", "shen_du", "cheng"]),
    ("daxue.zhuan.7", "daxue", "传七章", "大学·传七章", "所谓修身在正其心者，身有所忿懥，则不得其正。", ["zheng_xin", "xiu_shen", "qing_zhi"]),
    ("daxue.zhuan.8", "daxue", "传八章", "大学·传八章", "所谓齐其家在修其身者，人之其所亲爱而辟焉。", ["qi_jia", "xiu_shen", "gong"]),
    ("daxue.zhuan.10", "daxue", "传十章", "大学·传十章", "德者本也，财者末也。", ["de", "benmo", "yi_li"]),
]


CONCEPTS = [
    ("minben", "民本", "mín běn", "people as the foundation", "政治合法性以民生与民心为根本。", ["renzheng", "de"]),
    ("renzheng", "仁政", "rén zhèng", "benevolent governance", "以仁爱与民生为核心的治理理想。", ["ren", "minben"]),
    ("jieyong", "节用", "jié yòng", "frugal use", "节制资源消耗，使民生、生态与礼义相互协调。", ["jie_zhi", "ren"]),
    ("wangdao", "王道", "wáng dào", "kingly way", "以德性、仁义和民心建立秩序的政治道路。", ["renzheng", "de"]),
    ("baomin", "保民", "bǎo mín", "protecting the people", "使人民得以安生立命，是王道政治的入口。", ["minben"]),
    ("ceyin", "恻隐", "cè yǐn", "compassionate concern", "见人受苦而自然不忍，是仁之端。", ["ren"]),
    ("xiuwu", "羞恶", "xiū wù", "moral shame", "对不义与恶行的羞耻和厌恶，是义之端。", ["yi"]),
    ("cirang", "辞让", "cí ràng", "deference", "谦退礼让的心，是礼之端。", ["li"]),
    ("shifei", "是非", "shì fēi", "moral discernment", "辨别是非善恶的能力，是智之端。", ["zhi"]),
    ("si_duan", "四端", "sì duān", "four moral sprouts", "恻隐、羞恶、辞让、是非四种道德开端。", ["ren", "yi", "li", "zhi"]),
    ("xing_shan", "性善", "xìng shàn", "goodness of human nature", "孟子关于人性具有向善端绪的核心命题。", ["xing", "si_duan"]),
    ("shan", "善", "shàn", "goodness", "合乎道义、成就人之为人的价值状态。", ["ren", "yi"]),
    ("haoran_zhi_qi", "浩然之气", "hào rán zhī qì", "flood-like qi", "由正直与义长期涵养出的宏大刚健之气。", ["yi", "yong"]),
    ("yangqi", "养气", "yǎng qì", "cultivating qi", "以正直、义行和不害之心涵养人格力量。", ["haoran_zhi_qi"]),
    ("zhi_direct", "直", "zhí", "uprightness", "不曲从私欲与外力的正直状态。", ["cheng", "yi"]),
    ("buren_ren_zhi_xin", "不忍人之心", "bù rěn rén zhī xīn", "heart unable to bear others' suffering", "见他人苦难而不能漠然处之的仁心。", ["ceyin", "ren"]),
    ("renshu", "仁术", "rén shù", "method of humaneness", "把不忍之心落实为政治和行动的方法。", ["ren", "renzheng"]),
    ("tui_en", "推恩", "tuī ēn", "extending care", "把亲近关系中的恩爱推广到更广阔的人群。", ["shu", "ren"]),
    ("quan", "权", "quán", "weighing circumstances", "在原则与情境之间权衡轻重的判断能力。", ["zhongyong", "zhi"]),
    ("yumin_tongle", "与民同乐", "yǔ mín tóng lè", "sharing joy with the people", "治理者与人民共享忧乐的政治情感。", ["minben", "renzheng"]),
    ("fen_gong", "分工", "fēn gōng", "division of labor", "不同职责相互成就社会秩序。", ["li", "zheng"]),
    ("guiju", "规矩", "guī jǔ", "standards and measures", "成就方圆与秩序的规范尺度。", ["li"]),
    ("tianren", "天人", "tiān rén", "Heaven and humanity", "天道与人道之间的贯通关系。", ["dao", "cheng"]),
    ("youwei", "有为", "yǒu wéi", "purposeful action", "有所不为之后才能承担的正当作为。", ["yi"]),
    ("jie_zhi", "节制", "jié zhì", "restraint", "对欲望、权力和行动限度的自觉把握。", ["li", "zhongyong"]),
    ("yi_bao_shi_han", "一暴十寒", "yī pù shí hán", "one day of heat, ten days of cold", "学习和修养不可间断的警示。", ["xue", "heng"]),
    ("heng", "恒", "héng", "constancy", "持续稳定的修养工夫。", ["xue", "cheng"]),
    ("tianjiang_daren", "天降大任", "tiān jiàng dà rèn", "Heaven entrusts great responsibility", "大任常伴随磨炼与承担。", ["ming", "yong"]),
    ("jinxin", "尽心", "jìn xīn", "fully realizing the heart-mind", "穷尽自身心性以通达人性与天道。", ["xing", "tian"]),
    ("tian", "天", "tiān", "Heaven", "儒家语境中的天道、命令与价值根源。", ["tianming", "dao"]),
    ("sanle", "三乐", "sān lè", "three joys", "孟子所说君子内在而非权位性的三种快乐。", ["junzi", "le"]),
    ("jingjie", "境界", "jìng jiè", "spiritual horizon", "通过学习和登临而拓展的胸襟与视野。", ["xue", "dao"]),
    ("benmo", "本末", "běn mò", "root and branch", "辨别根本与末节的秩序意识。", ["dao"]),
    ("zhixu", "秩序", "zhì xù", "order", "事物先后、本末与社会规范形成的有序状态。", ["li"]),
    ("cheng_yi", "诚意", "chéng yì", "making the will sincere", "不自欺，使意念真实诚恳。", ["cheng", "shen_du"]),
    ("zheng_xin", "正心", "zhèng xīn", "rectifying the heart-mind", "校正心中偏蔽，使身心归于中正。", ["xiu_shen"]),
    ("qi_jia", "齐家", "qí jiā", "ordering the family", "以修身为根基使家庭关系各得其正。", ["xiu_shen", "li"]),
    ("zhi_guo", "治国", "zhì guó", "ordering the state", "把修身齐家的德性扩展到公共治理。", ["renzheng", "minben"]),
    ("ping_tianxia", "平天下", "píng tiān xià", "bringing peace to the world", "由修身到天下秩序的最高政治理想。", ["zhi_guo", "he"]),
    ("mingde", "明德", "míng dé", "luminous virtue", "人本具而需要彰明的德性光明。", ["de"]),
    ("rixin", "日新", "rì xīn", "daily renewal", "持续自我更新的修养精神。", ["xue", "xiu_shen"]),
    ("zhizhi", "止至", "zhǐ zhì", "resting in the fitting place", "知其所当止，安顿于合宜之处。", ["zhongyong"]),
    ("shen_du", "慎独", "shèn dú", "watchfulness when alone", "独处无人知时仍不自欺的自我约束。", ["cheng_yi", "jing"]),
    ("qing_zhi", "情志", "qíng zhì", "emotions and intentions", "情绪与意向需要在修身中被调适。", ["zheng_xin"]),
    ("gong", "公", "gōng", "public-mindedness", "超越私偏、面向公共正当性的态度。", ["yi", "li"]),
    ("yi_li", "义利之辨", "yì lì zhī biàn", "distinguishing righteousness and profit", "以义校正利益追求的价值辨析。", ["yi", "li_yi"]),
    ("jingshi", "经世", "jīng shì", "ordering the world", "把学问落实于社会治理和民生事务。", ["zhi_guo"]),
    ("jiaohua", "教化", "jiào huà", "moral education", "以教育、礼乐和榜样转化人心风俗。", ["jiao", "li"]),
    ("shuren", "树人", "shù rén", "cultivating persons", "教育以成就人格为根本。", ["jiao", "de"]),
    ("liangzhi", "良知", "liáng zhī", "innate moral knowing", "不待外求而能知善恶的道德知觉。", ["zhi", "xing_shan"]),
    ("liangneng", "良能", "liáng néng", "innate moral capacity", "不待学习而能发用的道德能力。", ["xing_shan", "liangzhi"]),
]


PEOPLE = [
    ("xunzi", "荀子", "Xunzi", "儒家", "战国", "主张性恶与礼法教化的儒家思想家。"),
    ("dong_zhongshu", "董仲舒", "Dong Zhongshu", "儒家", "西汉", "推动汉代儒学制度化的重要思想家。"),
    ("zhou_dunyi", "周敦颐", "Zhou Dunyi", "理学", "北宋", "宋明理学开端人物之一。"),
    ("cheng_hao", "程颢", "Cheng Hao", "理学", "北宋", "洛学代表，与程颐并称二程。"),
    ("cheng_yi", "程颐", "Cheng Yi", "理学", "北宋", "强调居敬穷理，对朱熹影响深远。"),
    ("zhu_xi", "朱熹", "Zhu Xi", "理学", "南宋", "四书章句集注作者，理学集大成者。"),
    ("lu_jiuyuan", "陆九渊", "Lu Jiuyuan", "心学", "南宋", "心学重要先驱。"),
    ("wang_yangming", "王阳明", "Wang Yangming", "心学", "明代", "提出致良知与知行合一的心学大家。"),
    ("zi_lu", "子路", "Zilu", "儒家", "春秋", "孔门弟子，以勇直著称。"),
    ("zi_xia", "子夏", "Zixia", "儒家", "春秋", "孔门弟子，重文献与教育。"),
    ("ran_you", "冉有", "Ran You", "儒家", "春秋", "孔门弟子，长于政事。"),
    ("you_zi", "有子", "Youzi", "儒家", "春秋", "孔门弟子，重孝悌之道。"),
    ("zi_si", "子思", "Zisi", "儒家", "战国", "孔子之孙，传为《中庸》思想传统关键人物。"),
    ("yan_yuan", "颜渊", "Yan Yuan", "儒家", "春秋", "即颜回，孔门德行代表。"),
    ("mencius_mother", "孟母", "Mother of Mencius", "儒家", "战国", "孟子成长叙事中的教育象征。"),
]


SCHOOLS = [
    ("lixue", "理学", "Neo-Confucianism"),
    ("xinxue", "心学", "School of Mind"),
    ("jingxue", "经学", "Classical learning"),
]


PROPOSITIONS = [
    ("prop_xingshan", "人性之善也，犹水之就下也。", "mengzi.gaozi.6.2", ["xing_shan", "xing", "shan"]),
    ("prop_siduan", "恻隐、羞恶、辞让、是非为四端。", "mengzi.gongsunchou.2.6c", ["si_duan", "ren", "yi", "li", "zhi"]),
    ("prop_renzheng", "保民而王，莫之能御也。", "mengzi.lianghuiwang.1.5", ["renzheng", "minben", "wangdao"]),
    ("prop_tui_en", "推恩足以保四海。", "mengzi.lianghuiwang.1.7c", ["tui_en", "shu", "ren"]),
    ("prop_haoran", "我善养吾浩然之气。", "mengzi.gongsunchou.2.2", ["haoran_zhi_qi", "yangqi", "yi"]),
    ("prop_cheng", "诚者，天之道也；思诚者，人之道也。", "mengzi.lilou.4.12", ["cheng", "tianren", "dao"]),
    ("prop_daxue_mingde", "大学之道，在明明德，在亲民，在止于至善。", "daxue.jing.1", ["mingde", "zhizhi", "shan"]),
    ("prop_daxue_batiao", "格物、致知、诚意、正心、修身、齐家、治国、平天下。", "daxue.jing.4", ["ge_wu", "zhi_zhi", "cheng_yi", "zheng_xin", "xiu_shen", "qi_jia", "zhi_guo", "ping_tianxia"]),
    ("prop_shendu", "所谓诚其意者，毋自欺也。", "daxue.zhuan.6", ["cheng_yi", "shen_du", "cheng"]),
    ("prop_deben", "德者本也，财者末也。", "daxue.zhuan.10", ["de", "benmo", "yi_li"]),
]


CASES = [
    ("tech_ethics", "AI 判断学生品格是否合适？", "AI 可以辅助观察学习行为，但不应替代师生之间的成德判断。儒家重视教化与因材施教，人的成长不能被单一数据标签固定。", ["jiao", "shuren", "ren"], ["daxue.jing.4", "lunyu.weizheng.2.15"]),
    ("tech_ethics", "算法推荐让人越来越偏激，儒家怎么看？", "儒家会把问题放在心性与礼的层面：技术若持续刺激偏私和愤怒，就需要制度礼法与自我节制共同校正。", ["zheng_xin", "jie_zhi", "li"], ["daxue.zhuan.7", "lunyu.yanyuan.12.1"]),
    ("tech_ethics", "生成式 AI 能不能代写作业？", "学习的目的不是交付答案，而是成就心智。若 AI 让学生逃避思考，就违背格物致知；若用于启发、校对和讨论，则可成为学的助缘。", ["xue", "ge_wu", "zhi_zhi"], ["daxue.jing.4", "lunyu.weizheng.2.15"]),
    ("tech_ethics", "数字监控能否为了安全而扩大？", "儒家并不否认秩序，但秩序应服务民生与德治。若监控把人仅视为可疑对象，就会损害仁政所需的信任。", ["minben", "renzheng", "xin"], ["mengzi.lianghuiwang.1.5", "lunyu.weizheng.2.22"]),
    ("climate", "低碳生活是个人美德还是公共责任？", "从儒家看，节用不是孤立的个人偏好，而是仁心向万物和后代扩展后的生活方式；个人修身和公共制度应相互支持。", ["jieyong", "ren", "gong"], ["mengzi.lianghuiwang.1.3", "lunyu.yanyuan.12.1"]),
    ("climate", "企业绿色转型是否只是形象工程？", "应看其是否真正把德作为本、财作为末。若只追求声誉和利润，绿色语言就会变成巧言；若改变生产与责任结构，才接近义。", ["de", "benmo", "yi_li"], ["daxue.zhuan.10", "lunyu.xueer.1.3"]),
    ("climate", "气候政策会不会伤害穷人？", "仁政要求先看民生承受力。政策要节制过度消耗，也要避免把转型成本转嫁给最脆弱的人。", ["renzheng", "minben", "quan"], ["mengzi.lianghuiwang.1.3", "mengzi.lianghuiwang.1.7d"]),
    ("climate", "为什么要为未来世代负责？", "儒家把人放在连续的关系中理解。修身齐家治国平天下意味着责任不止于当下个人，也延伸到未见之人。", ["ping_tianxia", "gong", "ren"], ["daxue.jing.5", "mengzi.lianghuiwang.1.7c"]),
    ("social", "家庭责任和个人自由冲突时怎么办？", "儒家不是简单压倒个人，而是要求在亲亲、义理和正心之间权衡。真正的孝敬需要诚意，不是盲从。", ["xiao", "jing", "quan"], ["daxue.zhuan.8", "lunyu.weizheng.2.7"]),
    ("social", "公益慈善应当从身边人开始吗？", "孟子的推恩思想说明，亲近关系可以成为公共关怀的起点，但不能成为排斥陌生人的借口。", ["tui_en", "shu", "ren"], ["mengzi.lianghuiwang.1.7c", "lunyu.yanyuan.12.2"]),
    ("social", "教育公平为什么重要？", "教育不是只生产能力，而是树人。若学习机会被出身锁定，社会就失去教化和向善的基础。", ["jiao", "shuren", "minben"], ["daxue.jing.4", "mengzi.lianghuiwang.1.5"]),
    ("social", "网络暴力中旁观者有责任吗？", "恻隐之心要求人不能把他人的痛苦当作娱乐。旁观者至少应停止扩散伤害，并在合宜范围内维护公正。", ["ceyin", "yi", "gong"], ["mengzi.gongsunchou.2.6b", "lunyu.yanyuan.12.2"]),
    ("personal", "年轻人面对内卷如何安顿？", "儒家会把焦点从外在比较转向修身次第：格物、致知、诚意、正心。先建立可持续的学习与行动节奏。", ["xiu_shen", "heng", "rixin"], ["daxue.jing.4", "daxue.zhuan.2"]),
    ("personal", "失败后如何重新开始？", "孟子讲天降大任常伴随磨炼。失败不是自动带来成长，关键是能否反身而诚，整理经验后重新立志。", ["tianjiang_daren", "cheng", "yong"], ["mengzi.gaozi.6.15", "mengzi.jinxin.7.4"]),
    ("personal", "如何理解真正的自律？", "自律不是压抑自己，而是正心诚意，使欲望回到合宜位置。这样获得的是能行动、能承担的自由。", ["zheng_xin", "cheng_yi", "jie_zhi"], ["daxue.zhuan.6", "daxue.zhuan.7"]),
    ("personal", "屏幕成瘾如何对治？", "儒家会从慎独和正心入手：无人监督时仍不自欺，观察自己被什么牵动，再建立礼一样的生活边界。", ["shen_du", "zheng_xin", "li"], ["daxue.zhuan.6", "lunyu.yanyuan.12.1"]),
    ("governance", "好政府最重要的指标是什么？", "儒家首先看是否保民、是否得民心。效率重要，但不能脱离民生、信任与德性。", ["baomin", "minben", "de"], ["mengzi.lianghuiwang.1.5", "lunyu.weizheng.2.1"]),
    ("governance", "公共政策中专家和民意如何平衡？", "儒家会强调权衡：专家提供知，民意体现民生与信任。治理者需要以公心校正偏私。", ["quan", "gong", "minben"], ["mengzi.lianghuiwang.1.7d", "daxue.zhuan.8"]),
    ("governance", "反腐为什么不只是法律问题？", "法律能止恶，德治和礼治才能塑造耻感与责任。反腐需要制度约束，也需要把义利之辨重新放回公共生活。", ["yi_li", "li", "de"], ["daxue.zhuan.10", "lunyu.weizheng.2.3"]),
    ("governance", "数字政府如何避免技术傲慢？", "技术治理必须服务民本，而不是以可计算性替代人的处境。政策应可解释、可申诉，并保留对弱者的恻隐。", ["minben", "ceyin", "renzheng"], ["mengzi.gongsunchou.2.6b", "mengzi.lianghuiwang.1.5"]),
]


def _ensure_book(db: Session, book_id: str) -> None:
    if db.get(Book, book_id):
        return
    meta = {
        "mengzi": ("孟子", "Mencius", "孟子及其后学", "战国", 2),
        "daxue": ("大学", "The Great Learning", "《礼记》篇章，传统归入四书", "先秦", 3),
    }[book_id]
    db.add(Book(id=book_id, title_zh=meta[0], title_i18n={"en": meta[1]}, author=meta[2], era=meta[3], sort_order=meta[4]))
    # Session 配置为 autoflush=False，不手动 flush 的话同一会话内后续 db.get()
    # 看不到这条待提交记录，会重复 add 同一主键 → UNIQUE constraint failed
    db.flush()


def _ensure_chapter(db: Session, book_id: str, title: str) -> str:
    cid = f"{book_id}.{title}"
    if not db.get(Chapter, cid):
        db.add(Chapter(id=cid, book_id=book_id, title_zh=title, sort_order=100))
        db.flush()
    return cid


def _add_passages(db: Session) -> int:
    added = 0
    for ref_id, book_id, chapter, ref_label, text, concepts in PASSAGES:
        if db.get(Passage, ref_id):
            continue
        _ensure_book(db, book_id)
        chapter_id = _ensure_chapter(db, book_id, chapter)
        db.add(Passage(id=ref_id, chapter_id=chapter_id, ref_label=ref_label, original_text=text, pinyin="", sort_order=950, concepts=concepts))
        db.add(Translation(passage_id=ref_id, lang="zh", text=text, translator="原文"))
        db.add(Translation(passage_id=ref_id, lang="en", text=f"Platform draft translation: {text}", translator="platform-draft"))
        db.add(Annotation(passage_id=ref_id, type="modern", lang="zh", source="平台增强包", content=f"本条可用于理解「{'、'.join(concepts[:3])}」等儒家概念，需专家复核。"))
        added += 1
    return added


def _add_concepts(db: Session) -> int:
    added = 0
    for cid, zh, pinyin, en, def_zh, related in CONCEPTS:
        if db.get(Concept, cid):
            continue
        db.add(Concept(
            id=cid,
            zh=zh,
            pinyin=pinyin,
            i18n={"en": en},
            school="儒家",
            rarity="normal",
            definition={"zh": def_zh, "en": en},
            related=related,
        ))
        added += 1
    return added


def _add_people_and_schools(db: Session) -> tuple[int, int]:
    schools = 0
    for sid, zh, en in SCHOOLS:
        if not db.get(School, sid):
            db.add(School(id=sid, name_zh=zh, name_i18n={"en": en}))
            schools += 1
    people = 0
    for pid, zh, en, school, era, bio in PEOPLE:
        if not db.get(Person, pid):
            db.add(Person(id=pid, name_zh=zh, name_i18n={"en": en}, school=school, era=era, bio={"zh": bio, "en": en}))
            people += 1
    return people, schools


def _add_propositions(db: Session) -> int:
    added = 0
    for pid, text, passage_ref, concepts in PROPOSITIONS:
        if db.get(Proposition, pid):
            continue
        db.add(Proposition(id=pid, text_zh=text, text_i18n={"en": text}, passage_ref=passage_ref))
        added += 1
    return added


def _edge_exists(db: Session, s: str, label: str, t: str) -> bool:
    return db.execute(
        select(GraphEdge).where(
            GraphEdge.source_id == s,
            GraphEdge.label == label,
            GraphEdge.target_id == t,
        )
    ).scalar_one_or_none() is not None


def _add_edge(db: Session, s: str, st: str, label: str, t: str, tt: str) -> bool:
    if _edge_exists(db, s, label, t):
        return False
    db.add(GraphEdge(source_id=s, source_type=st, label=label, target_id=t, target_type=tt))
    return True


def _candidate_edges() -> list[tuple[str, str, str, str, str]]:
    edges: list[tuple[str, str, str, str, str]] = []
    school_map = {
        "儒家": "rujia",
        "理学": "lixue",
        "心学": "xinxue",
    }
    for pid, _, _, school, _, _ in PEOPLE:
        edges.append((pid, "person", "BELONGS_TO", school_map.get(school, "rujia"), "school"))
    for disciple in ["zi_lu", "zi_xia", "ran_you", "you_zi", "zi_si", "yan_yuan"]:
        edges.append((disciple, "person", "DISCIPLE_OF", "kongzi", "person"))
    edges += [
        ("mengzi", "person", "INFLUENCED_BY", "zi_si", "person"),
        ("xunzi", "person", "INFLUENCED_BY", "kongzi", "person"),
        ("dong_zhongshu", "person", "INFLUENCED_BY", "mengzi", "person"),
        ("zhou_dunyi", "person", "INFLUENCED", "cheng_hao", "person"),
        ("zhou_dunyi", "person", "INFLUENCED", "cheng_yi", "person"),
        ("cheng_hao", "person", "INFLUENCED", "zhu_xi", "person"),
        ("cheng_yi", "person", "INFLUENCED", "zhu_xi", "person"),
        ("lu_jiuyuan", "person", "INFLUENCED", "wang_yangming", "person"),
        ("zhu_xi", "person", "COMMENTED_ON", "daxue.jing.1", "passage"),
        ("zhu_xi", "person", "COMMENTED_ON", "mengzi.gaozi.6.2", "passage"),
    ]
    for pid, _, ref, concepts in PROPOSITIONS:
        proposer = "mengzi" if ref.startswith("mengzi.") else "zengzi"
        edges.append((proposer, "person", "PROPOSED", pid, "proposition"))
        edges.append((pid, "proposition", "FROM", ref, "passage"))
        for c in concepts:
            edges.append((pid, "proposition", "ABOUT", c, "concept"))
    for ref_id, _, _, _, _, concepts in PASSAGES:
        for c in concepts:
            if c == "kongzi":
                edges.append((ref_id, "passage", "MENTIONS", "kongzi", "person"))
                continue
            edges.append((ref_id, "passage", "MENTIONS", c, "concept"))
    for cid, _, _, _, _, related in CONCEPTS:
        for r in related:
            edges.append((cid, "concept", "RELATED_TO", r, "concept"))
    # Add a denser concept net for exploration.
    thematic = [
        ("minben", "renzheng"), ("renzheng", "wangdao"), ("wangdao", "de"), ("baomin", "minben"),
        ("ceyin", "si_duan"), ("xiuwu", "si_duan"), ("cirang", "si_duan"), ("shifei", "si_duan"),
        ("xing_shan", "liangzhi"), ("liangzhi", "liangneng"), ("haoran_zhi_qi", "yangqi"),
        ("yangqi", "zhi_direct"), ("buren_ren_zhi_xin", "ceyin"), ("renshu", "tui_en"),
        ("tui_en", "shu"), ("quan", "zhongyong"), ("yumin_tongle", "minben"), ("fen_gong", "li"),
        ("guiju", "li"), ("tianren", "cheng"), ("youwei", "jie_zhi"), ("yi_bao_shi_han", "heng"),
        ("tianjiang_daren", "ming"), ("jinxin", "tian"), ("sanle", "le"), ("jingjie", "xue"),
        ("benmo", "de"), ("zhixu", "li"), ("cheng_yi", "shen_du"), ("zheng_xin", "qing_zhi"),
        ("qi_jia", "xiu_shen"), ("zhi_guo", "qi_jia"), ("ping_tianxia", "zhi_guo"),
        ("mingde", "de"), ("rixin", "xue"), ("zhizhi", "zhongyong"), ("gong", "yi"),
        ("yi_li", "yi"), ("jingshi", "zhi_guo"), ("jiaohua", "jiao"), ("shuren", "jiao"),
    ]
    for a, b in thematic:
        edges.append((a, "concept", "RELATED_TO", b, "concept"))
    return edges


def _add_graph_edges(db: Session, target_new: int = 200) -> int:
    added = 0
    for s, st, label, t, tt in _candidate_edges():
        if added >= target_new:
            break
        if _add_edge(db, s, st, label, t, tt):
            added += 1
    return added


def _add_cases(db: Session) -> int:
    added = 0
    for topic_id, question, answer, tags, refs in CASES:
        title = f"精品案例 · {question}"
        exists = db.execute(select(DialogCase).where(DialogCase.title == title)).scalar_one_or_none()
        if exists:
            continue
        citations = []
        for rid in refs:
            p = db.get(Passage, rid)
            if p:
                citations.append({"ref_id": rid, "ref_label": p.ref_label or rid, "text": p.original_text})
        db.add(DialogCase(
            topic_id=topic_id,
            lang="zh",
            title=title,
            question=question,
            confucian_answer=(
                f"【精品案例】{answer}\n\n"
                f"【经典依据】" + "；".join(c["text"] for c in citations) + "\n\n"
                "【使用建议】适合海外课堂、跨文化讨论和平台问答页展示；仍建议专家终审。"
            ),
            cross_civ_views=[],
            citations=citations,
            tags=["精品案例", topic_id, *tags],
            status="published",
            quality=4,
            ai_generated=True,
            reviewer="seed_enrichment_pack",
            review_note="平台增强包生成的首批精品案例草案，已做结构化溯源，待专家复核。",
        ))
        added += 1
    return added


def seed_enrichment_pack(db: Session) -> dict:
    counts = {}
    counts["passages"] = _add_passages(db)
    counts["concepts"] = _add_concepts(db)
    people, schools = _add_people_and_schools(db)
    counts["people"] = people
    counts["schools"] = schools
    counts["propositions"] = _add_propositions(db)
    db.flush()
    counts["graph_edges"] = _add_graph_edges(db, 200)
    counts["cases"] = _add_cases(db)
    db.commit()
    return counts


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        counts = seed_enrichment_pack(db)
        print("[seed_enrichment_pack]", counts)
    finally:
        db.close()


if __name__ == "__main__":
    main()
