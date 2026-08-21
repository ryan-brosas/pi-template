---
name: jobspy-foundation
description: "Use when scraping job listings across sites (LinkedIn, Indeed, Glassdoor, Naukri, Bayt, BdJobs, ZipRecruiter, Google): the JobSpy unified Scraper abstraction, proxy rotation, and description conversion."
disable-model-invocation: true
---
---
name: jobspy-foundation
description: "Use when scraping job listings across sites (LinkedIn, Indeed, Glassdoor, Naukri, Bayt, BdJobs, ZipRecruiter, Google): the JobSpy unified Scraper abstraction, proxy rotation, and description conversion."
disable-model-invocation: true
---

# JobSpy Foundation

## Solves
Unified multi-site job scraping behind one typed contract: ScraperInput -> Scraper (ABC) -> JobResponse, with 8 site packages, proxy rotation, and description conversion.

## When to use
Scraping job listings across LinkedIn, Indeed, Glassdoor, Naukri, Bayt, BdJobs, ZipRecruiter, Google.

## Key skill-lines
- Multi-site job scraping -> JobSpy's contract: build ScraperInput (site_type list, results_wanted, offset, hours_old, is_remote, easy_apply), call Scraper.scrape() -> JobResponse.
- Proxy rotation -> `RotatingProxySession` (itertools.cycle; `http://localhost` = no-proxy sentinel).
- Resilient HTTP session -> `create_session(is_tls=True, has_retry=True)` (TLS fingerprint + 429/5xx retry).
- HTML->markdown for job descriptions -> `markdown_converter` (or `plain_converter`).
- New site -> copy the linkedin package: subclass Scraper, implement scrape(), keep the typed JobPost contract.

## Full view (memory graph)

Indexed in Codebase Memory as **`JobSpy`** (`/mnt/hdd/utopia/inspo/JobSpy`, branch `main`). Pull the full view before porting:

- `codebase_memory_get_architecture({ project: "JobSpy", aspects: ["overview", "entry_points", "hotspots", "boundaries"] })` — shape, hotspots by fan-in, package boundaries.
- `codebase_memory_search_graph({ project: "JobSpy", query: "<symbol>" })` — find a specific symbol.
- `codebase_memory_trace_path({ project: "JobSpy", ... })` — call flows across packages.
- `codebase_memory_check_index_coverage({ project: "JobSpy", paths: [...] })` — confirm a cited path is indexed.

Confirm every claim against source — the graph is an index, not truth.

## References (load on demand)
- `references/DEEP.md` — architecture map, red flags, verification.
- `references/contract.md` — the typed contract: ScraperInput, Scraper ABC, JobPost union schema, Compensation, Location.
- `references/sessions-proxies.md` — RotatingProxySession, TLS/retry session factory, converters and parsers.
- `references/scraper-pattern.md` — the per-site scraper pattern (copy linkedin for a new site).

## Skill Result Contract

```xml
<skill_result>
  <skill>jobspy-foundation</skill>
  <status>success|partial|blocked|failure</status>
  <evidence>Scraper used/ported, provenance cited, results verified</evidence>
  <artifacts>Integration + site coverage</artifacts>
  <risks>Site breakage, proxy misuse, contract drift, or none</risks>
</skill_result>
```
