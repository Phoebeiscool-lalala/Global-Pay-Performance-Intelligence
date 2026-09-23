"""Context-sensitive evidence assessment.

The numeric score is an explainability detail, never a statistical probability.
"""

from __future__ import annotations

from datetime import date

from models import ClaimType, EvidenceAssessment, EvidenceItem, EvidenceStatus, QualityBand


def _age_days(value: str | None, today: date) -> int | None:
    if not value:
        return None
    return (today - date.fromisoformat(value)).days


def _authority(item: EvidenceItem) -> int:
    source = item.source
    base = max(0, min(5, source.authority_level)) * 4
    if item.claim_type == ClaimType.REGULATION:
        return min(25, base + (5 if source.is_first_party and source.source_type == "GOVERNMENT" else -5))
    if item.claim_type == ClaimType.VENDOR_CAPABILITY:
        return min(25, base + (4 if source.is_first_party else 0))
    if item.claim_type in (ClaimType.MARKET_PRACTICE, ClaimType.VENDOR_COMPARISON):
        return max(0, base - (8 if source.commercial_interest else 0))
    return base


def assess_evidence(items: list[EvidenceItem], today: date | None = None) -> EvidenceAssessment:
    today = today or date.today()
    supporting = [item for item in items if item.stance == "supports"]
    conflicting = [item for item in items if item.stance == "contradicts"]
    if not supporting:
        return EvidenceAssessment(
            EvidenceStatus.CONFLICTING if conflicting else EvidenceStatus.INSUFFICIENT,
            QualityBand.LOW, 0, 0, 0, None,
            reasons=("No supporting evidence is available.",),
        )

    independent = {item.source.id for item in supporting if item.source.is_independent}
    official = {item.source.id for item in supporting if item.source.source_type == "GOVERNMENT"}
    last_verified_values = [item.source.last_verified for item in items if item.source.last_verified]
    last_verified = max(last_verified_values) if last_verified_values else None
    ages = [_age_days(item.source.last_verified or item.source.published_date, today) for item in supporting]
    valid_ages = [age for age in ages if age is not None]

    authority = round(sum(_authority(item) for item in supporting) / len(supporting))
    independence = min(20, len(independent) * 10)
    recency = 20 if valid_ages and max(valid_ages) <= 180 else 12 if valid_ages and max(valid_ages) <= 365 else 4
    directness = round(sum(max(0, min(5, item.directness)) for item in supporting) / len(supporting) * 4)
    coverage = round(sum(max(0, min(5, item.coverage)) for item in supporting) / len(supporting) * 3)
    score = max(0, min(100, authority + independence + recency + directness + coverage))

    reasons: list[str] = []
    if conflicting:
        status = EvidenceStatus.CONFLICTING
        reasons.append(f"{len(conflicting)} conflicting evidence item(s) require human review.")
    elif valid_ages and min(valid_ages) > 365:
        status = EvidenceStatus.STALE
        reasons.append("All supporting evidence is older than the freshness threshold.")
    elif len(independent) >= 2 and score >= 70:
        status = EvidenceStatus.VERIFIED
        reasons.append("Multiple independent sources support the claim.")
    else:
        status = EvidenceStatus.SUPPORTED
        reasons.append("Evidence supports the claim, but independent validation is incomplete.")

    band = QualityBand.HIGH if score >= 75 else QualityBand.MEDIUM if score >= 50 else QualityBand.LOW
    return EvidenceAssessment(
        status, band, score, len(independent), len(official), last_verified,
        dimensions={
            "authority": authority,
            "independence": independence,
            "recency": recency,
            "directness": directness,
            "coverage": coverage,
        },
        reasons=tuple(reasons),
    )

