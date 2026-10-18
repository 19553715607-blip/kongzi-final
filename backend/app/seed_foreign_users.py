"""生成海外用户注册与互动数据（演示 / 看板演示用）。

灌入：
  - 200 个海外注册用户（以英文为主，少量 ja / ko / fr / de / es）
    · 前 20 个为精选用户（真实高校邮箱，手工编排）
    · 后 180 个为程序化生成（姓名池 + 大学域名池，自动去重）
  - 每个用户的：打卡 streak、收藏、对话（Conversation + Message）、浏览埋点 PageEvent
  - 20 家海外机构 + API Key + ApiCall 调用日志
  - 额外一批匿名 visitor 的 PageEvent（让 reach 看板 UV 更丰满）

时间分布：最近 7 天。
可重复运行：按 email / institution.name 去重，已存在则跳过；--force 先清后灌。

用法：
  .venv/bin/python -m app.seed_foreign_users            # 增量
  .venv/bin/python -m app.seed_foreign_users --force    # 清掉本脚本生成的数据后重灌
"""
from __future__ import annotations

import argparse
import random
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm.attributes import flag_modified

from .db import SessionLocal, init_db
from .models import (
    ApiCall,
    ApiKey,
    Conversation,
    Favorite,
    Institution,
    Message,
    PageEvent,
    Passage,
    User,
    UserBadge,
)
from .services.apikey import generate_key
from .services.auth import hash_password
from .services.geo import country_name, ip_to_country, random_ip_for_country

# 固定随机种子，保证每次重灌数据一致、可复现
RNG = random.Random(20260621)

# 匿名 visitor_id：与前端 track.ts 一致（v_ 前缀），不再使用 sfu- 标记
# --force 清理时仍删除 sfu-% 遗留 + 种子用户 user_id 关联的 PageEvent
ANON_MARK = "sfu-"

# country 全名 → ISO 3166-1 alpha-2（用于 IP 生成 + signup_country）
COUNTRY_NAME_TO_CODE = {
    "United States": "US",
    "United Kingdom": "GB",
    "Canada": "CA",
    "Australia": "AU",
    "Japan": "JP",
    "South Korea": "KR",
    "France": "FR",
    "Germany": "DE",
    "Spain": "ES",
    "Mexico": "MX",
}

# ─────────────────────────────────────────────────────────────────────────────
# 用户池：姓名 / 邮箱 / 国家 / lang / persona
# ─────────────────────────────────────────────────────────────────────────────

# (display_name, email, country, lang, campus, persona, theme)
USERS = [
    # en · United States (5)
    ("Emily Chen",       "emily.chen@harvard.edu",        "United States", "en", "harvard",      "ziyue",  "light"),
    ("James Wilson",     "j.wilson@yale.edu",             "United States", "en", "harvard",      "modern", "dark"),
    ("Sophia Martinez",  "sophia.m@stanford.edu",         "United States", "en", "stanford",     "ziyue",  "light"),
    ("Liam Johnson",     "liam.j@princeton.edu",          "United States", "en", "princeton",    "yanhui", "dark"),
    ("Olivia Brown",     "olivia.b@mit.edu",              "United States", "en", "mit",          "modern", "light"),
    # en · United Kingdom (3)
    ("Henry Taylor",     "h.taylor@ox.ac.uk",             "United Kingdom","en", "oxford",       "ziyue",  "light"),
    ("Charlotte Davis",  "charlotte.d@cam.ac.uk",         "United Kingdom","en", "cambridge",    "yanhui", "dark"),
    ("Daniel White",     "d.white@ed.ac.uk",              "United Kingdom","en", "edinburgh",    "modern", "light"),
    # en · Canada (2)
    ("Mia Wong",         "mia.wong@utoronto.ca",          "Canada",        "en", "toronto",      "ziyue",  "light"),
    ("Noah Lee",         "noah.lee@ubc.ca",               "Canada",        "en", "ubc",          "modern", "dark"),
    # en · Australia (2)
    ("Ava Nguyen",       "ava.nguyen@unimelb.edu.au",     "Australia",     "en", "melbourne",    "ziyue",  "light"),
    ("William Kim",      "w.kim@sydney.edu.au",           "Australia",     "en", "sydney",       "yanhui", "light"),
    # ja · Japan (2)  界面偏好 ja，但内容层无 ja 译文，assistant 回答用 en
    ("Yuki Tanaka",      "yuki.tanaka@u-tokyo.ac.jp",     "Japan",         "ja", "tokyo",        "ziyue",  "light"),
    ("Haruto Sato",      "h.sato@kyoto-u.ac.jp",          "Japan",         "ja", "kyoto",        "modern", "dark"),
    # ko · South Korea (1)
    ("Min-jun Park",     "mj.park@snu.ac.kr",             "South Korea",   "ko", "seoul",        "ziyue",  "light"),
    # fr · France (2)
    ("Léa Dubois",       "lea.dubois@sciencespo.fr",      "France",        "fr", "sciencespo",   "yanhui", "light"),
    ("Lucas Bernard",    "l.bernard@ens.fr",              "France",        "fr", "ens",          "modern", "dark"),
    # de · Germany (1)
    ("Anna Schmidt",     "anna.schmidt@hu-berlin.de",     "Germany",       "de", "humboldt",     "ziyue",  "dark"),
    # es · Spain (1) + Mexico (1)
    ("Carlos Romero",    "c.romero@ucm.es",               "Spain",         "es", "complutense",  "modern", "light"),
    ("Sofía López",      "sofia.lopez@unam.mx",           "Mexico",        "es", "unam",         "ziyue",  "light"),
]

# ─────────────────────────────────────────────────────────────────────────────
# 程序化生成 180 个额外用户：姓名池 + 大学域名池
# ─────────────────────────────────────────────────────────────────────────────

# 每个国家的目标用户数（总计 200 = 20 精选 + 180 生成）
EXTRA_TARGET = {
    "United States":  115,  # 总 120 (含已有)
    "United Kingdom":  39,  # 总 42
    "Canada":          29,  # 总 31
    "Australia":       21,  # 总 23
    "Japan":           38,  # 总 40
    "South Korea":     21,  # 总 22
    "France":          38,  # 总 40
    "Germany":         22,  # 总 23
    "Spain":           21,  # 总 22
    "Mexico":          21,  # 总 22
}

# country → lang
COUNTRY_LANG = {
    "United States": "en", "United Kingdom": "en", "Canada": "en", "Australia": "en",
    "Japan": "ja", "South Korea": "ko",
    "France": "fr", "Germany": "de",
    "Spain": "es", "Mexico": "es",
}

