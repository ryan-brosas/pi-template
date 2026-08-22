<!-- capsule-v1 -->
# Task isolation — isolate Git state and cap only network production

**Source:** Oh My Pi MIT `main@96f428097`; Codebase Memory project `oh-my-pi`. `packages/coding-agent/src/task/{worktree,provider-concurrency}.ts`. **Question:** How do parallel coding workers avoid both Git cross-talk and provider-cap deadlock?

## Source contract
**Path/Symbol:** `ensureIsolation` (422–472), `wrapStreamFnWithProviderConcurrency` (76–100).
**Signature:** `ensureIsolation(baseCwd, id, preferred?): Promise<IsolationHandle>`; stream wrapper retains a provider permit until producer completion.
**Data Shape:** owned isolation marker, detached Git directory, shared resizable provider semaphore, event stream.

### Decisive source
```ts
await writeIsolationOwner(baseDir, id);
await natives.isoStart(candidate, repoRoot, mergedDir);
await git.detachGitDir(mergedDir, sourceCommonDir);
stream.result().then(release, release); // release after HTTP producer ends
```

**Flow:** claim sandbox before materialization -> start fallback-capable isolation -> detach Git metadata -> run child; provider limiter wraps one LLM request, not an entire child conversation.
**Invariant:** a child cannot mutate the parent Git HEAD/index; parents release provider capacity before tool-spawned children need it, preventing width-over-cap deadlock.
**Probe:** direct `task-spawn.test.ts:151–275` covers permit ownership; provider module documents the spawn-tree deadlock regression `#3749`.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.check_index_coverage({ project: "oh-my-pi", paths: ["packages/coding-agent/src/task/worktree.ts", "packages/coding-agent/src/task/provider-concurrency.ts"] });
await mcp.codebase_memory.search_graph({ project: "oh-my-pi", name_pattern: "^(ensureIsolation|wrapStreamFnWithProviderConcurrency)$", limit: 8, fields: ["signature"] });
```
