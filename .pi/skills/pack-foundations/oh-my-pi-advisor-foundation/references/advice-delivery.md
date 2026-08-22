<!-- capsule-v1 -->
# Advisor delivery — severity alone is not enough

**Source:** Oh My Pi MIT `main@45e12e5`; Codebase Memory project `oh-my-pi`. `packages/coding-agent/src/advisor/advise-tool.ts`. **Question:** When should automated review advice interrupt, wait, or be preserved for the user?

## Source contract
**Path/Symbol:** `isInterruptingSeverity` (74–76), `isAdvisorInterruptImmuneTurnActive` (81–88), `resolveAdvisorDeliveryChannel` (116–132).
**Signature:** delivery returns `"aside" | "steer" | "preserve"`.
**Data Shape:** severity, streaming/aborting state, user-interrupt suppression, terminal-answer state, immune-turn fence.

### Decisive source
```ts
if (opts.preserveOnly && !opts.streaming) return "preserve";
if (!isInterruptingSeverity(opts.severity)) return "aside";
if (opts.autoResumeSuppressed && (opts.aborting || !opts.streaming)) return "preserve";
if (opts.interruptImmuneTurnActive) return "aside";
return "steer";
```

**Flow:** classify severity -> preserve if idle/aborting after user interruption -> otherwise route nits as asides -> steer concern/blocker -> downgrade repeated interruption during the cooldown.
**Invariant:** a late blocker after a terminal answer still wakes the primary; a suppressed idle/aborting run never auto-resumes from advisor traffic.
**Probe:** direct `test/advisor/advisor.test.ts:5228–5350` checks nits, terminal concerns versus blockers, immune turns, and post-interrupt streaming.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(isInterruptingSeverity|isAdvisorInterruptImmuneTurnActive|resolveAdvisorDeliveryChannel)$", limit: 8, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.coding-agent.src.advisor.advise-tool.resolveAdvisorDeliveryChannel" });
```
