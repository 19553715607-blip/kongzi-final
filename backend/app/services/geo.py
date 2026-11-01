"""IP → 国家解析（原型级，生产换 GeoIP）。

原型阶段用内置 CIDR 映射表覆盖生成脚本会用到的海外大学 IP 段；
未命中的 IP 返回 (None, None)。

生产应替换为 MaxMind GeoLite2（geoip2 + GeoLite2-Country.mmdb）或
ip-api.com HTTP 兜底——接口签名 `ip_to_country(ip) -> (code, name)` 不变。
"""
from __future__ import annotations

import ipaddress
import random
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# CIDR → (country_code, country_name) 映射表
# 覆盖 seed_foreign_users.py 用到的海外大学 IP 段（真实分配，便于演示可信）
# ─────────────────────────────────────────────────────────────────────────────

_CIDR_MAP: list[tuple[ipaddress.IPv4Network, str, str]] = [
    # ── United States ──
    (ipaddress.ip_network("18.0.0.0/8"),       "US", "United States"),   # MIT
    (ipaddress.ip_network("128.103.0.0/16"),   "US", "United States"),   # Harvard
    (ipaddress.ip_network("128.36.0.0/16"),    "US", "United States"),   # Yale
    (ipaddress.ip_network("171.64.0.0/16"),    "US", "United States"),   # Stanford
    (ipaddress.ip_network("128.112.0.0/16"),   "US", "United States"),   # Princeton
    (ipaddress.ip_network("128.59.0.0/16"),    "US", "United States"),   # Columbia
    (ipaddress.ip_network("128.84.0.0/16"),    "US", "United States"),   # Cornell
    (ipaddress.ip_network("128.32.0.0/16"),    "US", "United States"),   # Berkeley
    (ipaddress.ip_network("128.135.0.0/16"),   "US", "United States"),   # Chicago
    (ipaddress.ip_network("128.91.0.0/16"),    "US", "United States"),   # UPenn
    (ipaddress.ip_network("129.105.0.0/16"),   "US", "United States"),   # Northwestern
    (ipaddress.ip_network("152.3.0.0/16"),     "US", "United States"),   # Duke
    (ipaddress.ip_network("128.220.0.0/16"),   "US", "United States"),   # JHU
    (ipaddress.ip_network("128.122.0.0/16"),   "US", "United States"),   # NYU
    (ipaddress.ip_network("131.179.0.0/16"),   "US", "United States"),   # UCLA
    (ipaddress.ip_network("141.211.0.0/16"),   "US", "United States"),   # Umich
    # ── United Kingdom ──
    (ipaddress.ip_network("163.1.0.0/16"),     "GB", "United Kingdom"),  # Oxford
    (ipaddress.ip_network("131.111.0.0/16"),   "GB", "United Kingdom"),  # Cambridge
    (ipaddress.ip_network("129.215.0.0/16"),   "GB", "United Kingdom"),  # Edinburgh
    (ipaddress.ip_network("130.88.0.0/16"),    "GB", "United Kingdom"),  # Manchester
    (ipaddress.ip_network("128.40.0.0/16"),    "GB", "United Kingdom"),  # UCL
    (ipaddress.ip_network("137.73.0.0/16"),    "GB", "United Kingdom"),  # KCL / LSE / etc.
    # ── Canada ──
    (ipaddress.ip_network("128.100.0.0/16"),   "CA", "Canada"),          # Toronto
    (ipaddress.ip_network("142.103.0.0/16"),   "CA", "Canada"),          # UBC
    (ipaddress.ip_network("132.206.0.0/16"),   "CA", "Canada"),          # McGill
    # ── Australia ──
    (ipaddress.ip_network("128.250.0.0/16"),   "AU", "Australia"),       # Melbourne
    (ipaddress.ip_network("129.78.0.0/16"),    "AU", "Australia"),       # Sydney
    (ipaddress.ip_network("130.56.0.0/16"),    "AU", "Australia"),       # ANU
    # ── Japan ──
    (ipaddress.ip_network("130.69.0.0/16"),    "JP", "Japan"),           # Tokyo
    (ipaddress.ip_network("130.54.0.0/16"),    "JP", "Japan"),           # Kyoto
    (ipaddress.ip_network("133.1.0.0/16"),     "JP", "Japan"),           # Osaka
    # ── South Korea ──
    (ipaddress.ip_network("147.46.0.0/16"),    "KR", "South Korea"),     # SNU
    (ipaddress.ip_network("143.248.0.0/16"),   "KR", "South Korea"),     # KAIST
    # ── France ──
    (ipaddress.ip_network("194.167.0.0/16"),   "FR", "France"),          # Sciences Po / RENATER
    (ipaddress.ip_network("199.7.0.0/16"),     "FR", "France"),          # ENS
    # ── Germany ──
    (ipaddress.ip_network("141.20.0.0/16"),    "DE", "Germany"),         # Humboldt
    (ipaddress.ip_network("131.159.0.0/16"),   "DE", "Germany"),         # TUM
    # ── Spain ──
    (ipaddress.ip_network("147.96.0.0/16"),    "ES", "Spain"),           # Complutense
    # ── Mexico ──
    (ipaddress.ip_network("132.248.0.0/16"),   "MX", "Mexico"),          # UNAM
    # ── ISP 民用段（让非校园 IP 也能被识别到国家）──
    # US: Comcast / AT&T / Verizon / Spectrum
    (ipaddress.ip_network("73.0.0.0/8"),        "US", "United States"),
    (ipaddress.ip_network("75.0.0.0/8"),        "US", "United States"),
    (ipaddress.ip_network("76.0.0.0/8"),        "US", "United States"),
    (ipaddress.ip_network("99.0.0.0/8"),        "US", "United States"),
    (ipaddress.ip_network("108.0.0.0/8"),       "US", "United States"),
    (ipaddress.ip_network("174.0.0.0/8"),       "US", "United States"),
    # GB: BT / Sky / Virgin Media
    (ipaddress.ip_network("86.128.0.0/10"),     "GB", "United Kingdom"),
    (ipaddress.ip_network("92.0.0.0/8"),        "GB", "United Kingdom"),
    (ipaddress.ip_network("151.224.0.0/11"),    "GB", "United Kingdom"),
    # CA: Bell / Rogers / Telus
    (ipaddress.ip_network("70.0.0.0/8"),        "CA", "Canada"),
    (ipaddress.ip_network("99.224.0.0/11"),     "CA", "Canada"),
    (ipaddress.ip_network("207.219.0.0/16"),    "CA", "Canada"),
    # AU: Telstra / Optus / TPG
    (ipaddress.ip_network("1.120.0.0/13"),      "AU", "Australia"),
    (ipaddress.ip_network("58.6.0.0/15"),       "AU", "Australia"),
    (ipaddress.ip_network("110.142.0.0/16"),    "AU", "Australia"),
    # JP: NTT / SoftBank / KDDI
    (ipaddress.ip_network("126.0.0.0/8"),       "JP", "Japan"),
    (ipaddress.ip_network("153.120.0.0/13"),    "JP", "Japan"),
    (ipaddress.ip_network("211.0.0.0/8"),       "JP", "Japan"),
    # KR: KT / SK Broadband / LG U+
    (ipaddress.ip_network("59.0.0.0/8"),        "KR", "South Korea"),
    (ipaddress.ip_network("112.160.0.0/11"),    "KR", "South Korea"),
    (ipaddress.ip_network("175.192.0.0/10"),    "KR", "South Korea"),
    # FR: Orange / Free / SFR / Bouygues
    (ipaddress.ip_network("90.0.0.0/8"),        "FR", "France"),
    (ipaddress.ip_network("92.88.0.0/13"),      "FR", "France"),
    (ipaddress.ip_network("176.128.0.0/9"),     "FR", "France"),
    (ipaddress.ip_network("212.27.32.0/19"),    "FR", "France"),
    # DE: Deutsche Telekom / Vodafone / 1&1
    (ipaddress.ip_network("84.128.0.0/10"),     "DE", "Germany"),
    (ipaddress.ip_network("91.0.0.0/8"),        "DE", "Germany"),
    (ipaddress.ip_network("188.192.0.0/10"),    "DE", "Germany"),
    # ES: Movistar / Orange ES / Vodafone ES
    (ipaddress.ip_network("83.32.0.0/11"),      "ES", "Spain"),
    (ipaddress.ip_network("88.0.0.0/8"),        "ES", "Spain"),
    (ipaddress.ip_network("213.96.0.0/12"),     "ES", "Spain"),
    # MX: Telmex / AT&T MX
    (ipaddress.ip_network("189.128.0.0/9"),     "MX", "Mexico"),
    (ipaddress.ip_network("200.57.0.0/16"),     "MX", "Mexico"),
    # ── China（本平台自身 + 国内访客，便于本地开发 IP 也被识别）──
    (ipaddress.ip_network("111.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("112.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("113.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("114.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("115.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("116.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("117.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("118.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("119.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("120.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("121.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("122.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("123.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("125.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("180.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("182.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("183.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("202.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("203.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("210.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("211.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("218.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("219.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("220.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("221.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("222.0.0.0/8"),      "CN", "China"),
    (ipaddress.ip_network("223.0.0.0/8"),      "CN", "China"),
    # ── 本地开发 / 容器内网 ──
    (ipaddress.ip_network("127.0.0.0/8"),      "LO", "Local"),
    (ipaddress.ip_network("10.0.0.0/8"),       "LO", "Local"),
    (ipaddress.ip_network("172.16.0.0/12"),    "LO", "Local"),
    (ipaddress.ip_network("192.168.0.0/16"),   "LO", "Local"),
]

# country_code → country_name 的快速查找
_CODE_TO_NAME: dict[str, str] = {}
for _net, _code, _name in _CIDR_MAP:
    _CODE_TO_NAME.setdefault(_code, _name)


def ip_to_country(ip: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """解析 IP → (country_code, country_name)。未命中或无效返回 (None, None)。"""
    if not ip:
        return None, None
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        # 可能是 "ip:port" 形式
        if ":" in ip:
            ip = ip.rsplit(":", 1)[0]
            try:
                addr = ipaddress.ip_address(ip)
            except ValueError:
                return None, None
        else:
            return None, None
    for net, code, name in _CIDR_MAP:
        if addr in net:
            return code, name
    return None, None


def country_name(code: Optional[str]) -> Optional[str]:
    """country_code → country_name。"""
    if not code:
        return None
    return _CODE_TO_NAME.get(code)


# ─────────────────────────────────────────────────────────────────────────────
# 随机 IP 生成（给 seed 脚本用：按 country_code 在对应 CIDR 段内随机取 IP）
# ─────────────────────────────────────────────────────────────────────────────

# country_code → 可用的 CIDR 段列表（生成时按国家挑一段再随机一个 host）
_COUNTRY_CIDRS: dict[str, list[ipaddress.IPv4Network]] = {}
for _net, _code, _name in _CIDR_MAP:
    _COUNTRY_CIDRS.setdefault(_code, []).append(_net)

# 标记哪些 CIDR 是"校园段"（/16 及更窄的大网段），其余视为 ISP 民用段
# 简单判定：prefixlen >= 16 的是校园段（大学通常用 /16），< 16 的是大范围 ISP 段
_UNIV_NETS: set[int] = set()
for _net, _code, _name in _CIDR_MAP:
    if _net.prefixlen >= 16 and _code not in ("CN", "LO"):
        _UNIV_NETS.add(id(_net))


def random_ip_for_country(code: str, rng: random.Random, prefer: str = "any") -> str:
    """在 country_code 对应的 CIDR 段内随机生成一个 IP。

    prefer:
      "any"     — 从全部段中随机选（默认）
      "campus"  — 优先校园段（/16 及更窄）
      "isp"     — 优先 ISP 民用段（大范围 /8 /9 /10 /11 /12 /13）
    """
    nets = _COUNTRY_CIDRS.get(code)
    if not nets:
        nets = _COUNTRY_CIDRS.get("US", [ipaddress.ip_network("128.103.0.0/16")])
    if prefer == "campus":
        filtered = [n for n in nets if n.prefixlen >= 16]
        net = rng.choice(filtered) if filtered else rng.choice(nets)
    elif prefer == "isp":
        filtered = [n for n in nets if n.prefixlen < 16]
        net = rng.choice(filtered) if filtered else rng.choice(nets)
    else:
        net = rng.choice(nets)
    host_int = rng.randint(int(net.network_address) + 1, int(net.broadcast_address) - 1)
    return str(ipaddress.IPv4Address(host_int))
