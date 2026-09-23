/* ============================================================
   Global Pay & Performance Intelligence — Workbench Demo
   Static re-implementation of server.py (local prototype).

   NOTE: 演示环境 · 所有实践、证据、供应商数据均为示例数据，
   用于展示工作台结构与评分逻辑，不代表任何研究结论。
   ============================================================ */

"use strict";

/* ---------------- 常量（与 server.py 一致） ---------------- */

const MARKETS = [
  { code: "JP", zh: "日本", en: "Japan", color: "#c8102e" },
  { code: "KR", zh: "韩国", en: "South Korea", color: "#1a4fc3" },
  { code: "HK", zh: "中国香港", en: "Hong Kong", color: "#be1e2d" },
  { code: "TW", zh: "中国台湾", en: "Taiwan", color: "#0a6eb4" },
];

const TOPICS = [
  { domain: "Pay", category: "薪酬结构", question: "固定薪酬、津贴与可变薪酬如何构成？" },
  { domain: "Pay", category: "薪酬调整", question: "调薪频率、时点及绩效关联如何体现？" },
  { domain: "Pay", category: "浮动奖金", question: "奖金资格、目标与支付频率如何设定？" },
  { domain: "Pay", category: "销售激励", question: "佣金门槛、加速器与离职处理如何设计？" },
  { domain: "Performance", category: "绩效周期", question: "绩效回顾周期与持续反馈如何运作？" },
  { domain: "Performance", category: "目标设定", question: "KPI、OKR 和团队目标如何组合？" },
  { domain: "Performance", category: "评价与校准", question: "评分方法与跨团队校准如何实施？" },
  { domain: "Pay for Performance", category: "绩效与回报", question: "绩效如何影响调薪、奖金与晋升？" },
];

const CAPABILITIES = [
  "Payroll Processing", "Payroll Outsourcing", "Tax", "Statutory Reporting",
  "Compensation Consulting", "Salary Benchmark", "Incentive Design",
  "Performance Management", "Commission Management", "API Integration",
  "Local Team", "Managed Service",
];

const STATUS_LABEL = {
  "Research candidate": "研究候选",
  "Insufficient evidence": "证据不足",
  "Conflicting": "证据冲突",
  "Verified": "已验证",
  "Ready to publish": "待发布",
  "Needs review": "需复核",
};

const STATUS_BADGE = {
  "Research candidate": "badge-candidate",
  "Insufficient evidence": "badge-insufficient",
  "Conflicting": "badge-conflicting",
  "Verified": "badge-verified",
  "Ready to publish": "badge-ready",
  "Needs review": "badge-review",
};

const STATUS_ORDER = [
  "Verified", "Ready to publish", "Needs review",
  "Insufficient evidence", "Conflicting", "Research candidate",
];

const SCORE_WEIGHTS = [
  { name: "来源质量", weight: 30, desc: "存在 Tier 1–2 来源计满分，仅 Tier 3 给 18 分" },
  { name: "独立来源数", weight: 25, desc: "≥2 个独立来源域计满分，单一来源仅 8 分" },
  { name: "一致性", weight: 20, desc: "多个独立来源相互印证计满分" },
  { name: "时效性", weight: 15, desc: "发布 180 天内计满分，365 天内 8 分，缺失为 0" },
  { name: "适用范围", weight: 10, desc: "证据针对具体人群计满分，General 仅 5 分" },
];

const TIERS = [
  { tier: 1, label: "Tier 1", desc: "官方统计 / 法律法规 / 政府出版物" },
  { tier: 2, label: "Tier 2", desc: "行业协会、权威咨询与研究机构的公开报告" },
  { tier: 3, label: "Tier 3", desc: "主流商业媒体 / 专业期刊" },
  { tier: 4, label: "Tier 4", desc: "厂商（Vendor）营销与自述内容 —— 不能单独建立市场结论" },
  { tier: 5, label: "Tier 5", desc: "未核验内容（社交媒体、个人博客等）" },
];

const BOUNDARIES = [
  "不预装未经证实的薪酬、绩效或供应商结论，不把营销内容当独立证据。",
  "不提供 P25/P50/P75 薪资基准、不构成法律建议，不用于个人薪酬决策、Payroll 计算或员工绩效评定。",
  "当前评分是 PRD 权重的可解释原型，不等于已验证的统计概率，也不自动判断来源是否真正独立。",
  "达到发布门槛后，仍需研究员人工审核和发布结论；冲突证据强制标记。",
  "Ask Intelligence 仅检索 Verified 内部记录，没有证据时拒绝猜测。",
];

/* ---------------- 演示数据（示例，非真实结论） ---------------- */

/* 每条证据：stances = supports / contradicts / context，tier 1–5 */
const SAMPLE_EVIDENCE = {
  "JP|薪酬结构": [
    { source: "厚生労働省『令和7年 賃金構造基本統計調査』", url: "https://www.mhlw.go.jp/toukei-itiran/roudou/chingin/", domain: "mhlw.go.jp", tier: 1, stance: "supports", excerpt: "調査結果によれば、企業規模別・年齢階級別の所定内給与と年間賞与の分布が示されており、固定給と賞与の構成比を把握できる。", published_on: "2026-03-25", population: "General" },
    { source: "Mercer Japan Total Remuneration Survey 2026", url: "https://www.mercer.com/jp/", domain: "mercer.com", tier: 2, stance: "supports", excerpt: "日本企業の報酬パッケージは基本給・通勤手当・賞与（年間2回が主流）で構成される傾向が確認された。", published_on: "2026-02-10", population: "General" },
  ],
  "JP|薪酬调整": [
    { source: "経団連『2026年春季労使交渉・賃金回答の集計結果』", url: "https://www.keidanren.or.jp/policy/chingin/", domain: "keidanren.or.jp", tier: 1, stance: "supports", excerpt: "2026年春闘の平均賃上げ率は昨年を上回り、定期昇給とベースアップの別に集計された。", published_on: "2026-04-10", population: "General" },
  ],
  "KR|浮动奖金": [
    { source: "한국경제 HR  리포트（韩国经济 HR 报告）", url: "https://www.hankyung.com/", domain: "hankyung.com", tier: 2, stance: "supports", excerpt: "대기업의 성과급 지급률은 연봉의 20~30% 수준이며 설·추석 상여와 별도로 지급된다. （大型企业奖金约为年薪的 20–30%，与节日礼金分开支付）", published_on: "2026-01-14", population: "General" },
    { source: "労総研（KLI）성과급 실태조사", url: "https://www.kli.re.kr/", domain: "kli.re.kr", tier: 2, stance: "contradicts", excerpt: "실태조사에서는 중견기업 이하에서 성과급 도입률이 1/3에 미치지 못해, 전 산업 평균 20~30%라는 주장과 배치된다. （中坚以下企业导入率不足三分之一，与整体 20–30% 的说法矛盾）", published_on: "2026-02-02", population: "General" },
  ],
  "HK|评价与校准": [
    { source: "HKIHRM Performance Management Survey 2026", url: "https://www.hkiihrm.org/", domain: "hkiihrm.org", tier: 2, stance: "supports", excerpt: "Most Hong Kong organisations adopt a 5-point rating scale with central calibration committees to moderate cross-departmental variance.", published_on: "2026-05-08", population: "MNC 人力资源负责人" },
    { source: "South China Morning Post — HR 专栏", url: "https://www.scmp.com/", domain: "scmp.com", tier: 2, stance: "supports", excerpt: "Companies in the city increasingly combine rating calibration with quarterly check-ins to reduce end-of-year bias.", published_on: "2026-03-30", population: "MNC 人力资源负责人" },
  ],
  "TW|绩效周期": [
    { source: "104 人力銀行 HR 調查報告", url: "https://www.104.com.tw/", domain: "104.com.tw", tier: 3, stance: "supports", excerpt: "台灣企業的績效評估多採半年或年度週期，製造業與科技業普遍於年中與年末各進行一次正式考核。", published_on: "2026-06-12", population: "General" },
    { source: "遠見／Cheers 職場調查", url: "https://www.cheers.com.tw/", domain: "cheers.com.tw", tier: 3, stance: "supports", excerpt: "受訪企業中約七成維持年度績效考核，少數已導入每季 feedback 循環。", published_on: "2026-04-20", population: "General" },
  ],
  "JP|目标设定": [
    { source: "日本のIT人材白書（IT 产业白皮书）", url: "https://itwhitepaper.ipa.go.jp/", domain: "ipa.go.jp", tier: 3, stance: "supports", excerpt: "IT 企業では OKR 導入が進む一方、職能別の目標設定と全社目標の整合に課題が残る。", published_on: "2025-03-15", population: "IT 行业" },
  ],
};

