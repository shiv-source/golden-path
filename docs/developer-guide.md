# Developer Guide

## Requesting Repository Onboarding

1. Go to the golden-path repo **Issues** tab
2. Click **New Issue** → **Repository Onboarding**
3. Fill in the form:
    - **Repository Name** — the exact repo name (e.g., `my-service`)
    - **Repository Type** — `service`, `library`, `frontend`, `CLI`, or `documentation`
    - **Programming Language** — `Node.js`, `Go`, `Python`, or `Java`
    - **Optional Features** — check CodeQL, Gitleaks, Dependabot, or Release automation
4. Submit the issue. A bot will:
    - Validate the repo exists
    - Generate a `repositories/<name>.yaml` config
    - Create a PR in golden-path
    - Comment on your issue with the PR link
5. Once the PR is merged, a second workflow applies the standard config files to your repo via a PR — you review and merge

## How Profiles Work

Profiles are collections of standardized config files. Each repo gets at least two profiles:

| Every repo gets                                                                                         | Plus language-specific                                                                      |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `common` — `.editorconfig`, `CODEOWNERS`, `SECURITY.md`, `dependabot.yml`, issue templates, CI workflow | `node-library` — `.prettierrc`, `eslint.config.js`, `commitlint.config.js`, `tsconfig.json` |
|                                                                                                         | `node-service` — node-library profiles + `Dockerfile`                                       |
|                                                                                                         | `go-service` — `.golangci.yaml`, `Dockerfile`                                               |

### Profile Mapping

The mapping from language + type → profiles lives in `scripts/lib/profile-map.mjs`:

| Language | Type     | Profiles                |
| -------- | -------- | ----------------------- |
| node     | library  | common + node-library   |
| node     | service  | common + node-service   |
| node     | frontend | common + node-library   |
| node     | CLI      | common + node-library   |
| node     | docs     | common                  |
| go       | service  | common + go-service     |
| python   | service  | common + python-service |
| java     | service  | common + java-service   |

## Using Reusable Workflows

### Config-driven (recommended)

Add a `.github/golden-path.yaml` config file, then call the orchestrator with a one-job `ci.yaml`:

```yaml
# .github/workflows/ci.yaml
name: CI
on:
    push:
        branches: [main]
    pull_request:
        branches: [main]

permissions:
    contents: read
    security-events: write

jobs:
    golden-path:
        uses: shiv-source/golden-path/.github/workflows/golden-path-ci.yaml@v1
        with:
            config-path: .github/golden-path.yaml
        secrets: inherit
```

```yaml
# .github/golden-path.yaml
version: 2

# Go and Node are OPT-IN target lists: presence in the list enables the gate.
# Each target has a `name` (used in the CI job list) plus its own working
# directory and overrides (add more for a monorepo). Omit a list to disable it.
go:
    - name: api
      go-version-file: go.mod # or go-version: 'stable'
      working-directory: .
      change-detection:
          enabled: true
          paths: ['**/*.go', 'go.mod', 'go.sum', '.golangci.yaml', '.github/']
      coverage-floor: 90 # 0 disables the coverage gate
      cross-compile:
          enabled: true
          goos: [linux, darwin, windows]
          goarch: [amd64, arm64]
      lint:
          golangci-lint-version: v2.13.1
          config: .golangci.yaml
          timeout: 5m
          args: ''

# Node.js targets — same pattern, per-target commands, coverage, and
# change-detection:
node:
    - name: web
      node-version: '22'
      package-manager: auto # auto | npm | pnpm | yarn
      working-directory: .
      shard-count: 3
      lint-command: npm run lint
      typecheck-command: npm run typecheck
      test-command: npm test
      build-command: npm run build
      coverage-command: npm run test:coverage # empty disables the coverage gate
      coverage-floor: 90
      coverage-summary-path: coverage/coverage-summary.json
      change-detection:
          enabled: true
          paths: ['web/**', 'package.json', 'pnpm-lock.yaml', '.github/']

security-scan: { enabled: true }
secret-scan: { enabled: true, tool: betterleaks } # tool: betterleaks | ggshield
codespell:
    enabled: true
    skip: '.git,node_modules,dist,build,vendor,package-lock.json,pnpm-lock.yaml,*.lock,*.sum,*swagger-ui*'
    ignore-words-file: '' # one word per line for intentional/technical terms
actionlint: { enabled: true }
```

The orchestrator reads the config, then runs one Go/Node gate **per configured
target** plus the security scan, secret scan, codespell, and actionlint. Set
`enabled: false` to skip a scan/linter; a missing config file enables no
language gates (a single-language repo adds one target). `secret-scan.tool`
selects Betterleaks (default, no secrets) or GitGuardian `ggshield` (requires
a `GITGUARDIAN_API_KEY` secret). The orchestrator's `final-gate` is the single
aggregate check — per-target gates never emit their own.

> **Validation:** the config is validated against a strict JSON Schema
> (`schemas/golden-path.schema.json`). Unknown keys and invalid values fail the
> workflow with an actionable error instead of being silently ignored. Add
> `$schema: https://github.com/shiv-source/golden-path/blob/main/schemas/golden-path.schema.json`
> to your config for editor autocomplete.

### Direct workflow calls

In your repo, create `.github/workflows/ci.yaml`:

