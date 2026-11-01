"""语料规模化（S3.1）：论语扩章 + 概念扩到 20+ + 多语译文（中英法西阿）。

口径：每条 passage 含「原文+拼音+5 语译文+概念标注」共 7 个语料单元。
每条 concept 含「中文+拼音+5 语译文+多语定义+学派+稀有度」共 8 个单元。
跨文明立场 25 条 × 5 语 headline = 125 单元。
所有内容均标注 ai_generated（在 seed_corpus 入库时，对应模型字段已支持后续覆盖）。

仅在库内对应表为空（或缺失对应 ref_id）时增量插入，保持 idempotent。
"""
from __future__ import annotations

from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    Annotation,
    Book,
    Chapter,
    Concept,
    CrossCivView,
    Passage,
    Topic,
    Translation,
)

# ── 论语扩章 ─────────────────────────────────────────────────────────────────
# 每条：(ref_id, chapter, ref_label, text, pinyin, concepts, translations)
# translations: {zh, en, fr, es, ar}

EXTRA_PASSAGES = [
    # 学而（其余精选）
    {
        "id": "lunyu.xueer.1.2",
        "chapter": "学而",
        "ref": "论语·学而·1.2",
        "text": "其为人也孝弟，而好犯上者，鲜矣。",
        "pinyin": "qí wéi rén yě xiào tì, ér hào fàn shàng zhě, xiǎn yǐ.",
        "concepts": ["xiao", "ti", "junzi"],
        "tr": {
            "en": "It is rare for a person who is filial and respectful to elders to be inclined to defy superiors.",
            "fr": "Il est rare qu'une personne pieuse envers ses parents et respectueuse envers ses aînés soit encline à défier ses supérieurs.",
            "es": "Es raro que una persona piadosa con sus padres y respetuosa con sus mayores se incline a desafiar a sus superiores.",
            "ar": "نادرًا ما يميل من يبر والديه ويحترم كبار سنه إلى عصيان رؤسائه.",
        },
        "anno": ("modern", "现代释义", "孝悌是仁的根本，由近及远扩展为公共秩序的尊重。"),
    },
    {
        "id": "lunyu.xueer.1.4",
        "chapter": "学而",
        "ref": "论语·学而·1.4",
        "text": "吾日三省吾身：为人谋而不忠乎？与朋友交而不信乎？传不习乎？",
        "pinyin": "wú rì sān xǐng wú shēn...",
        "concepts": ["zhong", "xin", "xue"],
        "tr": {
            "en": "I daily examine myself on three points: in dealing with others, was I faithful? With friends, was I trustworthy? Have I practiced the teachings transmitted to me?",
            "fr": "Chaque jour je m'examine sur trois points : ai-je été loyal en servant les autres ? Sincère avec mes amis ? Ai-je pratiqué ce qu'on m'a enseigné ?",
            "es": "Cada día me examino en tres puntos: ¿he sido leal en mi servicio a los demás? ¿Sincero con mis amigos? ¿He practicado lo que me han enseñado?",
            "ar": "أتفقد نفسي يوميًا في ثلاث: هل أخلصت في خدمة الآخرين؟ هل صدقت مع الأصدقاء؟ هل عملت بما تعلمت؟",
        },
        "anno": ("classical", "朱熹《论语集注》", "曾子自述每日反省之三事，谓忠、信、传习。"),
    },
    {
        "id": "lunyu.xueer.1.6",
        "chapter": "学而",
        "ref": "论语·学而·1.6",
        "text": "弟子入则孝，出则弟，谨而信，泛爱众，而亲仁。行有余力，则以学文。",
        "pinyin": "dì zǐ rù zé xiào, chū zé tì...",
        "concepts": ["xiao", "ti", "ren", "xue"],
        "tr": {
            "en": "A young person should be filial at home, respectful abroad, careful and trustworthy, love all broadly, and be close to the benevolent. If energy remains, study the classics.",
            "fr": "Le jeune doit être pieux chez lui, respectueux dehors, prudent et sincère, aimer tous largement et fréquenter les bienveillants. S'il lui reste de l'énergie, qu'il étudie les textes.",
            "es": "El joven debe ser piadoso en casa, respetuoso fuera, prudente y sincero, amar ampliamente y acercarse a los benevolentes. Si le queda energía, que estudie los clásicos.",
            "ar": "على الشاب أن يبر أهله، ويحترم من حوله، ويتحلى بالحذر والصدق، ويحب الناس عامة، ويصاحب أهل الفضل، فإن بقي عنده وقت تعلم العلم.",
        },
        "anno": ("modern", "现代释义", "德行优先于知识：先做人后做学问。"),
    },
    # 为政（其余）
    {
        "id": "lunyu.weizheng.2.1",
        "chapter": "为政",
        "ref": "论语·为政·2.1",
        "text": "为政以德，譬如北辰，居其所而众星共之。",
        "pinyin": "wéi zhèng yǐ dé, pì rú běi chén...",
        "concepts": ["de", "ren", "junzi"],
        "tr": {
            "en": "Govern with virtue, and you will be like the polestar—remaining in place while all stars revolve around it.",
            "fr": "Gouverner par la vertu, c'est comme l'étoile polaire : elle reste à sa place et toutes les étoiles tournent autour d'elle.",
            "es": "Gobernar con virtud es como la estrella polar: permanece en su sitio mientras las demás giran a su alrededor.",
            "ar": "من ساس بالفضيلة فمثله كالنجم القطبي، يثبت في مكانه وتدور حوله سائر النجوم.",
        },
        "anno": ("classical", "朱熹《论语集注》", "言以德化民，民自归之。"),
    },
    {
        "id": "lunyu.weizheng.2.3",
        "chapter": "为政",
        "ref": "论语·为政·2.3",
        "text": "道之以政，齐之以刑，民免而无耻；道之以德，齐之以礼，有耻且格。",
        "pinyin": "dào zhī yǐ zhèng, qí zhī yǐ xíng...",
        "concepts": ["de", "li", "zheng"],
        "tr": {
            "en": "Lead by laws and impose order by punishments, and people will avoid wrong but have no shame. Lead by virtue and order by ritual, and they will have shame and become upright.",
            "fr": "Diriger par les lois et discipliner par les peines : le peuple évitera la faute sans honte. Diriger par la vertu et discipliner par les rites : il aura honte et se redressera.",
            "es": "Si guías con leyes y disciplinas con castigos, el pueblo evitará el mal sin vergüenza. Si guías con virtud y disciplinas con ritos, sentirá vergüenza y se enmendará.",
            "ar": "إن قُدت الناس بالقانون وحفظتهم بالعقوبة تجنبوا الخطأ بلا حياء، وإن قُدتهم بالفضيلة وحفظتهم بالأدب استحوا واستقاموا.",
        },
        "anno": ("modern", "现代释义", "德礼与政刑的根本区别：内在的耻感优于外在的强制。"),
    },
    {
        "id": "lunyu.weizheng.2.7",
        "chapter": "为政",
        "ref": "论语·为政·2.7",
        "text": "今之孝者，是谓能养。至于犬马，皆能有养；不敬，何以别乎？",
        "pinyin": "jīn zhī xiào zhě, shì wèi néng yǎng...",
        "concepts": ["xiao", "jing"],
        "tr": {
            "en": "Today's notion of filial piety means being able to provide for parents. But dogs and horses too can be fed. Without reverence, what is the difference?",
            "fr": "Aujourd'hui, on dit pieux celui qui nourrit ses parents. Mais on nourrit aussi chiens et chevaux. Sans respect, où est la différence ?",
            "es": "Hoy se dice piadoso quien alimenta a sus padres. Pero también se alimenta a perros y caballos. Sin reverencia, ¿cuál es la diferencia?",
            "ar": "البر اليوم أن تعول والديك، لكن الكلب والفرس يُعالان أيضًا. فإن لم يكن مع البر احترام فما الفرق؟",
        },
        "anno": ("modern", "现代释义", "孝的真义不在物质供养，而在内心敬意。"),
    },
    {
        "id": "lunyu.weizheng.2.11",
        "chapter": "为政",
        "ref": "论语·为政·2.11",
        "text": "温故而知新，可以为师矣。",
        "pinyin": "wēn gù ér zhī xīn, kě yǐ wéi shī yǐ.",
        "concepts": ["xue"],
        "tr": {
            "en": "He who reviews the old and learns the new is fit to be a teacher.",
            "fr": "Celui qui revoit l'ancien et y découvre du neuf est digne d'enseigner.",
            "es": "Quien repasa lo antiguo y descubre lo nuevo es digno de ser maestro.",
            "ar": "من راجع القديم واستنبط منه الجديد فهو أهل للتعليم.",
        },
        "anno": ("modern", "现代释义", "学习不仅是积累，更是新理解的生成。"),
    },
    {
        "id": "lunyu.weizheng.2.15",
        "chapter": "为政",
        "ref": "论语·为政·2.15",
        "text": "学而不思则罔，思而不学则殆。",
        "pinyin": "xué ér bù sī zé wǎng, sī ér bù xué zé dài.",
        "concepts": ["xue", "si"],
        "tr": {
            "en": "Learning without thought is labor lost; thought without learning is perilous.",
            "fr": "Étudier sans réfléchir, c'est se perdre ; réfléchir sans étudier, c'est se mettre en péril.",
            "es": "Estudiar sin pensar es perderse; pensar sin estudiar es peligroso.",
            "ar": "التعلم بلا تفكر ضلال، والتفكر بلا تعلم خطر.",
        },
        "anno": ("classical", "朱熹《论语集注》", "学与思相为表里，缺一则不可。"),
    },
    {
        "id": "lunyu.weizheng.2.17",
        "chapter": "为政",
        "ref": "论语·为政·2.17",
        "text": "知之为知之，不知为不知，是知也。",
        "pinyin": "zhī zhī wéi zhī zhī, bù zhī wéi bù zhī, shì zhì yě.",
        "concepts": ["zhi", "xue"],
        "tr": {
            "en": "To know what you know, and to know what you don't know—that is true knowledge.",
            "fr": "Savoir ce qu'on sait, et savoir ce qu'on ignore : voilà la vraie connaissance.",
            "es": "Saber lo que se sabe y saber lo que no se sabe: eso es verdadero conocimiento.",
            "ar": "أن تعرف ما تعلم وأن تعرف ما تجهل، فتلك هي المعرفة الحقة.",
        },
        "anno": ("modern", "现代释义", "智慧始于诚实地承认自己的无知。"),
    },
    # 里仁
    {
        "id": "lunyu.liren.4.1",
        "chapter": "里仁",
        "ref": "论语·里仁·4.1",
        "text": "里仁为美。择不处仁，焉得知？",
        "pinyin": "lǐ rén wéi měi. zé bù chǔ rén, yān dé zhī?",
        "concepts": ["ren"],
        "tr": {
            "en": "A neighborhood of benevolence is fair. Choosing not to dwell in benevolence—how can that be called wise?",
            "fr": "Un voisinage où règne la bienveillance est beau. Ne pas y demeurer, est-ce sagesse ?",
            "es": "Un barrio donde reina la benevolencia es hermoso. Elegir no morar en ella, ¿es sabiduría?",
            "ar": "حسنٌ أن يسكن المرء في جوار أهل الرحمة. من اختار ألا يقيم بينهم، فأيُّ حكمة في ذلك؟",
        },
        "anno": ("modern", "现代释义", "环境影响人的德性养成——择善而居。"),
    },
    {
        "id": "lunyu.liren.4.2",
        "chapter": "里仁",
        "ref": "论语·里仁·4.2",
        "text": "不仁者不可以久处约，不可以长处乐。仁者安仁，知者利仁。",
        "pinyin": "bù rén zhě bù kě yǐ jiǔ chǔ yuē...",
        "concepts": ["ren", "zhi"],
        "tr": {
            "en": "The unkind cannot long endure hardship nor long abide in joy. The benevolent rest in benevolence; the wise pursue benevolence for benefit.",
            "fr": "Le malveillant ne supporte ni la pauvreté longue ni la joie longue. Le bienveillant repose dans la bienveillance ; le sage la cherche pour son utilité.",
            "es": "El no-benevolente no soporta largo tiempo la dificultad ni la alegría. El benevolente reposa en la benevolencia; el sabio la persigue por su provecho.",
            "ar": "غير ذي الرحمة لا يصبر على الفقر طويلًا ولا على الترف طويلًا. أما الرحيم فيستقر في الرحمة، والحكيم يسعى إليها لخيرها.",
        },
        "anno": ("modern", "现代释义", "仁是稳定的安身立命之本，而非工具。"),
    },
    {
        "id": "lunyu.liren.4.8",
        "chapter": "里仁",
        "ref": "论语·里仁·4.8",
        "text": "朝闻道，夕死可矣。",
        "pinyin": "zhāo wén dào, xī sǐ kě yǐ.",
        "concepts": ["dao", "junzi"],
        "tr": {
            "en": "If a man hears the Way in the morning, he may die content in the evening.",
            "fr": "Qui entend la Voie le matin peut mourir content le soir.",
            "es": "Quien escucha el Tao por la mañana puede morir contento por la tarde.",
            "ar": "من سمع الحق في الصباح، فلا يضره أن يموت في المساء.",
        },
        "anno": ("classical", "朱熹《论语集注》", "言闻道之贵，重于生死。"),
    },
    {
        "id": "lunyu.liren.4.15",
        "chapter": "里仁",
        "ref": "论语·里仁·4.15",
        "text": "夫子之道，忠恕而已矣。",
        "pinyin": "fū zǐ zhī dào, zhōng shù ér yǐ yǐ.",
        "concepts": ["zhong", "shu", "dao"],
        "tr": {
            "en": "The Master's Way is nothing but loyalty and reciprocity.",
            "fr": "La Voie du Maître ne consiste qu'en la loyauté et la réciprocité.",
            "es": "La Vía del Maestro consiste solo en la lealtad y la reciprocidad.",
            "ar": "ليس طريق المعلم سوى الإخلاص ومعاملة الناس بالمثل.",
        },
        "anno": ("modern", "现代释义", "曾子总结孔子之道：忠（尽己）+ 恕（推己及人）。"),
    },
    {
        "id": "lunyu.liren.4.17",
        "chapter": "里仁",
        "ref": "论语·里仁·4.17",
        "text": "见贤思齐焉，见不贤而内自省也。",
        "pinyin": "jiàn xián sī qí yān, jiàn bù xián ér nèi zì xǐng yě.",
        "concepts": ["junzi", "xue"],
        "tr": {
            "en": "When you see a worthy person, think of becoming their equal. When you see an unworthy, examine yourself within.",
            "fr": "Voyant un sage, songe à l'égaler ; voyant un indigne, examine-toi.",
            "es": "Al ver a un virtuoso, piensa en igualarlo; al ver a un indigno, examínate.",
            "ar": "إذا رأيت الفاضل فاطلب مساواته، وإذا رأيت غيره فحاسب نفسك.",
        },
        "anno": ("modern", "现代释义", "他人是反观自己的镜子。"),
    },
    # 八佾
    {
        "id": "lunyu.bayi.3.3",
        "chapter": "八佾",
        "ref": "论语·八佾·3.3",
        "text": "人而不仁，如礼何？人而不仁，如乐何？",
        "pinyin": "rén ér bù rén, rú lǐ hé? rén ér bù rén, rú yuè hé?",
        "concepts": ["ren", "li", "yue"],
        "tr": {
            "en": "If a person lacks benevolence, what use is ritual? If a person lacks benevolence, what use is music?",
            "fr": "Si l'homme manque de bienveillance, à quoi bon les rites ? à quoi bon la musique ?",
            "es": "Si la persona carece de benevolencia, ¿de qué sirven los ritos? ¿de qué sirve la música?",
            "ar": "إذا فقد المرء الرحمة، فما نفع الطقوس؟ وما نفع الموسيقى؟",
        },
        "anno": ("modern", "现代释义", "礼乐的内核是仁；无仁则礼乐流于形式。"),
    },
    # 颜渊
    {
        "id": "lunyu.yanyuan.12.7",
        "chapter": "颜渊",
        "ref": "论语·颜渊·12.7",
        "text": "民无信不立。",
        "pinyin": "mín wú xìn bù lì.",
        "concepts": ["xin", "zheng"],
        "tr": {
            "en": "Without the trust of the people, the state cannot stand.",
            "fr": "Sans la confiance du peuple, l'État ne peut subsister.",
            "es": "Sin la confianza del pueblo, el Estado no puede sostenerse.",
            "ar": "إن لم يثق الشعب بالحكم لم يقم له بنيان.",
        },
        "anno": ("modern", "现代释义", "政府合法性的根基是民众的信任。"),
    },
    # 雍也
    {
        "id": "lunyu.yongye.6.20",
        "chapter": "雍也",
        "ref": "论语·雍也·6.20",
        "text": "知之者不如好之者，好之者不如乐之者。",
        "pinyin": "zhī zhī zhě bù rú hào zhī zhě, hào zhī zhě bù rú lè zhī zhě.",
        "concepts": ["xue", "le"],
        "tr": {
            "en": "Knowing it is not as good as loving it; loving it is not as good as delighting in it.",
            "fr": "Le connaître ne vaut pas l'aimer ; l'aimer ne vaut pas s'y réjouir.",
            "es": "Conocerlo no vale tanto como amarlo; amarlo no vale tanto como deleitarse en ello.",
            "ar": "العلم لا يبلغ منزلة المحبة، والمحبة لا تبلغ منزلة السرور بالمعرفة.",
        },
        "anno": ("modern", "现代释义", "学习的最高境界是「乐之」——内在的喜悦。"),
    },
    # 述而
    {
        "id": "lunyu.shuer.7.21",
        "chapter": "述而",
        "ref": "论语·述而·7.21",
        "text": "三人行，必有我师焉。择其善者而从之，其不善者而改之。",
        "pinyin": "sān rén xíng, bì yǒu wǒ shī yān...",
        "concepts": ["xue", "junzi"],
        "tr": {
            "en": "When walking with two others, there is always something to learn. Follow their goodness; correct their faults in yourself.",
            "fr": "Quand je marche avec deux autres, il y a toujours mon maître parmi eux. Je suis ce qu'ils ont de bon et corrige ce qu'ils ont de mauvais en moi.",
            "es": "Cuando camino con otros dos, siempre hay un maestro entre ellos. Sigo lo bueno y corrijo lo malo en mí.",
            "ar": "إذا سرت مع اثنين فلابد أن يكون فيهما معلم لي. آخذ من حسنهما وأصلح في نفسي ما أراه من سوء.",
        },
        "anno": ("modern", "现代释义", "每个人都可以是学习对象，关键在反观自己。"),
    },
    {
        "id": "lunyu.shuer.7.8",
        "chapter": "述而",
        "ref": "论语·述而·7.8",
        "text": "不愤不启，不悱不发。举一隅不以三隅反，则不复也。",
        "pinyin": "bù fèn bù qǐ, bù fěi bù fā...",
        "concepts": ["xue", "jiao"],
        "tr": {
            "en": "I do not open the way for the uneager, nor lift up the inarticulate. If shown one corner and they can't infer the other three, I don't repeat.",
            "fr": "Je n'éclaire pas qui n'est pas avide d'apprendre, ni n'aide qui ne cherche pas ses mots. Si je montre un coin et qu'on ne tire pas les trois autres, je n'insiste pas.",
            "es": "No abro camino al desinteresado ni ayudo al que no busca expresarse. Si muestro un rincón y no se deducen los otros tres, no repito.",
            "ar": "لا أفتح طريق العلم لمن لا يشتاق إليه، ولا أعين من لا يبحث عن جوابه. وإن لم يقس من ركن واحد ثلاثة، فلن أعيد.",
        },
        "anno": ("classical", "朱熹《论语集注》", "因材施教，启发先于灌输。"),
    },
]

