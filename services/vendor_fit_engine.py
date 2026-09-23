"""Requirement-level vendor fit matching. No total score or recommendation."""

from __future__ import annotations

from models import EvidenceStatus, FitStatus, OperationalRequirement, VendorFitResult


def match_vendor(requirements: list[OperationalRequirement], vendor: dict) -> list[VendorFitResult]:
    capabilities = vendor.get("capabilities", {})
    results: list[VendorFitResult] = []
    for requirement in requirements:
        record = capabilities.get(requirement.capability)
        if not record:
            fit, evidence = FitStatus.UNKNOWN, EvidenceStatus.INSUFFICIENT
            gaps = ("No evidence-backed capability record is available.",)
        elif record["status"] in {"CONFIRMED", "THIRD_PARTY_CONFIRMED"}:
            fit, evidence, gaps = FitStatus.FIT, EvidenceStatus.VERIFIED, ()
        elif record["status"] == "VENDOR_CLAIMED":
            fit, evidence = FitStatus.PARTIAL_FIT, EvidenceStatus.SUPPORTED
            gaps = ("Independent validation is still required.",)
        elif record["status"] == "NOT_SUPPORTED":
            fit, evidence = FitStatus.GAP, EvidenceStatus.VERIFIED
            gaps = ("The capability is explicitly not covered.",)
        else:
            fit, evidence = FitStatus.UNKNOWN, EvidenceStatus.INSUFFICIENT
            gaps = ("Capability coverage remains unknown.",)
        results.append(VendorFitResult(
            vendor["name"], requirement.id, requirement.capability, fit, evidence,
            strengths=(requirement.name,) if fit == FitStatus.FIT else (), gaps=gaps,
            trade_offs=("Fit status describes evidence coverage, not vendor suitability.",),
        ))
    return results