/* 结论（示例）。key = market|category */
const SAMPLE_CLAIMS = {
  "JP|薪酬结构": {
    claim: "日本大型企业普遍采用「月薪 + 年度奖金(两次) + 通勤津贴」的薪酬组合，年度调薪与春闘结果挂钩。（示例结论，演示数据）",
    reason: "两个独立来源（厚労省统计 Tier1 + Mercer 调研 Tier2）在 180 天内发布且结论一致，达到发布门槛。",
    date: "2026-08-12",
  },
  "TW|绩效周期": {
    claim: "台湾企业绩效回顾以半年或年度周期为主，制造业与科技业多在年中 / 年末各进行一次正式评估。（示例结论，演示数据）",
    reason: "104 人力銀行与 Cheers 两个独立来源相互印证，达到发布门槛后人工审核通过。",
    date: "2026-09-02",
  },
};

/* 变更历史（claim_history 的演示版本） */
const SAMPLE_CHANGES = [
  {
    market: "JP", domain: "Pay", category: "薪酬结构", date: "2026-09-10",
    old: "（初版）日本大型企业普遍采用「月薪 + 年度奖金」组合。",
    next: "日本大型企业普遍采用「月薪 + 年度奖金(两次) + 通勤津贴」的薪酬组合，年度调薪与春闘结果挂钩。（示例结论）",
    reason: "补充 2 月 Mercer 调研后，将奖金次数与通勤津贴纳入结论表述，置信度由 88 调整为 95。",
    score: "88 → 95",
  },
  {
    market: "JP", domain: "Pay", category: "薪酬结构", date: "2026-08-12",
    old: "（无）", next: "（初版）日本大型企业普遍采用「月薪 + 年度奖金」组合。（示例结论）",
    reason: "厚労省统计与 Mercer 调研两个独立来源支撑，人工审核后首次发布。",
    score: "— → 88",
  },
  {
    market: "TW", domain: "Performance", category: "绩效周期", date: "2026-09-02",
    old: "（无）", next: "台湾企业绩效回顾以半年或年度周期为主，制造业与科技业多在年中 / 年末各进行一次正式评估。（示例结论）",
    reason: "104 人力銀行与 Cheers 两个独立来源相互印证，达到发布门槛。",
    score: "— → 83",
  },
];

/* 供应商（示例档案） */
const VENDORS = [
  {
    name: "ADP Japan", hq: "美国 / 日本", website: "https://www.adp.com/", color: "#3f51b5",
    notes: "全球 payroll 服务商，日本市场深耕多年。",
    caps: {
      "JP|Payroll Processing": ["Confirmed", "https://www.adp.com/jp/"],
      "JP|Payroll Outsourcing": ["Confirmed", "https://www.adp.com/jp/"],
      "JP|Local Team": ["Third-party Confirmed", "https://www.g2.com/products/adp/reviews"],
      "JP|Tax": ["Vendor Claimed", "https://www.adp.com/jp/solutions/tax/"],
      "JP|Statutory Reporting": ["Vendor Claimed", "https://www.adp.com/jp/solutions/compliance/"],
      "HK|Payroll Processing": ["Vendor Claimed", "https://www.adp.com/hk/"],
      "TW|Payroll Processing": ["Vendor Claimed", "https://www.adp.com/tw/"],
      "KR|Payroll Processing": ["Unknown", ""],
    },
  },
  {
    name: "TMF Group", hq: "荷兰（全球）", website: "https://www.tmf-group.com/", color: "#0f7a5f",
    notes: "全球企业服务与薪酬外包，亚太本地团队覆盖广。",
    caps: {
      "JP|Tax": ["Confirmed", "https://www.tmf-group.com/en/location/asia/japan/"],
      "JP|Payroll Outsourcing": ["Third-party Confirmed", "https://www.tmf-group.com/en/insights/"],
      "HK|Payroll Outsourcing": ["Confirmed", "https://www.tmf-group.com/en/location/asia/hong-kong/"],
      "HK|Statutory Reporting": ["Confirmed", "https://www.tmf-group.com/en/"],
      "TW|Managed Service": ["Vendor Claimed", "https://www.tmf-group.com/en/location/asia/taiwan/"],
      "KR|Local Team": ["Vendor Claimed", "https://www.tmf-group.com/en/location/asia/south-korea/"],
    },
  },
  {
    name: "Mercer", hq: "美国（全球）", website: "https://www.mercer.com/", color: "#1d4ed8",
    notes: "C&B 咨询与薪酬数据供应商。",
    caps: {
      "JP|Compensation Consulting": ["Confirmed", "https://www.mercer.com/jp/"],
      "JP|Salary Benchmark": ["Confirmed", "https://www.mercer.com/jp/what-we-do/total-rewards.html"],
      "HK|Compensation Consulting": ["Confirmed", "https://www.mercer.com/hk/"],
      "HK|Salary Benchmark": ["Confirmed", "https://www.mercer.com/hk/"],
      "TW|Compensation Consulting": ["Third-party Confirmed", "https://www.mercer.com/tw/"],
      "TW|Salary Benchmark": ["Vendor Claimed", "https://www.mercer.com/tw/"],
      "KR|Compensation Consulting": ["Vendor Claimed", "https://www.mercer.com/kk/"],
      "KR|Incentive Design": ["Vendor Claimed", "https://www.mercer.com/kk/"],
      "JP|Incentive Design": ["Vendor Claimed", "https://www.mercer.com/jp/"],
    },
  },
  {
    name: "Willis Towers Watson", hq: "英国 / 美国", website: "https://www.wtwco.com/", color: "#7c3aed",
    notes: "人力资源与薪酬咨询（WTW）。",
    caps: {
      "KR|Incentive Design": ["Confirmed", "https://www.wtwco.com/"],
      "JP|Salary Benchmark": ["Third-party Confirmed", "https://www.wtwco.com/"],
      "JP|Incentive Design": ["Vendor Claimed", "https://www.wtwco.com/en-GB/insights/"],
      "TW|Performance Management": ["Vendor Claimed", "https://www.wtwco.com/"],
      "HK|Compensation Consulting": ["Vendor Claimed", "https://www.wtwco.com/"],
      "JP|Commission Management": ["Unknown", ""],
    },
  },
  {
    name: "PwC（普华永道）", hq: "英国（全球网络）", website: "https://www.pwchk.com/", color: "#b45309",
    notes: "税务 / 会计 / 薪酬合规咨询。",
    caps: {
      "HK|Tax": ["Confirmed", "https://www.pwchk.com/taxes/"],
      "HK|Statutory Reporting": ["Confirmed", "https://www.pwchk.com/"],
      "HK|Compensation Consulting": ["Confirmed", "https://www.pwchk.com/human-resources-services/"],
      "JP|Tax": ["Third-party Confirmed", "https://www.pwc.com/jp/"],
      "TW|Statutory Reporting": ["Vendor Claimed", "https://www.pwc.tw/"],
      "KR|Tax": ["Vendor Claimed", "https://www.pwc.com/kr/"],
      "KR|Statutory Reporting": ["Conflicting", "https://www.pwc.com/kr/"],
    },
  },
];

/* ---------------- Phase 2 决策智能对象（演示数据，非研究结论） ---------------- */

const COMPANY_ARCHETYPES = [
  { id: "large-mnc", name: "Large MNC", origin: "Global / Regional", size: "5,000–50,000", workforce: "Mixed", operating: "Regional" },
  { id: "retail-sales", name: "Retail Sales Network", origin: "Local / Asian MNC", size: "500–5,000", workforce: "Store Sales", operating: "Multi-market" },
  { id: "tech-growth", name: "Growth Technology", origin: "Local / US MNC", size: "<500", workforce: "Office / Sales", operating: "Single-country" },
];