# 每个国家的大学域名池 (domain, campus_short)
UNIV_DOMAINS: dict[str, list[tuple[str, str]]] = {
    "United States": [
        ("columbia.edu", "columbia"), ("cornell.edu", "cornell"), ("berkeley.edu", "berkeley"),
        ("uchicago.edu", "chicago"), ("upenn.edu", "upenn"), ("northwestern.edu", "northwestern"),
        ("duke.edu", "duke"), ("jhu.edu", "jhu"), ("nyu.edu", "nyu"), ("ucla.edu", "ucla"),
        ("umich.edu", "umich"), ("caltech.edu", "caltech"), ("rice.edu", "rice"),
        ("brown.edu", "brown"), ("dartmouth.edu", "dartmouth"),
    ],
    "United Kingdom": [
        ("manchester.ac.uk", "manchester"), ("ucl.ac.uk", "ucl"), ("kcl.ac.uk", "kcl"),
        ("lse.ac.uk", "lse"), ("bristol.ac.uk", "bristol"), ("warwick.ac.uk", "warwick"),
        ("glasgow.ac.uk", "glasgow"), ("durham.ac.uk", "durham"), ("bham.ac.uk", "birmingham"),
        ("leeds.ac.uk", "leeds"), ("southampton.ac.uk", "southampton"),
    ],
    "Canada": [
        ("mcgill.ca", "mcgill"), ("uwaterloo.ca", "waterloo"), ("ualberta.ca", "alberta"),
        ("queensu.ca", "queens"), ("dal.ca", "dalhousie"), ("yorku.ca", "york"),
        ("sfu.ca", "sfu"), ("uwo.ca", "western"),
    ],
    "Australia": [
        ("anu.edu.au", "anu"), ("unsw.edu.au", "unsw"), ("uq.edu.au", "uq"),
        ("monash.edu", "monash"), ("adelaide.edu.au", "adelaide"), ("uwa.edu.au", "uwa"),
        ("qut.edu.au", "qut"), ("rmit.edu.au", "rmit"),
    ],
    "Japan": [
        ("osaka-u.ac.jp", "osaka"), ("tohoku.ac.jp", "tohoku"), ("nagoya-u.ac.jp", "nagoya"),
        ("kyushu-u.ac.jp", "kyushu"), ("hokudai.ac.jp", "hokudai"), ("tsukuba.ac.jp", "tsukuba"),
        ("waseda.jp", "waseda"), ("keio.jp", "keio"), ("ritsumei.ac.jp", "ritsumei"),
    ],
    "South Korea": [
        ("kaist.ac.kr", "kaist"), ("postech.ac.kr", "postech"), ("yonsei.ac.kr", "yonsei"),
        ("korea.ac.kr", "korea"), ("sogang.ac.kr", "sogang"), ("hanyang.ac.kr", "hanyang"),
        ("kyungpook.ac.kr", "kyungpook"), ("pusan.ac.kr", "pusan"),
    ],
    "France": [
        ("sorbonne-universite.fr", "sorbonne"), ("polytechnique.edu", "polytechnique"),
        ("ensae.fr", "ensae"), ("hec.edu", "hec"), ("dauphine.psl.eu", "dauphine"),
        ("sciencespo.fr", "sciencespo"), ("ens-lyon.fr", "ens-lyon"),
        ("univ-paris1.fr", "paris1"), ("institut-optique.fr", "optique"),
    ],
    "Germany": [
        ("tum.de", "tum"), ("lmu.de", "lmu"), ("uni-heidelberg.de", "heidelberg"),
        ("uni-freiburg.de", "freiburg"), ("uni-tuebingen.de", "tuebingen"),
        ("uni-koeln.de", "koeln"), ("uni-hamburg.de", "hamburg"), ("tu-berlin.de", "tu-berlin"),
        ("uni-frankfurt.de", "frankfurt"), ("uni-bonn.de", "bonn"),
    ],
    "Spain": [
        ("ub.edu", "barcelona"), ("upc.edu", "upc"), ("ugr.es", "granada"),
        ("us.es", "sevilla"), ("uv.es", "valencia"), ("uam.es", "uam"),
        ("uc3m.es", "uc3m"), ("ucm.es", "complutense"),
    ],
    "Mexico": [
        ("itam.mx", "itam"), ("tec.mx", "tec"), ("udla.mx", "udla"),
        ("uam.mx", "uam"), ("ipn.mx", "ipn"), ("unam.mx", "unam"),
    ],
}

# 姓名池（每种语言 40+ first + 40+ last，尽量减少 200 人内的重名）
NAME_POOLS: dict[str, tuple[list[str], list[str]]] = {
    "en": (
        # first names
        ["Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
         "Isabella", "Lucas", "Mia", "Henry", "Charlotte", "Daniel", "Amelia",
         "Jack", "Harper", "Benjamin", "Evelyn", "James", "Abigail", "Michael",
         "Emily", "Alexander", "Elizabeth", "Sebastian", "Sofia", "David",
         "Avery", "Joseph", "Ella", "Samuel", "Grace", "Connor", "Chloe",
         "Logan", "Camila", "Jacob", "Lily", "Andrew"],
        # last names
        ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
         "Davis", "Rodriguez", "Martinez", "Lopez", "Gonzalez", "Wilson",
         "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee",
         "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez",
         "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright",
         "Scott", "Hill", "Green", "Adams", "Baker", "Nelson"],
    ),
    "ja": (
        ["Yuki", "Haruto", "Sora", "Hina", "Ren", "Aoi", "Minato", "Tsubasa",
         "Sakura", "Kaito", "Yua", "Hiroshi", "Mei", "Riku", "Yuno",
         "Souta", "Koharu", "Riku", "Tatsuya", "Mio", "Daiki", "Rin",
         "Yuto", "Hinata", "Kazuki", "Nanami", "Sho", "Akari", "Tomoya", "Yuri"],
        ["Tanaka", "Sato", "Suzuki", "Watanabe", "Takahashi", "Ito", "Yamamoto",
         "Nakamura", "Kobayashi", "Saito", "Kato", "Yoshida", "Yamada",
         "Sasaki", "Yamaguchi", "Matsumoto", "Inoue", "Kimura", "Hayashi",
         "Shimizu", "Yamazaki", "Mori", "Abe", "Ikeda", "Hashimoto"],
    ),
    "ko": (
        ["Min-jun", "Seo-yeon", "Ji-ho", "Yu-jin", "Joon-ho", "Ha-eun",
         "Si-woo", "Ji-woo", "Do-yoon", "Seo-yeon", "Eun-woo", "Soo-min",
         "Tae-hyung", "Hye-jin", "Jin-soo", "Min-ji", "Sung-ho", "Da-eun",
         "Ye-jin", "Hyun-woo", "Jae-min", "So-hee", "Woo-jin", "Eun-ji"],
        ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon",
         "Jang", "Lim", "Han", "Oh", "Seo", "Shin", "Kwon", "Hwang",
         "Ahn", "Bae", "Song", "Yoo", "Hong", "Nam", "Go"],
    ),
    "fr": (
        ["Léa", "Lucas", "Manon", "Gabriel", "Camille", "Louis", "Chloé",
         "Hugo", "Inès", "Jules", "Alice", "Nathan", "Zoé", "Léo",
         "Jeanne", "Paul", "Anna", "Tom", "Emma", "Théo", "Louise",
         "Raphaël", "Rose", "Adam", "Jade", "Gaspard", "Mila", "Evan"],
        ["Dubois", "Martin", "Bernard", "Petit", "Robert", "Richard",
         "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre",
         "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent",
         "Fournier", "Morel", "Girard", "André", "Lefevre", "Mercier"],
    ),
    "de": (
        ["Anna", "Lukas", "Mia", "Ben", "Sophie", "Paul", "Marie", "Finn",
         "Emma", "Jonas", "Hannah", "Elias", "Lea", "Felix", "Lena",
         "Maximilian", "Lena", "Leon", "Lina", "Tim", "Sarah", "David",
         "Laura", "Julian", "Nina", "Tobias", "Klara", "Philipp"],
        ["Schmidt", "Müller", "Schneider", "Fischer", "Weber", "Meyer",
         "Wagner", "Becker", "Schulz", "Hoffmann", "Schäfer", "Koch",
         "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann",
         "Schwarz", "Zimmermann", "Braun", "Krüger", "Hofmann", "Hartmann"],
    ),
    "es": (
        ["Carlos", "Sofía", "Mateo", "Valentina", "Diego", "Lucía",
         "Alejandro", "Martina", "Pablo", "Catalina", "Javier", "Daniela",
         "Sebastián", "Camila", "Antonio", "Elena", "Miguel", "Isabella",
         "Rafael", "Mariana", "Tomás", "Adriana", "Andrés", "Paola"],
        ["García", "Rodríguez", "González", "Fernández", "López", "Martínez",
         "Sánchez", "Pérez", "Gómez", "Martín", "Jiménez", "Ruiz",
         "Hernández", "Díaz", "Moreno", "Muñoz", "Álvarez", "Romero",
         "Alonso", "Gutiérrez", "Navarro", "Torres", "Domínguez", "Vázquez"],
    ),
}


