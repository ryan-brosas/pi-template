# Pi Fabric — Architecture Reference

Complete technical map for **pi-fabric** (monotykamary). MIT License. Branch `feat/veda-runner`, commit b709edb (2026-08-13). Root: `/mnt/hdd/utopia/inspo/pi-fabric`. Graph: 4354 nodes / 17822 edges.

## What it solves

Pi Fabric: the **Schema mutation guard + full-code executor** for Pi. It is the runtime this template runs on: native providers (memory/state/mesh/compact/schema), an actor system for multi-process delegation, a compaction pipeline with measured bounds, and a cross-process cost ledger.

## The stack

| Layer | Technology | Where |
|---|---|---|
| Language | TypeScript (184 files), Bash, Python | whole repo |
| Atomic writes | `writeJsonAtomic` (`src/core/atomic-write.ts`) | schema, actors |
| Crypto | `node:crypto` (sha256, randomUUID, randomBytes) | schema controller |
| Process | `node:child_process` spawn (trusted commands) | schema controller |
| Mesh | `MeshStore` / `MeshIdentity` (key-version CAS puts) | schema, state |
| PTY/transports | process, tmux, screen, localterm, herdr | actors |

## Full module map

```
src/schema/        -> THE MUTATION GUARD
  controller.ts    -> SchemaController: authorize/status/hypothesize/verify/commit/abort,
                      transaction journal + commit lock + journal recovery
  types.ts         -> SchemaEvidence, SchemaFileOperation, records, stateBinding
  workspace.ts     -> snapshotWorkspace: fingerprinted workspace snapshots (caps, symlinks)
src/compaction/    -> THE CONTEXT PIPELINE
  bounds.ts        -> clipUtf8, canonicalizeText, sampleAddressedFrom, omissionLine
  render.ts        -> renderSummary: sectioned summary with per-section byte budgets
  threshold.ts     -> compactAtConfiguredThreshold (per-model token thresholds)
  branch-summary.ts, branch-details.ts, enrichers.ts, projections.ts, qa.ts, hook.ts,
  instructions.ts, normalize.ts, trace-events.ts
src/agents/        -> budget-ledger.ts (cross-process cost), thinking-transfer.ts (clipUtf8 digest)
src/actors/        -> global-registry.ts (resolve, fan-in 25), manager, delivery-policy,
                      predicate, host-event-observer, host-event-payload, context, types
src/providers/     -> memory, state, mesh, compact, schema (the native providers)
src/ui/            -> transcript-sanitization.ts (recordOf, terminalSafe, clip), format, highlight, types
src/core/          -> atomic-write.ts
src/config.ts      -> FabricConfig (schema mode, certificateTtlMs, maxFiles/maxBytes, trustedCommands,
                      compaction tokenThresholds/thresholds per model)
```

## Graph signals

- Boundaries: fabric-state->topology (19), fabric-state->providers (13), providers->memory (13), fabric-state->actors (10), ui->config (8).
- Hotspots: GlobalActorRegistry.resolve (25), isActiveStatus (27), safeText (20), ActorManager.#publicInfo (16), recordOf (13), clipUtf8 (13), highlightCode (12).
- Layers: memory/topology/config/core = "core" (high fan-in); fabric-state/ui/jetbrains = "entry".
- Clusters: src cohesion 0.88-0.99 (12 clusters).

## Data-flow overview

1. **Agent wants to mutate** -> calls a non-allowlisted ref -> `SchemaController.authorize` blocks it (enforce) or reports would-block (audit). Allowlist: pi.read/grep/find/ls, memory.recall/expand/sessions, state.get/history/complexity, mesh.self/read/members/get/list, compact.status, schema.status/hypothesize/verify/commit/abort.
2. **hypothesize** -> typed evidence + workspace snapshot fingerprint + state binding -> record stored in mesh (ifVersion 0).
3. **verify** -> re-snapshot; evidence checked (file_exists/absent/contains/sha256/trusted_command); certificate issued with TTL.
4. **commit** -> certificate consumed under a commit lock; operations applied; postconditions verified; transaction journal written before, updated after (committed / rolled_back / quarantined); recovery on startup.
5. **Compaction** -> threshold.ts triggers per-model; render.ts renders sectioned summaries within byte budgets; bounds.ts guarantees UTF-8 safety and provenance-preserving sampling.
6. **Delegation** -> actors/global-registry resolves actors; manager spawns via transports (process/tmux/screen/localterm/herdr); budget-ledger tracks spend across the tree.
