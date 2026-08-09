# Workflow Input/Output Naming Convention

**Status:** Approved  
**Date:** 2026-08-09  
**Scope:** All reusable workflows in `.github/workflows/`

## Motivation

Golden Path has 13 reusable workflows with inconsistent input/output naming:

- **Outputs mix casing:** `isReleased` (camelCase) alongside `release_created`, `tag_name`, `is_prerelease` (snake_case) in `release-github.yml`
- **Tool version inputs vary:** `version` (codespell, actionlint, betterleaks) vs `ggshield-version` (ggshield) — no rule for when to prefix
- **Boolean inputs have no pattern:** `draft`, `prerelease`, `dry-run`, `auto-merge`, `generate-release-notes` — no signal that they're boolean flags
- **Domain scoping inconsistent:** `registry` in `release-npm` but `npm-registry` in `release-github-npm` for the same concept
- **No formal `on.workflow_call.outputs`:** all 13 workflows rely on job-level outputs, coupling callers to internal job names

Team needs a predictable, enforceable standard so developers can guess names without looking them up.

## Convention

### 1. Case

**All `workflow_call` inputs and outputs use `snake_case`.**

Multi-word names replace hyphens with underscores. Single-word names stay as-is.

| Before | After |
|---|---|
| `node-version` | `node_version` |
| `working-directory` | `working_directory` |
| `tag-prefix` | `tag_prefix` |
| `image-name` | `image_name` |

**Exception:** Secrets stay `UPPER_SNAKE_CASE` (`NPM_TOKEN`, `REGISTRY_TOKEN`, `GITGUARDIAN_API_KEY`). This is the GitHub ecosystem standard and secrets live in a separate namespace (`secrets.*`).

### 2. Tool Version Prefix

Version inputs for specific tools prefix with the tool name. Standalone `version` is reserved for *release versions* (semver of the thing being released).

| Workflow | Before | After | Rationale |
|---|---|---|---|
| codespell | `version` | `codespell_version` | Tool version |
| actionlint | `version` | `actionlint_version` | Tool version |
| betterleaks | `version` | `betterleaks_version` | Tool version |
| ggshield | `ggshield-version` | `ggshield_version` | Tool version |
| release-npm | `version` | `version` | Release version — no change |

### 3. Boolean Prefix

**State/adjective booleans** use `is_` prefix — they describe a condition or mode.  
**Action/behavior booleans** use the verb stem — they enable or disable a behavior.

| Workflow | Before | After | Type |
|---|---|---|---|
| release-github | `draft` | `is_draft` | state |
| release-github | `prerelease` | `is_prerelease` | state |
| release-npm | `dry-run` | `is_dry_run` | state |
| release-github-npm | `npm-prerelease` | `is_npm_prerelease` | state |
| dependency-update | `auto-merge` | `auto_merge` | action |
| release-github | `generate-release-notes` | `generate_release_notes` | action |

Distinction: `is_draft` describes a *state* of the release ("this release is a draft"). `auto_merge` enables an *action* ("auto-merge dependency PRs"). The `is_` prefix signals a boolean to the caller at a glance.

### 4. Domain Prefix

Inputs scoped to a specific ecosystem use that ecosystem as a prefix. Ensures the same concept has the same name across workflows.

| Workflow | Before | After |
|---|---|---|
| release-npm | `registry` | `npm_registry` |
| release-npm | `scope` | `npm_scope` |
| release-github-npm | `npm-registry` | `npm_registry` |
| release-github-npm | `npm-scope` | `npm_scope` |
| release-github-npm | `npm-prerelease` | `is_npm_prerelease` |

`registry` in `deploy-service` stays `registry` — it's a container registry, different domain.

### 5. Shared Vocabulary

Same concept uses the identical name across all workflows.

| Concept | Name |
|---|---|
| Working directory | `working_directory` |
| Scan/check path | `path` |
| Extra CLI arguments | `args` |
| Node.js version | `node_version` |

### 6. Output Declarations

All reusable workflows that expose outputs MUST declare them in `on.workflow_call.outputs`. This decouples the contract from internal job names.

```yaml
on:
  workflow_call:
    inputs: ...
    outputs:
      is_released:
        description: 'Whether a release was created'
        value: '${{ jobs.release.outputs.is_released }}'
```

The `release_created` output on `release-github` is dropped — it's a duplicate of `is_released`.

## Complete Rename Map

### Breaking Changes (inputs)

| Workflow | Before | After |
|---|---|---|
| `build-test-node` | `node-version` | `node_version` |
| | `working-directory` | `working_directory` |
| | `shard-count` | `shard_count` |
| | `build-command` | `build_command` |
| `build-test-go` | `go-version` | `go_version` |
| | `working-directory` | `working_directory` |
| `release-github` | `tag-prefix` | `tag_prefix` |
| | `draft` | `is_draft` |
| | `prerelease` | `is_prerelease` |
| | `prerelease-branch` | `prerelease_branch` |
| | `target-branch` | `target_branch` |
| | `body-file` | `body_file` |
| | `extra-files` | `extra_files` |
| | `generate-release-notes` | `generate_release_notes` |
| `release-npm` | `node-version` | `node_version` |
| | `registry` | `npm_registry` |
| | `scope` | `npm_scope` |
| | `dry-run` | `is_dry_run` |
| | `npm-tag` | `npm_tag` |
| | `working-directory` | `working_directory` |
| `release-github-npm` | `npm-prerelease` | `is_npm_prerelease` |
| | `npm-registry` | `npm_registry` |
| | `npm-scope` | `npm_scope` |
| | `node-version` | `node_version` |
| | `generate-release-notes` | `generate_release_notes` |
| `deploy-service` | `image-name` | `image_name` |
| | `deploy-command` | `deploy_command` |
| `codespell` | `version` | `codespell_version` |
| | `ignore-words-file` | `ignore_words_file` |
| `betterleaks` | `version` | `betterleaks_version` |
| `ggshield` | `ggshield-version` | `ggshield_version` |
| `security-scan` | `gitleaks-config` | `gitleaks_config` |
| `dependency-update` | `package-ecosystem` | `package_ecosystem` |
| | `auto-merge` | `auto_merge` |
| `actionlint` | `version` | `actionlint_version` |

### Breaking Changes (outputs)

| Workflow | Before | After |
|---|---|---|
| `release-github` | `isReleased` | `is_released` |
| `release-github` | `release_created` | Dropped (duplicate) |

### No Changes

- `self-ci` — 0 inputs
- 18 single-word inputs: `tag`, `path`, `body`, `args`, `skip`, `config`, `context`, `language`, `dockerfile`, `registry`, `version` (release contexts), `tag` in release-github-npm
- All secrets: `NPM_TOKEN`, `REGISTRY_TOKEN`, `GITGUARDIAN_API_KEY`
- 8 of 9 `release-github` outputs: `tag_name`, `version`, `release_type`, `is_prerelease`, `major`, `minor`, `patch`, plus renamed `is_released`

### Internal Callers to Update

| File | Changes |
|---|---|
| `release-github-npm.yml` | 5 input renames + `isReleased` → `is_released` output reference |
| `self-release.yml` | None (only passes `tag`) |

## Migration

This is a breaking change. All consumers must update simultaneously.

1. Rename all inputs/outputs in the 13 reusable workflow definitions
2. Update internal callers (`release-github-npm.yml`)
3. Add formal `on.workflow_call.outputs` to `release-github.yml`
4. Drop `release_created` output
5. Update `self-release.yml` if needed (verify — likely no change)
6. Document in release notes for external consumers
7. Run `actionlint` and `self-ci` to validate
