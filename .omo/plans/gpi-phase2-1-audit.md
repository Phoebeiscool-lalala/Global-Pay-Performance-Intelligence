# Phase 2 Plan Part 1: Current Architecture Audit

## 1.1 Repository State

```
Global-Pay-Performance-Intelligence/   (main @ df8bc6c6, single commit)
├── .gitignore           35 bytes
├── README.md            3,465 bytes
└── server.py            20,137 bytes (348 lines)
```

**Critical finding:** The repo contains ONLY the backend. The `static/` directory (index.html, styles.css, app.js) and `tests/` directory documented in README are NOT committed.

## 1.2 Backend Architecture

| Aspect | Current State |
|--------|--------------|
| Language | Python 3.10+, stdlib-only (zero third-party deps) |
| HTTP Server | `http.server.ThreadingHTTPServer` with custom `BaseHTTPRequestHandler` |
| Database | SQLite (`intelligence.sqlite3`), created at runtime |
| Bind | `127.0.0.1:8765` (loopback only) |
| Static serving | Yes, from `ROOT/static` |
| Auth/RBAC | None |
| AI/LLM | None |
| Crawling | None |
| Scheduled jobs | None |
| Audit logging | None |
| Configuration | Env vars only (`GPI_DB_PATH`, `PORT`) |

## 1.3 Database Schema (6 tables)

| Table | Key Columns | Relationships |
|-------|------------|--------------|
| `markets` | code (PK), name_zh, name_en | Referenced by practices, vendor_capabilities |
| `practices` | id (PK), market (FK), domain, category, question, claim, population, industry, company_size, status, confidence | One-to-many with evidence, claim_history |
| `evidence` | id (PK), practice_id (FK), source_name, url, tier (1-5), stance, excerpt, published_on | Belongs to practice |
| `vendors` | id (PK), name (UNIQUE), hq, website, notes | One-to-many with vendor_capabilities |
| `vendor_capabilities` | vendor_id (FK), market (FK), capability, status, source_url | Composite PK |
| `claim_history` | id (PK), practice_id (FK), old_claim, new_claim, reason, changed_at | Belongs to practice |

## 1.4 API Endpoints (Phase 1)

| Method | Path | Function |
|--------|------|----------|
| GET | `/api/overview` | Market summary stats |
| GET | `/api/practices` | Practice list (filtered) |
| GET | `/api/practices/{id}` | Practice detail + evidence + history |
| GET | `/api/compare` | Cross-market comparison matrix |
| GET | `/api/vendors` | Vendor list with capabilities |
| GET | `/api/changes` | Claim history (last 50) |
| GET | `/api/ask` | Verified-only semantic search |
| POST | `/api/evidence` | Submit evidence |
| POST | `/api/vendors` | Create vendor |
| POST | `/api/vendor-capability` | Update vendor capability |
| POST | `/api/practice-claim` | Publish claim |

## 1.5 Confidence Scoring Engine

The existing `confidence_for()` implements transparent, evidence-first scoring:
- **Source quality (30%):** Tier 1-2 = 30, else 18
- **Source count (25%):** >=2 independent domains = 25, else 8
- **Consistency (20%):** >=2 independent = 20, else 5
- **Freshness (15%):** <=180 days = 15, <=365 = 8, else 0
- **Specificity (10%):** Non-General population = 10, else 5
- **Minimum 2 independent sources** required for Verified status
- **Tier 4-5 cannot support** market practice conclusions
- **Conflict detection:** Any contradicting evidence caps score at 59

## 1.6 Taxonomy

- **Markets:** JP, KR, HK, TW (4)
- **Domains:** Pay, Performance, Pay for Performance (3)
- **Topics (8):** 4 Pay + 3 Performance + 1 Pay-for-Performance
- **Capabilities (12):** Payroll Processing, Payroll Outsourcing, Tax, Statutory Reporting, Compensation Consulting, Salary Benchmark, Incentive Design, Performance Management, Commission Management, API Integration, Local Team, Managed Service

## 1.7 Phase 1 Strengths (Reusable)

1. Evidence-first philosophy - entire scoring enforces "no evidence -> no conclusion"
2. Transparent confidence scoring - weighted, explainable
3. URL validation - rejects localhost, requires http/https
4. Tier system - Tier 1-5 with independence checks
5. Claim history - full versioning
6. Market taxonomy - configurable 4-market structure
7. Vendor capability matrix - per-market, per-capability
8. Evidence-only Ask Intelligence - refuses to guess
9. Foreign key constraints - proper relational integrity
10. Idempotent initialization - CREATE IF NOT EXISTS + INSERT OR IGNORE

## 1.8 Technical Debt Blocking Phase 2

1. Monolithic server.py - all logic in single 348-line file
2. No entity type definitions - Python dicts throughout
3. No schema validation - ad-hoc validation in each endpoint
4. No AI/LLM infrastructure - no prompts, no structured output
5. No crawl/research layer - manual evidence input only
6. No audit trail - only claim_history
7. No cross-entity analytics - no pattern detection
8. No batch operations - no bulk import
9. No event system - no material change notifications
10. No configuration system - hard-coded taxonomy