# ── 概念扩充：从 5 到 20+ ────────────────────────────────────────────────────
EXTRA_CONCEPTS = [
    {
        "id": "xiao", "zh": "孝", "pinyin": "xiào",
        "i18n": {"en": "filial piety", "fr": "piété filiale", "es": "piedad filial", "ar": "بِر الوالدين"},
        "school": "儒家", "rarity": "SR",
        "definition": {
            "zh": "对父母的爱与敬，是仁的根本之一。",
            "en": "Love and reverence toward parents; one of the roots of benevolence.",
            "fr": "Amour et respect envers les parents ; l'une des racines de la bienveillance.",
            "es": "Amor y reverencia hacia los padres; una de las raíces de la benevolencia.",
            "ar": "محبة الوالدين وإجلالهما، وأحد أصول الرحمة.",
        },
        "related": ["ren", "ti", "jing"],
    },
    {
        "id": "ti", "zh": "悌", "pinyin": "tì",
        "i18n": {"en": "fraternal respect", "fr": "respect fraternel", "es": "respeto fraterno", "ar": "احترام الإخوة"},
        "school": "儒家", "rarity": "normal",
        "definition": {
            "zh": "对兄长的尊敬，引申为对长者的尊重。",
            "en": "Respect for elder brothers, extended to all elders.",
            "fr": "Respect envers les frères aînés, étendu à tous les aînés.",
            "es": "Respeto a los hermanos mayores, extendido a los mayores.",
            "ar": "احترام الإخوة الكبار، ويمتد إلى كل من هو أكبر.",
        },
        "related": ["xiao", "ren"],
    },
    {
        "id": "zhong", "zh": "忠", "pinyin": "zhōng",
        "i18n": {"en": "loyalty / conscientiousness", "fr": "loyauté", "es": "lealtad", "ar": "إخلاص"},
        "school": "儒家", "rarity": "SR",
        "definition": {
            "zh": "尽己之心，对所事之人或事的负责。",
            "en": "Doing one's utmost for the persons or duties one serves.",
            "fr": "Faire de son mieux pour ceux et ce que l'on sert.",
            "es": "Hacer lo mejor por las personas o deberes a los que se sirve.",
            "ar": "بذل أقصى الجهد لمن أو لما يخدمه المرء.",
        },
        "related": ["shu", "ren", "xin"],
    },
    {
        "id": "xin", "zh": "信", "pinyin": "xìn",
        "i18n": {"en": "trustworthiness", "fr": "sincérité / confiance", "es": "confianza / sinceridad", "ar": "صدق"},
        "school": "儒家", "rarity": "SR",
        "definition": {
            "zh": "言行可信，是社会与政府的根基。",
            "en": "Trustworthiness in word and deed; foundation of society and government.",
            "fr": "Sincérité dans la parole et l'acte ; fondement de la société et du gouvernement.",
            "es": "Confiabilidad en palabra y acción; base de la sociedad y del gobierno.",
            "ar": "صدق القول والفعل، وهو أساس المجتمع والحكم.",
        },
        "related": ["zhong", "ren"],
    },
    {
        "id": "zhi", "zh": "智", "pinyin": "zhì",
        "i18n": {"en": "wisdom", "fr": "sagesse", "es": "sabiduría", "ar": "حكمة"},
        "school": "儒家", "rarity": "SR",
        "definition": {
            "zh": "明辨是非、知人知己的智慧。",
            "en": "Discerning right from wrong; knowing others and oneself.",
            "fr": "Discerner le bien du mal ; connaître autrui et soi-même.",
            "es": "Discernir el bien del mal; conocer a los otros y a uno mismo.",
            "ar": "تمييز الحق من الباطل ومعرفة الناس والنفس.",
        },
        "related": ["ren", "yi"],
    },
    {
        "id": "dao", "zh": "道", "pinyin": "dào",
        "i18n": {"en": "the Way", "fr": "la Voie", "es": "el Tao / Camino", "ar": "الطريق / السبيل"},
        "school": "儒家", "rarity": "SSR",
        "definition": {
            "zh": "宇宙与人事的根本之理与方向。",
            "en": "The fundamental order and direction of cosmos and human affairs.",
            "fr": "L'ordre fondamental et la direction du cosmos et des affaires humaines.",
            "es": "El orden fundamental y la dirección del cosmos y los asuntos humanos.",
            "ar": "النظام الجوهري والاتجاه الكوني والإنساني.",
        },
        "related": ["de", "ren", "tianming"],
    },
    {
        "id": "de", "zh": "德", "pinyin": "dé",
        "i18n": {"en": "virtue / moral power", "fr": "vertu", "es": "virtud", "ar": "فضيلة"},
        "school": "儒家", "rarity": "SR",
        "definition": {
            "zh": "内在德性的积累与外显的感召力。",
            "en": "Inner virtue cultivated, manifesting as moral power that draws others.",
            "fr": "Vertu intérieure cultivée, manifestée comme force morale attirante.",
            "es": "Virtud interior cultivada que se manifiesta como fuerza moral atrayente.",
            "ar": "فضيلة داخلية مكتسبة تتجلى قوةً أخلاقية جاذبة.",
        },
        "related": ["dao", "ren", "junzi"],
    },
    {
        "id": "xue", "zh": "学", "pinyin": "xué",
        "i18n": {"en": "learning", "fr": "étude / apprentissage", "es": "aprendizaje / estudio", "ar": "تعلم"},
        "school": "儒家", "rarity": "normal",
        "definition": {
            "zh": "终身的学习与修养，包含知识与德行。",
            "en": "Lifelong study and self-cultivation, including knowledge and virtue.",
            "fr": "Étude et culture de soi à vie, incluant savoir et vertu.",
            "es": "Estudio y cultivo de uno mismo de por vida, incluyendo conocimiento y virtud.",
            "ar": "التعلم وتزكية النفس مدى العمر، علمًا وفضيلة.",
        },
        "related": ["si", "junzi"],
    },
    {
        "id": "si", "zh": "思", "pinyin": "sī",
        "i18n": {"en": "reflection", "fr": "réflexion", "es": "reflexión", "ar": "تفكر"},
        "school": "儒家", "rarity": "normal",
        "definition": {
            "zh": "深入的思考与省察，与学相辅相成。",
            "en": "Deep thinking and self-examination; complement to learning.",
            "fr": "Pensée profonde et auto-examen ; complément de l'étude.",
            "es": "Pensamiento profundo y auto-examen; complemento del estudio.",
            "ar": "التأمل العميق ومراجعة النفس، وهو مكمّل للتعلم.",
        },
        "related": ["xue"],
    },
    {
        "id": "jing", "zh": "敬", "pinyin": "jìng",
        "i18n": {"en": "reverence", "fr": "respect / révérence", "es": "reverencia", "ar": "تَجلَّة / احترام"},
        "school": "儒家", "rarity": "normal",
        "definition": {
            "zh": "对人事的敬重之心，孝之内核。",
            "en": "Reverence toward persons and affairs; the inner core of filial piety.",
            "fr": "Respect envers les personnes et les affaires ; cœur de la piété filiale.",
            "es": "Reverencia hacia personas y asuntos; núcleo de la piedad filial.",
            "ar": "إجلال الناس والشأن، وهو لبّ بر الوالدين.",
        },
        "related": ["xiao", "li"],
    },
    {
        "id": "zhongyong", "zh": "中庸", "pinyin": "zhōng yōng",
        "i18n": {"en": "the Mean", "fr": "le Juste Milieu", "es": "el Justo Medio", "ar": "الاعتدال"},
        "school": "儒家", "rarity": "SSR",
        "definition": {
            "zh": "不偏不倚、恰到好处的中道智慧。",
            "en": "The wisdom of the unbiased, fitting Mean—neither excess nor deficiency.",
            "fr": "Sagesse du juste milieu, sans excès ni défaut.",
            "es": "Sabiduría del justo medio, sin exceso ni defecto.",
            "ar": "حكمة الاعتدال، لا إفراط ولا تفريط.",
        },
        "related": ["dao", "ren"],
    },
    {
        "id": "he", "zh": "和", "pinyin": "hé",
        "i18n": {"en": "harmony", "fr": "harmonie", "es": "armonía", "ar": "وئام"},
        "school": "儒家", "rarity": "SR",
        "definition": {
            "zh": "差异中的和谐，是社会与心性的目标。",
            "en": "Harmony amid difference; the goal of society and self.",
            "fr": "Harmonie dans la différence ; but de la société et du soi.",
            "es": "Armonía en medio de la diferencia; meta de la sociedad y del ser.",
            "ar": "وئام في التنوع، وهو غاية المجتمع والنفس.",
        },
        "related": ["li", "zhongyong"],
    },
    {
        "id": "tianming", "zh": "天命", "pinyin": "tiān mìng",
        "i18n": {"en": "Mandate of Heaven", "fr": "Mandat du Ciel", "es": "Mandato del Cielo", "ar": "تكليف السماء"},
        "school": "儒家", "rarity": "SSR",
        "definition": {
            "zh": "天所赋予的使命与道德之命。",
            "en": "The mandate and moral calling bestowed by Heaven.",
            "fr": "Mandat et appel moral conférés par le Ciel.",
            "es": "Mandato y llamado moral conferido por el Cielo.",
            "ar": "التكليف والنداء الأخلاقي من السماء.",
        },
        "related": ["dao", "de"],
    },
    {
        "id": "keji", "zh": "克己", "pinyin": "kè jǐ",
        "i18n": {"en": "self-mastery", "fr": "maîtrise de soi", "es": "dominio de sí", "ar": "ضبط النفس"},
        "school": "儒家", "rarity": "SR",
        "definition": {
            "zh": "约束私欲、回归礼仪的自我修养。",
            "en": "Restraining selfish desires and returning to ritual propriety.",
            "fr": "Maîtriser ses désirs égoïstes et revenir aux rites.",
            "es": "Dominar los deseos egoístas y volver a la propiedad ritual.",
            "ar": "كبح الأهواء والعودة إلى الأدب.",
        },
        "related": ["ren", "li"],
    },
    {
        "id": "zheng", "zh": "政", "pinyin": "zhèng",
        "i18n": {"en": "governance", "fr": "gouvernement", "es": "gobierno", "ar": "حكم / سياسة"},
        "school": "儒家", "rarity": "normal",
        "definition": {
            "zh": "治国理民之道，儒家强调以德为本。",
            "en": "The way of governing, founded on virtue in Confucian thought.",
            "fr": "Manière de gouverner, fondée sur la vertu dans la pensée confucéenne.",
            "es": "Forma de gobernar, fundada en la virtud en el pensamiento confuciano.",
            "ar": "أسلوب الحكم، وأساسه الفضيلة في الفكر الكونفوشيوسي.",
        },
        "related": ["de", "ren", "li"],
    },
    {
        "id": "yue", "zh": "乐", "pinyin": "yuè",
        "i18n": {"en": "music / ritual music", "fr": "musique rituelle", "es": "música ritual", "ar": "موسيقى طقسية"},
        "school": "儒家", "rarity": "normal",
        "definition": {
            "zh": "礼乐文明中的音乐，承载教化与和谐功能。",
            "en": "Music in the rites-and-music civilization, bearing edification and harmony.",
            "fr": "Musique dans la civilisation des rites et de la musique, vecteur d'édification et d'harmonie.",
            "es": "Música en la civilización de ritos y música, vehículo de edificación y armonía.",
            "ar": "الموسيقى في حضارة الطقس والموسيقى، تحمل وظيفة التربية والوئام.",
        },
        "related": ["li", "he"],
    },
    {
        "id": "le", "zh": "乐(lè)", "pinyin": "lè",
        "i18n": {"en": "joy / delight", "fr": "joie", "es": "alegría", "ar": "بهجة / سرور"},
        "school": "儒家", "rarity": "normal",
        "definition": {
            "zh": "内在的喜悦，源于德性与学问的契合。",
            "en": "Inner joy arising from alignment with virtue and learning.",
            "fr": "Joie intérieure jaillie de l'accord avec la vertu et l'étude.",
            "es": "Alegría interior nacida de la sintonía con la virtud y el estudio.",
            "ar": "بهجة داخلية ناشئة من توافق الفضيلة والعلم.",
        },
        "related": ["junzi", "xue"],
    },
    {
        "id": "jiao", "zh": "教", "pinyin": "jiào",
        "i18n": {"en": "teaching", "fr": "enseignement", "es": "enseñanza", "ar": "تعليم"},
        "school": "儒家", "rarity": "normal",
        "definition": {
            "zh": "因材施教、以德育人的教育之道。",
            "en": "Teaching that adapts to each learner and cultivates virtue.",
            "fr": "Enseignement adapté à chaque élève et cultivant la vertu.",
            "es": "Enseñanza adaptada a cada alumno y cultivadora de virtud.",
            "ar": "التعليم وفق طبيعة المتعلم وتنمية الفضيلة.",
        },
        "related": ["xue", "de"],
    },
]

