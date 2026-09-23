"""Shared V2 domain types for evidence-first decision intelligence."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class EvidenceStatus(StrEnum):
    VERIFIED = "VERIFIED"
    SUPPORTED = "SUPPORTED"
    CONFLICTING = "CONFLICTING"
    INSUFFICIENT = "INSUFFICIENT"
    STALE = "STALE"


class QualityBand(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ClaimType(StrEnum):
    REGULATION = "REGULATION"
    MARKET_PRACTICE = "MARKET_PRACTICE"
    VENDOR_CAPABILITY = "VENDOR_CAPABILITY"
    VENDOR_COMPARISON = "VENDOR_COMPARISON"
    OPERATIONAL_REQUIREMENT = "OPERATIONAL_REQUIREMENT"


class FitStatus(StrEnum):
    FIT = "FIT"
    PARTIAL_FIT = "PARTIAL_FIT"
    GAP = "GAP"
    UNKNOWN = "UNKNOWN"


@dataclass(frozen=True)
class Source:
    id: str
    name: str
    source_type: str
    authority_level: int
    is_first_party: bool
    is_independent: bool
    commercial_interest: bool
    url: str
    published_date: str | None = None
    effective_date: str | None = None
    last_verified: str | None = None


@dataclass(frozen=True)
class EvidenceItem:
    id: str
    source: Source
    claim_type: ClaimType
    stance: str
    directness: int
    coverage: int
    excerpt: str = ""


@dataclass(frozen=True)
class EvidenceAssessment:
    status: EvidenceStatus
    quality_band: QualityBand
    quality_score: int
    independent_sources: int
    tier_one_sources: int
    last_verified: str | None
    dimensions: dict[str, int] = field(default_factory=dict)
    reasons: tuple[str, ...] = ()


@dataclass(frozen=True)
class ScenarioContext:
    country: str
    employee_count: int
    industry: str
    payroll_frequency: str
    payroll_complexity: str
    commission_required: bool
    local_hr_capacity: int
    outsourcing_preference: str
    reporting_requirement: str
    integration_requirement: str
    compliance_complexity: str


@dataclass(frozen=True)
class OperationalRequirement:
    id: str
    name: str
    capability: str
    rationale: str
    evidence_refs: tuple[str, ...] = ()
    criticality: str = "IMPORTANT"


@dataclass(frozen=True)
class VendorFitResult:
    vendor: str
    requirement_id: str
    capability: str
    fit_status: FitStatus
    evidence_status: EvidenceStatus
    strengths: tuple[str, ...] = ()
    gaps: tuple[str, ...] = ()
    trade_offs: tuple[str, ...] = ()

