<!-- capsule-v1 -->
# Replay and occupancy: provider-native history without silent loss

**Provenance:** Oh My Pi (MIT), main at 45e12e5; Codebase Memory project oh-my-pi. compaction.ts, openai.ts, compaction-v2-openai.ts are source-covered. remote-compaction.test.ts is fast-index excluded; direct-read it for probes.

**Porting question:** when provider-native compaction/replay exists, how do you keep local occupancy honest, reuse native history only when compatible, and fall back without swallowing user aborts?

## Capsule -- occupancy uses the larger trustworthy signal

**Path/Symbol:** packages/agent/src/compaction/compaction.ts:compactionContextTokens (356-358).
**Signature:** compactionContextTokens(providerContextTokens, storedConversationEstimate): number.
**Data Shape:** provider-reported usage can be lower than stored replayable history after request/wire transforms; local estimate tracks durable stored representation.
**Flow:** read provider + stored estimate; clamp each to >=0; take the max; feed that value into the compaction threshold decision.
**Invariant:** the reduction gate never runs on a wire-shrunk number that would let stored history outgrow its usable window.
**Adopt/Adapt/Omit:** adopt the max(provider,local) rule; adapt the local estimator; omit when there is no transformed/replayed history.
**Probe:** a transformed-request case where provider usage is below stored history and the trigger still fires.
**Retrieve:** graph-search both helpers, read the caller into prepareCompaction/compact, then direct-read the excluded compaction-reserve and remote-compaction tests.

## Capsule: native replay is reusable only under provider+model compatibility

**Path/Symbol:** compaction.ts:remotePreserveReusable (1200-1211) and prepareCompaction (1213-1321); openai.ts:withOpenAiRemoteCompactionPreserveData (358-375); compaction-v2-openai.ts:storeCompactionV2PreserveData (804-815).
**Signature:** remotePreserveReusable(preserveData, activeModel, settings): boolean.
**Flow:** a prior compaction stores opaque native preserve data; later prep compares active provider/model/settings; compatible -> reuse payload; else -> re-expand originals and make a fresh portable local summary.
**Invariant:** an incompatible provider never receives a placeholder as its only history; opaque native state always has a portable local fallback.
**Probe:** provider-switch, reuse, and input-forwarding cases; direct-read remote-compaction.test.ts (fast-index excluded).
**Retrieve:** graph-search the four symbols, trace prepareCompaction into build/trim, then direct-read the named excluded tests.

## Capsule: abort and archive migration are one-way control flow
**Path/Symbol:** compaction.ts:compact (1399-1680) and buildOpenAiResponsesCompactionInput (1334-1358); openai.ts:trimRemoteCompactionInputToContextWindow (161-206).
**Flow:** build/trim remote input -> request native compaction -> on user abort propagate the abort, never fold it into a local-fallback retry -> if replay becomes unreadable, migrate original/archived material once into a portable summary and do not re-persist consumed opaque state.
**Invariant:** cancellation stays cancellation; one-way archive migration does not duplicate or reintroduce consumed frames.
**Probe:** abort-during-fetch at remote-compaction.test.ts around :1562; direct-read the remote suite before porting.
**Retrieve:** inspect compact and remote helpers' source, trace callers, direct-read the excluded remote tests.