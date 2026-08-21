# Localterm — Completion, Theme & Fonts Reference

(Source-grounded reference; read in full during the pack's gold-standard calibration pass. Covers `packages/server/src/completion/` and theme/font catalog import paths.)

The shell completion engine, iTerm2 theme import, and the font catalog.

## Shell completion engine (`packages/server/src/completion/`)

- `index.ts` — public surface: `CommandSpec`, `CommandSpecNode`, `OptionSpec`, `PositionalSpec` (from spec.ts); `resolveCompletionContext` (walker.ts); `formatCandidates`, `resolveCandidates`, `ValueSource` (resolver.ts).
- `spec.ts` — the command spec model (commands, options, positionals).
- `walker.ts` — `resolveCompletionContext` walks the typed command line to find the current completion context.
- `resolver.ts` — `resolveCandidates` + `formatCandidates` produce the candidate list; `ValueSource` tags where a value comes from.

**Reuse:** a typed command-spec -> walker -> resolver pattern for any shell-completion or command-palette feature.

## Theme import (`packages/server/src/theme-parser.ts`)

Imports iTerm2 themes into a `TerminalTheme`:
- `colorKeysToTheme` maps iTerm2 color keys to ThemeColors: `Background Color`, `Foreground Color`, `Cursor Color`, `Cursor Text Color`, `Selection Color`, `Selected Text Color`, `Ansi 0..15 Color`.
- `normalizeColor` coerces to `#rrggbb` (accepts `#rgb`/`#rrggbb`/`#rrggbbaa`; alpha dropped — xterm colors are opaque; null/undefined omitted).
- `generateThemeId` — `custom-<timestamp36>-<random>`.
- `baseNameFrom` — filename -> theme name.
- `ImportedThemeResult = { theme } | { error }`.

**Reuse:** the iTerm2 color-key mapping + hex normalization is directly portable to any terminal/IDE theme importer.

## Font catalog (`packages/server/src/terminal-fonts.ts`)

- `TerminalFont { id, name, source }` where `source: "fontsource" | "custom"`.
- Built-in catalog: Geist Mono, Anonymous Pro, DM Mono, Fira Code, IBM Plex Mono, Inconsolata, JetBrains Mono, Source Code Pro, Roboto Mono, Space Mono, Ubuntu Mono.
- The browser app re-exports and adds the CSS `family` string (a browser-only concern; the daemon stores only id + custom family name).
- One source of truth: server package shared by daemon (storage + completion + `localterm font` CLI) and browser.

## Red flags

- Storing a browser-only CSS family in the daemon store.
- A theme importer that doesn't normalize `#rgb` to `#rrggbb`.
- Duplicating the font catalog between daemon and browser.

## Verification

- A typed command line resolves to the right completion context.
- An iTerm2 theme imports with correct ANSI colors.
- The font catalog is a single source shared by daemon + browser.