const REGIONAL_PATTERNS = [
  {
    id: "east-asia-performance-cycle", domain: "Performance", name: "Formal cycle plus lighter check-ins",
    scope: "East Asia · Large MNC · Office / Mixed workforce", status: "Established", confidence: "High",
    markets: ["JP", "HK", "TW"], archetypes: ["Large MNC"], evidenceCount: 5,
    components: ["Annual or semi-annual formal review", "Mid-cycle check-in", "Manager-led review"],
    claims: ["JP|目标设定", "HK|评价与校准", "TW|绩效周期"],
    counter: "韩国与本地中小企业的公开证据不足，不能外推为整个区域的一致做法。",
    limitation: "样本以大型企业与专业调查为主；缺少行业和企业规模的均衡覆盖。",
    firstDetected: "2026-08-12", lastVerified: "2026-09-18",
  },
  {
    id: "retail-incentive-mix", domain: "Pay for Performance", name: "Individual plus store performance mix",
    scope: "Retail Sales · Multi-market candidate", status: "Emerging", confidence: "Medium",
    markets: ["JP", "HK"], archetypes: ["Retail Sales Network"], evidenceCount: 3,
    components: ["Individual sales component", "Store or team modifier", "Cap or threshold"],
    claims: ["JP|销售激励", "HK|绩效与回报"],
    counter: "公开证据尚不足以确认韩国和台湾的同类结构。",
    limitation: "达到候选门槛，但跨市场覆盖有限；需要补充独立来源与反向案例。",
    firstDetected: "2026-09-01", lastVerified: "2026-09-20",
  },
  {
    id: "calibration-mnc-dependent", domain: "Performance", name: "Calibration depends on company archetype",
    scope: "MNC / Large company · Performance rating", status: "Conflicting", confidence: "Low",
    markets: ["HK", "JP"], archetypes: ["Large MNC", "Growth Technology"], evidenceCount: 3,
    components: ["Central calibration", "Cross-team moderation", "Rating scale governance"],
    claims: ["HK|评价与校准"],
    counter: "部分新型科技企业采用 rating-less 或轻量化反馈，不能把校准委员会视为普遍做法。",
    limitation: "公司原型差异大于国家差异；需要更多本地企业样本。",
    firstDetected: "2026-08-28", lastVerified: "2026-09-19",
  },
];

const DESIGN_PATTERNS = [
  { id: "annual-midyear", type: "Performance", name: "Annual review + mid-year check-in", structure: "年度正式评估，中期进行目标与进展检查。", markets: ["JP", "HK", "TW"], archetypes: ["Large MNC"], advantages: ["节奏清晰", "可与年度薪酬周期衔接"], tradeoffs: ["年末偏差风险", "经理培训要求"], complexity: "Medium", evidence: 5, limitation: "不代表适合高变化团队。" },
  { id: "continuous-feedback", type: "Performance", name: "Continuous feedback with formal checkpoint", structure: "持续反馈配合一个正式记录节点。", markets: ["HK", "TW"], archetypes: ["Growth Technology"], advantages: ["反馈及时", "适应目标变化"], tradeoffs: ["管理纪律要求高", "记录一致性较弱"], complexity: "High", evidence: 3, limitation: "公开证据集中于科技与大型企业。" },
  { id: "fixed-rate", type: "Sales Incentive", name: "Individual sales × fixed rate", structure: "按个人业绩乘以固定佣金率，可设置门槛与封顶。", markets: ["JP", "HK"], archetypes: ["Retail Sales Network"], advantages: ["易理解", "业绩关联直接"], tradeoffs: ["波动较高", "团队协作激励有限"], complexity: "Low", evidence: 3, limitation: "未包含成本模拟和法规判断。" },
  { id: "individual-team", type: "Sales Incentive", name: "Individual + team / store component", structure: "个人佣金与门店或团队结果共同决定支付。", markets: ["JP", "HK"], archetypes: ["Retail Sales Network"], advantages: ["兼顾个人与协作", "可降低单一指标偏差"], tradeoffs: ["解释更复杂", "权重治理要求更高"], complexity: "Medium", evidence: 3, limitation: "跨市场证据仍在补充。" },
  { id: "threshold-accelerator", type: "Sales Incentive", name: "Threshold → target → accelerator", structure: "低于门槛不支付，达到目标后按阶梯加速。", markets: ["JP", "HK"], archetypes: ["Retail Sales Network", "Growth Technology"], advantages: ["突出关键目标", "支持高绩效差异化"], tradeoffs: ["成本波动", "目标设定敏感"], complexity: "High", evidence: 3, limitation: "必须结合本地合规与实际财务约束。" },
];

const MARKET_SIGNALS = [
  { id: "feedback-shift", name: "正式年度评估之外的轻量反馈增加", type: "Performance Management Trend", markets: ["HK", "TW", "JP"], strength: "Building", direction: "Increasing", confidence: "Medium", first: "2026-08-12", evidence: 5, counter: 2, why: "可能改变经理工作节奏与绩效记录方式，但尚未取代正式周期。" },
  { id: "vendor-ai-claims", name: "Vendor AI capability 声明快速增加", type: "Vendor Technology / AI Capability", markets: ["JP", "KR", "HK", "TW"], strength: "Weak", direction: "Increasing", confidence: "Low", first: "2026-09-02", evidence: 4, counter: 4, why: "营销声明增长快于独立验证，需要通过 RFI 澄清真实功能、数据边界与客户案例。" },
  { id: "managed-service", name: "区域化 Managed Service 覆盖扩大", type: "Regional Expansion / Coverage", markets: ["JP", "HK", "TW"], strength: "Building", direction: "Mixed", confidence: "Medium", first: "2026-08-25", evidence: 4, counter: 1, why: "供应商可能通过本地团队或合作伙伴扩大交付，但各市场服务边界并不一致。" },
];

/* ---------------- 评分逻辑（移植自 server.py confidence_for） ---------------- */

const TODAY = new Date("2026-09-23T00:00:00+08:00");

function daysSince(iso) {
  const d = new Date(iso + "T00:00:00+08:00");
  return Math.floor((TODAY - d) / 86400000);
}

function confidenceFor(evidence) {
  const supporting = evidence.filter((e) => e.stance === "supports" && e.tier <= 3);
  const contradicting = evidence.filter((e) => e.stance === "contradicts" && e.tier <= 3);
  const independent = new Set(supporting.map((e) => e.domain));

  if (!evidence.length) return { score: 0, status: "Research candidate" };
  if (contradicting.length) {
    return { score: Math.min(59, 15 + 12 * independent.size), status: "Conflicting" };
  }
  if (!supporting.length) return { score: 0, status: "Insufficient evidence" };

  const sourceQuality = supporting.some((e) => e.tier <= 2) ? 30 : 18;
  const sourceCount = independent.size >= 2 ? 25 : 8;
  const consistency = independent.size >= 2 ? 20 : 5;
  const dated = supporting.filter((e) => e.published_on).map((e) => daysSince(e.published_on));
  const age = dated.length ? Math.max(...dated) : null;
  const freshness = age !== null && age <= 180 ? 15 : age !== null && age <= 365 ? 8 : 0;
  const specificity = supporting.some((e) => e.population !== "General") ? 10 : 5;

  let score = sourceQuality + sourceCount + consistency + freshness + specificity;
  if (independent.size < 2) return { score: Math.min(score, 59), status: "Insufficient evidence" };
  return { score, status: score >= 60 ? "Verified" : "Needs review" };
}

function practiceStatus(conf, claim) {
  if (conf.status === "Verified" && !claim) return "Ready to publish";
  return conf.status;
}

/* ---------------- 数据装配：32 个主题 = 4 市场 × 8 主题 ---------------- */

function buildPractices() {
  const list = [];
  for (const m of MARKETS) {
    for (const t of TOPICS) {
      const key = `${m.code}|${t.category}`;
      const evidence = SAMPLE_EVIDENCE[key] || [];
      const claimInfo = SAMPLE_CLAIMS[key];
      const claim = claimInfo ? claimInfo.claim : "";
      const conf = confidenceFor(evidence);
      list.push({
        market: m.code, domain: t.domain, category: t.category, question: t.question,
        claim, claimDate: claimInfo ? claimInfo.date : null,
        confidence: conf.score, status: practiceStatus(conf, claim),
        evidence,
      });
    }
  }
  return list;
}

let practices = buildPractices();
let verifiedPractice = () => practices.filter((p) => p.status === "Verified");

/* ---------------- 状态元数据 ---------------- */

