---
name: maximo3k-sales-nav-scraper-foundation
description: "Use when scraping LinkedIn Sales Navigator saved-search result pages into CSV with Selenium: a pagination loop, per-item scroll+extract with data-anonymize selectors, and header-on-first-write CSV append."
disable-model-invocation: true
---
# maximo3k-sales-nav-scraper: LinkedIn Sales Navigator CSV Scraper Foundation

## Use this for
Scrape a LinkedIn Sales Navigator saved-search people list into a CSV using Selenium: page through the results with the "Next" pagination button, scroll each result card into view and extract name/title/company/location/link via `data-anonymize` selectors, and append rows to a CSV with a header written only on first write. Source is ground truth; there are no direct tests in the repo, so each capsule states that coverage caveat.

## Load the matching source dump
- `references/pagination.md` — page through Sales Navigator results via the enabled "Next" pagination button, stopping on disabled/absent.
- `references/extraction.md` — scroll each `li.artdeco-list__item.pl3.pv3` card into view and extract the five `data-anonymize` fields with NA defaults.
- `references/csv-output.md` — append extracted rows to a CSV, writing the header only when the file is empty.

## Capsule map
- **Pagination** — `references/pagination.md`: loop pages on the enabled next-button, break on disabled/absent.
- **Extraction** — `references/extraction.md`: scroll-into-view + `data-anonymize` field extraction with per-item exception tolerance.
- **CSV output** — `references/csv-output.md`: header-on-first-write append of the five-field row.

## Extending the foundation
Add one graph-selected, source-confirmed capsule per new porting seam (e.g. a login/captcha seam or a different result-card layout). Add exactly one loader line and one grouped map entry; retain decisive source, an invariant, a direct-test probe (or an explicit no-test caveat), and a `search_graph` retrieval in the capsule rather than expanding this leaf.

## Provenance
maximo3k-sales-nav-scraper (license file, `main@bdcd2e5197929f78631ab127d2fd10cee18807ca`); Codebase Memory project `maximo3k-sales-nav-scraper` (full index: 30 nodes / 42 edges, indexed 2026-08-18, HEAD matches source). No test files exist in the repo — all claims are source-grounded only.

## Full view (memory graph)
Revalidate `maximo3k-sales-nav-scraper` before porting: run `index_status`, `check_index_coverage`, `search_graph`, `trace_path`, and `get_code_snippet`. Record the graph root, branch, commit, mode, node/edge counts, freshness, and any coverage caveats; source decides shipped claims. The single production file `prospect_scraper_sales_navigator.py` reports `no_recorded_issue` + `metadata_match` (best-effort); only `.git` is excluded by design.

## Boundaries
Adopt the pagination loop, the scroll-into-view + `data-anonymize` extraction contract, and the header-on-first-write CSV append. Adapt the result-card CSS selectors, login flow, and timing to the host and current LinkedIn DOM. Omit the manual login/captcha handoff and the hard-coded `prospects_1.csv` output path unless a target needs them.