```yaml
name: CI
on:
    push:
        branches: [main]
    pull_request:
        branches: [main]

jobs:
    build-test:
        uses: shiv-source/golden-path/.github/workflows/build-test-node.yaml@main
        secrets: inherit

    security:
        uses: shiv-source/golden-path/.github/workflows/security-scan.yaml@main
        with:
            language: node
        secrets: inherit
```

### Available Workflow Inputs

The language workflows (`build-test-go.yaml`, `build-test-node.yaml`) build a
**single target** from explicit inputs. The orchestrator (`golden-path-ci.yaml`)
is config-driven and fans out one run **per configured target** — most repos
only ever call the orchestrator.

**build-test-node.yaml:**

- `node-version` (default: `22`)
- `package-manager` (default: `auto` — `auto | npm | pnpm | yarn`)
- `working-directory` (default: `.`)
- `shard-count` (default: `3`)
- `lint-command` (default: `npm run lint`)
- `typecheck-command` (default: `npm run typecheck`)
- `test-command` (default: `npm test`)
- `build-command` (default: `npm run build`)
- `change-detection` (boolean, default `false` — skip when no matching files changed)
- `change-paths` (JSON array of globs)
- `coverage-command` (default: `''` — e.g. `npm run test:coverage`; empty disables)
- `coverage-floor` (number, default `0`)
- `coverage-summary-path` (default: `coverage/coverage-summary.json`)

**build-test-go.yaml:**

- `go-version` (default: `stable`)
- `go-version-file` (default: `''` — pins Go from `go.mod`/`go.work`)
- `working-directory` (default: `.`)
- `setup-command` (default: `''` — run after Go setup, before tests/build)
- `test-args` (default: `''` — extra `go test` args, defaults to `-race -coverprofile=coverage.out ./...`)
- `coverage-floor` (number, default `0` — minimum coverage %, `0` disables)
- `cross-compile` (boolean, default `false`)
- `goos` (JSON array, default `["linux","darwin","windows"]`)
- `goarch` (JSON array, default `["amd64","arm64"]`)
- `change-detection` (boolean, default `false`)
- `change-paths` (JSON array of globs, default `["**/*.go","go.mod","go.sum",".golangci.yaml",".github/"]`)
- `golangci-lint-version` (default `v2.13.1`)
- `golangci-lint-config` (default `.golangci.yaml`)
- `golangci-lint-timeout` (default `5m`)
- `golangci-lint-args` (default `''`)
- `final-gate` (boolean, default `false` — emit a single aggregated required check)

**security-scan.yaml:**

- `language` (default: `''` — CodeQL auto-detects; pin with `node`, `go`,
  `python`, or `java` if needed)
- `gitleaks-config` (default: built-in rules)

**release-npm.yaml:**

- `node-version` (default: `22`)
- `registry` (default: `https://registry.npmjs.org`)
- `scope` (e.g., `@myorg`)
- `dry-run` (default: `false`)
- **Secrets:** `NPM_TOKEN` (required)

**deploy-service.yaml:**

- `registry` (default: repo owner)
- `image-name` (required)
- `dockerfile` (default: `Dockerfile`)
- `context` (default: `.`)
- `deploy-command` (optional — skip if empty)
- **Secrets:** `REGISTRY_TOKEN` (required)

**issue-labels.yaml:**

- `config` (default: `config.json` — the action-bundled label set; pass a
  repo-local path such as `.github/issue-labels.json` to use your own labels/form headings)

### Issue Labeling

`issue-labels.yaml` auto-applies the three-tier issue labels — **type**,
**priority**, and **areas** — from the issue form answers a reporter selected.
It is add-only (never removes labels) and whitelist-driven (a body can never
inject a label outside the configured set). Trigger it from the `issues` event:

```yaml
# .github/workflows/issue-labels.yaml
name: issue-labels
on:
    issues:
        types: [opened, edited]

permissions:
    contents: read
    issues: write

jobs:
    apply:
        uses: shiv-source/golden-path/.github/workflows/issue-labels.yaml@v1
```

The default config (`config.json` inside the action) matches the reference
three-tier scheme: `Change type` → type, `Priority` → priority, `Area(s)` →
areas, plus a `Summary` + `Steps to reproduce` → `bug` fallback. To use another
label set or form headings, copy that JSON into your repo and point `config`
at it (labels must already exist on the repo — a missing label fails with a
422).

### PR Assignee

`pr-assignee.yaml` auto-assigns every pull request to its author and all commit
authors. It is add-only (never removes/replaces assignments, so manual
assignees survive), skips excluded users (common bots by default), and only
assigns users GitHub reports as assignable. It is convenience-only — it never
fails the run. Trigger it from the `pull_request` event:

```yaml
# .github/workflows/pr-assignee.yaml
name: pr-assignee
on:
    pull_request:
        branches: [main]

permissions:
    contents: read
    issues: write
    pull-requests: write

jobs:
    assign:
        uses: shiv-source/golden-path/.github/workflows/pr-assignee.yaml@v1
```

**pr-assignee.yaml inputs:**

- `exclude-users` (default: `dependabot[bot],renovate[bot],github-actions[bot]` —
  comma-separated logins to never auto-assign)
- `filter-assignable` (boolean, default `true` — only assign users GitHub
  reports as assignable, avoiding 422s on non-collaborator commit authors)

### Version Pinning

By default, workflows are pinned to `@main` — always get the latest. For stability, pin to a tag:

```yaml
uses: shiv-source/golden-path/.github/workflows/build-test-node.yaml@v1
```
