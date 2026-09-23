"""Rule-based, explainable Scenario -> Operational Requirement generation."""

from __future__ import annotations

from models import OperationalRequirement, ScenarioContext


def build_requirements(context: ScenarioContext) -> list[OperationalRequirement]:
    requirements = [
        OperationalRequirement("req-payroll", f"{context.country} payroll processing", "Payroll Processing",
                               f"{context.payroll_frequency} payroll for {context.employee_count} employees.",
                               ("claim-jp-payroll-control",), "CRITICAL"),
        OperationalRequirement("req-statutory", "Local statutory reporting", "Statutory Reporting",
                               "Local payroll reporting and filing controls must be evidenced.",
                               ("claim-jp-statutory-control",), "CRITICAL"),
    ]
    if context.commission_required:
        requirements.append(OperationalRequirement(
            "req-commission", "Retail commission calculation", "Commission Management",
            "Commission inputs, exceptions and monthly cut-off must be supported.",
            ("claim-retail-commission-control",), "CRITICAL"))
    if context.outsourcing_preference.casefold() in {"preferred", "required"}:
        requirements.append(OperationalRequirement(
            "req-outsourcing", "Payroll outsourcing", "Payroll Outsourcing",
            "The operating model prefers an accountable external delivery layer.",
            ("claim-outsourcing-model",), "IMPORTANT"))
    if context.local_hr_capacity <= 2:
        requirements.extend([
            OperationalRequirement("req-local-team", "Local service team", "Local Team",
                                   "A small local HR team needs local escalation support.", criticality="IMPORTANT"),
            OperationalRequirement("req-managed", "Managed service", "Managed Service",
                                   "Operational workload should not rely entirely on the two-person HR team.", criticality="IMPORTANT"),
        ])
    if context.integration_requirement.casefold() != "none":
        requirements.append(OperationalRequirement(
            "req-api", "HRIS / finance integration", "API Integration",
            f"Integration requirement: {context.integration_requirement}.", criticality="IMPORTANT"))
    if context.compliance_complexity.casefold() == "high":
        requirements.append(OperationalRequirement(
            "req-offcycle", "Controlled off-cycle payroll", "Off-cycle Payroll",
            "High compliance complexity requires an evidenced exception and off-cycle process.",
            ("claim-jp-offcycle-control",), "CRITICAL"))
    return requirements


def build_options(context: ScenarioContext, requirements: list[OperationalRequirement]) -> list[dict]:
    common = [requirement.id for requirement in requirements]
    return [
        {"id": "option-a", "name": "Managed payroll model", "requirement_ids": common,
         "strengths": ["Single accountable delivery model", "Lower day-to-day workload for local HR"],
         "gaps": ["Commission configuration and off-cycle evidence must be confirmed"],
         "trade_offs": ["Higher external dependency", "Scope boundaries require detailed RFI"]},
        {"id": "option-b", "name": "Platform-led model", "requirement_ids": common,
         "strengths": ["Greater internal process control", "Stronger integration ownership"],
         "gaps": ["Two-person local HR team may be capacity constrained"],
         "trade_offs": ["Higher internal administration", "Requires implementation capability"]},
        {"id": "option-hybrid", "name": "Hybrid operating model", "requirement_ids": common,
         "strengths": ["Payroll operations can be outsourced while commission governance remains internal"],
         "gaps": ["Data hand-offs and accountability need explicit controls"],
         "trade_offs": ["More interfaces to govern", "Can preserve business-specific commission logic"]},
    ]

