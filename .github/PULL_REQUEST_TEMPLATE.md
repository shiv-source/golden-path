## Description

<!-- What does this PR do? -->

## Type

- [ ] feat: new feature
- [ ] fix: bug fix
- [ ] chore: maintenance
- [ ] docs: documentation
- [ ] refactor: code improvement

## Checklist

- [ ] Scripts: `npm test` passes (42 tests)
- [ ] Scripts: `npm run lint` passes
- [ ] Formatting: `npm run format:check` passes
- [ ] Workflows: actionlint passes on changed files
- [ ] No dead code: every script imported by a workflow
- [ ] Idempotent: re-running does not break

## For New Workflows

- [ ] `on: workflow_call` with documented inputs
- [ ] `timeout-minutes` set on all jobs
- [ ] `permissions` explicitly declared
- [ ] No `${{ }}` expressions in `workflow_call` input defaults
- [ ] Tested in a scratch repo
