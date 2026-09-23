import unittest
from datetime import date

from models import ClaimType, EvidenceItem, EvidenceStatus, ScenarioContext, Source
from services.evidence_engine import assess_evidence
from services.scenario_engine import build_options, build_requirements
from services.vendor_fit_engine import match_vendor


class V2EngineTest(unittest.TestCase):
    def test_market_claim_requires_independent_evidence(self):
        official = Source("official", "Official", "GOVERNMENT", 5, True, True, False,
                          "https://example.gov", last_verified="2026-09-20")
        independent = Source("research", "Research", "INDEPENDENT_RESEARCH", 3, False, True, False,
                             "https://example.org", last_verified="2026-09-16")
        result = assess_evidence([
            EvidenceItem("e1", official, ClaimType.MARKET_PRACTICE, "supports", 5, 4),
            EvidenceItem("e2", independent, ClaimType.MARKET_PRACTICE, "supports", 4, 3),
        ], date(2026, 9, 23))
        self.assertEqual(result.status, EvidenceStatus.VERIFIED)
        self.assertEqual(result.independent_sources, 2)

    def test_vendor_first_party_is_supported_not_independent(self):
        vendor = Source("vendor", "Vendor docs", "VENDOR_PRODUCT_DOCUMENTATION", 4, True, False, True,
                        "https://vendor.example", last_verified="2026-09-20")
        result = assess_evidence([
            EvidenceItem("e1", vendor, ClaimType.VENDOR_CAPABILITY, "supports", 5, 4),
        ], date(2026, 9, 23))
        self.assertEqual(result.status, EvidenceStatus.SUPPORTED)
        self.assertEqual(result.independent_sources, 0)

    def test_japan_retail_scenario_to_vendor_fit(self):
        context = ScenarioContext("JP", 300, "Retail", "Monthly", "Medium", True, 2,
                                  "Preferred", "Local statutory + regional", "HRIS + Finance", "High")
        requirements = build_requirements(context)
        capabilities = {item.capability for item in requirements}
        self.assertIn("Commission Management", capabilities)
        self.assertIn("Off-cycle Payroll", capabilities)
        self.assertEqual(len(build_options(context, requirements)), 3)
        results = match_vendor(requirements, {
            "name": "Vendor A",
            "capabilities": {"Payroll Processing": {"status": "CONFIRMED"}},
        })
        self.assertTrue(any(item.fit_status.value == "FIT" for item in results))
        self.assertTrue(any(item.fit_status.value == "UNKNOWN" for item in results))


if __name__ == "__main__":
    unittest.main()
