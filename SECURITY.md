# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in this repository, please report it
through the [GitHub Security Advisory process](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
for this repository.

**Please do not** report security vulnerabilities through public GitHub issues,
discussions, or pull requests.

## What to Include

To help triage and respond quickly, please include:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact

## Scope

This repository is a **template** — it ships agent infrastructure (skills,
prompts, templates, configs), not application code. Security-relevant areas:

- `.pi/skills/` — skill definitions the agent executes
- `.pi/prompts/` — slash-command workflows
- `.github/workflows/` — CI/CD automation
- `scripts/` — check scripts

## Automated Enforcement

The repository enforces security hygiene automatically:

- `scripts/repo-hygiene.py` scans for leaked secrets (API keys, tokens) in CI.
- `.pre-commit-config.yaml` runs the same checks locally before commit.
- CI uses least-privilege `permissions: contents: read` by default.