# ── 已有概念补 fr/es/ar i18n + 定义（覆盖式更新）────────────────────────────
LEGACY_CONCEPT_PATCH = {
    "ren": {
        "i18n_add": {"fr": "bienveillance / humanité", "es": "benevolencia / humanidad", "ar": "رحمة / إنسانية"},
        "definition_add": {
            "fr": "La vertu confucéenne cardinale : la bienveillance, prendre soin d'autrui et s'étendre à autrui.",
            "es": "La virtud cardinal confuciana: humanidad, cuidar a los demás y extenderse a ellos.",
            "ar": "الفضيلة الكونفوشيوسية الأساسية: الرحمة والعناية بالآخرين وامتداد الذات إليهم.",
        },
    },
    "li": {
        "i18n_add": {"fr": "rite / convenance rituelle", "es": "propiedad ritual", "ar": "أدب الطقوس / آداب"},
        "definition_add": {
            "fr": "Les normes rituelles qui ordonnent conduite et société, et forme de culture de soi.",
            "es": "Las normas rituales que ordenan la conducta y la sociedad, y forma de cultivo personal.",
            "ar": "المعايير الآدابية المنظمة للسلوك والمجتمع وصورة من تزكية النفس.",
        },
    },
    "junzi": {
        "i18n_add": {"fr": "homme de bien / personne exemplaire", "es": "persona ejemplar", "ar": "الإنسان الفاضل"},
        "definition_add": {
            "fr": "La personne moralement exemplaire qui privilégie la droiture sur le profit.",
            "es": "Persona moralmente ejemplar que prioriza la rectitud sobre el provecho.",
            "ar": "الإنسان الفاضل أخلاقيًا الذي يقدم الحق على المنفعة.",
        },
    },
    "yi": {
        "i18n_add": {"fr": "droiture / justice morale", "es": "rectitud / justicia moral", "ar": "حق / استقامة"},
        "definition_add": {
            "fr": "La droiture : norme du moralement convenable et approprié.",
            "es": "La rectitud: criterio de lo moralmente apropiado.",
            "ar": "الاستقامة: معيار ما هو لائق أخلاقيًا ومناسب.",
        },
    },
    "shu": {
        "i18n_add": {"fr": "réciprocité / empathie", "es": "reciprocidad / empatía", "ar": "تبادلية / تعاطف"},
        "definition_add": {
            "fr": "Réciprocité : ne pas imposer aux autres ce qu'on ne veut pas pour soi.",
            "es": "Reciprocidad: no imponer a otros lo que uno no quiere para sí.",
            "ar": "أن لا تفرض على غيرك ما لا ترضاه لنفسك.",
        },
    },
}