function badge(status) { return `<span class="badge ${STATUS_BADGE[status] || "badge-candidate"}">${STATUS_LABEL[status] || status}</span>`; }
function tierBadge(t) { return `<span class="tier-badge tier-${t}">Tier ${t}</span>`; }
function stanceBadge(s) {
  const label = { supports: "支持", contradicts: "反对", context: "背景" }[s] || s;
  return `<span class="stance stance-${s}">${label}</span>`;
}
function marketDot(m) { const mm = MARKETS.find((x) => x.code === m); return `<span class="market-dot" style="background:${mm.color}"></span>`; }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function marketName(code) { const m = MARKETS.find((x) => x.code === code); return m ? m.zh : code; }
function domainName(d) { return { Pay: "薪酬", Performance: "绩效", "Pay for Performance": "绩效与回报" }[d] || d; }

/* ---------------- 视图切换 ---------------- */

const VIEWS = ["overview", "practices", "compare", "patterns", "design", "scenario", "vendorfit", "vendors", "signals", "changes", "ask", "method"];
const VIEW_TITLE = {
  overview: ["总览", "Dashboard"],
  practices: ["市场实践", "Practice Intelligence"],
  compare: ["区域情报", "Regional Intelligence"],
  patterns: ["模式探索", "Pattern Explorer"],
  design: ["设计模式库", "Practice Design Library"],
  scenario: ["Scenario Lab", "Alternative Options & Trade-offs"],
  vendorfit: ["Vendor Fit", "Requirement Coverage & RFI"],
  vendors: ["供应商情报", "Vendor Intelligence"],
  signals: ["市场信号", "Market Signals & Evolution"],
  changes: ["市场变化", "Published Changes"],
  ask: ["Ask Intelligence", "Verified-only 检索"],
  method: ["方法论与边界", "Scoring & Boundaries"],
};

let currentView = "overview";

function switchView(name, pushHash = true) {
  if (!VIEWS.includes(name)) name = "overview";
  currentView = name;
  document.querySelectorAll(".view").forEach((v) => (v.hidden = true));
  const el = document.getElementById("view-" + name);
  if (el) el.hidden = false;
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === name));
  document.getElementById("page-title").textContent = VIEW_TITLE[name][0];
  document.getElementById("page-sub").textContent = VIEW_TITLE[name][1];
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("backdrop").classList.remove("show");
  if (pushHash && location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
  window.scrollTo({ top: 0 });
}

/* ---------------- 总览 ---------------- */

function renderOverview() {
  const total = practices.length;
  const verified = practices.filter((p) => p.status === "Verified").length;
  const ready = practices.filter((p) => p.status === "Ready to publish").length;
  const review = practices.filter((p) => ["Insufficient evidence", "Needs review", "Conflicting"].includes(p.status)).length;
  const sources = practices.reduce((n, p) => n + p.evidence.length, 0);

  document.getElementById("hero-aside").innerHTML = `
    <div class="hero-stat"><span>研究主题</span><b>${total}</b></div>
    <div class="hero-stat"><span>已验证结论</span><b>${verified}</b></div>
    <div class="hero-stat"><span>证据条目</span><b>${sources}</b></div>`;

  const stats = [
    ["研究主题", total, "4 市场 × 8 主题", "var(--brand)"],
    ["已验证", verified, "达到发布门槛", "var(--ok)"],
    ["待发布", ready, "证据达标·结论待审", "var(--info)"],
    ["需复核", review, "证据不足 / 冲突", "var(--warn)"],
    ["证据条目", sources, "已挂载公开来源", "var(--accent)"],
    ["供应商档案", VENDORS.length, "Vendor Intelligence", "var(--neutral)"],
  ];
  document.getElementById("stat-grid").innerHTML = stats.map(([b, n, s, c]) =>
    `<div class="stat" style="--stat-color:${c}"><b>${n}</b><span>${b} · ${s}</span></div>`).join("");

  document.getElementById("market-list").innerHTML = MARKETS.map((m) => {
    const items = practices.filter((p) => p.market === m.code);
    const v = items.filter((p) => p.status === "Verified").length;
    const ev = items.reduce((n, p) => n + p.evidence.length, 0);
    return `<div class="market-row">
      ${marketDot(m.code)}
      <span class="m-name">${m.zh}</span><span class="m-en">${m.en}</span>
      <span class="m-stat"><b>${v}</b> 已验证 · <b>${ev}</b> 证据</span>
    </div>`;
  }).join("");

  document.getElementById("topic-preview").innerHTML = TOPICS.map((t, i) =>
    `<div class="topic-mini"><span>${["P1", "P2", "P3", "P4", "PF1", "PF2", "PF3", "PF4"][i]} · ${domainName(t.domain)}</span><b>${t.category}</b>
      <span class="badge badge-candidate">8 条</span></div>`).join("");

  document.getElementById("recent-changes").innerHTML = SAMPLE_CHANGES.slice(0, 3).map(changeRow).join("")
    || `<div class="empty-state">尚无已发布结论的变更</div>`;
  const pad = (n) => String(n).padStart(2, "0");
  document.getElementById("side-refreshed").textContent =
    "数据刷新：" + `${TODAY.getFullYear()}-${pad(TODAY.getMonth() + 1)}-${pad(TODAY.getDate())}`;
}

function changeRow(c) {
  return `<div class="change-item">
    <div class="change-rail"><div class="change-dot"></div><div class="change-line"></div></div>
    <div class="change-body">
      <div class="change-title">${marketDot(c.market)} ${marketName(c.market)} · ${c.domain} / ${c.category} <small>${c.date}</small></div>
      <div class="change-why">${esc(c.reason)}</div>
      <span class="change-old">${esc(c.old)}</span><span class="change-new">${esc(c.next)}</span>
      <div class="change-meta" style="margin-top:6px">置信度：${esc(c.score)}</div>
    </div>
  </div>`;
}

/* ---------------- 市场实践 ---------------- */

let practiceFilter = { market: "ALL", domain: "ALL", status: "ALL" };

function renderPracticeFilters() {
  document.getElementById("market-filter").innerHTML =
    `<button class="filter-chip on" data-m="ALL">全部市场</button>` +
    MARKETS.map((m) => `<button class="filter-chip" data-m="${m.code}"><span class="dot" style="background:${m.color}"></span>${m.zh}</button>`).join("");

  document.getElementById("domain-filter").innerHTML =
    `<option value="ALL">全部研究域</option>` +
    [...new Set(TOPICS.map((t) => t.domain))].map((d) => `<option value="${d}">${domainName(d)}</option>`).join("");

  document.getElementById("status-filter").innerHTML =
    `<option value="ALL">全部状态</option>` +
    STATUS_ORDER.map((s) => `<option value="${s}">${STATUS_LABEL[s]}</option>`).join("");
}

function renderPracticeList() {
  const { market, domain, status } = practiceFilter;
  const items = practices.filter((p) =>
    (market === "ALL" || p.market === market) &&
    (domain === "ALL" || p.domain === domain) &&
    (status === "ALL" || p.status === status));

  document.getElementById("practice-count").textContent = `显示 ${items.length} / ${practices.length} 条`;
  const host = document.getElementById("practice-list");
  if (!items.length) {
    host.innerHTML = `<div class="empty-state">当前筛选条件下没有记录</div>`;
    return;
  }
  host.innerHTML = items.map(practiceCard).join("");
}

