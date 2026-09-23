(function () {
  const STATUS_LABELS = {
    VERIFIED: "Verified",
    SUPPORTED: "Supported",
    CONFLICTING: "Conflicting",
    INSUFFICIENT: "Insufficient",
    STALE: "Stale",
  };

  function authorityScore(source, claimType) {
    let score = Math.max(0, Math.min(5, source.authorityLevel || 0)) * 4;
    if (claimType === "REGULATION") score += source.isFirstParty && source.sourceType === "GOVERNMENT" ? 5 : -5;
    if (claimType === "VENDOR_CAPABILITY") score += source.isFirstParty ? 4 : 0;
    if (["MARKET_PRACTICE", "VENDOR_COMPARISON"].includes(claimType) && source.commercialInterest) score -= 8;
    return Math.max(0, Math.min(25, score));
  }

  function daysSince(value) {
    if (!value) return null;
    return Math.floor((new Date("2026-09-23T00:00:00+08:00") - new Date(value + "T00:00:00+08:00")) / 86400000);
  }

  function assessClaim(claim, data) {
    const sources = new Map(data.sources.map((source) => [source.id, source]));
    const items = (claim.evidence || []).map((item) => ({ ...item, source: sources.get(item.sourceId) })).filter((item) => item.source);
    const supporting = items.filter((item) => item.stance === "supports");
    const conflicts = items.filter((item) => item.stance === "contradicts");
    if (!supporting.length) return { status: conflicts.length ? "CONFLICTING" : "INSUFFICIENT", qualityBand: "LOW", score: 0, independentSources: 0, tierOneSources: 0, lastVerified: null, dimensions: {}, reasons: ["No supporting evidence is available."], items };

    const independent = new Set(supporting.filter((item) => item.source.isIndependent).map((item) => item.source.id));
    const tierOne = new Set(supporting.filter((item) => item.source.sourceType === "GOVERNMENT").map((item) => item.source.id));
    const authority = Math.round(supporting.reduce((sum, item) => sum + authorityScore(item.source, claim.claimType), 0) / supporting.length);
    const independence = Math.min(20, independent.size * 10);
    const ages = supporting.map((item) => daysSince(item.source.lastVerified || item.source.publishedDate)).filter((age) => age !== null);
    const recency = ages.length && Math.max(...ages) <= 180 ? 20 : ages.length && Math.max(...ages) <= 365 ? 12 : 4;
    const directness = Math.round(supporting.reduce((sum, item) => sum + Math.max(0, Math.min(5, item.directness || 0)), 0) / supporting.length * 4);
    const coverage = Math.round(supporting.reduce((sum, item) => sum + Math.max(0, Math.min(5, item.coverage || 0)), 0) / supporting.length * 3);
    const score = Math.max(0, Math.min(100, authority + independence + recency + directness + coverage));
    let status = "SUPPORTED";
    const reasons = [];
    if (conflicts.length) {
      status = "CONFLICTING";
      reasons.push(`${conflicts.length} conflicting evidence item(s) require human review.`);
    } else if (ages.length && Math.min(...ages) > 365) {
      status = "STALE";
      reasons.push("All supporting evidence is older than the freshness threshold.");
    } else if (independent.size >= 2 && score >= 70) {
      status = "VERIFIED";
      reasons.push("Multiple independent sources support this claim.");
    } else {
      reasons.push("Evidence supports this claim, but independent validation is incomplete.");
    }
    return {
      status,
      qualityBand: score >= 75 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW",
      score,
      independentSources: independent.size,
      tierOneSources: tierOne.size,
      lastVerified: items.map((item) => item.source.lastVerified).filter(Boolean).sort().at(-1) || null,
      dimensions: { authority, independence, recency, directness, coverage },
      reasons,
      items,
    };
  }

  function evidencePacket(claimIds, data) {
    return claimIds.map((id) => data.claims.find((claim) => claim.id === id)).filter(Boolean).map((claim) => ({ claim, assessment: assessClaim(claim, data) }));
  }

  window.GPIEvidenceEngine = { STATUS_LABELS, assessClaim, evidencePacket, authorityScore };
})();
