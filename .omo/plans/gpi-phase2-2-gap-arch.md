# Phase 2 Plan Part 2: Gap Analysis & Target Architecture

## 2.1 New Capabilities Required

| Phase 2 Module | PRD Section | Current State | Gap Level |
|----------------|-------------|---------------|-----------|
| Company Archetype | Section 5 | Not implemented | **NEW** |
| Cross-market Intelligence | Section 4 | Basic compare matrix only | **MAJOR** |
| Practice Pattern Mining | Section 6 | Not implemented | **NEW** |
| Practice Design Library | Section 7 | Not implemented | **NEW** |
| Scenario Simulator | Section 8 | Not implemented | **NEW** |
| Vendor Fit Analysis | Section 9 | Basic capability matrix | **MAJOR** |
| RFI Copilot | Section 10 | Basic RFI questions | **MODERATE** |
| Market Signal Detection | Section 11 | Not implemented | **NEW** |
| Practice Evolution Timeline | Section 12 | claim_history exists | **MODERATE** |
| Contextual Analysis | Section 13 | Not implemented | **NEW** |
| AI Agent Architecture | Section 14 | None | **NEW** |
| Frontend (Phase 1) | Section 18 | static/ missing | **NEW** |
| Frontend (Phase 2) | Section 18 | None | **NEW** |

## 2.2 New Database Entities Required (14 tables)

| Entity | PRD Section | Dependencies |
|--------|-------------|-------------|
| `company_archetypes` | Section 5 | Markets, Evidence |
| `regional_patterns` | Section 4 | Practices, Evidence |
| `practice_patterns` | Section 6 | Practices, Evidence |
| `design_patterns` | Section 7 | Patterns, Evidence |
| `scenarios` | Section 8 | Patterns, Design Library |
| `scenario_options` | Section 8 | Scenarios |
| `requirement_profiles` | Section 9 | Vendors |
| `vendor_fit_records` | Section 9 | Requirements, Vendor Capabilities |
| `rfi_questions` | Section 10 | Requirements, Vendors |
| `market_signals` | Section 11 | Evidence, Changes |
| `practice_evolutions` | Section 12 | Practices, Evidence |
| `context_profiles` | Section 13 | User input |
| `intelligence_versions` | Section 12/17 | All entities |

## 2.3 New API Endpoints Required

- Cross-market Intelligence: GET/POST /api/regional-patterns
- Pattern Mining: GET/POST /api/patterns
- Design Library: GET /api/design-patterns
- Scenario Simulator: GET/POST /api/scenarios
- Vendor Fit: GET/POST /api/requirement-profiles, GET /api/requirement-profiles/{id}/fit, POST /api/requirement-profiles/{id}/rfi
- Market Signals: GET /api/signals
- Practice Evolution: GET /api/practices/{id}/evolution
- Contextual Analysis: POST /api/context-analysis

## 3.1 System Architecture Layers

```
+-----------------------------------------------------+
|                    User Interface                     |
|  Dashboard | Patterns | Scenarios | Vendor Fit | ... |
+-----------------------------------------------------+
|              API Gateway (server.py extended)         |
+-----------------------------------------------------+
|           Application Services Layer                  |
|  EvidenceService | PatternService | ScenarioService   |
|  VendorFitService | SignalService | ArchetypeService  |
+-----------------------------------------------------+
|              AI Agent Layer                           |
|  EvidenceRetrieval | PatternMining | ScenarioBuilder  |
|  VendorFitAnalyzer | RFIGenerator | SignalDetection   |
|  CrossMarketSynthesis | VerificationAgent            |
+-----------------------------------------------------+
|           Pattern & Reasoning Layer                   |
|  Cross-market Comparison | Pattern Detection          |
|  Similarity Analysis | Signal Clustering              |
+-----------------------------------------------------+
|           Evidence & Verification Layer               |
|  Confidence Scoring | Tier System | Independence      |
+-----------------------------------------------------+
|           Structured Intelligence Database            |
|  SQLite (Phase 1 tables + Phase 2 entities)           |
+-----------------------------------------------------+
|           Research / Crawling Layer (Phase 2+)         |
|  Source Discovery | Content Fetching | Change Detection|
+-----------------------------------------------------+
```

## 3.2 File Structure (Target)

```
Global-Pay-Performance-Intelligence/
├── server.py                    # Phase 1 API (preserved, extended)
├── config.py                    # Taxonomy, thresholds, AI config
├── models.py                    # Type definitions (dataclasses)
├── database.py                  # Schema, migrations, connection
├── services/
│   ├── __init__.py
│   ├── evidence_service.py
│   ├── practice_service.py
│   ├── vendor_service.py
│   ├── archetype_service.py
│   ├── pattern_service.py
│   ├── design_library_service.py
│   ├── scenario_service.py
│   ├── vendor_fit_service.py
│   ├── rfi_service.py
│   ├── signal_service.py
│   ├── evolution_service.py
│   └── context_service.py
├── agents/
│   ├── __init__.py
│   ├── base_agent.py
│   ├── evidence_retrieval.py
│   ├── gap_research.py
│   ├── pattern_mining.py
│   ├── cross_market_synthesis.py
│   ├── scenario_builder.py
│   ├── vendor_fit_analyzer.py
│   ├── rfi_generator.py
│   ├── signal_detection.py
│   └── verification_agent.py
├── prompts/
│   ├── __init__.py
│   ├── evidence_prompts.py
│   ├── pattern_prompts.py
│   ├── scenario_prompts.py
│   ├── vendor_fit_prompts.py
│   ├── rfi_prompts.py
│   ├── signal_prompts.py
│   └── schemas.py
├── static/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── tests/
│   ├── test_api.py
│   ├── test_services.py
│   ├── test_agents.py
│   └── test_patterns.py
├── README.md
├── requirements.txt
└── .env.example
```

## 3.3 Key Design Decisions

1. **Extend, don't replace** - Phase 1 server.py remains the API gateway
2. **Service layer separation** - Business logic extracted into service modules
3. **Agent independence** - Each AI agent is self-contained with shared schema
4. **Prompt externalization** - All AI prompts in separate files
5. **Configuration-driven** - Taxonomy, thresholds in config.py
6. **Type safety** - Python dataclasses for all entities
7. **Schema validation** - JSON Schema for all AI structured outputs
8. **Evidence-first enforcement** - All AI outputs require evidence chain
9. **Backward compatibility** - Phase 1 API endpoints unchanged
10. **Modular frontend** - Each Phase 2 module is a separate frontend component
