# Phase 2 Plan Part 4: Implementation Plan

## 5. AI Agent Architecture

### Agent Definitions

| Agent | Input | Output | Trigger |
|-------|-------|--------|---------|
| EvidenceRetrievalAgent | Query, market, domain | Verified evidence list | On-demand |
| GapResearchAgent | Practice with low evidence | Research suggestions | Auto on confidence < 30 |
| PatternMiningAgent | Verified claims grouped | Practice pattern candidates | Scheduled + on-demand |
| CrossMarketSynthesisAgent | Cross-market evidence | Regional patterns | On-demand |
| ScenarioBuilderAgent | User context + patterns | 2-4 scenario options | User-triggered |
| VendorFitAnalyzerAgent | Requirements + vendor capabilities | Fit records per vendor | User-triggered |
| RFIGeneratorAgent | Requirements + fit gaps | Vendor-specific questions | User-triggered |
| SignalDetectionAgent | Multiple changes | Market signals | Scheduled |
| VerificationAgent | New patterns/signals/claims | Verification results | Auto on creation |

### Shared Infrastructure

All agents share:
- Evidence Schema (same JSON format)
- Source Registry (same source definitions)
- Confidence Logic (same scoring weights)
- Taxonomy (same markets, domains, categories)
- Prompt Template System (externalized in prompts/)
- Structured Output Validation (JSON Schema)

### Base Agent Pattern

```python
class BaseAgent:
    name: str
    model: str  # Configurable (GPT-4, Claude, etc.)
    temperature: float
    max_tokens: int

    def build_prompt(self, context: dict) -> str: ...
    def validate_output(self, raw: str, schema: dict) -> dict: ...
    def execute(self, context: dict) -> dict: ...
    def log(self, message: str): ...
```

---

## 6. Implementation Roadmap

### P0 (Weeks 1-4): Foundation + Core Intelligence

**Task 1: Phase 1 Frontend (Missing static/)**
- Create static/index.html, styles.css, app.js
- Implement Phase 1 views: Dashboard, Practice Intelligence, Market Comparison, Vendor Intelligence, Changes, Ask Intelligence
- Responsive design, dark/light theme
- Deliverable: Functional Phase 1 UI

**Task 2: Extract Service Layer**
- Create database.py (schema, migrations, connection pool)
- Create models.py (dataclasses for all Phase 1 entities)
- Create config.py (taxonomy, thresholds, AI config)
- Extract business logic from server.py into services/
- server.py becomes thin API gateway that delegates to services
- Deliverable: Clean separation of concerns

**Task 3: Company Archetype Data Model**
- Create company_archetypes table (SQL above)
- Create archetype_service.py
- Add API endpoints: GET/POST /api/archetypes
- Deliverable: Archetype CRUD

**Task 4: Cross-market Intelligence Engine**
- Create regional_patterns table
- Create pattern_service.py (regional pattern analysis)
- Implement: Verified Claims -> Scope Filtering -> Evidence Aggregation -> Similarity/Difference Analysis -> Pattern Candidate -> Evidence Validation
- Add API endpoints: GET/POST /api/regional-patterns
- Deliverable: Regional pattern detection

**Task 5: Evidence Traceability Enhancement**
- Create intelligence_versions table
- Add version tracking to all intelligence updates
- Implement automatic version history on claim updates
- Add API endpoint: GET /api/practices/{id}/evolution
- Deliverable: Full version history

**Task 6: Practice Pattern Mining**
- Create practice_patterns table
- Implement Pattern Mining Agent
- Logic: Verified Claims -> Normalize -> Group by Market/Industry/Archetype -> Detect Repeated Combinations -> Identify Supporting/Counter Evidence -> Generate Pattern Candidate -> Verify -> Calculate Confidence -> Publish
- Minimum 2 sources required for pattern publication
- Add API endpoints: GET/POST /api/patterns
- Deliverable: Pattern mining engine

### P1 (Weeks 5-8): Design Library + Simulation + Vendor Fit

**Task 7: Practice Design Library**
- Create design_patterns table
- Seed with initial patterns:
  - Performance: 3-point, 4-point, 5-point, Rating-less, Absolute, Relative, Hybrid, Annual, Semi-annual, Continuous
  - Sales Incentive: Individual x Fixed, Individual+Store, Threshold-Target-Accelerator, Team Pool, Capped, Uncapped
- Create design_library_service.py
- Add API endpoints: GET /api/design-patterns
- Deliverable: Design pattern library

**Task 8: Scenario Simulator**
- Create scenarios and scenario_options tables
- Implement Scenario Builder Agent
- Input: Market, Industry, Workforce, Business Goal, Current Model, Constraints
- Output: 2-4 parallel scenarios with evidence, complexity, trade-offs
- No ranking, no "best" recommendation
- Add API endpoints: GET/POST /api/scenarios
- Deliverable: Scenario simulation engine

