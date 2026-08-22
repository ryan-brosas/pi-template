<!-- capsule-v1 -->
# Prewalk — plan first, hand off only after a durable implementation boundary

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory project `oh-my-pi`. `packages/coding-agent/src/session/prewalk.ts`. **Question:** How do you move from planning to implementation without switching on read-only exploration or losing hidden plan state?

## Source contract
**Path/Symbol:** `PrewalkCoordinator.advanceAtTurnEnd` (143–204), `isPrewalkImplementationAction` (42–53), `#finalizePlanYoloProposal` (275–318).
**Signature:** `advanceAtTurnEnd(liveMessages, context): Promise<void>`; implementation classifier accepts completed `ToolResultMessage`.
**Data Shape:** target model, todo-gate state, hidden custom plan nudge, completed tool results, persisted session messages.

### Decisive source
```ts
const action = todoGateOpen ? context.toolResults.find(result => isPrewalkImplementationAction(result)) : undefined;
if (!action) {
  this.#host.agent.steer({ customType: PREWALK_PLAN_MESSAGE_TYPE, content: prewalkPlanPrompt, display: false });
  return;
}
await this.#host.waitForSessionMessagePersistence(context.message);
await this.#host.setModelTemporary(target, prewalk.thinkingLevel, { ephemeral: true });
```

**Flow:** inject hidden plan prompt -> wait for todo if available -> classify first genuine mutation -> persist context -> scrub hidden nudge -> switch at the next safe boundary -> inject implementation checklist.
**Invariant:** a `write xd://lsp` result with `tier: "read"` is exploration, not implementation; plan nudges never survive a context rebuild.
**Probe:** direct `test/agent-session-prewalk.test.ts:118–217` waits for the first post-todo write; `:407–525` rejects read-tier device dispatch but accepts write-tier dispatch.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", query: "PrewalkCoordinator advanceAtTurnEnd implementation action", limit: 12, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.coding-agent.src.session.prewalk.isPrewalkImplementationAction" });
```
