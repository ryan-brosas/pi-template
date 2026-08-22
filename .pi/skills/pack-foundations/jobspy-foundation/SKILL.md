---
name: jobspy-foundation
description: "Use when scraping job listings across sites (LinkedIn, Indeed, Glassdoor, Naukri, Bayt, BdJobs, ZipRecruiter, Google): a unified Scraper abstraction, proxy rotation, and description conversion."
disable-model-invocation: true
---
# JobSpy Foundation

## Use this for
Scrape job listings across many sites behind one typed abstraction: a shared Scraper contract, proxy rotation and session factories, and HTML-to-markdown description conversion. Source and direct tests are ground truth; references resolve to decisive excerpts and retrieval.

## Load the matching source dump
- `references/contract.md` — the typed contract: ScraperInput, Scraper ABC, JobPost union schema, Compensation, Location.
- `references/sessions-proxies.md` — RotatingProxySession, TLS/retry session factory, converters and parsers.
- `references/scraper-pattern.md` — the per-site adapter pattern with verified anchors.

## Capsule map
- **Unified scraper contract** — `references/contract.md`: ScraperInput → Scraper(ABC) → JobResponse across all sites.
- **Sessions, proxies & pattern** — `references/sessions-proxies.md`, `references/scraper-pattern.md`: rotating proxies, TLS+retry, HTML→markdown, and a copy-this-site recipe.

## Extending the foundation
Add one references-fileshaped capsule per new site or porting question: one loader line, one grouped map entry, decisive source with an invariant, a direct-test probe, and a `search_graph`/trace retrieval.

## Provenance
Indexed in Codebase Memory as `JobSpy` (`/mnt/hdd/utopia/inspo/JobSpy`); source and its direct tests remain authoritative; the graph is a discovery index, not truth.

## Boundaries
Adopt the typed scraper contract, session factories, and per-site scraper pattern; adapt site selectors, auth, and retry budgets; omit a boards' proprietary flows and monetization unless a target requires them.
