# Golden Path

Internal developer platform — standardized, reusable CI/CD workflows, automated repository onboarding, and org-wide profile templates.

## Workflows

| Workflow                       | Purpose                                         |
| ------------------------------ | ----------------------------------------------- |
| `golden-path-ci.yaml`          | **Config-driven CI orchestrator (entry point)** |
| `build-test-node.yaml`         | Node.js CI: lint → typecheck → test → build     |
| `build-test-go.yaml`           | Go CI: lint → vet → test → build                |
| `security-scan.yaml`           | CodeQL static analysis                          |
| `codespell.yaml`               | Spell check                                     |
| `secret-scan-betterleaks.yaml` | Secret scanning (Betterleaks)                   |
| `secret-scan-ggshield.yaml`    | Secret scanning (GitGuardian)                   |
| `release-github.yaml`          | GitHub Release (tag-driven or release-please)   |
| `release-npm.yaml`             | npm publish                                     |
| `release-github-npm.yaml`      | GitHub Release → npm publish                    |
| `deploy-service.yaml`          | Docker build → push → deploy                    |
| `dependency-update.yaml`       | Dependabot auto-merge                           |
| `actionlint.yaml`              | Workflow linting                                |
| `governance.yaml`              | Repo-hygiene automations bundle (see below)     |
| `pr-assignee.yaml`             | Auto-assign PR to its authors/committers        |
| `issue-labels.yaml`            | Apply type/priority/area labels from issue form |
| `stale-issue.yaml`             | Mark/close stale issues and PRs                 |
| `self-ci.yaml`                 | Lint, test, format, secret-scan                 |
| `self-pr-assignee.yaml`        | Golden-path's own PR auto-assignment            |

## Actions

### JavaScript Actions (TypeScript, bundled to a committed `dist/index.cjs`)

Referenced by the reusable workflows; cross-repo consumers fetch the action but
never run `npm install`.

| Action          | Purpose                                                               | Runtime deps      |
| --------------- | --------------------------------------------------------------------- | ----------------- |
| `parse-config`  | Read `.github/golden-path.yaml` → validated, normalized JSON          | `@actions/core`   |
| `changed-files` | PR-aware change detection against glob patterns                       | `@actions/github` |
| `coverage-gate` | Run Go tests and enforce a coverage floor                             | `@actions/core`   |
| `final-gate`    | Aggregate job results into one required check                         | `@actions/core`   |
| `issue-labels`  | Apply three-tier issue labels (type/priority/areas) from form answers | `@actions/core`   |
| `pr-assignee`   | Auto-assign PR to its author and commit authors                       | `@actions/github` |

### Composite Actions (bash steps, `using: composite`)

| Action                  | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `setup-go`              | Install Go from a version or `go.mod`/`go.work` (+ optional cache) |
| `setup-node`            | Install Node + npm/pnpm/yarn (auto-detect, cache, install)         |
| `install-tool`          | Download a pinned GitHub-release binary, cache it, add to PATH     |
| `lint-go`               | golangci-lint (pinned direct binary) + analysis cache              |
| `codespell`             | Spell check                                                        |
| `actionlint`            | GitHub Actions workflow lint                                       |
| `betterleaks`           | Secret scan over git history                                       |
| `gitleaks`              | Secret scan via gitleaks-action                                    |
| `docker-build-push`     | Login → metadata → build & push a container image                  |
| `s3-deploy`             | Configure AWS → s3 sync → CloudFront invalidation                  |
| `dependabot-auto-merge` | Approve + auto-merge non-breaking Dependabot PRs                   |

> TypeScript actions live in `packages/actions/<name>/src` and are bundled to
> `.github/actions/<name>/dist/index.cjs` by `pnpm run build:actions` — `self-ci.yaml`
> fails when the committed bundle is stale. Third-party action versions are
> pinned to commit SHAs and enforced by `scripts/check-action-pins.mjs`.

## Quickstart

```bash
git clone https://github.com/shiv-source/golden-path.git
cd golden-path
pnpm install          # installs deps + sets up git hooks
pnpm test             # Vitest (actions) + node --test (scripts)
```

## Development

```bash
pnpm run lint          # ESLint on scripts/ + packages/
pnpm typecheck         # tsc --noEmit across TS packages
pnpm run format        # Prettier
pnpm run format:check  # Prettier check
pnpm run lint:workflows # actionlint (requires binary)
pnpm run build:actions # re-bundle TypeScript actions (dist/index.cjs)
```

### Git Hooks

- **pre-commit**: main branch guard → format check → lint → typecheck → tests
- **commit-msg**: conventional commits via commitlint

