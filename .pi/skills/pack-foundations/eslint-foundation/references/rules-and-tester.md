<!-- capsule-v1 -->
# ESLint rules — RuleTester harness and AST-utils primitives

**Source:** ESLint MIT `main@dc1e7a84`; Codebase Memory project `eslint`. **Question:** How do you test a rule and reuse AST helpers for property names, token positions, and parentheses?

## 1. RuleTester drives rule behavior on valid/invalid cases
**Path/Symbol:** `lib/rule-tester/rule-tester.js:RuleTester.run` (890–1992).
**Signature:** `new RuleTester(config?).run(name, rule, { valid, invalid })`.
**Data Shape:** `context.options`/`settings` frozen before each case; the rule is wrapped to assert the AST is never mutated; autofix output is re-linted for syntax.

### Decisive source
```js
this.testerConfig = [
  sharedDefaultConfig,
  testerConfig,
  { rules: { "rule-tester/validate-ast": "error" } },
];
this.linter = new Linter({ configType: "flat" });
```

**Flow:** build the flat base config -> wrap the rule with a frozen context -> run `linter.verify` per case -> assert the expected message -> re-verify autofixed output -> assert AST unchanged. **Invariant:** a rule must not mutate the AST; autofix output must still parse; invalid cases assert message/line/column and optionally `messageId`/`data`/`suggestions`.
**Probe:** direct `tests/lib/rule-tester/rule-tester.js` (rule-tester run contract, wrap-rule freezing, autofix re-verify).

## 2. ast-utils rule primitives
**Path/Symbol:** `lib/rules/utils/ast-utils.js:getStaticPropertyName` (304–335), `isParenthesised` (655–666), `isTokenOnSameLine` (1585–1587), `skipChainExpression` (342–344).
**Signature:** `isParenthesised(sourceCode, node)`; `isTokenOnSameLine(left, right)`; `getStaticPropertyName(node)`.

### Decisive source
```js
function isParenthesised(sourceCode, node) {
  const previousToken = sourceCode.getTokenBefore(node),
        nextToken = sourceCode.getTokenAfter(node);
  return Boolean(previousToken && nextToken) &&
    previousToken.value === "(" && previousToken.range[1] <= node.range[0] &&
    nextToken.value === ")" && nextToken.range[0] >= node.range[1];
}
```

**Flow:** token before/after the node -> confirm immediate balanced parens exactly bracket it. **Invariant:** both parens must exist and immediately surround the node (no nesting whitespace).
**Probe:** direct `tests/lib/rules/utils/ast-utils.js`.

## Get live surrounding code
**Retrieve:**
```ts
await mcp.codebase_memory.search_graph({ project: "eslint", name_pattern: "^(isParenthesised|getStaticPropertyName|isTokenOnSameLine)$", limit: 8, fields: ["signature"] });
await mcp.codebase_memory.get_code_snippet({ project: "eslint", qualified_name: "eslint.lib.rules.utils.ast-utils.getStaticPropertyName" });
```
