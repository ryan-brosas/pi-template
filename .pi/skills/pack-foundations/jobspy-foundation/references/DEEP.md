# JobSpy Foundation — Deep Reference


# JobSpy Foundation

A deep reference for JobSpy (Cullen Watson). MIT License. Branch `main`, commit fda080a (2026-02-18). Root: `/mnt/hdd/utopia/inspo/JobSpy`. Graph: 301 nodes / 1280 edges. The cleanest **unified multi-site scraper** design in the set: one typed contract (ScraperInput -> Scraper -> JobResponse) with per-site implementations behind an ABC.

## Architecture

```
jobspy/model.py       -> the typed contract: ScraperInput, Scraper (ABC), JobPost, JobResponse, Site, Compensation, Location, DescriptionFormat
jobspy/util.py        -> sessions, proxy rotation, logger, markdown/plain/email converters, currency parser
jobspy/exception.py   -> LinkedInException + site-specific errors
jobspy/<site>/        -> one package per site: linkedin, indeed, ziprecruiter, glassdoor, google, bayt, naukri, bdjobs
  each: __init__.py (the Scraper subclass) + util.py + constant.py (headers/constants)
```

## The typed contract (jobspy/model.py)

- **Site enum**: LINKEDIN, INDEED, ZIP_RECRUITER, GLASSDOOR, GOOGLE, BAYT, NAUKRI, BDJOBS.
- **ScraperInput**: site_type (list[Site]), search_term, google_search_term, location, country (default USA), distance, is_remote, job_type, easy_apply, offset, linkedin_fetch_description, linkedin_company_ids, description_format (default MARKDOWN), request_timeout (60), results_wanted (15), hours_old.
- **Scraper (ABC)**: `__init__(site, proxies, ca_cert, user_agent)` + abstract `scrape(scraper_input) -> JobResponse`. **Every site implements this — the contract that keeps 8 scrapers uniform.**
- **JobPost**: the union schema — common fields (id, title, company_name, job_url, location, description, job_type, compensation, date_posted, emails, is_remote, listing_type) + per-site extensions (LinkedIn job_level/job_function, Indeed company_* + banner_photo_url, Naukri skills/experience_range/company_rating/vacancy_count/work_from_home_type).
- **JobResponse**: `{ jobs: list[JobPost] }`.
- **Compensation**: interval (CompensationInterval enum: YEARLY/MONTHLY/WEEKLY/DAILY/HOURLY), min_amount, max_amount, currency (default USD).
- **DescriptionFormat**: MARKDOWN | HTML | PLAIN.
- **Location.display_location()**: composes city/state/country; handles Country.US_CANADA / WORLDWIDE specially.

## The session + proxy primitives (jobspy/util.py)

- **RotatingProxySession**: wraps a proxy string or list in `itertools.cycle`. `format_proxy(proxy)` normalizes to a dict — http/https/socks5 prefix preserved, bare string gets `http://` prepended. No proxies -> `proxy_cycle = None`.
- **RequestsRotating(RotatingProxySession, requests.Session)**: adds optional Retry (total=3, connect=3, status=3, status_forcelist=[500,502,503,504,429], backoff_factor=delay) + `clear_cookies` per request. On each request: next proxy from the cycle; `http://localhost` means NO proxy (clears self.proxies).
- **TLSRotating(RotatingProxySession, tls_client.Session)**: same rotation with `random_tls_extension_order=True`; patches `response.ok` to status in 200-399.
- **create_session(*, proxies, ca_cert, is_tls=True, has_retry=False, delay=1, clear_cookies=False)**: the factory. TLS by default; ca_cert -> session.verify.
- **create_logger(name)**: `JobSpy:<name>` logger, propagate=False, single console handler.
- **set_logger_level(verbose)**: 2=INFO, 1=WARNING, 0=ERROR — runtime-adjustable.
- **markdown_converter / plain_converter**: HTML -> markdown (markdownify) or plain (BeautifulSoup + whitespace collapse).
- **extract_emails_from_text**: regex `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`.
- **currency_parser**: strips non-numeric, handles 000s separators and comma/decimal.
- **get_enum_from_job_type**: string -> JobType enum.

## The scraper pattern (one site, e.g. jobspy/linkedin/__init__.py)

```python
class LinkedIn(Scraper):
    base_url = "https://www.linkedin.com"
    delay = 3        # polite delay between requests
    band_delay = 4   # extra delay when throttled

    def __init__(...):
        super().__init__(site=Site.LINKEDIN, ...)
        self.session = create_session(proxies=proxies, ca_cert=ca_cert, is_tls=True)

    def scrape(self, scraper_input: ScraperInput) -> JobResponse:
        # 1. build the URL from scraper_input (search_term, location, is_remote, offset...)
        # 2. GET with session + headers from constant.py
        # 3. parse HTML (BeautifulSoup) into JobPost list
        # 4. per-post: title, company, job_url, description (markdown/plain per input),
        #    compensation (currency_parser), emails, job_type (parse_job_type), is_remote
        # 5. honor results_wanted, offset, hours_old, easy_apply
        # 6. raise LinkedInException on auth/lockout
        return JobResponse(jobs=jobs)
```

Each site package has its own `constant.py` (headers) and `util.py` (parsers like parse_job_type, parse_job_level, parse_company_industry).

## How to use

- **When you need multi-site job scraping** -> use JobSpy's contract: build a ScraperInput, pick site_type list, call the Scraper.scrape() -> JobResponse. Pick sites via the Site enum; results_wanted/offset/hours_old/is_remote/easy_apply control the query.
- **When you need proxy rotation** -> RotatingProxySession: pass a list, it cycles per request; `http://localhost` clears the proxy (a no-proxy sentinel).
- **When you need a resilient HTTP session** -> create_session(is_tls=True, has_retry=True) — TLS fingerprint + 429/5xx retry with backoff.
- **When you need HTML->markdown for job descriptions** -> markdown_converter (or plain_converter for plain text).
- **When you need a new site** -> copy the linkedin package: subclass Scraper, implement scrape(), keep the typed JobPost contract. The ABC + union schema is the whole point.

## Red Flags

- A new scraper that doesn't implement the Scraper ABC (breaks the uniform contract).
- Proxy rotation without the cycle (single proxy = no rotation).
- Forgetting `http://localhost` as the no-proxy sentinel.
- Retry without status_forcelist including 429 (throttle kills the run).
- Ignoring site-specific exceptions (LinkedInException on auth/lockout).
- Jobs as raw dicts instead of typed JobPost (the union schema exists for a reason).

## Verification

- Scrape returns a typed JobResponse for the target site.
- Proxy rotation actually cycles through the list (and localhost clears it).
- Job descriptions come back in the requested DescriptionFormat.
- results_wanted / offset / hours_old are honored.
- A site auth failure raises the site-specific exception, not a silent empty result.

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