def _generate_extra_users() -> list[tuple[str, str, str, str, str, str, str]]:
    """程序化生成 180 个额外用户，返回与 USERS 同格式的 tuple 列表。

    格式：(display_name, email, country, lang, campus, persona, theme)
    """
    extra: list[tuple[str, str, str, str, str, str, str]] = []
    used_emails: set[str] = set()
    # 把精选用户的 email 也加入 used，避免碰撞
    for row in USERS:
        used_emails.add(row[1])

    for country, n in EXTRA_TARGET.items():
        lang = COUNTRY_LANG[country]
        first_pool, last_pool = NAME_POOLS[lang]
        domains = UNIV_DOMAINS[country]
        for _ in range(n):
            first = RNG.choice(first_pool)
            last = RNG.choice(last_pool)
            domain, campus = RNG.choice(domains)
            # email: first.last@domain，重名时加数字
            base = f"{first.lower().replace(' ', '').replace('-', '')}.{last.lower().replace(' ', '').replace('-', '')}"
            email = f"{base}@{domain}"
            counter = 2
            while email in used_emails:
                email = f"{base}{counter}@{domain}"
                counter += 1
            used_emails.add(email)
            display_name = f"{first} {last}"
            persona = RNG.choices(
                ["ziyue", "modern", "yanhui"], weights=[45, 35, 20]
            )[0]
            theme = RNG.choices(["light", "dark"], weights=[62, 38])[0]
            extra.append((display_name, email, country, lang, campus, persona, theme))
    return extra


# 构建 ALL_USERS（精选 + 生成）和查表用的 EMAIL_TO_CAMPUS
_EXTRA_USERS = _generate_extra_users()
ALL_USERS: list[tuple[str, str, str, str, str, str, str]] = list(USERS) + _EXTRA_USERS
ALL_EMAILS: set[str] = {row[1] for row in ALL_USERS}
EMAIL_TO_CAMPUS: dict[str, str] = {row[1]: row[4] for row in ALL_USERS}

# ─────────────────────────────────────────────────────────────────────────────
# 互动素材
# ─────────────────────────────────────────────────────────────────────────────

# 可被收藏 / 被对话引用的真实 passage ref_id（来自 seed + seed_corpus）
PASSAGE_POOL = [
    "lunyu.xueer.1.1",       # 学而时习之
    "lunyu.weizheng.2.4",    # 吾十有五而志于学
    "lunyu.weizheng.2.11",   # 温故而知新
    "lunyu.weizheng.2.15",   # 学而不思则罔
    "lunyu.weizheng.2.17",   # 知之为知之
    "lunyu.liren.4.1",       # 里仁为美
    "lunyu.liren.4.8",       # 朝闻道，夕死可矣
    "lunyu.liren.4.15",      # 夫子之道，忠恕而已矣
    "lunyu.liren.4.16",      # 君子喻于义
    "lunyu.liren.4.17",      # 见贤思齐
    "lunyu.yanyuan.12.1",    # 克己复礼为仁
    "lunyu.yanyuan.12.2",    # 己所不欲，勿施于人
    "lunyu.yanyuan.12.7",    # 民无信不立
    "lunyu.shuer.7.21",      # 三人行必有我师
    "lunyu.shuer.7.8",       # 不愤不启
    "lunyu.yongye.6.20",     # 知之者不如好之者
    "lunyu.bayi.3.3",        # 人而不仁如礼何
    "lunyu.xueer.1.4",       # 吾日三省吾身
    "lunyu.xueer.1.6",       # 弟子入则孝
    "lunyu.xueer.1.16",      # 不患人之不己知
]

CONCEPT_POOL = [
    "ren", "li", "junzi", "yi", "shu", "xiao", "zhong", "xin",
    "zhi", "dao", "de", "xue", "si", "jing", "zhongyong", "he",
]

# 每种 lang 对应的一组真实感提问（用户侧 message）
QUESTIONS_BY_LANG = {
    "en": [
        "What does 仁 (ren) really mean? Is it just benevolence?",
        "How is li (ritual) relevant in modern society?",
        "Did Confucius say anything about learning from friends?",
        "What is a junzi and how is it different from a good person?",
        "Is 'do not impose on others what you don't want' the same as the Golden Rule?",
        "How should I reflect on myself daily, like Confucius taught?",
        "What did Confucius mean by 'hearing the Way in the morning, dying at night is fine'?",
        "Was Confucius in favor of hierarchy or mutual care?",
    ],
    "ja": [
        "仁という概念は現代の日本社会にどう応用できますか？",
        "孔子の「学び而時習之」の本当の意味は何ですか？",
        "礼は現代でも重要ですか？それとも古い考え方ですか？",
        "君子と善人の違いは何ですか？",
    ],
    "ko": [
        "공자가 말한 군자군자는 오늘날의 좋은 사람과 어떻게 다른가요?",
        "仁(인)의 개념을 현대적으로 어떻게 해석할 수 있나요?",
        "매일 자신을 돌아보는 삼라는 어떤 의미인가요?",
    ],
    "fr": [
        "Que signifie vraiment 仁 (ren) ? Est-ce simplement la bienveillance ?",
        "Comment le li (rites) est-il pertinent dans la société moderne ?",
        "Le junzi est-il l'équivalent du gentleman anglais ?",
        "Comment Confucius concevait-il l'apprentissage ?",
    ],
    "de": [
        "Was bedeutet 仁 (ren) wirklich? Ist es nur Nächstenliebe?",
        "Wie ist li (Ritus) in der modernen Gesellschaft relevant?",
        "Was ist ein junzi und wie unterscheidet er sich von einem guten Menschen?",
    ],
    "es": [
        "¿Qué significa realmente 仁 (ren)? ¿Es simplemente benevolencia?",
        "¿Cómo es relevante el li (rito) en la sociedad moderna?",
        "¿Qué es un junzi y en qué se diferencia de una buena persona?",
        "¿Confucio apoyaba la jerarquía o el cuidado mutuo?",
    ],
}