function confidenceBreakdown(p) {
  const evidence = p.evidence.filter((e) => e.stance === "supports" && e.tier <= 3);
  const contradicting = p.evidence.filter((e) => e.stance === "contradicts" && e.tier <= 3);
  if (!p.evidence.length) return `<div class="note">尚无证据。进入「市场实践」录入公开来源后，系统会按权重给出可解释的可信度评分。</div>`;
  if (contradicting.length) {
    const independent = new Set(evidence.map((e) => e.domain)).size;
    return `<div class="note">检测到 <b class="badge badge-conflicting">反对证据</b>：存在 ${contradicting.length} 条 Tier≤3 的反对来源。按规则强制标记为「Conflicting」，评分封顶：min(59, 15 + 12×${independent})。</div>`;
  }
  if (!evidence.length) return `<div class="note">仅有背景 / Tier 4–5 来源，不能支撑任何市场实践结论（Insufficient evidence）。</div>`;

  const independent = new Set(evidence.map((e) => e.domain));
  const sourceQuality = evidence.some((e) => e.tier <= 2) ? 30 : 18;
  const sourceCount = independent.size >= 2 ? 25 : 8;
  const consistency = independent.size >= 2 ? 20 : 5;
  const dated = evidence.filter((e) => e.published_on).map((e) => daysSince(e.published_on));
  const age = dated.length ? Math.max(...dated) : null;
  const freshness = age !== null && age <= 180 ? 15 : age !== null && age <= 365 ? 8 : 0;
  const specificity = evidence.some((e) => e.population !== "General") ? 10 : 5;
  const parts = [
    ["来源质量", sourceQuality, 30], ["独立来源", sourceCount, 25], ["一致性", consistency, 20],
    ["时效性", freshness, 15], ["适用范围", specificity, 10],
  ];
  return `<div class="score-break">${parts.map(([n, v, max]) => `
    <div class="score-part"><span>${n} · ${max}%</span><b>${v} / ${max}</b>
      <div class="score-bar"><i style="width:${(v / max) * 100}%"></i></div></div>`).join("")}</div>
    <div class="note">总分 = ${sourceQuality} + ${sourceCount} + ${consistency} + ${freshness} + ${specificity} =
      <b>${sourceQuality + sourceCount + consistency + freshness + specificity}</b>；${independent.size < 2 ? `独立来源仅 ${independent.size} 个，按规则封顶 59 分（不能达发布门槛）` : `达到 ≥60 门槛后仍需研究员人工审核`}。</div>`;
}

function practiceCard(p) {
  const m = MARKETS.find((x) => x.code === p.market);
  const open = currentView === "practices" ? "" : "";
  return `<div class="practice-item" data-key="${p.market}|${p.category}">
    <button class="practice-head" type="button">
      <span class="practice-pill" style="background:${m.color}"></span>
      <span class="practice-q">
        <b>${p.market} · ${esc(p.category)}</b>
        <small>${esc(p.question)}</small>
      </span>
      <span class="practice-meta">
        ${badge(p.status)}
        <span class="conf-ring"><b>${p.confidence}</b>分</span>
        <span class="practice-open">展开 ▸</span>
      </span>
    </button>
    <div class="practice-body">
      ${p.claim ? `<div class="claim-box"><b>已发布结论（示例）：</b>${esc(p.claim)}</div>` : ""}
      ${confidenceBreakdown(p)}
      ${p.evidence.length ? `<h4 style="margin:8px 0 4px;color:var(--muted);font-size:12px">证据列表（${p.evidence.length}）</h4>
      <table class="ev-table">
        <thead><tr><th>来源</th><th>链接</th><th>Tier</th><th>方向</th><th>发布日期</th><th>人群</th></tr></thead>
        <tbody>${p.evidence.map((e) => `
          <tr>
            <td>${esc(e.source)}<span class="ev-excerpt">${esc(e.excerpt)}</span></td>
            <td><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.domain)} ↗</a></td>
            <td>${tierBadge(e.tier)}</td>
            <td>${stanceBadge(e.stance)}</td>
            <td>${esc(e.published_on || "—")}</td>
            <td>${esc(e.population)}</td>
          </tr>`).join("")}</tbody>
      </table>` : `<div class="note">待研究主题：暂无证据，状态保持 Research candidate。</div>`}
    </div>
  </div>`;
}

/* ---------------- 对比矩阵 ---------------- */

let compareMarkets = ["JP", "KR", "HK", "TW"];

function renderCompare() {
  document.getElementById("compare-market-filter").innerHTML = MARKETS.map((m) =>
    `<button class="filter-chip ${compareMarkets.includes(m.code) ? "on" : ""}" data-m="${m.code}"><span class="dot" style="background:${m.color}"></span>${m.zh}</button>`).join("");

  const cells = (m) => TOPICS.map((t) =>
    practices.find((p) => p.market === m && p.category === t.category));

  const head = `<thead><tr><th class="th-domain">研究主题</th>` +
    compareMarkets.map((m) => {
      const mm = MARKETS.find((x) => x.code === m);
      return `<th>${marketDot(m)} ${mm.zh}<br><small style="color:#8b9ac0;font-weight:400">${mm.en}</small></th>`;
    }).join("") + `</tr></thead>`;

  const body = TOPICS.map((t, i) => {
    const row = `<tr><td class="th-domain"><b>${esc(t.category)}</b><small style="display:block;color:var(--muted)">${domainName(t.domain)} · ${esc(t.question)}</small></td>` +
      compareMarkets.map((m) => {
        const p = cells(m)[i];
        if (!p) return `<td class="cell-empty">—</td>`;
        const c = p.status === "Verified" && p.claim
          ? `<div class="cell-claim">${esc(p.claim.slice(0, 40))}…</div>` : "";
        return `<td class="cell-practice" data-key="${m}|${t.category}">${badge(p.status)}<div class="conf-ring" style="margin-top:4px"><b>${p.confidence}</b>分</div>${c}</td>`;
      }).join("") + `</tr>`;
    return row;
  }).join("");

  document.getElementById("compare-table").innerHTML = head + `<tbody>${body}</tbody>`;
  document.getElementById("compare-legend").innerHTML =
    `<span>${badge("Verified")} 已验证</span><span>${badge("Ready to publish")} 待发布</span><span>${badge("Insufficient evidence")} 证据不足</span><span>${badge("Conflicting")} 证据冲突</span><span>${badge("Research candidate")} 研究候选</span><span>点击单元格查看详情</span>
    <div class="regional-summary">
      <div><small>COMMON PRACTICE</small><b>正式绩效周期仍然是主要观察框架</b><p>仅限已有证据的市场与样本；不可外推为整个区域事实。</p></div>
      <div><small>MARKET DIFFERENCE</small><b>校准与反馈频率受 Company Archetype 影响</b><p>大型 MNC 与成长型科技企业的差异可能大于国家差异。</p></div>
      <div><small>EVIDENCE GAP</small><b>韩国和本地中小企业覆盖不足</b><p>比较结果必须保留 Unknown，不能用相邻市场补齐。</p></div>
    </div>`;
}

/* ---------------- Phase 2：Pattern Explorer ---------------- */

let patternFilter = { domain: "ALL", status: "ALL" };

function renderPatterns() {
  const domain = document.getElementById("pattern-domain");
  const status = document.getElementById("pattern-status");
  if (!domain.options.length) {
    domain.innerHTML = `<option value="ALL">全部领域</option><option value="Performance">绩效</option><option value="Pay for Performance">绩效与回报</option>`;
    status.innerHTML = `<option value="ALL">全部状态</option><option>Established</option><option>Emerging</option><option>Conflicting</option>`;
  }
  domain.value = patternFilter.domain;
  status.value = patternFilter.status;
  document.getElementById("archetype-list").innerHTML = COMPANY_ARCHETYPES.map((a) => `
    <div><b>${esc(a.name)}</b><span>${esc(a.origin)}</span><span>${esc(a.size)}</span><span>${esc(a.workforce)}</span><small>${esc(a.operating)}</small></div>`).join("");
  const list = REGIONAL_PATTERNS.filter((p) =>
    (patternFilter.domain === "ALL" || p.domain === patternFilter.domain) &&
    (patternFilter.status === "ALL" || p.status === patternFilter.status));
  document.getElementById("pattern-count").textContent = `${list.length} / ${REGIONAL_PATTERNS.length} 个候选模式`;
  document.getElementById("pattern-list").innerHTML = list.map((p) => `
    <article class="pattern-card">
      <header><div><span class="pattern-state ${p.status.toLowerCase()}">${esc(p.status)}</span><h3>${esc(p.name)}</h3><p>${esc(p.scope)}</p></div><div class="confidence-block"><small>CONFIDENCE</small><b>${esc(p.confidence)}</b></div></header>
      <div class="pattern-metrics"><span><b>${p.evidenceCount}</b> evidence</span><span><b>${p.markets.length}</b> markets</span><span><b>${p.archetypes.length}</b> archetype</span><span>核验 ${esc(p.lastVerified)}</span></div>
      <div class="component-list">${p.components.map((c) => `<span>${esc(c)}</span>`).join("")}</div>
      <dl class="trace-list"><div><dt>Markets observed</dt><dd>${p.markets.map(marketName).join(" · ")}</dd></div><div><dt>Supporting claims</dt><dd>${p.claims.map(esc).join(" · ")}</dd></div><div><dt>Counter evidence</dt><dd>${esc(p.counter)}</dd></div><div><dt>Research limitation</dt><dd>${esc(p.limitation)}</dd></div></dl>
    </article>`).join("") || `<div class="empty-state">没有符合条件的模式。</div>`;
}

