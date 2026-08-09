## Work link

- **Issue:** #<issue>
- **Work records:** `.pi/work/<issue>-<slug>/`
- **Branch:** `feat/<issue>-<slug>`

## Change summary

[What changed and why; one paragraph]

## Verification

- [ ] `node scripts/validate-skill-packs.mjs` exit 0
- [ ] `node scripts/sync-skill-manifest.mjs --check` exit 0
- [ ] `node scripts/probe-skill-routing.mjs` all pass
- [ ] `node scripts/validate-ultra-fabric.mjs` exit 0
- [ ] `node scripts/validate-work-management.mjs` exit 0
- [ ] `git diff --check` exit 0

## Risk and rollback

- **Risk:** [none | description]
- **Rollback:** [revert commit | migration step]

## Checklist

- [ ] Issue number is verified, not guessed
- [ ] Acceptance criteria from the issue are met
- [ ] No unrelated changes in the diff