# 每种 lang 对应的多套 assistant 回答模板（带一条真实引用），随机选用以避免模板化
ANSWER_TEMPLATES_BY_LANG: dict[str, list[str]] = {
    "en": [
        "Based on the Analects, {point}. As Confucius says in {ref_label}: \"{quote_en}\"\n\nThe original Chinese reads: {quote_zh}\n\nIn a modern context, this suggests {modern}.",
        "The Analects address this directly. {point}. Consider {ref_label}: \"{quote_en}\"\n\n原文：{quote_zh}\n\nFor us today, this means {modern}.",
        "This is a central concern in Confucian thought. {point}. The Master says in {ref_label}: \"{quote_en}\"\n\n原文：{quote_zh}\n\nApplied to contemporary life, {modern}.",
        "Confucius has a clear position on this. {point}. See {ref_label}: \"{quote_en}\"\n\n原文：{quote_zh}\n\nModern readers might interpret this as {modern}.",
        "In {ref_label}, Confucius remarks: \"{quote_en}\" — which supports the view that {point}.\n\n原文：{quote_zh}\n\nTranslating this for today: {modern}.",
        "Your question touches a theme the Analects return to often. {point}. Note especially {ref_label}: \"{quote_en}\"\n\n原文：{quote_zh}\n\nA contemporary reading would emphasize {modern}.",
        "Scholars often cite {ref_label} here: \"{quote_en}\". From this passage we learn that {point}.\n\n原文：{quote_zh}\n\nIn present-day ethics, {modern}.",
        "The Master’s teaching in {ref_label} is instructive: \"{quote_en}\". It suggests {point}.\n\n原文：{quote_zh}\n\nFor modern students, {modern}.",
        "One classical reading begins with {ref_label}: \"{quote_en}\". {point}.\n\n原文：{quote_zh}\n\nThis resonates today because {modern}.",
        "Confucian commentators link this issue to {ref_label}, where we read: \"{quote_en}\". The key idea is that {point}.\n\n原文：{quote_zh}\n\nApplied broadly, {modern}.",
        "When students ask about this, I point them to {ref_label}: \"{quote_en}\". There Confucius implies {point}.\n\n原文：{quote_zh}\n\nIn cross-cultural dialogue, {modern}.",
        "The passage {ref_label} offers a concise answer: \"{quote_en}\". It clarifies that {point}.\n\n原文：{quote_zh}\n\nEthically speaking today, {modern}.",
        "Ren, li, and yi are intertwined here. {point}. {ref_label} states: \"{quote_en}\"\n\n原文：{quote_zh}\n\nModern civic life can still learn that {modern}.",
        "A careful reading of {ref_label} shows: \"{quote_en}\". This supports the Confucian claim that {point}.\n\n原文：{quote_zh}\n\nPractically, {modern}.",
        "In classroom discussion we often begin with {ref_label}: \"{quote_en}\". The Analects thereby teach us {point}.\n\n原文：{quote_zh}\n\nFor international readers, {modern}.",
        "To situate this historically: {ref_label} records, \"{quote_en}\". Confucius is urging us to see that {point}.\n\n原文：{quote_zh}\n\nIts modern relevance lies in {modern}.",
    ],
    "ja": [
        "論語に基づくと、{point}。孔子は{ref_label}で次のように述べています：\"{quote_en}\"\n\n原文：{quote_zh}\n\n現代の文脈では、{modern}。",
        "これは儒学の核心的な問いです。{point}。{ref_label}に「{quote_en}」とあります。\n\n原文：{quote_zh}\n\n現代においては、{modern}。",
        "孔子の教えでは、{point}。{ref_label}を参照してください：「{quote_en}」\n\n原文：{quote_zh}\n\n今日の生活に当てはめると、{modern}。",
    ],
    "ko": [
        "논어에 따르면, {point}. 공자는 {ref_label}에서 다음과 같이 말씀하셨습니다: \"{quote_en}\"\n\n원문: {quote_zh}\n\n현대적 맥락에서는 {modern}.",
        "이것은 유교 사상의 핵심 주제입니다. {point}. {ref_label}을 보십시오: \"{quote_en}\"\n\n원문: {quote_zh}\n\n오늘날의 삶에 적용하면, {modern}.",
        "공자의 가르침에서, {point}. {ref_label}에 이르기를: \"{quote_en}\"\n\n원문: {quote_zh}\n\n현대 독자에게는 {modern}으로 해석될 수 있습니다.",
    ],
    "fr": [
        "D'après les Entretiens, {point}. Comme le dit Confucius dans {ref_label} : \"{quote_fr}\"\n\nLe texte original chinois : {quote_zh}\n\nDans un contexte moderne, cela suggère {modern}.",
        "Les Entretiens traitent cette question directement. {point}. Considérez {ref_label} : \"{quote_fr}\"\n\n原文：{quote_zh}\n\nPour nous aujourd'hui, cela signifie {modern}.",
        "C'est une préoccupation centrale de la pensée confucéenne. {point}. Le Maître dit dans {ref_label} : \"{quote_fr}\"\n\n原文：{quote_zh}\n\nAppliqué à la vie contemporaine, {modern}.",
    ],
    "de": [
        "Laut den Analekten, {point}. Konfuzius sagt in {ref_label}: \"{quote_en}\"\n\nDer chinesische Originaltext: {quote_zh}\n\nIn einem modernen Kontext legt dies {modern} nahe.",
        "Die Analekten behandeln dies direkt. {point}. Siehe {ref_label}: \"{quote_en}\"\n\n原文：{quote_zh}\n\nFür uns heute bedeutet das {modern}.",
        "Das ist ein zentrales Anliegen im konfuzianischen Denken. {point}. Der Meister sagt in {ref_label}: \"{quote_en}\"\n\n原文：{quote_zh}\n\nAuf das zeitgenössische Leben angewandt, {modern}.",
    ],
    "es": [
        "Según las Analectas, {point}. Como dice Confucio en {ref_label}: \"{quote_es}\"\n\nEl texto original en chino: {quote_zh}\n\nEn un contexto moderno, esto sugiere {modern}.",
        "Las Analectas abordan esto directamente. {point}. Considere {ref_label}: \"{quote_es}\"\n\n原文：{quote_zh}\n\nPara nosotros hoy, esto significa {modern}.",
        "Es una preocupación central del pensamiento confuciano. {point}. El Maestro dice en {ref_label}: \"{quote_es}\"\n\n原文：{quote_zh}\n\nAplicado a la vida contemporánea, {modern}.",
    ],
}

# 兼容旧引用名
ANSWER_TEMPLATE_BY_LANG = {lang: templates[0] for lang, templates in ANSWER_TEMPLATES_BY_LANG.items()}

# 按 lang 提供可填入模板的 point / modern 短语池
ANSWER_BITS = {
    "en": {
        "points": [
            "ren is the cardinal virtue of humaneness, extending oneself to others",
            "li is the ritual propriety that orders both conduct and society",
            "the junzi prioritizes righteousness (yi) over personal profit",
            "learning must be paired with practice and reflection",
            "self-cultivation begins with examining one's own conduct daily",
        ],
        "moderns": [
            "cultivating empathy in everyday relationships matters as much as formal ethics",
            "shared rituals still anchor communities even in secular societies",
            "reflective practice at work echoes the Confucian art of self-examination",
            "the junzi ideal can reframe leadership as moral exemplarity rather than authority",
        ],
    },
    "ja": {
        "points": [
            "仁は他者へ思いを及ぼす、儒家の中心となる徳",
            "礼は行為と社会を整える儀礼的な適切さ",
            "君子は利益より義を重んじる",
            "学びは実践と反省とともにあるべき",
        ],
        "moderns": [
            "日常の人間関係で共感を養うことが倫理に等しい",
            "共有の儀礼は世俗社会でも共同体を支える",
            "振り返りの実践は儒家の自省と通じる",
        ],
    },
    "ko": {
        "points": [
            "인(仁)은 타인에게 미치는 유가의 핵심 덕목",
            "예(礼)는 행동과 사회를 정돈하는 예절적 적합성",
            "군자는 이익보다 의(義)를 우선한다",
            "배움은 실천과 반성을 동반해야 한다",
        ],
        "moderns": [
            "일상의 관계에서 공감을 기르는 것이 곧 윤리",
            "공유의 예식은 세속 사회에서도 공동체를 지탱한다",
        ],
    },
    "fr": {
        "points": [
            "ren est la vertu cardinale d'humanité, s'extendre vers autrui",
            "li est la convenance rituelle qui ordonne conduite et société",
            "le junzi priorise la droiture (yi) sur le profit personnel",
            "l'apprentissage doit s'allier à la pratique et à la réflexion",
        ],
        "moderns": [
            "cultiver l'empathie dans les relations du quotidien importe autant que l'éthique formelle",
            "les rituels partagés ancrent encore les communautés même laïques",
            "la pratique réflexive au travail fait écho à l'art confucéen de l'introspection",
        ],
    },
    "de": {
        "points": [
            "ren ist die Kardinaltugend der Menschlichkeit, sich zu anderen auszudehnen",
            "li ist die ritliche Angemessenheit, die Verhalten und Gesellschaft ordnet",
            "der junzi stellt Rechtschaffenheit (yi) über persönlichen Gewinn",
            "Lernen muss mit Praxis und Reflexion einhergehen",
        ],
        "moderns": [
            "Empathie in alltäglichen Beziehungen zu kultivieren, zählt ebenso wie formale Ethik",
            "gemeinsame Rituale verankern auch in säkularen Gesellschaften Gemeinschaften",
        ],
    },
    "es": {
        "points": [
            "ren es la virtud cardinal de humanidad, extenderse hacia los demás",
            "li es la propiedad ritual que ordena conducta y sociedad",
            "el junzi prioriza la rectitud (yi) sobre el beneficio personal",
            "el aprendizaje debe ir junto con la práctica y la reflexión",
        ],
        "moderns": [
            "cultivar la empatía en las relaciones cotidianas importa tanto como la ética formal",
            "los rituales compartidos anclan comunidades incluso en sociedades seculares",
            "la práctica reflexiva en el trabajo hace eco del arte confuciano de introspección",
        ],
    },
}

# 浏览路径池（覆盖主要路由）
PATH_POOL = [
    "/", "/read", "/chat", "/feed", "/graph", "/journey",
    "/journey/li", "/journey/she", "/me", "/login",
    "/cases", "/co-create", "/plugins", "/reach", "/developers", "/kiosk",
]
# 来源池
SOURCE_POOL = ["direct", "qr", "embed", "wechat", "slack", "twitter", "email"]
# 设备池（按权重）
DEVICE_WEIGHTS = [("web", 0.55), ("mobile", 0.35), ("kiosk", 0.05), ("plugin", 0.05)]

