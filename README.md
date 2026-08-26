# Golden Path

Internal developer platform — standardized, reusable CI/CD workflows, automated repository onboarding, and org-wide profile templates.

## Workflows

| Workflow                      | Purpose                                         |
| ----------------------------- | ----------------------------------------------- |
| `golden-path-ci.yml`          | **Config-driven CI orchestrator (entry point)** |
| `build-test-node.yml`         | Node.js CI: lint → typecheck → test → build     |
| `build-test-go.yml`           | Go CI: lint → vet → test → build                |
| `security-scan.yml`           | CodeQL static analysis                          |
| `codespell.yml`               | Spell check                                     |
| `secret-scan-betterleaks.yml` | Secret scanning (Betterleaks)                   |
| `secret-scan-ggshield.yml`    | Secret scanning (GitGuardian)                   |
| `release-github.yml`          | GitHub Release (tag-driven or release-please)   |
| `release-npm.yml`             | npm publish                                     |
| `release-github-npm.yml`      | GitHub Release → npm publish (composite)        |
| `deploy-service.yml`          | Docker build → push → deploy                    |
| `dependency-update.yml`       | Dependabot auto-merge                           |
| `actionlint.yml`              | Workflow linting                                |
| `self-ci.yml`                 | Lint, test, format, secret-scan                 |

## JavaScript Actions

TypeScript-backed actions (bundled to a committed `dist/index.cjs`), referenced by the reusable workflows:

| Action           | Purpose                                                  | Runtime deps      |
| ---------------- | -------------------------------------------------------- | ----------------- |
| `parse-config`   | Read `.github/golden-path.yml` → normalized JSON outputs | `@actions/core`   |
| `setup-go`       | Install Go from a version or `go.mod`/`go.work`          | — (composite)     |
| `setup-go-cache` | Install Go + cache module/build caches (keyed)           | — (composite)     |
| `changed-files`  | PR-aware change detection against glob patterns          | `@actions/github` |
| `coverage-gate`  | Run Go tests and enforce a coverage floor                | `@actions/core`   |
| `final-gate`     | Aggregate job results into one required check            | `@actions/core`   |

> TypeScript actions live in `packages/actions/<name>/src` and are bundled to
> `.github/actions/<name>/dist/index.cjs` by `pnpm run build:actions` — cross-repo
> consumers fetch the action but never run `npm install`, so the bundle must be
> committed. `self-ci.yml` fails when the committed bundle is stale.

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
        uses: shiv-source/golden-path/.github/workflows/golden-path-ci.yml@main
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

The config file drives which checks run and their settings. Set `enabled: false` to opt out of a gate; a missing config file uses sane defaults.

### Direct workflow calls

In any repo, create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
    push:
        branches: [main]
    pull_request:
        branches: [main]

jobs:
    build-test:
        uses: shiv-source/golden-path/.github/workflows/build-test-node.yml@main
        secrets: inherit
    security:
        uses: shiv-source/golden-path/.github/workflows/security-scan.yml@main
        with:
            language: node
        secrets: inherit
    release:
        uses: shiv-source/golden-path/.github/workflows/release-github-npm.yml@main
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
│   ├── actions/               # action.yml manifests + committed dist/index.cjs bundles
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
│   └── go-service/             # .golangci.yml, Dockerfile, golden-path.yml, ci.yml
├── repositories/               # Per-repo config (generated by onboarding)
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