/* ---------------- Phase 2：Design Library ---------------- */

let designType = "ALL";

function renderDesignLibrary() {
  const types = ["ALL", "Performance", "Sales Incentive"];
  document.getElementById("design-filter").innerHTML = types.map((type) =>
    `<button class="filter-chip ${designType === type ? "on" : ""}" data-design="${type}">${type === "ALL" ? "全部" : type}</button>`).join("");
  const list = DESIGN_PATTERNS.filter((p) => designType === "ALL" || p.type === designType);
  document.getElementById("design-count").textContent = `${list.length} 个结构化模式`;
  document.getElementById("design-list").innerHTML = list.map((p) => `
    <article class="design-card">
      <div class="design-top"><span class="eyebrow-small">${esc(p.type)}</span><span class="complexity complexity-${p.complexity.toLowerCase()}">${esc(p.complexity)} complexity</span></div>
      <h3>${esc(p.name)}</h3><p class="design-structure">${esc(p.structure)}</p>
      <div class="design-columns"><div><b>Potential advantages</b><ul>${p.advantages.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div><b>Trade-offs</b><ul>${p.tradeoffs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div>
      <div class="design-foot"><span>${p.markets.map(marketName).join(" · ")}</span><span>${p.evidence} evidence</span></div>
      <p class="limitation"><b>Limitation：</b>${esc(p.limitation)}</p>
    </article>`).join("");
}

/* ---------------- Phase 2：Scenario Lab ---------------- */

function renderScenarioSetup() {
  const options = MARKETS.map((m) => `<option value="${m.code}">${m.zh} · ${m.en}</option>`).join("");
  document.getElementById("scenario-market").innerHTML = options;
  document.getElementById("scenario-results").innerHTML = `<div class="empty-state">填写左侧轻量 Context，生成 3 个不排序的可选情景。</div>`;
}

function scenarioSet(context) {
  const market = marketName(context.market);
  const goal = { growth: "Increase sales", balance: "Balance individual and team performance", simple: "Simplify administration" }[context.goal] || context.goal;
  const choices = [
    { name: "Option A · Simple individual structure", pattern: DESIGN_PATTERNS.find((p) => p.id === "fixed-rate"), complexity: "Low", volatility: "Medium–High", explain: "High", admin: "Low", trade: "个人激励直接，但协作与成本波动需要单独治理。" },
    { name: "Option B · Individual + team balance", pattern: DESIGN_PATTERNS.find((p) => p.id === "individual-team"), complexity: "Medium", volatility: "Medium", explain: "Medium", admin: "Medium", trade: "兼顾个人和门店结果，但权重和例外处理更复杂。" },
    { name: "Option C · Threshold and accelerator", pattern: DESIGN_PATTERNS.find((p) => p.id === "threshold-accelerator"), complexity: "High", volatility: "High", explain: "Medium", admin: "High", trade: "强化目标差异化，同时提高成本波动与目标设定风险。" },
  ];
  document.getElementById("scenario-results").innerHTML = choices.map((s, i) => `
    <button class="scenario-card" data-scenario="${i}">
      <div class="scenario-head"><span>OPTION ${String.fromCharCode(65 + i)}</span><b>${esc(s.name.replace(/^Option . · /, ""))}</b></div>
      <p>${esc(s.pattern.structure)}</p>
      <div class="scenario-stats"><span>复杂度 <b>${s.complexity}</b></span><span>成本波动 <b>${s.volatility}</b></span><span>可解释性 <b>${s.explain}</b></span><span>运营影响 <b>${s.admin}</b></span></div>
      <small>${esc(s.trade)}</small>
    </button>`).join("");
  document.getElementById("scenario-evidence").innerHTML = `<div class="card-head"><h3>Evidence / Assumptions / Gaps</h3><span class="card-hint">${esc(market)}</span></div>
    <div class="evidence-section"><b>输入 Context</b><p>${esc(context.industry)} · ${esc(context.workforce)} · ${esc(goal)}<br>当前：${esc(context.current)}<br>约束：${esc(context.constraints || "未提供")}</p></div>
    <div class="evidence-section"><b>共同证据基础</b><p>使用 Design Library 中的 3 个销售激励结构；底层候选模式覆盖日本与香港，证据数仍有限。</p></div>
    <div class="evidence-section"><b>关键假设</b><p>仅讨论结构，不包含内部成本、员工分布、法规、财务目标或系统限制。</p></div>
    <div class="evidence-section gap"><b>Evidence gaps</b><p>${esc(market)} 的行业与企业规模证据需要补充；必须由 HR、Legal、Finance 和业务共同核验。</p></div>`;
}

/* ---------------- Phase 2：Vendor Fit ---------------- */

function renderVendorFitSetup() {
  document.getElementById("fit-market").innerHTML = MARKETS.map((m) => `<option value="${m.code}">${m.zh} · ${m.en}</option>`).join("");
  document.getElementById("fit-capabilities").innerHTML = CAPABILITIES.map((c, i) => `<label><input type="checkbox" name="capability" value="${esc(c)}" ${i < 4 ? "checked" : ""}> ${esc(c)}</label>`).join("");
  document.getElementById("fit-table").innerHTML = `<tbody><tr><td class="empty-state">选择需求后生成覆盖矩阵。</td></tr></tbody>`;
}

function fitStatus(vendor, market, capability) {
  const raw = vendor.caps[`${market}|${capability}`] || ["Unknown", ""];
  const map = { "Confirmed": "Confirmed Coverage", "Third-party Confirmed": "Confirmed Coverage", "Vendor Claimed": "Partial Coverage", "Unknown": "Unknown", "Conflicting": "Evidence Gap" };
  return { label: map[raw[0]] || "Unknown", source: raw[1], raw: raw[0] };
}

function analyzeVendorFit(requirement) {
  const selected = requirement.capabilities;
  const head = `<thead><tr><th>Vendor</th>${selected.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>`;
  const body = VENDORS.map((v) => `<tr><td><b>${esc(v.name)}</b><small>${esc(v.hq)}</small></td>${selected.map((c) => {
    const status = fitStatus(v, requirement.market, c);
    return `<td><span class="fit-state fit-${status.label.toLowerCase().replaceAll(" ", "-")}">${esc(status.label)}</span>${status.source ? `<a class="cap-src" href="${esc(status.source)}" target="_blank" rel="noopener">Evidence ↗</a>` : `<small class="fit-raw">${esc(status.raw)}</small>`}</td>`;
  }).join("")}</tr>`).join("");
  document.getElementById("fit-table").innerHTML = head + `<tbody>${body}</tbody>`;
  const gaps = VENDORS
    .flatMap((v) => selected.map((c) => ({ vendor: v, capability: c, status: fitStatus(v, requirement.market, c) })))
    .filter((x) => ["Unknown", "Partial Coverage", "Evidence Gap"].includes(x.status.label));
  document.getElementById("fit-rfi").innerHTML = `<div class="card-head"><h3>差异化 RFI Question Pack</h3><span class="card-hint">${gaps.length} 个待确认字段</span></div><div class="rfi-grid">${gaps.map((g) => `<div><b>${esc(g.vendor.name)} · ${esc(g.capability)}</b><p>${g.status.label === "Partial Coverage" ? "当前仅有供应商自述，请提供独立客户案例、实际服务范围与本地交付责任。" : g.status.label === "Evidence Gap" ? "公开信息存在冲突，请澄清当前能力、适用市场和证据日期。" : "当前没有足够公开信息，请确认是否提供该能力并附可验证来源。"}</p></div>`).join("") || `<div class="empty-state">所有必选字段均有可展开来源；仍需核验时效和适用范围。</div>`}</div>`;
}

/* ---------------- Phase 2：Market Signals ---------------- */