# 密码池（每个用户从中随机选一个，避免全同密码）
PASSWORD_POOL = [
    "kongzi-demo-2026",
    "Confucius2026!",
    "Analects#1",
    "Junzi@harvard",
    "RenLi2026",
    "WenXin2026!",
    "XueEr#pass",
    "ZhiZhi@2026",
    "ShuDao2026",
    "LunYu!pass",
    "EastAsia#1",
    "Classics2026",
    "Philosophy@1",
    "Ethics2026!",
    "Wisdom#pass",
]

# 问题类型分类（用于 agents_used 分化）
# key: 问题文本中的关键词 → 智能体组合
def _classify_question(q: str) -> str:
    """返回问题类型：concept / relation / learning / ethics / general"""
    q_lower = q.lower()
    # 更具体的类型优先，避免含 ren/li 的问题全部落入 concept
    if any(k in q_lower for k in ["learn", "study", "apprentissage", "lernen",
                                    "學", "学", "reflect", "反省", "反思",
                                    "friend", "teacher", "practice", "apprendre"]):
        return "learning"
    if any(k in q_lower for k in ["modern", "today", "contemporary", "society",
                                    "ethical", "ethics", "moral", "social",
                                    "现代社会", "現代", "현대", "relevant", "actual"]):
        return "ethics"
    if any(k in q_lower for k in ["relationship", "relation", "connect", "hierarchy",
                                    "between", "diff", "different", "difference",
                                    "golden rule", "互", "関係", "関係性", "versus", " vs "]):
        return "relation"
    if any(k in q_lower for k in ["ren", "仁", "li", "礼", "ritual", "junzi", "君子",
                                    "benevolence", "righteousness", "yi", "义",
                                    "humaneness", "rit", "rito", "rites", "ritus"]):
        return "concept"
    return "general"


def _agents_for_type(qtype: str, lang: str, rng: Optional[random.Random] = None) -> list[str]:
    r = rng or RNG
    base = ["router", "retrieval", "synthesizer", "verifier"]
    if qtype == "concept":
        base = ["router", "retrieval", "concept_explainer", "synthesizer", "verifier"]
    elif qtype == "relation":
        base = ["router", "retrieval", "graph", "synthesizer", "verifier"]
    elif qtype == "learning":
        base = ["router", "retrieval", "teaching_guide", "synthesizer", "verifier"]
    elif qtype == "ethics":
        base = ["router", "retrieval", "topic_engine", "cross_civilization",
                "synthesizer", "verifier"]
    if lang != "zh":
        base = base[:-1] + ["translator", "cross_culture", "verifier"]
        if r.random() < 0.22 and "cross_culture" in base:
            base = [a for a in base if a != "cross_culture"]
        if r.random() < 0.12 and "translator" in base:
            base = [a for a in base if a != "translator"] + ["verifier"]
        if r.random() < 0.08:
            idx = max(1, len(base) - 2)
            base.insert(idx, "topic_engine")
    return base


def _frontend_visitor_id(rng: random.Random, stable: str = "") -> str:
    """与 frontend/src/lib/track.ts 一致的 visitor_id（v_ 前缀）。"""
    if stable:
        import hashlib

        digest = hashlib.sha1(stable.encode("utf-8")).hexdigest()
        return f"v_{digest[:10]}{digest[10:18]}"
    rpart = "".join(rng.choice("0123456789abcdefghijklmnopqrstuvwxyz") for _ in range(10))
    tpart = format(int(rng.random() * 1e12), "x")[:8]
    return f"v_{rpart}{tpart}"

# ─────────────────────────────────────────────────────────────────────────────
# 机构池
# ─────────────────────────────────────────────────────────────────────────────

# (name, country, contact_email, purpose, monthly_quota, campus)
INSTITUTIONS = [
    ("Harvard University",                  "United States",  "eastasia@harvard.edu",       "East Asian Studies curriculum integration",     20_000, "harvard"),
    ("University of Oxford",                "United Kingdom", "china.institute@ox.ac.uk",  "Cross-civilization ethics research project",     15_000, "oxford"),
    ("University of Tokyo",                 "Japan",          "confucius@u-tokyo.ac.jp",    "Comparative philosophy teaching assistant",     12_000, "tokyo"),
    ("Sciences Po",                         "France",         "ethics.lab@sciencespo.fr",   "Global governance and Confucian ethics course", 10_000, "sciencespo"),
    ("Humboldt-Universität zu Berlin",      "Germany",        "sinologie@hu-berlin.de",     "Sinology digital corpus access",                 8_000, "humboldt"),
    ("Universidad Complutense Madrid",      "Spain",          "filosofia@ucm.es",           "Cross-cultural philosophy program",              8_000, "complutense"),
    ("University of Toronto",               "Canada",         "东亚系@utoronto.ca",         "East Asian philosophy digital humanities",       10_000, "toronto"),
    ("University of Melbourne",             "Australia",      "confucius@unimelb.edu.au",   "Asian studies curriculum integration",            8_000, "melbourne"),
    ("Yale University",                     "United States",  "ceas@yale.edu",              "Classical Chinese philosophy seminar support",     12_000, "harvard"),
    ("Stanford University",                 "United States",  "ealc@stanford.edu",          "Humanities AI teaching pilot",                    15_000, "stanford"),
    ("Columbia University",                 "United States",  "eaac@columbia.edu",          "Global Core curriculum Confucian ethics module",    14_000, "harvard"),
    ("University of Cambridge",             "United Kingdom", "faculty.asian@cam.ac.uk",    "Faculty of Asian studies research access",          11_000, "cambridge"),
    ("London School of Economics",          "United Kingdom", "philosophy.lse.ac.uk",       "Political philosophy and Confucian governance",   9_000,  "oxford"),
    ("McGill University",                   "Canada",         "eastasian@mcgill.ca",        "East Asian religions and ethics program",          9_000,  "toronto"),
    ("Seoul National University",           "South Korea",    "philosophy@snu.ac.kr",       "Comparative ethics and Analects corpus API",       10_000, "seoul"),
    ("Kyoto University",                    "Japan",          "phil@kyoto-u.ac.jp",         "Buddhist-Confucian comparative studies",           10_000, "kyoto"),
    ("École normale supérieure",            "France",         "philosophie@ens.fr",         "History of Chinese thought digital access",        8_000,  "ens"),
    ("Ludwig-Maximilians-Universität München", "Germany",     "sinologie@lmu.de",           "Munich sinology graduate seminar tools",           8_000,  "humboldt"),
    ("Universidad Nacional Autónoma de México", "Mexico",     "filosofia@unam.mx",          "Latin American Confucian studies network",         7_000,  "unam"),
    ("Princeton University",                "United States",  "eas@princeton.edu",          "East Asian studies graduate research API",         11_000, "princeton"),
]

# 机构调用的开放接口路径池（/api/v1/public/*）
PUBLIC_PATH_POOL = [
    "/api/v1/public/search",
    "/api/v1/public/passages/lunyu.yanyuan.12.1",
    "/api/v1/public/passages/lunyu.yanyuan.12.2",
    "/api/v1/public/passages/lunyu.shuer.7.21",
    "/api/v1/public/passages/lunyu.liren.4.16",
    "/api/v1/public/topics",
    "/api/v1/public/topics/climate",
    "/api/v1/public/topics/tech-ethics",
    "/api/v1/public/cases",
    "/api/v1/public/corpus/stats",
    "/api/v1/public/whoami",
]


# ─────────────────────────────────────────────────────────────────────────────
# 工具函数
# ─────────────────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.utcnow().replace(microsecond=RNG.randint(0, 999999))


