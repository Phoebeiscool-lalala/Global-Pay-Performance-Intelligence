import json
import threading
import unittest
import uuid
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen

import server


class Phase2Test(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        scratch = Path(__file__).resolve().parents[1] / ".test-data"
        scratch.mkdir(exist_ok=True)
        cls.db_path = scratch / f"phase2-{uuid.uuid4().hex}.sqlite3"
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

    def get(self, path):
        with urlopen(self.base + path, timeout=3) as response:
            return response.status, response.headers.get_content_type(), response.read()

    def test_phase2_schema_is_created(self):
        expected = {
            "company_archetypes", "regional_patterns", "regional_pattern_claims", "design_patterns",
            "context_profiles", "scenarios", "requirement_profiles", "vendor_fit_records",
            "rfi_questions", "market_signals", "signal_evidence",
            "regions", "countries", "sources", "claims", "facts", "claim_evidence",
            "regulations", "operational_requirements", "practice_requirements",
            "vendor_capability_evidence", "scenario_requirements", "decision_insights",
            "entity_relationships", "source_snapshots", "change_events", "affected_entities",
        }
        with server.db() as connection:
            actual = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertTrue(expected.issubset(actual))

    def test_readiness_gate_starts_closed(self):
        status, mime, body = self.get("/api/phase2/readiness")
        self.assertEqual((status, mime), (200, "application/json"))
        result = json.loads(body)
        self.assertFalse(result["ready_for_automated_phase2"])
        self.assertEqual(result["unknown_discipline"], "Missing values remain Unknown; no AI imputation.")

    def test_phase2_schema_endpoint_and_static_app(self):
        _, _, body = self.get("/api/phase2/schema")
        result = json.loads(body)
        self.assertIn("RegionalPattern", result["objects"])
        self.assertIn("Scenario", result["objects"])
        status, mime, html = self.get("/")
        self.assertEqual((status, mime), (200, "text/html"))
        page = html.decode("utf-8")
        for view in ("patterns", "design", "scenario", "vendorfit", "signals"):
            self.assertIn(f'id="view-{view}"', page)
        status, mime, body = self.get("/data/v2-demo.json")
        self.assertEqual((status, mime), (200, "application/json"))
        self.assertIn("claim-jp-payroll-control", body.decode("utf-8"))

    def test_v2_acceptance_demo(self):
        status, mime, body = self.get("/api/v2/demo/japan-retail")
        self.assertEqual((status, mime), (200, "application/json"))
        result = json.loads(body)
        self.assertEqual(result["context"]["country"], "JP")
        self.assertEqual(result["context"]["employee_count"], 300)
        capabilities = {item["capability"] for item in result["requirements"]}
        self.assertIn("Commission Management", capabilities)
        self.assertIn("Payroll Outsourcing", capabilities)
        self.assertEqual(len(result["options"]), 3)
        statuses = {item["fit_status"] for vendor in result["vendor_fit"] for item in vendor["requirements"]}
        self.assertIn("UNKNOWN", statuses)
        self.assertNotIn("BEST", json.dumps(result).upper())


if __name__ == "__main__":
    unittest.main()