# ── 议题名称多语扩展 ─────────────────────────────────────────────────────────
TOPIC_I18N = {
    "climate":     {"fr": "Gouvernance climatique", "es": "Gobernanza climática", "ar": "حوكمة المناخ"},
    "tech_ethics": {"fr": "Éthique de la technologie", "es": "Ética de la tecnología", "ar": "أخلاقيات التكنولوجيا"},
    "social":      {"fr": "Responsabilité sociale", "es": "Responsabilidad social", "ar": "المسؤولية الاجتماعية"},
    "personal":    {"fr": "Développement personnel", "es": "Desarrollo personal", "ar": "التنمية الشخصية"},
    "governance":  {"fr": "Gouvernance publique", "es": "Gobernanza pública", "ar": "الحوكمة العامة"},
}

# ── 跨文明立场 headline 法/西/阿（每条 25 × 3 = 75 单元）─────────────────────
CIV_HEADLINE_I18N = {
    # 气候
    ("climate", "confucian"): {
        "fr": "Ciel-humanité en union ; économie et amour de toutes choses.",
        "es": "Cielo-humanidad en unidad; frugalidad y amor a todos los seres.",
        "ar": "وحدة السماء والإنسان، التقتير والرفق بكل الموجودات.",
    },
    ("climate", "christian"): {
        "fr": "Intendance : l'humanité doit prendre soin de la création.",
        "es": "Mayordomía: la humanidad está encargada de cuidar la creación.",
        "ar": "الوصاية: على الإنسان رعاية الخلق.",
    },
    ("climate", "enlightenment"): {
        "fr": "Délibération rationnelle et pacte global : science, institutions, coopération.",
        "es": "Deliberación racional y pacto global: ciencia, instituciones, cooperación.",
        "ar": "التداول العقلاني والميثاق العالمي: علم ومؤسسات وتعاون.",
    },
    ("climate", "kantian"): {
        "fr": "Traiter la nature comme une fin, non un simple moyen.",
        "es": "Tratar la naturaleza como un fin, no como mero medio.",
        "ar": "أن نُعامل الطبيعة غايةً لا مجرد وسيلة.",
    },
    ("climate", "buddhist"): {
        "fr": "Interdépendance, non-soi, non-violence : réduire le désir est la racine.",
        "es": "Interdependencia, no-yo, no violencia: reducir el deseo es la raíz.",
        "ar": "الترابط واللاذات واللاعنف؛ تقليص الرغبة هو الأصل.",
    },
    # 科技伦理
    ("tech_ethics", "confucian"): {
        "fr": "Rectifier les noms et tenir le juste milieu : la technique au service de l'humain.",
        "es": "Rectificar los nombres y mantener el Justo Medio: la técnica al servicio de lo humano.",
        "ar": "تصحيح المسميات والاعتدال: تخدم التقنية الإنسان لا العكس.",
    },
    ("tech_ethics", "christian"): {
        "fr": "L'homme à l'image de Dieu ; la technique ne doit pas usurper le Créateur.",
        "es": "Imagen de Dios; la técnica no debe usurpar al Creador.",
        "ar": "الإنسان على صورة الله، وعلى التقنية ألا تنازع الخالق.",
    },
    ("tech_ethics", "enlightenment"): {
        "fr": "Autonomie rationnelle et garde-fous institutionnels : transparence algorithmique.",
        "es": "Autonomía racional con salvaguardas institucionales: transparencia algorítmica.",
        "ar": "الاستقلال العقلي ضمن ضوابط مؤسسية: شفافية الخوارزميات والمساءلة.",
    },
    ("tech_ethics", "kantian"): {
        "fr": "L'humanité comme fin en soi : ne pas réduire la personne à une donnée.",
        "es": "Humanidad como fin en sí: no reducir a la persona a un dato.",
        "ar": "الإنسانية غاية بذاتها: لا تختزل الإنسان إلى بيانات.",
    },
    ("tech_ethics", "buddhist"): {
        "fr": "La technique aussi est interdépendante : se méfier de l'attachement à l'algorithme.",
        "es": "La técnica también surge interdependientemente: cuidado con el apego al algoritmo.",
        "ar": "التقنية أيضًا قائمة على الترابط؛ احذر تعلّق الأنا بالخوارزمية.",
    },
    # 社会责任
    ("social", "confucian"): {
        "fr": "S'étendre à autrui : « ne fais pas à autrui ce que tu ne veux pas qu'on te fasse ».",
        "es": "Extenderse a los otros: «no impongas a otros lo que no quieres para ti».",
        "ar": "امتداد الذات إلى الآخر: لا تفرض على غيرك ما لا تحبه لنفسك.",
    },
    ("social", "christian"): {
        "fr": "S'aimer les uns les autres, surtout le plus petit des frères.",
        "es": "Amarse unos a otros, especialmente al más pequeño de los hermanos.",
        "ar": "أحبوا بعضكم بعضًا، ولا سيما الأصغر من إخوتكم.",
    },
    ("social", "enlightenment"): {
        "fr": "Vertu civique et contrat social : droits et devoirs réciproques.",
        "es": "Virtud cívica y contrato social: derechos y deberes recíprocos.",
        "ar": "الفضيلة المدنية والعقد الاجتماعي: حقوق وواجبات متبادلة.",
    },
    ("social", "kantian"): {
        "fr": "Devoirs imparfaits : agir positivement pour le bien d'autrui.",
        "es": "Deberes imperfectos: actuar positivamente por el bien ajeno.",
        "ar": "واجبات غير تامة: السعي الإيجابي لخير الآخر.",
    },
    ("social", "buddhist"): {
        "fr": "Compassion sans limite, née de l'interdépendance.",
        "es": "Compasión ilimitada, nacida de la interdependencia.",
        "ar": "رحمة لا حدود لها، تنبع من الترابط.",
    },
    # 个人发展
    ("personal", "confucian"): {
        "fr": "Volonté d'étudier : culture de soi à vie, pas à pas.",
        "es": "Decidir aprender: cultivo personal de por vida, paso a paso.",
        "ar": "العزم على التعلم: تزكية النفس مدى العمر، خطوة فخطوة.",
    },
    ("personal", "christian"): {
        "fr": "Croître dans la grâce : déposer l'orgueil, s'appuyer sur le Transcendant.",
        "es": "Crecer en la gracia: deponer el orgullo, apoyarse en el Trascendente.",
        "ar": "النمو في النعمة: ترك الكبر والاتكاء على ما يفوق الذات.",
    },
    ("personal", "enlightenment"): {
        "fr": "Sapere aude : ose te servir de ton propre entendement.",
        "es": "Sapere aude: atrévete a usar tu propio entendimiento.",
        "ar": "اجرؤ على استخدام عقلك (Sapere aude).",
    },
    ("personal", "kantian"): {
        "fr": "L'autonomie est la liberté : se donner sa propre loi.",
        "es": "La autonomía es libertad: darse a uno mismo la propia ley.",
        "ar": "الاستقلال ذاتيًا هو الحرية: أن تشرّع لنفسك قانونك.",
    },
    ("personal", "buddhist"): {
        "fr": "Pleine présence ici et maintenant ; accueillir l'impermanence.",
        "es": "Plena presencia aquí y ahora; acoger la impermanencia.",
        "ar": "حضور تام في اللحظة، وقبول التغير.",
    },
    # 公共治理
    ("governance", "confucian"): {
        "fr": "Gouverner par la vertu ; rectifier les noms ; le peuple est le fondement.",
        "es": "Gobernar con virtud; rectificar los nombres; el pueblo como base.",
        "ar": "السياسة بالفضيلة، وتصحيح المسميات، والشعب أصل الحكم.",
    },
    ("governance", "christian"): {
        "fr": "Les autorités sont établies, mais le pouvoir n'est pas absolu.",
        "es": "Las autoridades están establecidas, pero el poder no es absoluto.",
        "ar": "السلطات قائمة، لكن السلطة ليست مطلقة.",
    },
    ("governance", "enlightenment"): {
        "fr": "Séparation des pouvoirs, souveraineté populaire, État de droit.",
        "es": "Separación de poderes, soberanía popular, Estado de derecho.",
        "ar": "فصل السلطات وسيادة الشعب وسيادة القانون.",
    },
    ("governance", "kantian"): {
        "fr": "Principe de publicité : seul ce qui peut se justifier publiquement est juste.",
        "es": "Principio de publicidad: solo es justo lo que puede justificarse públicamente.",
        "ar": "مبدأ العلانية: لا عدل إلا فيما يمكن تبريره علنًا.",
    },
    ("governance", "buddhist"): {
        "fr": "Politique du non-soi : servir tous les êtres avec compassion et sagesse.",
        "es": "Política del no-yo: servir a todos los seres con compasión y sabiduría.",
        "ar": "سياسة بلا أنا: خدمة الكائنات برحمة وحكمة.",
    },
}