def _days_ago(days: int, hour_floor: int = 0) -> datetime:
    """返回 days 天前的一个随机时间点。

    微秒用 RNG 填充（不用 func.now()），避免批量生成的记录秒-微秒高度相关。
    """
    base = _now() - timedelta(days=days)
    if hour_floor:
        base = base.replace(hour=hour_floor, minute=0, second=0, microsecond=0)
    return base + timedelta(
        hours=RNG.randint(0, 23),
        minutes=RNG.randint(0, 59),
        seconds=RNG.randint(0, 59),
        microseconds=RNG.randint(0, 999999),
    )


def _ts_after(base_ts: datetime, min_delay_sec: int = 1, max_delay_hr: int = 48) -> datetime:
    """生成一个在 base_ts 之后的时间点（保证时间因果不倒置）。"""
    delay = timedelta(
        seconds=RNG.randint(min_delay_sec, min_delay_sec + 300),
        minutes=RNG.randint(0, 59),
        hours=RNG.randint(0, max_delay_hr - 1),
        microseconds=RNG.randint(0, 999999),
    )
    return base_ts + delay


def _ts_between(start: datetime, end: datetime) -> datetime:
    """生成一个在 [start, end] 之间的随机时间点。"""
    delta = end - start
    total_sec = int(delta.total_seconds())
    if total_sec <= 0:
        return start + timedelta(microseconds=RNG.randint(0, 999999))
    return start + timedelta(seconds=RNG.randint(0, total_sec), microseconds=RNG.randint(0, 999999))


def _weighted_choice(weighted: list[tuple[str, float]]) -> str:
    total = sum(w for _, w in weighted)
    r = RNG.random() * total
    upto = 0.0
    for v, w in weighted:
        upto += w
        if r <= upto:
            return v
    return weighted[-1][0]


def _passage_brief(db, ref_id: str) -> Optional[Passage]:
    return db.get(Passage, ref_id)


def _quote_text(db, ref_id: str, lang: str) -> str:
    p = _passage_brief(db, ref_id)
    if not p:
        return ""
    if lang == "zh":
        return p.original_text
    tr = next((t.text for t in p.translations if t.lang == lang), None)
    if tr:
        return tr
    # 没有对应 lang 的译文 → 回落到英文，再回落到中文原文
    en = next((t.text for t in p.translations if t.lang == "en"), None)
    return en or p.original_text


# ─────────────────────────────────────────────────────────────────────────────
# 清理（--force 用）
# ─────────────────────────────────────────────────────────────────────────────

def _purge_foreign(db) -> dict:
    """删除本脚本生成的所有数据。

    用户按 ALL_EMAILS（精选 + 程序化生成的全部 200 个 email）识别；
    机构按 INSTITUTIONS 列表里的原始 name 识别；
    匿名 PageEvent 按 visitor_id 前缀 ANON_MARK 识别。
    """
    stats = {}
    # 1. 删匿名 PageEvent（visitor_id 前缀匹配）
    n_pe_anon = db.query(PageEvent).filter(
        PageEvent.visitor_id.like(f"{ANON_MARK}%")
    ).delete()
    # 2. 删用户绑定的 PageEvent：先查用户 id
    user_ids = [
        r[0]
        for r in db.execute(
            select(User.id).where(User.email.in_(list(ALL_EMAILS)))
        ).all()
    ]
    n_pe_users = 0
    if user_ids:
        n_pe_users = db.query(PageEvent).filter(PageEvent.user_id.in_(user_ids)).delete()
    stats["page_events"] = n_pe_anon + n_pe_users
    # 3. 删机构：先查机构 id，再删 ApiCall / ApiKey / Institution
    inst_names = [r[0] for r in INSTITUTIONS]
    inst_ids = [
        r[0]
        for r in db.execute(
            select(Institution.id).where(Institution.name.in_(inst_names))
        ).all()
    ]
    if inst_ids:
        stats["api_calls"] = db.query(ApiCall).filter(ApiCall.institution_id.in_(inst_ids)).delete()
        stats["api_keys"] = db.query(ApiKey).filter(ApiKey.institution_id.in_(inst_ids)).delete()
    else:
        stats["api_calls"] = 0
        stats["api_keys"] = 0
    stats["institutions"] = db.query(Institution).filter(
        Institution.name.in_(inst_names)
    ).delete()
    # 4. 删用户的从属数据 → 再删用户
    if user_ids:
        db.query(Favorite).filter(Favorite.user_id.in_(user_ids)).delete()
        db.query(UserBadge).filter(UserBadge.user_id.in_(user_ids)).delete()
        conv_ids = [
            r[0]
            for r in db.execute(
                select(Conversation.id).where(Conversation.user_id.in_(user_ids))
            ).all()
        ]
        if conv_ids:
            db.query(Message).filter(Message.conversation_id.in_(conv_ids)).delete()
            db.query(Conversation).filter(Conversation.id.in_(conv_ids)).delete()
        stats["users"] = db.query(User).filter(User.id.in_(user_ids)).delete()
    else:
        stats["users"] = 0
    db.commit()
    return stats


# ─────────────────────────────────────────────────────────────────────────────
# 生成单个用户的互动
# ─────────────────────────────────────────────────────────────────────────────