## Using Workflows

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
        uses: shiv-source/golden-path/.github/workflows/golden-path-ci.yaml@main
        with:
            config-path: .github/golden-path.yaml
        secrets: inherit
```

```yaml
# .github/golden-path.yaml
version: 2

# Go and Node are OPT-IN target lists: presence in the list enables the gate.
# Each target has its own name (used in the CI job list and reports), working
# directory and overrides (add more for a monorepo). Omit the list to disable.
go:
    - name: api # identify the target; fallback is the working-directory
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
# Scans/linters run automatically and are on by default (opt out with
# enabled: false). security-scan's CodeQL auto-detects languages unless you
# pin one (language: go).
security-scan: { enabled: true }
secret-scan: { enabled: true, tool: betterleaks }
# codespell: skip vendored/generated paths (lockfiles, bundles) and ignore
# intentional technical terms via ignore-words-file (one word per line).
codespell:
    enabled: true
    skip: '.git,node_modules,dist,build,vendor,package-lock.json,pnpm-lock.yaml,*.lock,*.sum'
    ignore-words-file: '' # e.g. .codespellignore
actionlint: { enabled: true }
```

The config file drives which checks run and their settings. The orchestrator
fans out one Go/Node gate **per configured target** plus the scans and
linters. Set `enabled: false` to skip a scan; a missing config file enables no
language gates.

### Governance automations (recommended, second file)

CI gates run on `push`/`pull_request`; repo-hygiene automations need `issues`
and `schedule` too, so they live in a separate event-driven workflow. The
`governance.yaml` bundle (PR auto-assign, issue-form labels, stale management,
Dependabot auto-merge) is default-all-on and needs only its own trigger file:

```yaml
# .github/workflows/governance.yml
name: governance
on:
    pull_request:
        branches: [main, master]
    issues:
        types: [opened, edited]
    schedule:
        - cron: '0 6 * * *'
    workflow_dispatch:

permissions:
    contents: read

jobs:
    governance:
        uses: shiv-source/golden-path/.github/workflows/governance.yaml@main
        # disable any automation with inputs, e.g. with: dependency-update: false
```

The bundled actions no-op gracefully on events they don't apply to, so one
workflow can carry every trigger. The standard consumer layout is therefore
two files: `ci.yaml` (→ `golden-path-ci.yaml`) for quality gates and
`governance.yml` (→ `governance.yaml`) for automations.

### Direct workflow calls

In any repo, create `.github/workflows/ci.yaml`:

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
    release:
        uses: shiv-source/golden-path/.github/workflows/release-github-npm.yaml@main
        with:
            tag: '${{ github.ref_name }}'
        secrets:
            NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Onboarding a Repository

1. Go to **Issues** → **New Issue** → **Repository Onboarding**
2. Fill in: repository name, type, language, optional features
3. Submit — a PR is automatically created adding the config
4. Once merged, the standard configuration is applied to your repo

## Repository Structure

```
golden-path/
├── packages/                  # pnpm workspace
│   ├── core/                  # @golden-path/core — shared types + helpers
│   └── actions/               # TypeScript action sources
├── .github/
│   ├── actions/               # action.yaml manifests + committed dist/index.cjs bundles
│   ├── workflows/             # reusable + CI workflows
│   ├── ISSUE_TEMPLATE/        # Repository onboarding form
│   └── PULL_REQUEST_TEMPLATE.md
├── scripts/                    # Plain .mjs (zero deps)
│   ├── lib/                    # Shared helpers (gh, fs, profile-map)
│   └── test/                   # node --test
├── profiles/                   # File templates
│   ├── common/                 # .editorconfig, CODEOWNERS, SECURITY.md, dependabot
│   ├── node-library/           # .prettierrc, eslint, commitlint, tsconfig
│   ├── node-service/           # Dockerfile (inherits node-library)
│   └── go-service/             # .golangci.yaml, Dockerfile, golden-path.yaml, ci.yaml
├── repositories/               # Per-repo config (generated by onboarding)
├── schemas/                    # golden-path.schema.json — the config contract (strict)
├── examples/                   # Copy-paste consumer examples (go/node/monorepo)
├── docs/                       # Architecture, developer guide, admin guide
├── .husky/                     # Git hooks
├── .vscode/                    # Editor settings
└── CLAUDE.md                   # Project conventions
```

## Docs

- [Architecture](docs/architecture.md)
- [Developer Guide](docs/developer-guide.md)
- [Admin Guide](docs/admin-guide.md)
- [CLAUDE.md](CLAUDE.md)
