(function () {
  function fitStatus(record, evidenceStatus) {
    if (!record || record.status === "UNKNOWN") return "UNKNOWN";
    if (record.status === "NOT_SUPPORTED") return "GAP";
    if (["CONFIRMED", "THIRD_PARTY_CONFIRMED"].includes(record.status) && ["VERIFIED", "SUPPORTED"].includes(evidenceStatus)) return "FIT";
    if (["VENDOR_CLAIMED", "PARTIAL", "CONFIRMED"].includes(record.status)) return "PARTIAL_FIT";
    return "UNKNOWN";
  }

  function analyze(scenario, data, evidenceEngine) {
    return data.vendors.map((vendor) => {
      const requirements = scenario.requirements.map((requirement) => {
        const record = vendor.capabilities[requirement.capability];
        const packet = evidenceEngine.evidencePacket(record?.claimIds || [], data);
        const evidenceStatus = packet.length ? packet.map((item) => item.assessment.status).sort((a, b) => ["VERIFIED", "SUPPORTED", "STALE", "CONFLICTING", "INSUFFICIENT"].indexOf(a) - ["VERIFIED", "SUPPORTED", "STALE", "CONFLICTING", "INSUFFICIENT"].indexOf(b))[0] : "INSUFFICIENT";
        const status = fitStatus(record, evidenceStatus);
        return {
          requirement,
          record,
          packet,
          evidenceStatus,
          status,
          strengths: status === "FIT" ? [`Evidence-backed coverage for ${requirement.name}`] : [],
          gaps: status === "PARTIAL_FIT" ? ["Independent or scope-specific validation is required"] : status === "GAP" ? ["Capability is explicitly not covered"] : status === "UNKNOWN" ? ["No sufficient evidence; retained as Unknown"] : [],
        };
      });
      return { vendor, requirements };
    });
  }

  window.GPIVendorFitEngine = { analyze, fitStatus };
})();
