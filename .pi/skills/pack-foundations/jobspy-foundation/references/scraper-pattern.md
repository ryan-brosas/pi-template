# JobSpy — Per-Site Scraper Pattern Reference

(Source-grounded; ground truth from `jobspy/linkedin/__init__.py` (345 lines, read in full); package shape per site: `__init__.py`, `constant.py`, `util.py`.)

Ground truth from `jobspy/linkedin/__init__.py` (345 lines, read in full). Copy this package shape for new sites.

## Package shape

```
jobspy/<site>/
  __init__.py   # Scraper subclass
  constant.py   # headers
  util.py       # site parsers (parse_job_type, parse_job_level, parse_company_industry, is_job_remote)
```

## What the REAL scraper teaches (beyond the ABC)

- **Guest API, not pages**: LinkedIn scrapes `jobs-guest/jobs/api/seeMoreJobPostings/search` — HTML FRAGMENT endpoint returning search cards, no login. Find the equivalent lightweight endpoint per site.
- **Hard pagination ceiling**: `start` advances by cards-per-page but the loop condition caps at `start < 1000` (site-enforced); incoming `offset` is normalized to page boundaries (`offset // 10 * 10`).
- **Dedupe across pages**: `seen_ids: set[str]` — sites reshuffle results between pages.
- **Politeness jitter**: `time.sleep(random.uniform(delay, delay + band_delay))` BETWEEN pages only; per-job detail fetches use short timeouts (5s).
- **Graceful degradation**: HTTP errors / exceptions return the PARTIAL `JobResponse(jobs=job_list)` collected so far — a 429 at page 5 keeps pages 1-4. Only per-CARD parse errors raise the site exception (LinkedInException). 429 gets its own explicit message; proxy failures detected by string match on the error.
- **Empty card page = natural end** (return what you have), distinct from an error.
- **Auth-wall detection**: job-detail responses redirecting to `linkedin.com/signup` are detected via `response.url` and skipped — the wall is data, not an exception.
- **Expensive fields are OPT-IN**: descriptions cost one request per job; gated behind `scraper_input.linkedin_fetch_description`. Respect results_wanted strictly (`job_list[:results_wanted]`).
- **Direct apply URLs** hide in `<code id="applyUrl">` — extracted by regex `(?<=\?url=)[^"]+` + unquote.
- Salary parsing on cards splits `min-max` text through currency_parser; currency taken from the first char ($ → USD).

## Rules for a new site

1. Subclass `Scraper`; keep the JobPost union contract (site-prefixed ids).
2. Honor `results_wanted` / `offset` / `hours_old` (→ `f_TPR=r{seconds}` style params) / `is_remote` / `easy_apply` filters.
3. Partial success > silent failure: return collected jobs on transport errors; raise the site exception only for parse bugs.
4. Jitter delays; dedupe ids; cap pagination at the site's real limit.
5. Put site parsers in the package's own util.py — model.py stays site-agnostic.

**Verification probes**: typed JobResponse returned · results_wanted honored exactly · second run dedupes · 429 mid-pagination preserves earlier pages · description format matches DescriptionFormat.

## Verification

The guest endpooint and pagination ceiling are visible in `jobspy/linkedin/__init__.py` (jobs-guest path, start<1000); auth-wall detection lives in the signup redirect check in the same file; `jobspy/exception.py` holds the per-site exception types; site parsers live in `jobspy/<site>/util.py`.
