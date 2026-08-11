---
name: webclaw
description: "Use when webfetch returns 403 or bot protection errors, when crawling documentation sites, batch-extracting pages, or extracting brand identity. Primary web scraping tool for non-trivial scraping."
disable-model-invocation: true
---


# Webclaw — Web Scraping

## Iron Laws

- **Public content only.** Never circumvent CAPTCHAs, bot protection, or auth; respect robots.txt and terms of service; rate-limit batch jobs; never send credentials or private/authenticated content to scraping tools.
- **Webclaw > webfetch for dynamic/protected pages.** webfetch fails on 403, CAPTCHA, JS.
- **`llm` format as default.** Token-efficient extraction for LLM consumption.
- **`onlyMainContent: true`** by default. Excludes nav, footer, sidebar.
- **Batch parallel scraping > sequential.** Use `webclaw_batch` for multiple URLs.

## When to Use

webfetch returns 403 / 503 on a *public* page (dynamic or bot-protected); the page is behind auth or a CAPTCHA — stop and ask the user, never circumvent; scraping docs sites; extracting brand identity; batch-scraping multiple pages; JS-rendered content.

## Output Formats

| Format | Use |
|---|---|
| `llm` | Default. Token-efficient markdown, auto-structure. |
| `markdown` | Clean markdown, includes all visible content. |
| `text` | Plain text, minimal formatting. Fastest. |
| `html` | Raw HTML. For browser-like processing. |
| `json` | Structured data if the page provides it. |

## Workflow

1. Start with `webclaw_scrape(url)` with `onlyMainContent: true`.
2. If content is too thin, re-scrape with `onlyMainContent: false`.
3. If content is still thin, fall back to browser (Playwright).
4. For batch: `webclaw_batch(urls)` — up to 20 URLs in parallel.

## Common Mistakes

Using webfetch on a protected page (403); not using `onlyMainContent` (gets nav + footer noise); sequential scraping of 10 pages (use batch); missing timeout for slow pages; not specifying `format` (defaults to `llm`); scraping a page that needs JS interaction; "I'll scrape the whole docs site" (use batch, pagination, or the docs API).

## Anti-Patterns

**webfetch on protected pages**; **no `onlyMainContent`**; **sequential batch**; **no timeout**; **scraping JS-heavy without fallback**; **scraping docs without batch**; **scraping without format**.
