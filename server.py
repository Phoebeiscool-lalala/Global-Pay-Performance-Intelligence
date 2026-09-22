"""Local evidence-first prototype for Global Pay & Performance Intelligence.

No external research, LLM, scheduler, or authentication is implied by this server.
Bind only to loopback until those production controls exist.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("GPI_DB_PATH", ROOT / "intelligence.sqlite3"))
STATIC = ROOT / "static"
MARKETS = [
    ("JP", "日本", "Japan"),
    ("KR", "韩国", "South Korea"),
    ("HK", "中国香港", "Hong Kong"),
    ("TW", "中国台湾", "Taiwan"),
]
TOPICS = [
    ("Pay", "薪酬结构", "固定薪酬、津贴与可变薪酬如何构成？"),
    ("Pay", "薪酬调整", "调薪频率、时点及绩效关联如何体现？"),
    ("Pay", "浮动奖金", "奖金资格、目标与支付频率如何设定？"),
    ("Pay", "销售激励", "佣金门槛、加速器与离职处理如何设计？"),
    ("Performance", "绩效周期", "绩效回顾周期与持续反馈如何运作？"),
    ("Performance", "目标设定", "KPI、OKR 和团队目标如何组合？"),
    ("Performance", "评价与校准", "评分方法与跨团队校准如何实施？"),
    ("Pay for Performance", "绩效与回报", "绩效如何影响调薪、奖金与晋升？"),
]
CAPABILITIES = [
    "Payroll Processing", "Payroll Outsourcing", "Tax", "Statutory Reporting",
    "Compensation Consulting", "Salary Benchmark", "Incentive Design",
    "Performance Management", "Commission Management", "API Integration",
    "Local Team", "Managed Service",
]


@contextmanager
def db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys=ON")
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db() as connection:
        connection.executescript("""
        CREATE TABLE IF NOT EXISTS markets (
            code TEXT PRIMARY KEY, name_zh TEXT NOT NULL, name_en TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS practices (
            id INTEGER PRIMARY KEY, market TEXT NOT NULL REFERENCES markets(code),
            domain TEXT NOT NULL, category TEXT NOT NULL, question TEXT NOT NULL,
            claim TEXT NOT NULL DEFAULT '', population TEXT NOT NULL DEFAULT 'General',
            industry TEXT NOT NULL DEFAULT 'All', company_size TEXT NOT NULL DEFAULT 'Unknown',
            prevalence TEXT NOT NULL DEFAULT 'Unknown', status TEXT NOT NULL DEFAULT 'Research candidate',
            confidence INTEGER NOT NULL DEFAULT 0, last_verified TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(market, domain, category, population, industry)
        );
        CREATE TABLE IF NOT EXISTS evidence (
            id INTEGER PRIMARY KEY, practice_id INTEGER NOT NULL REFERENCES practices(id),
            source_name TEXT NOT NULL, url TEXT NOT NULL, domain TEXT NOT NULL,
            tier INTEGER NOT NULL CHECK(tier BETWEEN 1 AND 5),
            stance TEXT NOT NULL CHECK(stance IN ('supports','contradicts','context')),
            excerpt TEXT NOT NULL, published_on TEXT, checked_on TEXT NOT NULL,
            population TEXT NOT NULL DEFAULT 'General',
            UNIQUE(practice_id, url)
        );
        CREATE TABLE IF NOT EXISTS vendors (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, hq TEXT NOT NULL DEFAULT '',
            website TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS vendor_capabilities (
            vendor_id INTEGER NOT NULL REFERENCES vendors(id), market TEXT NOT NULL REFERENCES markets(code),
            capability TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN
                ('Confirmed','Vendor Claimed','Third-party Confirmed','Unknown','Conflicting')),
            source_url TEXT NOT NULL DEFAULT '', checked_on TEXT,
            PRIMARY KEY(vendor_id, market, capability)
        );
        CREATE TABLE IF NOT EXISTS claim_history (
            id INTEGER PRIMARY KEY, practice_id INTEGER NOT NULL REFERENCES practices(id),
            old_claim TEXT NOT NULL, new_claim TEXT NOT NULL,
            old_confidence INTEGER NOT NULL, new_confidence INTEGER NOT NULL,
            reason TEXT NOT NULL, changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_practice_market ON practices(market, domain);
        CREATE INDEX IF NOT EXISTS idx_evidence_practice ON evidence(practice_id);
        """)
        connection.executemany("INSERT OR IGNORE INTO markets VALUES (?,?,?)", MARKETS)
        connection.executemany(
            "INSERT OR IGNORE INTO practices(market,domain,category,question) VALUES (?,?,?,?)",
            [(market, domain, category, question)
             for market, _, _ in MARKETS for domain, category, question in TOPICS],
        )


def rows(cursor: sqlite3.Cursor) -> list[dict]:
    return [dict(row) for row in cursor.fetchall()]


def confidence_for(connection: sqlite3.Connection, practice_id: int) -> tuple[int, str]:
    items = rows(connection.execute("SELECT * FROM evidence WHERE practice_id=?", (practice_id,)))
    # Tier 4 vendor material and Tier 5 UGC cannot establish a market practice.
    supporting = [e for e in items if e["stance"] == "supports" and e["tier"] <= 3]
    contradicting = [e for e in items if e["stance"] == "contradicts" and e["tier"] <= 3]
    independent = {e["domain"] for e in supporting}
    if not items:
        return 0, "Research candidate"
    if contradicting:
        return min(59, 15 + 12 * len(independent)), "Conflicting"
    if not supporting:
        return 0, "Insufficient evidence"
    # Transparent provisional score; never call a single source independently verified.
    source_quality = 30 if any(e["tier"] <= 2 for e in supporting) else 18
    source_count = 25 if len(independent) >= 2 else 8
    consistency = 20 if len(independent) >= 2 else 5
    dated = [e["published_on"] for e in supporting if e["published_on"]]
    age = max((date.today() - date.fromisoformat(day)).days for day in dated) if dated else None
    freshness = 15 if age is not None and age <= 180 else 8 if age is not None and age <= 365 else 0
    specificity = 10 if any(e["population"] != "General" for e in supporting) else 5
    score = source_quality + source_count + consistency + freshness + specificity
    if len(independent) < 2:
        return min(score, 59), "Insufficient evidence"
    return score, "Verified" if score >= 60 else "Needs review"


def practice_list(connection: sqlite3.Connection, market: str = "", domain: str = "") -> list[dict]:
    sql = """SELECT p.*, (SELECT COUNT(*) FROM evidence e WHERE e.practice_id=p.id) AS evidence_count
             FROM practices p WHERE (?='' OR p.market=?) AND (?='' OR p.domain=?)
             ORDER BY p.market,p.id"""
    return rows(connection.execute(sql, (market, market, domain, domain)))


def overview(connection: sqlite3.Connection) -> dict:
    practices = practice_list(connection)
    return {
        "markets": [dict(row) for row in connection.execute("SELECT * FROM markets")],
        "total": len(practices),
        "verified": sum(p["status"] == "Verified" for p in practices),
        "review": sum(p["status"] in ("Insufficient evidence", "Needs review", "Conflicting") for p in practices),
        "sources": connection.execute("SELECT COUNT(*) FROM evidence").fetchone()[0],
        "vendors": connection.execute("SELECT COUNT(*) FROM vendors").fetchone()[0],
        "refreshed": datetime.now(timezone.utc).date().isoformat(),
    }


def validate_url(value: str) -> tuple[str, str]:
    parsed = urlparse(value)
    if parsed.scheme not in ("https", "http") or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("请输入公开的 http(s) 来源链接")
    hostname = parsed.hostname.lower()
    if hostname in ("localhost", "127.0.0.1", "::1") or hostname.endswith(".local"):
        raise ValueError("不接受本地地址")
    return value, hostname.removeprefix("www.")


class Handler(BaseHTTPRequestHandler):
    server_version = "GPIPrototype/0.1"

    def send_json(self, value: object, status: int = 200) -> None:
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path, query = parsed.path, parse_qs(parsed.query)
        try:
            with db() as connection:
                if path == "/api/overview":
                    return self.send_json(overview(connection))
                if path == "/api/practices":
                    return self.send_json(practice_list(connection, query.get("market", [""])[0], query.get("domain", [""])[0]))
                if re.fullmatch(r"/api/practices/\d+", path):
                    identifier = int(path.rsplit("/", 1)[1])
                    item = connection.execute("SELECT * FROM practices WHERE id=?", (identifier,)).fetchone()
                    if not item:
                        return self.send_json({"error": "记录不存在"}, 404)
                    result = dict(item)
                    result["evidence"] = rows(connection.execute(
                        "SELECT * FROM evidence WHERE practice_id=? ORDER BY checked_on DESC,id DESC", (identifier,)))
                    result["history"] = rows(connection.execute(
                        "SELECT * FROM claim_history WHERE practice_id=? ORDER BY id DESC", (identifier,)))
                    return self.send_json(result)
                if path == "/api/compare":
                    codes = [c for c in query.get("markets", ["JP,KR"])[0].split(",") if c in {m[0] for m in MARKETS}]
                    records = practice_list(connection)
                    return self.send_json({"markets": codes[:4], "rows": [
                        {"domain": domain, "category": category,
                         "cells": {market: next((p for p in records if p["market"] == market and
                          p["domain"] == domain and p["category"] == category), None) for market in codes[:4]}}
                        for domain, category, _ in TOPICS]})
                if path == "/api/vendors":
                    vendors = rows(connection.execute("SELECT * FROM vendors ORDER BY name"))
                    for vendor in vendors:
                        vendor["capabilities"] = rows(connection.execute(
                            "SELECT market,capability,status,source_url,checked_on FROM vendor_capabilities WHERE vendor_id=?",
                            (vendor["id"],)))
                    return self.send_json(vendors)
                if path == "/api/changes":
                    return self.send_json(rows(connection.execute("""
                        SELECT h.*,p.market,p.domain,p.category FROM claim_history h
                        JOIN practices p ON p.id=h.practice_id ORDER BY h.id DESC LIMIT 50""")))
                if path == "/api/ask":
                    term = query.get("q", [""])[0].strip()[:100]
                    verified = [p for p in practice_list(connection) if p["status"] == "Verified"]
                    matched = [p for p in verified if term and any(
                        token.casefold() in " ".join([p["claim"], p["category"], p["market"]]).casefold()
                        for token in term.split() if len(token) > 1)][:5]
                    return self.send_json({"query": term, "results": matched,
                        "message": "仅检索已核验的内部情报；当前没有足够证据回答。" if not matched else
                                   "以下是已核验记录，请展开查看原始证据与适用范围。"})
            if path == "/" or path in ("/index.html", "/app.js", "/styles.css"):
                name = "index.html" if path == "/" else path.lstrip("/")
                content = (STATIC / name).read_bytes()
                mime = "text/html" if name.endswith("html") else "text/css" if name.endswith("css") else "text/javascript"
                self.send_response(200)
                self.send_header("Content-Type", mime + "; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                return self.wfile.write(content)
            self.send_json({"error": "Not found"}, 404)
        except Exception as exc:
            self.send_json({"error": str(exc)}, 500)

    def do_POST(self) -> None:
        origin = self.headers.get("Origin", "")
        if origin and origin != f"http://{self.headers.get('Host')}":
            return self.send_json({"error": "Origin not allowed"}, 403)
        if self.headers.get("Content-Type", "").split(";", 1)[0] != "application/json":
            return self.send_json({"error": "JSON required"}, 415)
        length = int(self.headers.get("Content-Length", "0"))
        if length > 65536 or length <= 0:
            return self.send_json({"error": "Invalid request size"}, 413)
        try:
            payload = json.loads(self.rfile.read(length))
            with db() as connection:
                if self.path == "/api/evidence":
                    practice_id = int(payload.get("practice_id", 0))
                    record = connection.execute("SELECT * FROM practices WHERE id=?", (practice_id,)).fetchone()
                    if not record:
                        return self.send_json({"error": "记录不存在"}, 404)
                    url, domain = validate_url(str(payload.get("url", "")).strip())
                    tier = int(payload.get("tier", 0))
                    stance = payload.get("stance")
                    if tier not in range(1, 6) or stance not in ("supports", "contradicts", "context"):
                        raise ValueError("来源层级或证据方向无效")
                    name = str(payload.get("source_name", "")).strip()[:120]
                    excerpt = str(payload.get("excerpt", "")).strip()[:2000]
                    if not name or len(excerpt) < 15:
                        raise ValueError("请填写来源名称及至少 15 字的原文摘录")
                    published = str(payload.get("published_on", "")).strip() or None
                    if published:
                        if date.fromisoformat(published) > date.today():
                            raise ValueError("发布日期不能晚于今天")
                    connection.execute("""INSERT INTO evidence(practice_id,source_name,url,domain,tier,stance,
                        excerpt,published_on,checked_on,population) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                        (practice_id, name, url, domain, tier, stance, excerpt, published,
                         date.today().isoformat(), str(payload.get("population", "General"))[:80]))
                    score, status = confidence_for(connection, practice_id)
                    if status == "Verified" and not record["claim"]:
                        status = "Ready to publish"
                    connection.execute("UPDATE practices SET confidence=?,status=?,last_verified=? WHERE id=?",
                                       (score, status, date.today().isoformat(), practice_id))
                    return self.send_json({"confidence": score, "status": status}, 201)
                if self.path == "/api/vendors":
                    name = str(payload.get("name", "")).strip()[:120]
                    if not name:
                        raise ValueError("供应商名称不能为空")
                    website = str(payload.get("website", "")).strip()
                    if website:
                        validate_url(website)
                    cursor = connection.execute("INSERT INTO vendors(name,hq,website,notes) VALUES (?,?,?,?)",
                        (name, str(payload.get("hq", ""))[:80], website, str(payload.get("notes", ""))[:500]))
                    return self.send_json({"id": cursor.lastrowid}, 201)
                if self.path == "/api/vendor-capability":
                    vendor_id = int(payload.get("vendor_id", 0))
                    market, capability, status = (payload.get(k) for k in ("market", "capability", "status"))
                    if not connection.execute("SELECT 1 FROM vendors WHERE id=?", (vendor_id,)).fetchone():
                        raise ValueError("供应商不存在")
                    if market not in {m[0] for m in MARKETS} or capability not in CAPABILITIES or status not in (
                        "Confirmed", "Vendor Claimed", "Third-party Confirmed", "Unknown", "Conflicting"):
                        raise ValueError("市场、能力或状态无效")
                    source_url = str(payload.get("source_url", "")).strip()
                    if status != "Unknown" and not source_url:
                        raise ValueError("非 Unknown 状态必须提供来源")
                    if source_url:
                        validate_url(source_url)
                    connection.execute("""INSERT INTO vendor_capabilities VALUES (?,?,?,?,?,?)
                        ON CONFLICT(vendor_id,market,capability) DO UPDATE SET
                        status=excluded.status,source_url=excluded.source_url,checked_on=excluded.checked_on""",
                        (vendor_id, market, capability, status, source_url, date.today().isoformat()))
                    return self.send_json({"ok": True}, 201)
                if self.path == "/api/practice-claim":
                    practice_id = int(payload.get("practice_id", 0))
                    item = connection.execute("SELECT * FROM practices WHERE id=?", (practice_id,)).fetchone()
                    if not item:
                        return self.send_json({"error": "记录不存在"}, 404)
                    claim = str(payload.get("claim", "")).strip()[:1000]
                    reason = str(payload.get("reason", "")).strip()[:300]
                    if not claim or not reason:
                        raise ValueError("请填写结论及变更原因")
                    score, status = confidence_for(connection, practice_id)
                    if status != "Verified":
                        raise ValueError("需要至少两个独立来源且达到可信度阈值，才能发布结论")
                    connection.execute("""INSERT INTO claim_history(practice_id,old_claim,new_claim,
                        old_confidence,new_confidence,reason) VALUES (?,?,?,?,?,?)""",
                        (practice_id, item["claim"], claim, item["confidence"], score, reason))
                    connection.execute("UPDATE practices SET claim=?,status=?,confidence=?,last_verified=? WHERE id=?",
                        (claim, status, score, date.today().isoformat(), practice_id))
                    return self.send_json({"ok": True}, 201)
            return self.send_json({"error": "Not found"}, 404)
        except (ValueError, KeyError, sqlite3.IntegrityError, json.JSONDecodeError) as exc:
            return self.send_json({"error": str(exc)}, 400)
        except Exception as exc:
            return self.send_json({"error": str(exc)}, 500)


def main() -> None:
    initialize()
    port = int(os.environ.get("PORT", "8765"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Global Pay Intelligence: http://127.0.0.1:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
