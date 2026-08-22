<!-- capsule-v1 -->
# Replay and occupancy — native payloads need a portable escape hatch

**Source:** Oh My Pi MIT `main@45e12e5`; Codebase Memory `oh-my-pi`. **Question:** When can provider-native compacted history be replayed, and what happens after a provider switch?

## Reuse native data only for the active compatible provider
**Path/Symbol:** `packages/agent/src/compaction/compaction.ts:remotePreserveReusable/prepareCompaction` (1200–1244).
**Signature:** `remotePreserveReusable(preserveData, activeModel, settings): boolean`.
**Data Shape:** opaque preserve blob with provider, active model, remote-compaction settings.

### Decisive source
```ts
if (!remote) return true;
if (settings.remoteEnabled === false) return false;
if (remote.provider !== activeModel.provider) return false;
return v2Ok || shouldUseOpenAiRemoteCompaction(activeModel);
```

**Flow:** locate prior preserve blob -> compare it to the active model, not a candidate role model -> reuse only when decodable -> otherwise re-expand originals for a portable summary.
**Invariant:** a provider-switched session never keeps an opaque placeholder as its only recoverable history.
**Probe:** direct `packages/agent/test/remote-compaction.test.ts:309–415` tracks native call IDs and drops stale outputs after a full-snapshot payload.

## Occupancy is the larger trustworthy signal
**Path/Symbol:** `compaction.ts:compactionContextTokens`, `prepareCompaction`.
**Signature:** `compactionContextTokens(providerContextTokens, storedConversationEstimate): number`.
**Data Shape:** provider usage is wire-shaped; stored estimate is durable replay-shaped.
**Flow:** clamp both to valid counts -> choose the larger -> evaluate compaction threshold.
**Invariant:** reduced wire usage cannot hide stored history that still exceeds a usable context window.
**Probe:** direct `compaction-reserve-provenance.test.ts:13–92` exercises explicit/default reserve provenance; add a target-specific transformed-wire occupancy case when porting.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", query: "remotePreserveReusable provider-native replay", limit: 8, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.agent.src.compaction.compaction.remotePreserveReusable" });
```
