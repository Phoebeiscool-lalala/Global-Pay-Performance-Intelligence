(function () {
  function requirement(id, name, capability, rationale, claimIds = [], criticality = "IMPORTANT") {
    return { id, name, capability, rationale, claimIds, criticality };
  }

  function buildRequirements(context) {
    const requirements = [
      requirement("req-payroll", `${context.country} payroll processing`, "Payroll Processing", `${context.payrollFrequency} payroll for ${context.employeeCount} employees.`, ["claim-jp-payroll-control"], "CRITICAL"),
      requirement("req-statutory", "Local statutory reporting", "Statutory Reporting", "Local payroll reporting and filing controls must be evidenced.", ["claim-jp-statutory-control"], "CRITICAL"),
    ];
    if (context.commissionRequired === "Yes") requirements.push(requirement("req-commission", "Retail commission calculation", "Commission Management", "Commission inputs, exceptions and monthly cut-off must be supported.", ["claim-retail-commission-control"], "CRITICAL"));
    if (["Preferred", "Required"].includes(context.outsourcingPreference)) requirements.push(requirement("req-outsourcing", "Payroll outsourcing", "Payroll Outsourcing", "The target operating model prefers an accountable external delivery layer.", ["claim-outsourcing-model"]));
    if (Number(context.localHrCapacity) <= 2) {
      requirements.push(requirement("req-local-team", "Local service team", "Local Team", "A small local HR team needs a local escalation path."));
      requirements.push(requirement("req-managed", "Managed service", "Managed Service", "Operational workload should not rely entirely on the local HR team.", ["claim-outsourcing-model"]));
    }
    if (context.integrationRequirement !== "None") requirements.push(requirement("req-api", "HRIS / finance integration", "API Integration", `Integration requirement: ${context.integrationRequirement}.`));
    if (context.complianceComplexity === "High") requirements.push(requirement("req-offcycle", "Controlled off-cycle payroll", "Off-cycle Payroll", "High compliance complexity requires an evidenced exception and off-cycle process.", ["claim-jp-offcycle-control"], "CRITICAL"));
    return requirements;
  }

  function buildScenario(context, data) {
    const requirements = buildRequirements(context);
    const practices = data.practices.filter((practice) => practice.country === context.country);
    const regulations = data.regulations.filter((regulation) => regulation.country === context.country);
    return {
      id: `scenario-${Date.now()}`,
      context,
      practices,
      regulations,
      requirements,
      options: [
        { id: "option-a", name: "Managed payroll model", strengths: ["Single accountable operating model", "Lower day-to-day workload for local HR"], gaps: ["Commission and off-cycle coverage require explicit confirmation"], tradeOffs: ["Higher external dependency", "Detailed scope governance required"] },
        { id: "option-b", name: "Platform-led model", strengths: ["Greater internal process control", "Stronger ownership of integrations"], gaps: ["Two-person local HR team may be capacity constrained"], tradeOffs: ["Higher internal administration", "Implementation capability required"] },
        { id: "option-hybrid", name: "Hybrid operating model", strengths: ["Outsource payroll operations while retaining commission governance"], gaps: ["Data hand-offs and accountability require controls"], tradeOffs: ["More interfaces to govern", "Preserves business-specific commission logic"] },
      ],
    };
  }

  window.GPIScenarioEngine = { buildRequirements, buildScenario };
})();
