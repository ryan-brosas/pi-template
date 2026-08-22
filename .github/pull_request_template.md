## Work link

- **Issue:** #<issue> (optional — local-first work uses a slug)
- **Work records:** `.pi/work/<slug>/` (or `<issue>-<slug>` when linked)
- **Branch:** `<slug>` or `<issue>-<slug>` (at most three hyphen-separated lowercase words, no slashes, no type prefixes)

## Change summary

[What changed and why; one paragraph]

## Verification

- [ ] Direct verification evidence is recorded (`git diff --check`, inspected call sites, and relevant source/test/graph probes)
- [ ] Required CI checks pass

## Risk and rollback

- **Risk:** [none | description]
- **Rollback:** [revert commit | migration step]

## Checklist

- [ ] If an issue is linked, the number is verified, not guessed
- [ ] Acceptance criteria from the issue are met
- [ ] No unrelated changes are in the diff
