# Roo-Code — Modes & Tool Filtering Reference

How Roo-Code makes one extension serve code/architect/debug/custom personas, and how each persona's tool surface is computed.

## Modes as data: roleDefinition + whenToUse + tool groups

A ModeConfig carries `roleDefinition` (system-prompt persona), `whenToUse` (routing description), `groups` (tool-group allowlist), and optional custom instructions. Built-ins ship in `shared/modes`; users add custom modes via `CustomModesManager`.

The system prompt advertises modes for MODEL-driven routing (`prompts/sections/modes.ts:16-33`) — each rendered as `"Name" mode (slug) - description`, preferring `whenToUse` and falling back to the first sentence of roleDefinition. The model switches personas by calling `new_task` with a mode slug.

**Lesson:** advertise switchable personas IN the system prompt with routing descriptions keyed to whenToUse — the model picks specialists without hard-coded routers.

## Tool filtering: alias groups, cached renames, O(1) allowance

`filter-tools-for-mode.ts` computes each mode's visible tool surface:

- **Alias groups**: TOOL_ALIASES builds three precomputed maps at module load (alias→canonical, canonical→aliases, any-name→group) for O(1) lookups (:20-45).
- **Renamed-tool cache**: when a mode exposes a tool under an alias, the renamed OpenAI tool definition is CACHED by `canonical:alias` key (:60-88) — "avoids creating new objects via spread operators on every assistant message."
- Allowance resolves through `isToolAllowedForMode` (validateToolUse.ts) against the mode's group list, with ALWAYS_AVAILABLE_TOOLS exempted.

System-prompt assembly (`prompts/system.ts:80-90+`) layers: roleDefinition → markdown formatting section → shared tool-use section → modes section → skills section, with MCP instructions included only when the mode has the mcp group AND servers exist, and native tool-calling as the only protocol (`const effectiveProtocol = "native"`).

**Lesson:** compute per-persona tool surfaces from data (groups + aliases) with caches at the rename boundary — personas stay declarative and the per-message cost stays allocation-free.

## Prompt sections as composable functions

`generatePrompt` composes named section functions (getRulesSection, getCapabilitiesSection, getModesSection, getSkillsSection, addCustomInstructions…) rather than one template string — each section independently testable (sections.spec.ts, custom-instructions.spec.ts at 1,722 lines of tests). STRUCTURED_OUTPUT_SYSTEM_PROMPT appends only for json_schema format; MAX_STEPS_PROMPT injects as a trailing assistant message on the final step.