function renderSignals() {
  document.getElementById("signal-list").innerHTML = MARKET_SIGNALS.map((s) => `
    <article class="signal-card">
      <div class="signal-line"><span class="signal-strength strength-${s.strength.toLowerCase()}">${esc(s.strength)}</span><span class="direction">${esc(s.direction)} ↗</span></div>
      <h3>${esc(s.name)}</h3><p class="signal-type">${esc(s.type)} · ${s.markets.map(marketName).join(" · ")}</p>
      <p>${esc(s.why)}</p>
      <div class="signal-evidence"><span><b>${s.evidence}</b> supporting evidence</span><span><b>${s.counter}</b> counter signals</span><span>Confidence <b>${esc(s.confidence)}</b></span><span>First detected ${esc(s.first)}</span></div>
    </article>`).join("");
}

/* ---------------- 供应商 ---------------- */

let vendorMarket = "ALL";

function vendorCapState(s) {
  const cls = {
    "Confirmed": "cap-confirmed", "Third-party Confirmed": "cap-third",
    "Vendor Claimed": "cap-claimed", "Unknown": "cap-unknown",
    "Conflicting": "cap-conflicting",
  }[s];
  return `<span class="cap-state ${cls}">${s}</span>`;
}

function renderVendorList() {
  const list = vendorMarket === "ALL" ? VENDORS : VENDORS.filter((v) =>
    Object.keys(v.caps).some((k) => k.startsWith(vendorMarket + "|")));
  document.getElementById("vendor-count").textContent = `显示 ${list.length} / ${VENDORS.length} 家供应商`;

  document.getElementById("vendor-market-filter").innerHTML =
    `<button class="filter-chip ${vendorMarket === "ALL" ? "on" : ""}" data-m="ALL">全部市场</button>` +
    MARKETS.map((m) => `<button class="filter-chip ${vendorMarket === m.code ? "on" : ""}" data-m="${m.code}"><span class="dot" style="background:${m.color}"></span>${m.zh}</button>`).join("");

  document.getElementById("vendor-list").innerHTML = list.map((v) => {
    const rfis = rfiPack(v);
    const caps = CAPABILITIES.map((cap) => {
      const cellsHtml = MARKETS.map((m) => {
        const state = v.caps[`${m.code}|${cap}`] || ["Unknown", ""];
        return `<td>${vendorCapState(state[0])}
          ${state[1] ? `<span class="cap-src"><a href="${esc(state[1])}" target="_blank" rel="noopener">来源 ↗</a></span>` : ""}</td>`;
      }).join("");
      return `<tr><td>${cap}</td>${cellsHtml}</tr>`;
    }).join("");

    return `<div class="vendor-card">
      <div class="vendor-head">
        <div class="vendor-logo" style="background:${v.color}">${esc(v.name.slice(0, 2).toUpperCase())}</div>
        <div class="vendor-info">
          <h3>${esc(v.name)}</h3>
          <div class="v-sub">${esc(v.hq)} · <a href="${esc(v.website)}" target="_blank" rel="noopener">${esc(v.website.replace(/^https?:\/\//, ""))}</a> · ${esc(v.notes)}</div>
        </div>
        <div class="vendor-actions">
          <button class="btn btn-small" data-rfi="${esc(v.name)}">RFI 问题包（${rfis.length}）</button>
        </div>
      </div>
      <div class="vendor-table-wrap">
        <table class="cap-table">
          <thead><tr><th>能力</th>${MARKETS.map((m) => `<th>${m.zh} <small style="color:var(--muted)">${m.en}</small></th>`).join("")}</tr></thead>
          <tbody>${caps}</tbody>
        </table>
      </div>
    </div>`;
  }).join("");
}

function rfiPack(vendor) {
  const questions = [];
  for (const [key, [state, src]] of Object.entries(vendor.caps)) {
    if (state === "Unknown") {
      const [m, cap] = key.split("|");
      questions.push(`【${marketName(m)} · ${cap}】贵司在该市场是否提供此服务？请提供公开案例或客户证明（非营销页面）。`);
    } else if (state === "Vendor Claimed") {
      const [m, cap] = key.split("|");
      questions.push(`【${marketName(m)} · ${cap}】该能力仅见于贵司自述来源${src ? `（${src}）` : ""}，请提供第三方独立验证或客户案例。`);
    } else if (state === "Conflicting") {
      const [m, cap] = key.split("|");
      questions.push(`【${marketName(m)} · ${cap}】存在相互矛盾的公开信息，请澄清实际服务范围与交付模式。`);
    }
  }
  return questions;
}

function openRfi(name) {
  const vendor = VENDORS.find((v) => v.name === name);
  const questions = rfiPack(vendor);
  if (!questions.length) {
    showModal(`${esc(name)} · RFI 问题包`, `<p class="note">该供应商档案在当前演示数据中不存在 Unknown / Vendor Claimed / Conflicting 字段，无需 RFI。</p>`);
    return;
  }
  showModal(`${esc(name)} · RFI 问题包（${questions.length}）`,
    `<ul class="boundary-list">${questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>
     <p class="note">RFI 问题包按 Unknown / Vendor Claimed / Conflicting 字段自动生成，用于向供应商发函求证后再更新能力状态与来源。</p>`);
}

function showModal(title, bodyHtml) {
  const wrap = document.createElement("div");
  wrap.className = "drawer open";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
  wrap.innerHTML = `<div class="ask-hero card" style="max-width:640px;margin:16px;width:100%">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <h3 style="margin:0">${title}</h3>
      <button class="btn" style="background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2);color:#fff">关闭 ✕</button>
    </div>
    <div style="margin-top:12px">${bodyHtml}</div>
  </div>`;
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.textContent.includes("关闭")) { wrap.remove(); }
  });
  document.body.appendChild(wrap);
}

/* ---------------- 市场变化 ---------------- */

function renderChanges() {
  document.getElementById("changes-list").innerHTML =
    SAMPLE_CHANGES.length ? SAMPLE_CHANGES.map(changeRow).join("")
      : `<div class="empty-state">尚无已发布结论的变更。达到「已验证」门槛并人工审核发布后，历史版本会记录于此。</div>`;
}

/* ---------------- Ask Intelligence ---------------- */

function renderAsk() {
  const suggest = verifiedPractice().map((p) => p.category);
  document.getElementById("ask-suggest").innerHTML =
    suggest.map((s) => `<button class="filter-chip" type="button" data-q="${esc(s)}">${esc(s)}</button>`).join("");
}

function ask(query) {
  const term = (query || "").trim().slice(0, 100);
  const verified = verifiedPractice();
  const match = (p) => {
    const hay = [p.claim, p.category, marketName(p.market), p.domain].join(" ").toLowerCase();
    return term.split(/\s+/).filter((t) => t.length > 1).every((t) => hay.includes(t.toLowerCase()));
  };
  const results = term ? verified.filter(match).slice(0, 5) : [];
  const host = document.getElementById("ask-results");

  if (!term) {
    host.innerHTML = `<div class="ask-note">输入关键词开始检索。仅返回<b>已验证（Verified）</b>记录。</div>`;
    return;
  }
  if (!results.length) {
    host.innerHTML = `<div class="ask-note">没有检索到足够证据支撑的回答。<br>Ask Intelligence 仅检索已验证的内部记录；当前没有证据时拒绝猜测，不伪装成已接入大模型或外部研究。</div>`;
    return;
  }
  host.innerHTML = `<div class="ask-note">以下是已核验记录，请展开查看原始证据与适用范围。</div>` +
    results.map((p) => `
    <div class="ask-result">
      <h4>${marketDot(p.market)} ${marketName(p.market)} · ${esc(p.category)} ${badge("Verified")}</h4>
      <p>${esc(p.claim)}</p>
      <div class="ask-foot"><span>可信度：<b>${p.confidence}</b> / 100</span><span>证据 ${p.evidence.length} 条</span><span>发布于 ${esc(p.claimDate || "—")}</span></div>
    </div>`).join("");
}

/* ---------------- 方法论 ---------------- */

function renderMethod() {
  document.getElementById("weight-chart").innerHTML = SCORE_WEIGHTS.map((w) => `
    <div class="weight-row"><span>${w.name}</span>
      <div class="weight-track"><div class="weight-fill" style="width:${w.weight}%"></div></div>
      <b>${w.weight}%</b></div>`).join("") +
    `<p class="note">${SCORE_WEIGHTS.map((w) => `${w.name}：${w.desc}`).join("；")}。</p>`;

  document.getElementById("tier-list").innerHTML = TIERS.map((t) => `
    <div class="tier-row">${tierBadge(t.tier)}<p><b>${esc(t.label)}</b> — ${esc(t.desc)}</p></div>`).join("");

  document.getElementById("boundary-list").innerHTML = BOUNDARIES.map((b) => `<li>${esc(b)}</li>`).join("");
}