**Task 9: Vendor Fit Analysis**
- Create requirement_profiles and vendor_fit_records tables
- Implement Vendor Fit Analyzer Agent
- Matching: Requirement Profile x Vendor Capability -> Fit Status
- Status only: Confirmed Coverage, Partial Coverage, Unknown, Capability Gap, Evidence Gap
- No scores, no rankings, no "best vendor"
- Add API endpoints: GET/POST /api/requirement-profiles, GET /api/requirement-profiles/{id}/fit
- Deliverable: Requirement-driven vendor analysis

**Task 10: RFI Copilot**
- Create rfi_questions table
- Implement RFI Generator Agent
- Logic: Requirements + Fit Gaps -> Vendor-specific questions
- Focus on Unknown/Evidence Gap items
- Reduce questions where high-confidence public evidence exists
- Add API endpoint: POST /api/requirement-profiles/{id}/rfi
- Deliverable: Automated RFI generation

### P2 (Weeks 9-12): Signals + Evolution + Context

**Task 11: Market Signal Detection**
- Create market_signals table
- Implement Signal Detection Agent
- Logic: Multiple Changes -> Semantic Clustering -> Topic Detection -> Cross-source Validation -> Trend Strength -> Signal Candidate -> Verification
- Signal Strength: Weak, Building, Established
- Direction: Increasing, Stable, Weakening, Mixed
- Add API endpoints: GET /api/signals
- Deliverable: Market signal engine

**Task 12: Practice Evolution Timeline**
- Create practice_evolutions table
- Enhance with versioned intelligence tracking
- Implement automatic evolution detection on evidence updates
- Deliverable: Practice evolution timeline

**Task 13: Contextual Analysis**
- Create context_profiles table
- Implement Context Analysis Service
- Input: Country, Industry, Scale, Workforce, Current Model, Pain Point
- Output: Current Model description, Market Observations, Key Differences, Evidence Strength, Questions
- No "your model is wrong" or "adopt X" conclusions
- Add API endpoint: POST /api/context-analysis
- Deliverable: Context-driven difference analysis

**Task 14: AI Prompt System**
- Create prompts/ directory with all prompt templates
- Create schemas.py with JSON Schema for all structured outputs
- Ensure all agents use shared prompts and validation
- Deliverable: Prompt management system

**Task 15: Frontend Phase 2 Views**
- Add to app.js: Regional Intelligence, Pattern Explorer, Design Library, Scenario Lab, Vendor Fit, RFI Copilot, Market Signals, Practice Timeline
- Keep professional HR Intelligence style (not chatbot)
- Deliverable: Complete Phase 2 UI

---

## 7. Validation Checklist

After P0 implementation:
- [ ] Existing Phase 1 functions still work (no regression)
- [ ] No data loss on existing database
- [ ] Evidence links correct for all new entities
- [ ] AI structured output valid (JSON Schema)
- [ ] Unknown handling correct (no guessing)
- [ ] Cross-market results traceable to evidence
- [ ] Company Archetype classifications only from evidence (not AI guesses)
- [ ] Pattern requires minimum 2 sources
- [ ] All AI outputs display confidence, last_verified, evidence_count, scope, source
- [ ] Phase 1 API endpoints unchanged and functional

After P1 implementation:
- [ ] Design Library shows "Available Design Patterns" not "Recommended Best Practices"
- [ ] Scenario Simulator generates 2-4 parallel options, no ranking
- [ ] Vendor Fit uses only specified status values, no scores/rankings
- [ ] RFI Copilot reduces questions where high-confidence evidence exists

After P2 implementation:
- [ ] Market Signals require multiple changes and cross-source validation
- [ ] Practice Evolution preserves all historical versions
- [ ] Contextual Analysis outputs difference analysis, not recommendations

---

## 8. Key Constraints from PRD

1. **No AI guessing** - Unknown when evidence insufficient
2. **No "Best Practice" labeling** - Show "Available Design Patterns" only
3. **No vendor ranking/scoring** - Show requirement coverage only
4. **No "Recommended Scenario"** - Parallel display, no ranking
5. **Evidence-first** - All AI outputs must trace to supporting evidence
6. **Version history** - All intelligence updates must be versioned
7. **No overwriting history** - append-only for claim changes
8. **Modular AI** - No single giant prompt for all tasks
9. **Configuration-driven** - Taxonomy, thresholds configurable
10. **Backward compatible** - Phase 1 must continue working

---

## 9. Final Deliverables

1. Current Architecture Analysis (Part 1)
2. Phase 2 Gap Analysis (Part 2)
3. Target Architecture (Part 2)
4. Database / Entity Design (Part 3)
5. AI Agent Architecture (Part 4, Section 5)
6. API Design (Part 2, Section 2.3)
7. Frontend Architecture (Part 2, Section 3.2)
8. P0/P1/P2 Implementation Roadmap (Part 4, Section 6)
9. Validation Checklist (Part 4, Section 7)
10. Key Constraints (Part 4, Section 8)
