"""Unit tests for confidence scoring boundary conditions and API error paths."""

import json
import threading
import unittest
import uuid
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen

import server


class ConfidenceBoundaryTest(unittest.TestCase):
    """Test confidence_for() edge cases directly against the DB."""

    @classmethod
    def setUpClass(cls):
        scratch = Path(__file__).resolve().parents[1] / ".test-data"
        scratch.mkdir(exist_ok=True)
        cls.db_path = scratch / f"confidence-{uuid.uuid4().hex}.sqlite3"
        server.DB_PATH = cls.db_path
        server.initialize()

    @classmethod
    def tearDownClass(cls):
        cls.db_path.unlink(missing_ok=True)

    def _insert_practice(self, market="JP", domain="Pay", category="test"):
        with server.db() as conn:
            cur = conn.execute(
                "INSERT INTO practices(market,domain,category,question) VALUES (?,?,?,?)",
                (market, domain, category, "test?"),
            )
            return cur.lastrowid

    def _insert_evidence(self, practice_id, domain="example.com", tier=2, stance="supports", published_on="2026-06-01"):
        with server.db() as conn:
            conn.execute(
                "INSERT INTO evidence(practice_id,source_name,url,domain,tier,stance,excerpt,published_on,checked_on)"
                " VALUES (?,?,?,?,?,?,?,?,?)",
                (practice_id, "Test Source", f"https://{domain}/x", domain, tier, stance, "x" * 20, published_on, "2026-10-01"),
            )

    def test_no_evidence_returns_research_candidate(self):
        pid = self._insert_practice(category="no-evidence")
        with server.db() as conn:
            score, status = server.confidence_for(conn, pid)
        self.assertEqual(score, 0)
        self.assertEqual(status, "Research candidate")

    def test_single_tier1_source_insufficient(self):
        pid = self._insert_practice(category="single-source")
        self._insert_evidence(pid, domain="gov.example", tier=1)
        with server.db() as conn:
            score, status = server.confidence_for(conn, pid)
        self.assertLessEqual(score, 59)
        self.assertEqual(status, "Insufficient evidence")

    def test_two_independent_tier1_sources_verified(self):
        pid = self._insert_practice(category="two-sources")
        self._insert_evidence(pid, domain="gov1.example", tier=1)
        self._insert_evidence(pid, domain="gov2.example", tier=1)
        with server.db() as conn:
            score, status = server.confidence_for(conn, pid)
        self.assertGreaterEqual(score, 60)
        self.assertEqual(status, "Verified")

    def test_contradicting_evidence_forces_conflicting(self):
        pid = self._insert_practice(category="conflicting")
        self._insert_evidence(pid, domain="gov1.example", tier=1, stance="supports")
        self._insert_evidence(pid, domain="gov2.example", tier=1, stance="contradicts")
        with server.db() as conn:
            score, status = server.confidence_for(conn, pid)
        self.assertLessEqual(score, 59)
        self.assertEqual(status, "Conflicting")

    def test_tier4_only_insufficient(self):
        pid = self._insert_practice(category="tier4-only")
        self._insert_evidence(pid, domain="vendor1.example", tier=4)
        self._insert_evidence(pid, domain="vendor2.example", tier=4)
        with server.db() as conn:
            score, status = server.confidence_for(conn, pid)
        self.assertEqual(status, "Insufficient evidence")

    def test_stale_evidence_reduces_freshness_score(self):
        pid = self._insert_practice(category="stale")
        self._insert_evidence(pid, domain="gov1.example", tier=1, published_on="2024-01-01")
        self._insert_evidence(pid, domain="gov2.example", tier=1, published_on="2024-01-01")
        with server.db() as conn:
            score, status = server.confidence_for(conn, pid)
        self.assertLessEqual(score, 85)

    def test_specific_population_gets_bonus(self):
        pid = self._insert_practice(category="specific-pop")
        self._insert_evidence(pid, domain="gov1.example", tier=1)
        self._insert_evidence(pid, domain="gov2.example", tier=1)
        with server.db() as conn:
            score, _ = server.confidence_for(conn, pid)
        self.assertGreaterEqual(score, 95)


class APIErrorPathTest(unittest.TestCase):
    """Test POST API error handling."""

    @classmethod
    def setUpClass(cls):
        scratch = Path(__file__).resolve().parents[1] / ".test-data"
        scratch.mkdir(exist_ok=True)
        cls.db_path = scratch / f"apierr-{uuid.uuid4().hex}.sqlite3"
        server.DB_PATH = cls.db_path
        server.initialize()
        cls.http = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.base = f"http://127.0.0.1:{cls.http.server_port}"
        cls.worker = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.worker.start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.worker.join(timeout=3)
        cls.db_path.unlink(missing_ok=True)

    def _post(self, path, data, content_type="application/json"):
        body = json.dumps(data).encode("utf-8")
        req = Request(self.base + path, data=body, method="POST")
        req.add_header("Content-Type", content_type)
        try:
            with urlopen(req, timeout=3) as resp:
                return resp.status, json.loads(resp.read())
        except Exception as e:
            if hasattr(e, "read"):
                return e.code, json.loads(e.read())
            raise

    def test_post_wrong_content_type_rejected(self):
        status, _ = self._post("/api/evidence", {}, content_type="text/plain")
        self.assertEqual(status, 415)

    def test_post_evidence_missing_fields(self):
        status, _ = self._post("/api/evidence", {"practice_id": 99999})
        self.assertEqual(status, 404)

    def test_post_evidence_invalid_url(self):
        with server.db() as conn:
            cur = conn.execute(
                "INSERT INTO practices(market,domain,category,question) VALUES ('JP','Pay','api-test','q?')"
            )
            pid = cur.lastrowid
        status, _ = self._post("/api/evidence", {
            "practice_id": pid,
            "url": "ftp://invalid.example.com",
            "tier": 2,
            "stance": "supports",
            "source_name": "Test",
            "excerpt": "x" * 20,
        })
        self.assertEqual(status, 400)

    def test_post_evidence_local_url_rejected(self):
        with server.db() as conn:
            cur = conn.execute(
                "INSERT INTO practices(market,domain,category,question) VALUES ('JP','Pay','api-test2','q?')"
            )
            pid = cur.lastrowid
        status, _ = self._post("/api/evidence", {
            "practice_id": pid,
            "url": "http://localhost:8765/x",
            "tier": 2,
            "stance": "supports",
            "source_name": "Test",
            "excerpt": "x" * 20,
        })
        self.assertEqual(status, 400)

    def test_post_vendor_missing_name(self):
        status, _ = self._post("/api/vendors", {"name": ""})
        self.assertEqual(status, 400)

    def test_post_vendor_capability_invalid_market(self):
        status, _ = self._post("/api/vendor-capability", {
            "vendor_id": 1, "market": "XX", "capability": "Tax", "status": "Confirmed",
        })
        self.assertEqual(status, 400)


if __name__ == "__main__":
    unittest.main()
