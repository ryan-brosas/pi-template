# JobSpy — Typed Contract Reference

(Source-grounded; read in full: `jobspy/model.py` (335 lines). Sibling files: `jobspy/exception.py`, `jobspy/util.py`, `jobspy/linkedin/constant.py` (headers).)

Source-grounded reference for `jobspy/model.py` (335 lines, read in full).

## The chain

```
ScraperInput -> Scraper.scrape() -> JobResponse { jobs: list[JobPost] }
```

- **ScraperInput**: site_type list, search_term, google_search_term, location, country (default USA), distance, is_remote, job_type, easy_apply, offset, linkedin_fetch_description (opt-in: each fetched description costs an extra request), linkedin_company_ids, description_format (default MARKDOWN), request_timeout=60, results_wanted=15, hours_old.
- **Scraper (ABC)**: `__init__(site, proxies, ca_cert, user_agent)` + abstract `scrape() -> JobResponse`. All 8 sites implement it.
- **JobPost**: one union schema — common fields plus commented per-site extensions (LinkedIn job_level/job_function · Indeed company_*/banner_photo_url · Naukri skills/experience_range/rating/vacancy_count/wfh_type). IDs are site-prefixed (`li-{job_id}`).

## WHY Country is a routing table, not a list

`Country` enum values are TUPLES encoding per-site routing: `(name_aliases, "indeed_sub:api_code", "glassdoor_sub:tld")` — e.g. `UK = ("uk,united kingdom", "uk:gb", "co.uk")`. Properties `indeed_domain_value` / `glassdoor_domain_value` unpack the colons into subdomain + code/TLD. Aliases split on commas (`"usa,us,united states"`). Two INTERNAL members never render: `US_CANADA` (ziprecruiter) and `WORLDWIDE` (linkedin) — `Location.display_location()` special-cases both out of output.

Same trick in `JobType`: each member's value packs dozens of LOCALIZED ALIASES (fulltime in 25+ languages) so string matching against any locale works via simple substring checks.

`Location.display_location()` composes city/state/country, takes first alias before the comma, uppercases usa/uk, title-cases the rest.

## Supporting types

- Compensation: interval + min/max + currency (default USD). SalarySource: DIRECT_DATA vs DESCRIPTION (provenance of salary numbers).
- DescriptionFormat: MARKDOWN | HTML | PLAIN.

**The lessons: enums-as-routing-tables (tuples carrying per-site domains) beat parallel lookup dicts; localized aliases belong IN the enum values; internal pseudo-members need explicit display suppression.**

## Verification

The routing tables are exercised by `jobspy/model.py` docstrings and `tests/` coverage for Country.from_string plus display_location US_CANADA/WORLDWIDE suppression; per-site scraper subclasses (`jobspy/linkedin/__init__.py`, `jobspy/naukri/__init__.py`, `jobspy/bdjobs/__init__.py`) consume the contract as a typed JobResponse.
