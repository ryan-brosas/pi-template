<!-- capsule-v1 -->
# Autoresearch — experiments belong to a branch and a durable ledger

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory project `oh-my-pi`. `packages/coding-agent/src/autoresearch/{index,git,state,storage}.ts`. **Question:** How can an agent experiment repeatedly without destroying a user worktree or reviving runs on the wrong branch?

## Source contract
**Path/Symbol:** `ensureAutoresearchBranch` (36–97), extension `rehydrate` (33–120), `buildExperimentState/reconstructControlState` (172–236).
**Signature:** `ensureAutoresearchBranch(api, workDir, goal): Result`; `reconstructControlState(entries): state`.
**Data Shape:** clean Git baseline, `autoresearch/*` branch, persisted control entries, SQLite session/run rows, current segment metrics.

### Decisive source
```ts
if (dirtyPaths.length > 0) return { ok: false, error: "Worktree is dirty ... clean baseline." };
const onActiveBranch = session === null || session.branch === null || session.branch === currentBranch;
runtime.autoresearchMode = control.autoresearchMode && onActiveBranch;
if (!everActivated) { /* do not create storage just to inspect */ }
```

**Flow:** reject pure-JJ/dirty unsafe branch setup -> create or reuse isolated branch -> rehydrate only when the current branch matches -> reconstruct state from durable control + logged runs -> enable experiment tools.
**Invariant:** switching branches detaches experiment tools instead of mixing ledgers; inactive sessions do not create persistent storage as a side effect.
**Probe:** direct `test/autoresearch-git.test.ts:49–142` protects pure-JJ and nested roots while allowing colocated/plain Git; `autoresearch-before-agent-start.test.ts` covers prompt injection.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(buildExperimentState|reconstructControlState)$", limit: 8, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "oh-my-pi", qualified_name: "oh-my-pi.packages.coding-agent.src.autoresearch.state.buildExperimentState" });
```