/* ---------------- 详情抽屉 ---------------- */

function openPracticeDetail(market, category) {
  const p = practices.find((x) => x.market === market && x.category === category);
  if (!p) return;
  const m = MARKETS.find((x) => x.code === market);
  document.getElementById("drawer-market").textContent = `${m.zh} · ${m.en}`;
  document.getElementById("drawer-title").textContent = `${market} · ${category}`;
  document.getElementById("drawer-question").textContent = p.question;
  document.getElementById("drawer-body").innerHTML = `
    <div class="drawer-section">
      <h4>状态</h4>
      ${badge(p.status)} <span class="conf-ring" style="margin-left:8px">置信度 <b>${p.confidence}</b> / 100</span>
      ${p.claim ? `<div class="claim-box" style="margin-top:10px"><b>已发布结论（示例）：</b>${esc(p.claim)}</div>` : ""}
      ${p.claimDate ? `<div class="change-meta">发布于 ${esc(p.claimDate)}</div>` : ""}
    </div>
    <div class="drawer-section">${confidenceBreakdown(p)}</div>
    <div class="drawer-section">
      <h4>证据与来源（${p.evidence.length}）</h4>
      ${p.evidence.length ? `<table class="ev-table">
        <thead><tr><th>来源</th><th>Tier</th><th>方向</th><th>发布</th><th>人群</th></tr></thead>
        <tbody>${p.evidence.map((e) => `
          <tr><td>${esc(e.source)}<span class="ev-excerpt">${esc(e.excerpt)}</span>
            <span class="ev-excerpt"><a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.domain)} ↗</a></span></td>
            <td>${tierBadge(e.tier)}</td><td>${stanceBadge(e.stance)}</td>
            <td>${esc(e.published_on || "—")}</td><td>${esc(e.population)}</td></tr>`).join("")}
        </tbody></table>` : `<div class="note">待研究主题：暂无证据。</div>`}
    </div>
    <div class="drawer-section">
      <h4>结论变更历史（示例）</h4>
      ${SAMPLE_CHANGES.filter((c) => c.market === market && c.category === category).map((c) => `
        <div class="change-item" style="border:none;padding:8px 0">
          <div class="change-body">
            <div class="change-why">${esc(c.reason)}</div>
            <span class="change-old">${esc(c.old)}</span><span class="change-new">${esc(c.next)}</span>
            <div class="change-meta" style="margin-top:4px">${esc(c.date)} · 置信度 ${esc(c.score)}</div>
          </div>
        </div>`).join("") || `<div class="note">无历史结论变更。</div>`}
    </div>`;
  const drawer = document.getElementById("drawer");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

/* ---------------- 事件绑定与初始化 ---------------- */

document.addEventListener("click", (e) => {
  const nav = e.target.closest(".nav-item");
  if (nav) { switchView(nav.dataset.view); return; }

  const mf = e.target.closest("#market-filter .filter-chip");
  if (mf) {
    document.querySelectorAll("#market-filter .filter-chip").forEach((c) => c.classList.remove("on"));
    mf.classList.add("on");
    practiceFilter.market = mf.dataset.m;
    renderPracticeList();
    return;
  }
  const cmf = e.target.closest("#compare-market-filter .filter-chip");
  if (cmf) {
    const code = cmf.dataset.m;
    if (compareMarkets.includes(code)) {
      compareMarkets = compareMarkets.filter((x) => x !== code);
      cmf.classList.remove("on");
    } else if (compareMarkets.length < 4) {
      compareMarkets.push(code);
      cmf.classList.add("on");
    }
    renderCompare();
    return;
  }
  const vmf = e.target.closest("#vendor-market-filter .filter-chip");
  if (vmf) {
    vendorMarket = vmf.dataset.m;
    document.querySelectorAll("#vendor-market-filter .filter-chip").forEach((c) => c.classList.remove("on"));
    vmf.classList.add("on");
    renderVendorList();
    return;
  }
  const design = e.target.closest("#design-filter .filter-chip");
  if (design) {
    designType = design.dataset.design;
    renderDesignLibrary();
    return;
  }
  const scenario = e.target.closest(".scenario-card");
  if (scenario) {
    document.querySelectorAll(".scenario-card").forEach((card) => card.classList.remove("selected"));
    scenario.classList.add("selected");
    const index = Number(scenario.dataset.scenario);
    const names = ["简单个人结构", "个人与团队平衡", "门槛与加速器"];
    const rail = document.getElementById("scenario-evidence");
    rail.querySelectorAll(".selected-option").forEach((item) => item.remove());
    rail.insertAdjacentHTML("beforeend", `<div class="evidence-section selected-option"><b>当前查看</b><p>${esc(names[index])}。这是用于比较的可选结构，不代表平台推荐。</p></div>`);
    return;
  }

  const head = e.target.closest(".practice-head");
  if (head) {
    const item = head.closest(".practice-item");
    item.classList.toggle("open");
    head.querySelector(".practice-open").textContent = item.classList.contains("open") ? "收起 ▾" : "展开 ▸";
    return;
  }

  const cell = e.target.closest(".cell-practice");
  if (cell) {
    const [m, c] = cell.dataset.key.split("|");
    openPracticeDetail(m, c);
    return;
  }

  const rfi = e.target.closest("[data-rfi]");
  if (rfi) { openRfi(rfi.dataset.rfi); return; }

  const sugg = e.target.closest("#ask-suggest .filter-chip");
  if (sugg) {
    document.getElementById("ask-input").value = sugg.dataset.q;
    ask(sugg.dataset.q);
  }
});

document.getElementById("domain-filter").addEventListener("change", (e) => {
  practiceFilter.domain = e.target.value;
  renderPracticeList();
});
document.getElementById("status-filter").addEventListener("change", (e) => {
  practiceFilter.status = e.target.value;
  renderPracticeList();
});
document.getElementById("pattern-domain").addEventListener("change", (e) => {
  patternFilter.domain = e.target.value;
  renderPatterns();
});
document.getElementById("pattern-status").addEventListener("change", (e) => {
  patternFilter.status = e.target.value;
  renderPatterns();
});
document.getElementById("scenario-form").addEventListener("submit", (e) => {
  e.preventDefault();
  scenarioSet(Object.fromEntries(new FormData(e.currentTarget)));
});
document.getElementById("fit-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const capabilities = form.getAll("capability");
  if (!capabilities.length) {
    document.getElementById("fit-rfi").innerHTML = `<div class="empty-state">请至少选择一个必须能力。</div>`;
    return;
  }
  analyzeVendorFit({ market: form.get("market"), scale: form.get("scale"), capabilities });
});
document.getElementById("ask-form").addEventListener("submit", (e) => {
  e.preventDefault();
  ask(document.getElementById("ask-input").value);
});
document.getElementById("drawer-close").addEventListener("click", () => {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawer").setAttribute("aria-hidden", "true");
});
document.getElementById("drawer").addEventListener("click", (e) => {
  if (e.target.id === "drawer") {
    document.getElementById("drawer").classList.remove("open");
    document.getElementById("drawer").setAttribute("aria-hidden", "true");
  }
});
document.getElementById("hamburger").addEventListener("click", () => {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("backdrop").classList.add("show");
  document.getElementById("hamburger").setAttribute("aria-expanded", "true");
});
document.getElementById("backdrop").addEventListener("click", () => {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("backdrop").classList.remove("show");
  document.getElementById("hamburger").setAttribute("aria-expanded", "false");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("drawer").classList.remove("open");
    document.getElementById("drawer").setAttribute("aria-hidden", "true");
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("backdrop").classList.remove("show");
  }
});

function init() {
  practices = buildPractices();
  renderPracticeFilters();
  renderOverview();
  renderCompare();
  renderPatterns();
  renderDesignLibrary();
  renderScenarioSetup();
  renderVendorFitSetup();
  renderVendorList();
  renderSignals();
  renderChanges();
  renderAsk();
  renderMethod();
  renderPracticeList();

  const initial = location.hash.replace("#", "");
  switchView(VIEWS.includes(initial) ? initial : "overview", false);
}

document.addEventListener("DOMContentLoaded", init);
