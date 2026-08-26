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
|                                                                                                         | `go-service` — `.golangci.yml`, `Dockerfile`                                                |

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

Add a `.github/golden-path.yml` config file, then call the orchestrator with a one-job `ci.yml`:

```yaml
# .github/workflows/ci.yml
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
        uses: your-org/golden-path/.github/workflows/golden-path-ci.yml@v1
        with:
            config-path: .github/golden-path.yml
        secrets: inherit
```

```yaml
# .github/golden-path.yml
version: 1
language: go

go:
    enabled: true
    go-version-file: go.mod # or go-version: 'stable'
    working-directory: .
    change-detection:
        enabled: true
        paths: ['**/*.go', 'go.mod', 'go.sum', '.golangci.yml', '.github/']
    coverage-floor: 90 # 0 disables the coverage gate
    cross-compile:
        enabled: true
        goos: [linux, darwin, windows]
        goarch: [amd64, arm64]
    final-gate: true

security-scan: { enabled: true, language: go }
secret-scan: { enabled: true, tool: betterleaks }
codespell: { enabled: true }
actionlint: { enabled: true }
```

The orchestrator reads the config, then conditionally runs the Go gates,
security scan, secret scan, codespell, and actionlint. Set `enabled: false` to
skip a gate; a missing config file uses defaults.

### Direct workflow calls

In your repo, create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
    push:
        branches: [main]
    pull_request:
        branches: [main]

jobs:
    build-test:
        uses: your-org/golden-path/.github/workflows/build-test-node.yml@main
        secrets: inherit

    security:
        uses: your-org/golden-path/.github/workflows/security-scan.yml@main
        with:
            language: node
        secrets: inherit
```

### Available Workflow Inputs

**build-test-node.yml:**

- `node-version` (default: `22`)
- `working-directory` (default: `.`)
- `shard-count` (default: `3`)

**build-test-go.yml:**

- `go-version` (default: `stable`)
- `go-version-file` (default: `''` — pins Go from `go.mod`/`go.work`)
- `working-directory` (default: `.`)
- `coverage-floor` (number, default `0` — minimum coverage %, `0` disables)
- `cross-compile` (boolean, default `false`)
- `goos` (JSON array, default `["linux","darwin","windows"]`)
- `goarch` (JSON array, default `["amd64","arm64"]`)
- `change-detection` (boolean, default `false`)
- `change-paths` (JSON array of globs, default `["**/*.go","go.mod","go.sum",".golangci.yml",".github/"]`)
- `final-gate` (boolean, default `false` — emit a single aggregated required check)

**security-scan.yml:**

- `language` (required: `node`, `go`, `python`, `java`)
- `gitleaks-config` (default: built-in rules)

**release-npm.yml:**

- `node-version` (default: `22`)
- `registry` (default: `https://registry.npmjs.org`)
- `scope` (e.g., `@myorg`)
- `dry-run` (default: `false`)
- **Secrets:** `NPM_TOKEN` (required)

**deploy-service.yml:**

- `registry` (default: repo owner)
- `image-name` (required)
- `dockerfile` (default: `Dockerfile`)
- `context` (default: `.`)
- `deploy-command` (optional — skip if empty)
- **Secrets:** `REGISTRY_TOKEN` (required)

### Version Pinning

By default, workflows are pinned to `@main` — always get the latest. For stability, pin to a tag:

```yaml
uses: your-org/golden-path/.github/workflows/build-test-node.yml@v1
```
