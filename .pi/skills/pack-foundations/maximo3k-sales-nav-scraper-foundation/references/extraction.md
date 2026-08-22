<!-- capsule-v2 -->
# Extraction — scroll each card into view and pull the five data-anonymize fields with NA defaults

**Source:** maximo3k-sales-nav-scraper (license file) `main@bdcd2e5197929f78631ab127d2fd10cee18807ca`; Codebase Memory `maximo3k-sales-nav-scraper`. **Question:** How does a Selenium loop reliably extract person name/title/company/location/link from each Sales Navigator result card without failing the whole run on one bad card?

## Per-card scroll + data-anonymize extraction
**Path/Symbol:** `prospect_scraper_sales_navigator.py:scroll_extract` (57–122).
**Signature:** `def scroll_extract(driver, items) -> None` (appends to the module-level `results` list and writes CSV).
**Data Shape:** `items` is a list of Selenium web elements (the current page's cards); each card is re-located by index via `li.artdeco-list__item.pl3.pv3`; every field defaults to the string `"NA"` and is only overwritten when its selector resolves; a per-item exception appends an all-NA row instead of aborting.

### Decisive source
```python
for index, item in enumerate(items):
    person_name = person_title = person_company = person_location = person_link = "NA"
    try:
        driver.execute_script("arguments[0].scrollIntoView(true);", item)
        WebDriverWait(driver, 10).until(EC.visibility_of(item))
        item = driver.find_elements(By.CSS_SELECTOR, "li.artdeco-list__item.pl3.pv3")[index]
        name_element = item.find_element(By.CSS_SELECTOR, "span[data-anonymize='person-name']")
        person_name = name_element.text if name_element else "NA"
        link_element = name_element.find_element(By.XPATH, "..")
        person_link = link_element.get_attribute('href') if link_element else "NA"
        person_title = item.find_element(By.CSS_SELECTOR, "span[data-anonymize='title']").text
        person_company = item.find_element(By.CSS_SELECTOR, "a[data-anonymize='company-name']").text
        person_location = item.find_element(By.CSS_SELECTOR, "span[data-anonymize='location']").text
    except Exception as e:
        print(f"Failed to process item at index {index}: {str(e)}")
    results.append({'person_name': person_name, 'person_title': person_title,
                    'person_company': person_company, 'person_location': person_location,
                    'person_link': person_link})
```

**Flow:** initialize all fields to `"NA"` -> scroll the card into view and wait for visibility -> re-locate the card by index -> read each `data-anonymize` field, keeping `"NA"` on failure -> on any exception log and append an all-NA row -> append the dict to `results`.
**Invariant:** one malformed card never aborts the run — it yields an all-NA row; the link is derived from the parent of the name element, not a direct attribute.
**Probe:** no test file exists in the repo — this is source-grounded evidence only (coverage caveat).

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "maximo3k-sales-nav-scraper", query: "scroll_extract data-anonymize scrollIntoView", limit: 10, fields: ["signature", "name", "file"] });
```

## Verdict
Adopt the scroll-into-view + re-locate-by-index + `data-anonymize` extraction with per-field `"NA"` defaults and per-card exception tolerance. Adapt the CSS selectors and the name-element parent link derivation to the current LinkedIn DOM. Omit the 1-second per-card sleep and the fixed re-location-by-index assumption unless a target needs them.