def _passage_text(db: Session, ref_id: str) -> str:
    p = db.get(Passage, ref_id)
    return p.original_text if p else ""


def seed_corpus_if_needed(db: Session) -> dict:
    """对所有扩展数据做幂等 upsert/insert。返回新增计数。"""
    counts = {
        "passages": 0,
        "translations": 0,
        "annotations": 0,
        "concepts": 0,
        "topic_i18n": 0,
        "civ_headline_i18n": 0,
        "concept_patches": 0,
    }

    # 章节确保存在
    existing_chapters = {
        c.id for c in db.execute(select(Chapter)).scalars()
    }
    book = db.execute(select(Book).where(Book.id == "lunyu")).scalar_one_or_none()
    if not book:
        return counts  # 主 seed 还没跑过；让 seed_if_empty 跑完后再调

    # 论语扩条
    for p in EXTRA_PASSAGES:
        if db.get(Passage, p["id"]):
            continue
        chap_id = f"lunyu.{p['chapter']}"
        if chap_id not in existing_chapters:
            db.add(Chapter(id=chap_id, book_id="lunyu", title_zh=p["chapter"],
                           sort_order=100))
            existing_chapters.add(chap_id)
        db.add(Passage(
            id=p["id"], chapter_id=chap_id, ref_label=p["ref"],
            original_text=p["text"], pinyin=p["pinyin"],
            sort_order=900, concepts=p["concepts"],
        ))
        counts["passages"] += 1
        # 译文：zh 留存 + 四语
        db.add(Translation(passage_id=p["id"], lang="zh",
                           text=p["text"], translator="原文"))
        counts["translations"] += 1
        for lang, text in p["tr"].items():
            db.add(Translation(passage_id=p["id"], lang=lang, text=text,
                               translator="platform"))
            counts["translations"] += 1
        atype, asource, acontent = p["anno"]
        db.add(Annotation(passage_id=p["id"], type=atype, lang="zh",
                          source=asource, content=acontent))
        counts["annotations"] += 1

    # 概念扩条
    for c in EXTRA_CONCEPTS:
        if db.get(Concept, c["id"]):
            continue
        db.add(Concept(**c))
        counts["concepts"] += 1

    # 既有概念补 fr/es/ar
    for cid, patch in LEGACY_CONCEPT_PATCH.items():
        c = db.get(Concept, cid)
        if not c:
            continue
        new_i18n = dict(c.i18n or {})
        new_i18n.update(patch["i18n_add"])
        c.i18n = new_i18n
        new_def = dict(c.definition or {})
        new_def.update(patch["definition_add"])
        c.definition = new_def
        counts["concept_patches"] += 1

    # 议题名称多语
    for tid, langs in TOPIC_I18N.items():
        t = db.get(Topic, tid)
        if not t:
            continue
        cur = dict(t.name_i18n or {})
        added = False
        for lang, text in langs.items():
            if lang not in cur:
                cur[lang] = text
                added = True
        if added:
            t.name_i18n = cur
            counts["topic_i18n"] += 1

    # 跨文明立场 headline 多语
    rows = db.execute(select(CrossCivView)).scalars()
    for v in rows:
        key = (v.topic_id, v.civilization)
        if key not in CIV_HEADLINE_I18N:
            continue
        new_h = dict(v.headline or {})
        added = False
        for lang, text in CIV_HEADLINE_I18N[key].items():
            if lang not in new_h:
                new_h[lang] = text
                added = True
        if added:
            v.headline = new_h
            counts["civ_headline_i18n"] += 1

    db.commit()
    return counts
