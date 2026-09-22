# Phase 2 Plan Part 3: Database Design

## New Tables SQL

```sql
-- Company Archetype (PRD Section 5)
CREATE TABLE IF NOT EXISTS company_archetypes (
    id INTEGER PRIMARY KEY,
    market TEXT NOT NULL REFERENCES markets(code),
    company_origin TEXT NOT NULL DEFAULT 'Unknown'
        CHECK(company_origin IN ('Local','US MNC','European MNC','Asian MNC','Chinese MNC','Unknown')),
    company_size TEXT NOT NULL DEFAULT 'Unknown'
        CHECK(company_size IN ('<500','500-5000','5000-50000','50000+','Unknown')),
    industry TEXT NOT NULL DEFAULT 'Other'
        CHECK(industry IN ('Retail','Technology','Manufacturing','Consumer Electronics','Internet','Financial Services','Other')),
    workforce_type TEXT NOT NULL DEFAULT 'Unknown'
        CHECK(workforce_type IN ('Office','Retail','Sales','Manufacturing','Mixed','Unknown')),
    source_evidence_id INTEGER REFERENCES evidence(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(market, company_origin, company_size, industry, workforce_type)
);

-- Regional Pattern (PRD Section 4)
CREATE TABLE IF NOT EXISTS regional_patterns (
    id INTEGER PRIMARY KEY,
    pattern_name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'Regional',
    markets TEXT NOT NULL,  -- JSON array of market codes
    industries TEXT NOT NULL DEFAULT '[]',  -- JSON array
    company_archetypes TEXT NOT NULL DEFAULT '[]',  -- JSON array
    workforce_types TEXT NOT NULL DEFAULT '[]',  -- JSON array
    pattern_type TEXT NOT NULL
        CHECK(pattern_type IN ('Common Practice','Market Difference','Outlier',
                               'Emerging Practice','Evidence Gap','Regional Pattern')),
    observed_components TEXT NOT NULL DEFAULT '[]',  -- JSON array
    supporting_claim_ids TEXT NOT NULL DEFAULT '[]',  -- JSON array
    counter_evidence_ids TEXT NOT NULL DEFAULT '[]',  -- JSON array
    evidence_count INTEGER NOT NULL DEFAULT 0,
    confidence INTEGER NOT NULL DEFAULT 0,
    first_detected TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_verified TEXT,
    status TEXT NOT NULL DEFAULT 'Emerging'
        CHECK(status IN ('Emerging','Established','Weakening','Conflicting')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Practice Pattern (PRD Section 6)
CREATE TABLE IF NOT EXISTS practice_patterns (
    id INTEGER PRIMARY KEY,
    pattern_name TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'Cross-market',
    markets TEXT NOT NULL,  -- JSON array
    industries TEXT NOT NULL DEFAULT '[]',
    company_archetypes TEXT NOT NULL DEFAULT '[]',
    workforce_types TEXT NOT NULL DEFAULT '[]',
    domain TEXT NOT NULL,
    category TEXT NOT NULL,
    pattern_description TEXT NOT NULL DEFAULT '',
    observed_components TEXT NOT NULL DEFAULT '[]',
    supporting_claim_ids TEXT NOT NULL DEFAULT '[]',
    counter_evidence_ids TEXT NOT NULL DEFAULT '[]',
    evidence_count INTEGER NOT NULL DEFAULT 0,
    confidence INTEGER NOT NULL DEFAULT 0,
    first_detected TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_verified TEXT,
    status TEXT NOT NULL DEFAULT 'Emerging'
        CHECK(status IN ('Emerging','Established','Weakening','Conflicting')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Design Pattern Library (PRD Section 7)
CREATE TABLE IF NOT EXISTS design_patterns (
    id INTEGER PRIMARY KEY,
    pattern_type TEXT NOT NULL
        CHECK(pattern_type IN ('Performance','Sales Incentive')),
    pattern_name TEXT NOT NULL,
    structure TEXT NOT NULL DEFAULT '',
    observed_markets TEXT NOT NULL DEFAULT '[]',
    observed_archetypes TEXT NOT NULL DEFAULT '[]',
    suitable_context TEXT NOT NULL DEFAULT '',
    operational_complexity TEXT NOT NULL DEFAULT 'Unknown'
        CHECK(operational_complexity IN ('Low','Medium','High','Unknown')),
    potential_advantages TEXT NOT NULL DEFAULT '[]',
    trade_offs TEXT NOT NULL DEFAULT '[]',
    supporting_evidence TEXT NOT NULL DEFAULT '[]',
    limitations TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'Draft'
        CHECK(status IN ('Draft','Published','Archived')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Scenario (PRD Section 8)
CREATE TABLE IF NOT EXISTS scenarios (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    market TEXT NOT NULL REFERENCES markets(code),
    industry TEXT NOT NULL DEFAULT 'Other',
    workforce TEXT NOT NULL DEFAULT 'Mixed',
    business_goal TEXT NOT NULL DEFAULT '',
    current_model TEXT NOT NULL DEFAULT '',
    constraints TEXT NOT NULL DEFAULT '',
    employee_scale TEXT DEFAULT '',
    current_performance_cycle TEXT DEFAULT '',
    pain_point TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Draft'
        CHECK(status IN ('Draft','Generating','Ready','Archived')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Scenario Options (2-4 per scenario)
CREATE TABLE IF NOT EXISTS scenario_options (
    id INTEGER PRIMARY KEY,
    scenario_id INTEGER NOT NULL REFERENCES scenarios(id),
    option_name TEXT NOT NULL,
    design_structure TEXT NOT NULL DEFAULT '',
    market_evidence TEXT NOT NULL DEFAULT '[]',  -- JSON array of evidence IDs
    operational_complexity TEXT NOT NULL DEFAULT 'Unknown',
    cost_volatility TEXT NOT NULL DEFAULT 'Unknown'
        CHECK(cost_volatility IN ('Low','Medium','High','Unknown')),
    explainability TEXT NOT NULL DEFAULT 'Unknown'
        CHECK(explainability IN ('High','Medium','Low','Unknown')),
    admin_impact TEXT NOT NULL DEFAULT '',
    key_trade_offs TEXT NOT NULL DEFAULT '[]',
    evidence_gaps TEXT NOT NULL DEFAULT '[]',
    assumptions TEXT NOT NULL DEFAULT '[]',
    confidence INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Requirement Profile (PRD Section 9)
CREATE TABLE IF NOT EXISTS requirement_profiles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    markets TEXT NOT NULL DEFAULT '[]',
    employee_scale TEXT DEFAULT '',
    industry TEXT DEFAULT '',
    workforce TEXT DEFAULT '',
    payroll_capability TEXT DEFAULT 'Unknown',
    tax_capability TEXT DEFAULT 'Unknown',
    statutory_reporting TEXT DEFAULT 'Unknown',
    variable_pay TEXT DEFAULT 'Unknown',
    commission TEXT DEFAULT 'Unknown',
    performance_management TEXT DEFAULT 'Unknown',
    api_integration TEXT DEFAULT 'Unknown',
    language TEXT DEFAULT '',
    local_team TEXT DEFAULT 'Unknown',
    managed_service TEXT DEFAULT 'Unknown',
    security TEXT DEFAULT 'Unknown',
    implementation_requirement TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Draft'
        CHECK(status IN ('Draft','Ready','In Use')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Vendor Fit Record (PRD Section 9)
CREATE TABLE IF NOT EXISTS vendor_fit_records (
    id INTEGER PRIMARY KEY,
    requirement_profile_id INTEGER NOT NULL REFERENCES requirement_profiles(id),
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    capability_name TEXT NOT NULL,
    requirement_value TEXT NOT NULL DEFAULT '',
    vendor_capability_status TEXT NOT NULL DEFAULT 'Unknown',
    fit_status TEXT NOT NULL DEFAULT 'Unknown'
        CHECK(fit_status IN ('Confirmed Coverage','Partial Coverage','Unknown','Capability Gap','Evidence Gap')),
    evidence_id INTEGER REFERENCES evidence(id),
    source_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requirement_profile_id, vendor_id, capability_name)
);

-- RFI Question (PRD Section 10)
CREATE TABLE IF NOT EXISTS rfi_questions (
    id INTEGER PRIMARY KEY,
    requirement_profile_id INTEGER NOT NULL REFERENCES requirement_profiles(id),
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'Standard'
        CHECK(priority IN ('Critical','Important','Standard')),
    capability_name TEXT DEFAULT '',
    fit_status TEXT DEFAULT 'Unknown',
    generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'Generated'
        CHECK(status IN ('Generated','Edited','Sent','Answered')),
    response TEXT DEFAULT '',
    notes TEXT DEFAULT ''
);

-- Market Signal (PRD Section 11)
CREATE TABLE IF NOT EXISTS market_signals (
    id INTEGER PRIMARY KEY,
    signal_name TEXT NOT NULL,
    supporting_evidence TEXT NOT NULL DEFAULT '[]',
    counter_evidence TEXT NOT NULL DEFAULT '[]',
    markets TEXT NOT NULL DEFAULT '[]',
    domain TEXT DEFAULT '',
    category TEXT DEFAULT '',
    signal_strength TEXT NOT NULL DEFAULT 'Weak'
        CHECK(signal_strength IN ('Weak','Building','Established')),
    direction TEXT NOT NULL DEFAULT 'Stable'
        CHECK(direction IN ('Increasing','Stable','Weakening','Mixed')),
    confidence INTEGER NOT NULL DEFAULT 0,
    why_it_matters TEXT NOT NULL DEFAULT '',
    first_detected TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'Emerging'
        CHECK(status IN ('Emerging','Confirmed','Archived'))
);

-- Practice Evolution (PRD Section 12)
CREATE TABLE IF NOT EXISTS practice_evolutions (
    id INTEGER PRIMARY KEY,
    practice_id INTEGER NOT NULL REFERENCES practices(id),
    previous_practice TEXT NOT NULL DEFAULT '',
    new_practice TEXT NOT NULL DEFAULT '',
    supporting_evidence TEXT NOT NULL DEFAULT '[]',
    change_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confidence_change INTEGER NOT NULL DEFAULT 0,
    market TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'Market',
    reason TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Context Profile (PRD Section 13)
CREATE TABLE IF NOT EXISTS context_profiles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'My Context',
    country TEXT NOT NULL REFERENCES markets(code),
    industry TEXT NOT NULL DEFAULT '',
    employee_scale TEXT DEFAULT '',
    workforce TEXT DEFAULT '',
    current_performance_cycle TEXT DEFAULT '',
    current_commission_model TEXT DEFAULT '',
    pain_point TEXT DEFAULT '',
    analysis_result TEXT DEFAULT '{}',  -- JSON blob
    status TEXT NOT NULL DEFAULT 'Draft'
        CHECK(status IN ('Draft','Analyzed','Archived')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Intelligence Version History (PRD Sections 12, 17)
CREATE TABLE IF NOT EXISTS intelligence_versions (
    id INTEGER PRIMARY KEY,
    entity_type TEXT NOT NULL,  -- 'practice', 'pattern', 'signal', 'scenario'
    entity_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    snapshot TEXT NOT NULL,  -- JSON snapshot
    change_reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Phase 2
CREATE INDEX IF NOT EXISTS idx_pattern_market ON practice_patterns(markets);
CREATE INDEX IF NOT EXISTS idx_signal_market ON market_signals(markets);
CREATE INDEX IF NOT EXISTS idx_evolution_practice ON practice_evolutions(practice_id);
CREATE INDEX IF NOT EXISTS idx_vendor_fit_req ON vendor_fit_records(requirement_profile_id);
CREATE INDEX IF NOT EXISTS idx_rfi_vendor ON rfi_questions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_version_entity ON intelligence_versions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_scenario_market ON scenarios(market);
CREATE INDEX IF NOT EXISTS idx_design_type ON design_patterns(pattern_type);
```

## Entity Relationships

```
markets --1:N--> practices --1:N--> evidence
                  |                    |
                  +--1:N--> claim_history
                  |
                  +--1:N--> practice_evolutions
                  |
                  +--M:N--> practice_patterns (via JSON arrays)
                              |
                              +--M:N--> design_patterns

vendors --1:N--> vendor_capabilities
    |
    +--M:N--> vendor_fit_records --> requirement_profiles
    |
    +--1:N--> rfi_questions --> requirement_profiles

company_archetypes -- referenced by --> regional_patterns, practice_patterns, scenarios

scenarios --1:N--> scenario_options

market_signals --M:N--> evidence (via JSON arrays)

context_profiles -- standalone --> analysis_result (JSON)

intelligence_versions -- polymorphic --> all entities
```