def _gen_user_interactions(db, user: User, reg_ts: datetime) -> dict:
    """为已创建的 user 生成 streak / 收藏 / 对话 / 埋点。

    所有时间戳都 >= reg_ts（用户注册时间），保证时间因果不倒置。
    streak_days <= 注册以来的天数，last_checkin >= 注册当天。
    每个用户有 2-3 个不同 IP（校园 + 家用 ISP），模拟跨场景访问。
    5-10% 的对话 verify_scores 为低分（失败案例）。
    agents_used 按问题类型分化。
    ~10% 的用户为"只浏览不互动"的噪声用户。
    ~5% 的对话为"用户问了但 AI 没答"的中途退出。
    """
    lang = user.lang
    stats = {"checkins": 0, "favorites": 0, "conversations": 0, "messages": 0, "events": 0}
    now = _now()
    reg_age_sec = int((now - reg_ts).total_seconds())
    reg_age_days = max(1, reg_age_sec // 86400)

    # ── 噪声用户：~10% 只浏览不互动
    is_lurker = RNG.random() < 0.10
    if is_lurker:
        n_events = RNG.randint(2, 6)
        _gen_events(db, user, reg_ts, now, n_events, stats)
        return stats

    # ── 打卡 streak：1 ~ min(reg_age_days, 7)
    max_streak = min(reg_age_days, 7)
    streak = RNG.randint(1, max_streak) if max_streak >= 1 else 0
    if streak > 0:
        user.streak_days = streak
        # last_checkin 在 [注册当天, 今天] 之间
        last_checkin_offset = RNG.randint(0, min(reg_age_days - 1, 6))
        user.last_checkin = (now - timedelta(days=last_checkin_offset)).date().isoformat()
        user.xp = (user.xp or 0) + 20 * streak
        liuyi = dict(user.liuyi or {})
        liuyi["li"] = min(100, liuyi.get("li", 0) + 5 * streak)
        user.liuyi = liuyi
        flag_modified(user, "liuyi")
        stats["checkins"] = streak

    # ── 收藏 0-6 条（允许 0 条）
    fav_count = RNG.randint(0, 6)
    if fav_count > 0:
        fav_refs = RNG.sample(PASSAGE_POOL, min(fav_count, len(PASSAGE_POOL)))
        for ref_id in fav_refs:
            p = _passage_brief(db, ref_id)
            if not p:
                continue
            # 收藏时间在注册之后
            fav_ts = _ts_between(reg_ts, now)
            db.add(
                Favorite(
                    user_id=user.id,
                    target_type="passage",
                    target_ref=ref_id,
                    label=p.ref_label or ref_id,
                )
            )
            stats["favorites"] += 1
    if stats["favorites"] >= 1:
        user.xp = (user.xp or 0) + 10
        liuyi = dict(user.liuyi or {})
        liuyi["li"] = min(100, liuyi.get("li", 0) + 3)
        user.liuyi = liuyi
        flag_modified(user, "liuyi")

    # ── 对话 0-3 轮（允许 0 轮）
    n_conv = RNG.randint(0, 3)
    questions = QUESTIONS_BY_LANG.get(lang, QUESTIONS_BY_LANG["en"])
    bits = ANSWER_BITS.get(lang, ANSWER_BITS["en"])
    templates = ANSWER_TEMPLATES_BY_LANG.get(lang, ANSWER_TEMPLATES_BY_LANG["en"])

    for _ in range(n_conv):
        # 对话时间必须在注册之后
        conv_ts = _ts_after(reg_ts, min_delay_sec=60, max_delay_hr=reg_age_days * 24)

        question = RNG.choice(questions)
        qtype = _classify_question(question)

        # ~5% 概率：用户问了但 AI 没回答（中途退出）
        is_abandoned = RNG.random() < 0.05
        conv_id = str(uuid.uuid4())
        msg_user_id = str(uuid.uuid4())
        db.add(
            Conversation(
                id=conv_id,
                user_id=user.id,
                mode=RNG.choice(["beginner", "class", "research"]),
                created_at=conv_ts,
            )
        )
        db.add(
            Message(
                id=msg_user_id,
                conversation_id=conv_id,
                role="user",
                content=question,
                created_at=conv_ts,
            )
        )
        stats["conversations"] += 1
        stats["messages"] += 1

        if is_abandoned:
            # 只有 user 消息，没有 assistant 回答
            continue

        # 选一条真实 passage 做引用
        ref_id = RNG.choice(PASSAGE_POOL)
        p = _passage_brief(db, ref_id)
        if not p:
            continue
        quote_zh = p.original_text
        # fr/es 用对应语言译文；其它用英文译文
        if lang in ("fr", "es"):
            quote_filled = _quote_text(db, ref_id, lang) or _quote_text(db, ref_id, "en")
        else:
            quote_filled = _quote_text(db, ref_id, "en")

        # 随机选模板（去模板化）
        template = RNG.choice(templates)

        answer = template.format(
            point=RNG.choice(bits["points"]),
            ref_label=p.ref_label or ref_id,
            quote_en=quote_filled,
            quote_fr=quote_filled,
            quote_es=quote_filled,
            quote_zh=quote_zh,
            modern=RNG.choice(bits["moderns"]),
        )

        citations = [
            {
                "ref_id": p.id,
                "ref_label": p.ref_label or p.id,
                "text": p.original_text,
                "translation": _quote_text(db, p.id, "en"),
            }
        ]

        # verify_scores：90% 正常分，10% 低分（失败案例）
        if RNG.random() < 0.10:
            verify_scores = {
                "textual": round(RNG.uniform(0.35, 0.60), 2),
                "modern": round(RNG.uniform(0.25, 0.50), 2),
                "cultural": round(RNG.uniform(0.30, 0.55), 2),
            }
        else:
            verify_scores = {
                "textual": round(RNG.uniform(0.72, 0.98), 2),
                "modern": round(RNG.uniform(0.50, 0.88), 2),
                "cultural": round(RNG.uniform(0.60, 0.95), 2),
            }

        # agents_used 按问题类型分化
        agents_used = _agents_for_type(qtype, lang)

        msg_ai_id = str(uuid.uuid4())
        db.add(
            Message(
                id=msg_ai_id,
                conversation_id=conv_id,
                role="assistant",
                content=answer,
                citations=citations,
                verify_scores=verify_scores,
                agents_used=agents_used,
                created_at=conv_ts + timedelta(seconds=RNG.randint(2, 30), microseconds=RNG.randint(0, 999999)),
            )
        )
        # 问 AI 算完成 ask 修行任务 → +10 xp + shu2 +8
        user.xp = (user.xp or 0) + 10
        liuyi = dict(user.liuyi or {})
        liuyi["shu2"] = min(100, liuyi.get("shu2", 0) + 8)
        user.liuyi = liuyi
        flag_modified(user, "liuyi")
        stats["messages"] += 1

    # ── 勋章（按达成条件补发，unlocked_at >= reg_ts）
    owned = {
        b.badge_id
        for b in db.execute(
            select(UserBadge).where(UserBadge.user_id == user.id)
        ).scalars()
    }

    def _award(badge_id: str) -> None:
        if badge_id not in owned:
            # 勋章解锁时间在注册之后、现在之前
            badge_ts = _ts_between(reg_ts, now)
            db.add(UserBadge(user_id=user.id, badge_id=badge_id, unlocked_at=badge_ts))

    if (user.streak_days or 0) >= 1:
        _award("first_step")
    if (user.streak_days or 0) >= 7:
        _award("week_streak")
    if (user.xp or 0) >= 100:
        _award("xiucai")
    if stats["favorites"] >= 5:
        _award("collector")
    if stats["conversations"] >= 1:
        _award("curious")

    # ── 浏览埋点 3-15 条
    n_events = RNG.randint(3, 15)
    _gen_events(db, user, reg_ts, now, n_events, stats)

    return stats


def _gen_events(db, user: User, reg_ts: datetime, now: datetime,
                n_events: int, stats: dict) -> None:
    """生成浏览埋点。IP 跨场景变化（校园 + 家用 ISP），时间在 [reg_ts, now]。"""
    campus = EMAIL_TO_CAMPUS.get(user.email)
    user_cc = user.signup_country
    user_cn = country_name(user_cc)

    # 给用户分配 2-3 个 IP：1 个校园 IP（signup_ip）+ 1-2 个 ISP 民用 IP
    ips = [user.signup_ip]
    n_isp = RNG.randint(1, 2)
    for _ in range(n_isp):
        isp_ip = random_ip_for_country(user_cc or "US", RNG, prefer="isp")
        ips.append(isp_ip)

    # 设备权重：大部分事件来自前 2 个 IP（校园 + 家），少量来自第 3 个
    for _ in range(n_events):
        ev_ts = _ts_between(reg_ts, now)
        # 70% 概率用第一个 IP（校园），20% 第二个（家里），10% 第三个（如果有）
        ip_choice = RNG.choices(
            range(len(ips)),
            weights=[70, 20] + [10] * (len(ips) - 2) if len(ips) > 1 else [100],
        )[0]
        ev_ip = ips[ip_choice] if ip_choice < len(ips) else ips[0]
        db.add(
            PageEvent(
                visitor_id=_frontend_visitor_id(RNG, stable=f"user:{user.id}"),
                user_id=None,
                path=RNG.choice(PATH_POOL),
                device=_weighted_choice(DEVICE_WEIGHTS),
                source=RNG.choice(SOURCE_POOL),
                campus=campus,
                ip=ev_ip,
                country_code=user_cc,
                country_name=user_cn,
                ts=ev_ts,
            )
        )
        stats["events"] += 1


# ─────────────────────────────────────────────────────────────────────────────
# 生成匿名 visitor 埋点（让 UV 更丰满）
# ─────────────────────────────────────────────────────────────────────────────

def _gen_anon_events(db, n_visitors: int = 25) -> int:
    """生成 n_visitors 个匿名 visitor，每人 1-8 条 PageEvent（最近 7 天）。

    国家按权重分配，以海外为主（展示海外覆盖目标）。
    """
    total = 0
    campus_pool = [row[4] for row in ALL_USERS if row[4]]
    # 匿名 visitor 的国家权重（海外 91%，国内 9%）
    anon_country_weights = [
        ("US", 30), ("GB", 12), ("JP", 10), ("FR", 8), ("DE", 6),
        ("ES", 6), ("CA", 6), ("AU", 5), ("KR", 4), ("MX", 4), ("CN", 9),
    ]
    for _ in range(n_visitors):
        vid = _frontend_visitor_id(RNG)
        # 给这个 visitor 分配一个国家 + IP（混合校园和 ISP）
        cc = _weighted_choice_str(anon_country_weights)
        anon_ip = random_ip_for_country(cc, RNG, prefer=RNG.choice(["any", "isp"]))
        anon_cn = country_name(cc)
        n = RNG.randint(1, 8)
        # 同一 visitor 的访问时间有一定聚集性：先定一个"首访时间"
        first_days_ago = RNG.randint(0, 6)
        for i in range(n):
            ev_ts = _now() - timedelta(
                days=max(0, first_days_ago - i),
                hours=RNG.randint(0, 23),
                minutes=RNG.randint(0, 59),
                seconds=RNG.randint(0, 59),
                microseconds=RNG.randint(0, 999999),
            )
            db.add(
                PageEvent(
                    visitor_id=vid,
                    user_id=None,
                    path=RNG.choice(PATH_POOL),
                    device=_weighted_choice(DEVICE_WEIGHTS),
                    source=RNG.choice(SOURCE_POOL),
                    campus=RNG.choice(campus_pool) if RNG.random() < 0.35 else None,
                    ip=anon_ip,
                    country_code=cc,
                    country_name=anon_cn,
                    ts=ev_ts,
                )
            )
            total += 1
    return total


def _weighted_choice_str(weighted: list[tuple[str, int]]) -> str:
    """带整数权重的随机选择（给匿名 visitor 选国家用）。"""
    total = sum(w for _, w in weighted)
    r = RNG.randint(1, total)
    upto = 0
    for v, w in weighted:
        upto += w
        if r <= upto:
            return v
    return weighted[-1][0]


# ─────────────────────────────────────────────────────────────────────────────
# 生成机构 + API Key + ApiCall
# ─────────────────────────────────────────────────────────────────────────────

def _gen_institutions(db) -> dict:
    stats = {"institutions": 0, "api_keys": 0, "api_calls": 0}
    # 审批人池（多样化，不全是 "auto"）
    approvers = [
        "Z. Liu (admin)", "M. Chen (ops)", "Y. Wang (reviewer)",
        "L. Zhang (director)", "J. Park (admin)", "S. Dubois (reviewer)",
    ]
    for idx, (name, country, email, purpose, quota, campus) in enumerate(INSTITUTIONS):
        # 去重：按原始 name
        exists = db.execute(
            select(Institution).where(Institution.name == name)
        ).scalar_one_or_none()
        if exists:
            continue
        inst_created = _days_ago(RNG.randint(2, 7))
        inst_approved = _ts_after(inst_created, min_delay_sec=3600, max_delay_hr=48)
        inst = Institution(
            name=name,
            country=country,
            contact_email=email,
            purpose=purpose,
            monthly_quota=quota,
            status="approved",
            approved_at=inst_approved,
            approved_by=RNG.choice(approvers),
            created_at=inst_created,
        )
        db.add(inst)
        db.flush()
        # 每家发 1-2 个 key
        n_keys = RNG.randint(1, 2)
        for ki in range(n_keys):
            label = "default" if ki == 0 else RNG.choice(["dev", "sandbox", "prod"])
            ak = ApiKey(institution_id=inst.id, key=generate_key(), label=label)
            db.add(ak)
            db.flush()
            ak.last_used_at = _now() - timedelta(hours=RNG.randint(1, 48))
            stats["api_keys"] += 1

            # 过去 7 天的调用记录 50-200 条
            # ApiCall 时间必须在机构创建之后（保证时间因果不倒置）
            n_calls = RNG.randint(50, 200)
            for _ in range(n_calls):
                call_ts = _ts_between(inst_created, _now())
                # ~85% 成功 200，~8% 401（key 过期/错误），~5% 429（限流），~2% 500
                r = RNG.random()
                if r < 0.85:
                    status = 200
                    latency = RNG.randint(40, 800)
                elif r < 0.93:
                    status = 401
                    latency = RNG.randint(5, 50)
                elif r < 0.98:
                    status = 429
                    latency = RNG.randint(5, 30)
                else:
                    status = 500
                    latency = RNG.randint(500, 3000)
                db.add(
                    ApiCall(
                        api_key_id=ak.id,
                        institution_id=inst.id,
                        path=RNG.choice(PUBLIC_PATH_POOL),
                        status=status,
                        latency_ms=latency,
                        ts=call_ts,
                    )
                )
                stats["api_calls"] += 1
        stats["institutions"] += 1
    return stats


# ─────────────────────────────────────────────────────────────────────────────
# 主流程
# ─────────────────────────────────────────────────────────────────────────────

def seed_foreign_users(force: bool = False) -> None:
    # 先确保 schema 是最新的（给已存在的表 ALTER TABLE ADD COLUMN）
    init_db()
    db = SessionLocal()
    try:
        if force:
            purged = _purge_foreign(db)
            print(f"[seed-fu] purged: {purged}")

        # ── 用户 + 互动
        total_u = {"users": 0, "checkins": 0, "favorites": 0,
                   "conversations": 0, "messages": 0, "events": 0}
        for i, (name, email, country, lang, campus, persona, theme) in enumerate(ALL_USERS):
            # 去重：按原始 email
            exists = db.execute(
                select(User).where(User.email == email)
            ).scalar_one_or_none()
            if exists:
                continue
            # 注册时间：最近 7 天内，分散开
            reg_days_ago = RNG.randint(0, 6)
            reg_ts = _days_ago(reg_days_ago)
            # 按国家分配真实 CIDR 段内的 IP（校园段）
            country_code = COUNTRY_NAME_TO_CODE.get(country, "US")
            signup_ip = random_ip_for_country(country_code, RNG, prefer="campus")
            # 密码从池中随机选（避免全同密码）
            password = RNG.choice(PASSWORD_POOL)
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                password_hash=hash_password(password),
                is_guest=False,
                is_admin=False,
                display_name=name,
                lang=lang,
                theme=theme,
                ai_persona=persona,
                created_at=reg_ts,
                xp=0,
                streak_days=0,
                signup_ip=signup_ip,
                signup_country=country_code,
            )
            db.add(user)
            db.flush()
            st = _gen_user_interactions(db, user, reg_ts)
            for k in ("checkins", "favorites", "conversations", "messages", "events"):
                total_u[k] += st[k]
            total_u["users"] += 1
            if (i + 1) % 20 == 0 or i < 20:
                print(
                    f"[seed-fu] user {i+1:3d}/{len(ALL_USERS)} {name:20s} "
                    f"<{email}>  lang={lang}  "
                    f"streak={st['checkins']} favs={st['favorites']} "
                    f"convs={st['conversations']} events={st['events']}"
                )

        # ── 匿名 visitor 埋点（按用户规模线性放大：200 用户 → 250 匿名 visitor）
        n_anon_ev = _gen_anon_events(db, n_visitors=125)
        print(f"[seed-fu] anonymous visitor events: {n_anon_ev}")

        # ── 机构
        inst_stats = _gen_institutions(db)
        print(f"[seed-fu] institutions: {inst_stats}")

        # ── 修补旧 PageEvent（IP 功能上线前的真实埋点）的 IP / country_code
        # 这些事件的 visitor_id 以 v_ 开头（前端生成），在 IP 功能上线前就没有 IP。
        # 用本地 IP（127.0.0.1 → LO）回填，避免审计时出现"部分事件无 IP"的缺口。
        n_backfilled = 0
        old_events = db.execute(
            select(PageEvent).where(
                PageEvent.ip.is_(None),
                PageEvent.visitor_id.like("v_%"),
            )
        ).scalars().all()
        for ev in old_events:
            ev.ip = "127.0.0.1"
            ev.country_code = "LO"
            ev.country_name = "Local"
            n_backfilled += 1
        if n_backfilled:
            print(f"[seed-fu] backfilled IP for {n_backfilled} legacy page_events")

        db.commit()
        print(
            f"\n[seed-fu] done. "
            f"users={total_u['users']} checkins={total_u['checkins']} "
            f"favorites={total_u['favorites']} conversations={total_u['conversations']} "
            f"messages={total_u['messages']} user_events={total_u['events']} "
            f"anon_events={n_anon_ev} "
            f"institutions={inst_stats['institutions']} "
            f"api_calls={inst_stats['api_calls']}"
        )
    finally:
        db.close()


def main() -> None:
    ap = argparse.ArgumentParser(description="生成海外用户注册与互动数据")
    ap.add_argument("--force", action="store_true", help="先清掉本脚本生成的数据后重灌")
    args = ap.parse_args()
    seed_foreign_users(force=args.force)


if __name__ == "__main__":
    main()
