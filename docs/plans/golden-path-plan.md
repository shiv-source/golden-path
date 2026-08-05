# golden-path — Implementation Plan

**Date:** 2026-08-06
**Status:** Ready for implementation
**Repo:** `our-org/golden-path`

## Scope

Golden-path is the **toolkit** consumed by 100+ repos across the org. It does NOT contain the dashboard — the dashboard lives in the sibling repo [`platform-observability`](../../../platform-observability/docs/plans/platform-observability-plan.md).

### What Lives Here

| Layer | What |
|---|---|
| 1. Reusable Workflows | 10 standardized CI/CD workflows callable via `uses:` |
| 2. Onboarding System | Issue form → validate → generate config → PR |
| 3. Shared Types | `@golden-path/shared` — TypeScript types + helpers published as private npm package |
| 4. Profile Templates | File templates for common, node-library, node-service, go-service |
| 5. GitHub App Manifest | App definition for Layer 4 (built later) |

### What Lives in platform-observability

| Layer | What |
|---|---|
| 3. Policy Engine | Rule evaluation, drift detection, compliance scoring |
| 4. GitHub App | Webhook receiver, event handlers, proactive enforcement |
| 5. Dashboard | NestJS + React app with charts, service catalog, health/activity tracking |

---

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Package Manager | pnpm | 10.x |
| Language | TypeScript | 5.x (strict) |
| Package Publishing | GitHub Packages (private npm) | — |
| CI | GitHub Actions | — |

---

## Repository Structure

```
golden-path/
├── package.json                    # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
│
├── packages/
│   └── shared/                     # @golden-path/shared (published)
│       ├── src/
│       │   ├── index.ts
│       │   ├── repo-config.ts      # RepoConfig, RepoType, RepoLanguage, RepoOptions
│       │   ├── profile.ts          # Profile, ProfileFile, MergeResult, Conflict
│       │   ├── dashboard.ts        # Overview, RepoSummary, Paginated<T>
│       │   ├── webhook.ts          # WebhookEvent discriminated union
│       │   ├── auth.ts             # User, UserRole
│       │   ├── audit.ts            # AuditLogEntry
│       │   └── onboarding.ts       # OnboardingRequest, ValidationIssue
│       └── package.json
│
├── profiles/                       # profile file templates
│   ├── common/
│   │   ├── .editorconfig
│   │   ├── CODEOWNERS
│   │   ├── SECURITY.md
│   │   ├── dependabot.yml
│   │   └── .github/
│   │       ├── ISSUE_TEMPLATE/
│   │       └── workflows/
│   │           └── ci.yml          # calls golden-path reusable workflows
│   ├── node-library/
│   │   ├── .prettierrc
│   │   ├── eslint.config.js
│   │   ├── commitlint.config.js
│   │   └── tsconfig.json
│   ├── node-service/
│   │   ├── Dockerfile
│   │   └── (inherits node-library)
│   └── go-service/
│       ├── .golangci.yml
│       ├── gofmt
│       └── Dockerfile
│
├── repositories/                   # per-repo config (generated + manual)
│   └── *.yaml
│
├── scripts/                        # workflow helper scripts
│   ├── parse-onboarding-issue.mjs
│   ├── generate-repo-config.mjs
│   ├── merge-profiles.mjs
│   ├── open-or-reuse-pr.mjs
│   ├── compliance-check.mjs
│   └── drift-check.mjs
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # platform-repo CI
│   │   ├── build-test-node.yml     # reusable
│   │   ├── build-test-go.yml       # reusable
│   │   ├── security-scan.yml       # reusable
│   │   ├── release-npm.yml         # reusable
│   │   ├── deploy-service.yml      # reusable
│   │   ├── dependency-update.yml   # reusable
│   │   ├── compliance-check.yml    # reusable
│   │   ├── repository-onboarding.yml
│   │   ├── apply-repository-config.yml
│   │   └── drift-check.yml
│   ├── ISSUE_TEMPLATE/
│   │   └── repository-onboarding.yml
│   └── app.yml                     # GitHub App manifest (for Layer 4)
│
├── docs/
│   ├── architecture.md
│   ├── developer-guide.md
│   └── admin-guide.md
│
└── README.md
```

---

## Layer 1 — Reusable Workflows

Standardized CI/CD callable from any repo with one `uses:` line.

### Workflow Catalog

| File | Purpose | Triggers |
|---|---|---|
| `build-test-node.yml` | pnpm install → lint → typecheck → sharded test → build | `workflow_call` |
| `build-test-go.yml` | golangci-lint → vet → test → build | `workflow_call` |
| `security-scan.yml` | Gitleaks + CodeQL (language parameterized, advisory) | `workflow_call` |
| `release-npm.yml` | Conventional commits → version → changelog → npm publish | `workflow_call` |
| `deploy-service.yml` | Docker buildx → GHCR push → deploy | `workflow_call` |
| `dependency-update.yml` | Dependabot auto-merge for non-breaking updates | `workflow_call` |
| `compliance-check.yml` | Verify required files + branch protection | `workflow_call` |
| `repository-onboarding.yml` | Issue-driven: parse → validate → config → PR | `issues.opened`, `issues.labeled` |
| `apply-repository-config.yml` | Profile merge → PR into target repo | `push` (repositories/**), `workflow_dispatch` |
| `drift-check.yml` | Scheduled weekly drift scan | `schedule`, `workflow_dispatch` |

### Usage Pattern (Target Repos)

```yaml
# In any repo's .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-test:
    uses: our-org/golden-path/.github/workflows/build-test-node.yml@main
    secrets: inherit

  security:
    uses: our-org/golden-path/.github/workflows/security-scan.yml@main
    with:
      language: node
    secrets: inherit
```

### Design Decisions

- **`@main` pinning** with optional `@v1` tags for teams wanting stability
- **`secrets: inherit`** — org-level secrets flow down, no per-repo secret setup
- **Opinionated defaults** — Node 22, Go stable. Overridable via inputs
- **Security scans are advisory** — don't block builds, findings surface in dashboard (platform-observability)
- **Reusable workflows** (not composite actions) — visible as separate CI jobs, independently retryable

---

## Layer 2 — Onboarding System

### Flow

```
Developer opens issue using form (.github/ISSUE_TEMPLATE/repository-onboarding.yml)
  ↓
Fields: repo name, type (service/library/frontend/CLI/docs),
        language (Node.js/Go/Python/Java),
        options (CodeQL/Gitleaks/Dependabot/Release automation)
  ↓
GitHub Action triggers on issues.opened or issues.labeled("approved")
  ↓
1. Parse issue body → extract fields
2. Validate repo exists in org (gh CLI)
3. Map language + type → profile list
4. Generate repositories/<repo>.yaml
5. Create branch feature/onboard-<repo>
6. Commit config → open PR against golden-path main
7. Comment on issue with PR link
  ↓
PR merged → apply-repository-config.yml triggers
  ↓
1. Read repositories/<repo>.yaml
2. Resolve profiles (common + node-service → merged file list)
3. Clone target repo
4. Copy profile files → check for conflicts
5. Open PR in target repo: "Apply organization standard configuration"
  ↓
PR description lists every file, source profile, and justification.
Conflicts flagged as "CONFLICT — manual review needed" (never overwrite silently).
```

### Profile Mapping

| Language | Type | Profiles Applied |
|---|---|---|
| Node.js | library | `common` + `node-library` |
| Node.js | service | `common` + `node-service` |
| Node.js | frontend | `common` + `node-library` |
| Node.js | CLI | `common` + `node-library` |
| Go | service | `common` + `go-service` |
| Python | service | `common` + `python-service` |
| Java | service | `common` + `java-service` |

### Idempotency

- Re-running onboarding for an already-configured repo detects existing `repositories/<name>.yaml` and skips
- Re-running onboarding for a repo with an open onboarding PR re-uses the existing PR
- Applying profiles twice produces the same result — files unchanged between runs produce no new PR

---

## Shared Types Package (`@golden-path/shared`)

Published as a private package to GitHub Packages. Consumed by `platform-observability`.

### Publication

```bash
# From golden-path repo
pnpm --filter @golden-path/shared build
pnpm --filter @golden-path/shared publish --registry https://npm.pkg.github.com
```

### Consumer Installation (in platform-observability)

```json
{
  "dependencies": {
    "@golden-path/shared": "^1.0.0"
  }
}
```

With `.npmrc`:
```
@golden-path:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### Exports

```typescript
// Repo config
export { RepoConfig, RepoType, RepoLanguage, RepoOptions, resolveProfilesFor, DEFAULT_OPTIONS } from './repo-config';

// Profiles
export { Profile, ProfileFile, MergeResult, Conflict, ConflictType } from './profile';

// Dashboard
export { Overview, RepoSummary, RepoDetail, ActivityStats, RiskItem, TrendPoint, Paginated } from './dashboard';

// Webhooks
export { WebhookEvent, RepositoryCreatedEvent, PushEvent, IssueOpenedEvent, PullRequestOpenedEvent } from './webhook';

// Auth
export { User, UserRole } from './auth';

// Audit
export { AuditLogEntry, AuditAction } from './audit';

// Onboarding
export { OnboardingRequest, ValidationIssue, OnboardingResult } from './onboarding';
```

---

## Profile Templates

### `common/` (applied to every repo)

```
.editorconfig          — whitespace/encoding conventions
CODEOWNERS              — default codeowners (org-level team)
SECURITY.md             — security policy + contact
dependabot.yml          — package ecosystem config
.github/ISSUE_TEMPLATE/ — standard bug/feature templates
.github/workflows/ci.yml — calls golden-path reusable workflows
```

### `node-library/`

```
.prettierrc             — consistent formatting
eslint.config.js         — org-standard linting rules
commitlint.config.js     — conventional commits enforced
tsconfig.json            — base TypeScript config
```

### `node-service/`

```
(inherits node-library)
Dockerfile               — multi-stage Node build
```

### `go-service/`

```
.golangci.yml            — linting config
gofmt                     — formatting enforced
Dockerfile                — multi-stage Go build
```

---

## Scripts

All scripts use plain `.mjs` (Node ES modules) for zero-config execution in GitHub Actions.

| Script | Purpose | Used By |
|---|---|---|
| `parse-onboarding-issue.mjs` | Parse issue-form YAML body → OnboardingRequest | `repository-onboarding.yml` |
| `generate-repo-config.mjs` | OnboardingRequest → `repositories/<name>.yaml` | `repository-onboarding.yml` |
| `merge-profiles.mjs` | Resolve profile list → merged file tree | `apply-repository-config.yml` |
| `open-or-reuse-pr.mjs` | Open PR or reuse existing (idempotent) | Both onboarding + apply workflows |
| `compliance-check.mjs` | Verify required files + branch protection | `compliance-check.yml` |
| `drift-check.mjs` | Compare declared config vs GitHub state | `drift-check.yml` |

Scripts import `@golden-path/shared` from its built `dist/` directory (the workflow runs `pnpm install --frozen-lockfile && pnpm --filter @golden-path/shared build` first), keeping `resolveProfilesFor` and types single-sourced.

---

## Engineering Conventions

- **TypeScript:** `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`
- **No dead code:** ESLint `no-unused-vars: error`, `consistent-type-imports: error`
- **Testing:** Shared types — Vitest with `expectTypeOf`; Scripts — `node --test`
- **Commits:** Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branching:** Feature branches from `main`, squash-merge PRs

---

## Implementation Phases

### Phase 1 — Scaffolding
- pnpm workspace, tsconfig, turbo.json, eslint, CI
- Placeholder package.json files
- **Verify:** `pnpm install` + `pnpm lint/typecheck/build` green

### Phase 2 — Shared Types Package
- All domain types + `resolveProfilesFor()`
- Unit tests
- Publication config
- **Verify:** `pnpm build` emits dist + d.ts; tests green

### Phase 3 — Reusable Workflows (Part 1)
- `build-test-node.yml`, `build-test-go.yml`, `security-scan.yml`
- `compliance-check.yml`, `dependency-update.yml`
- **Verify:** `actionlint`; scratch repo calls each workflow

### Phase 4 — Reusable Workflows (Part 2)
- `release-npm.yml`, `deploy-service.yml`, `drift-check.yml`
- **Verify:** `actionlint`; dry-run release

### Phase 5 — Profile Templates
- `common/`, `node-library/`, `node-service/`, `go-service/`
- Example `repositories/my-api.yaml`
- **Verify:** Templates contain all required files; example config is valid YAML

### Phase 6 — Onboarding Scripts + Workflows
- All 6 scripts with tests
- `repository-onboarding.yml`, `apply-repository-config.yml`
- Issue form YAML
- **Verify:** E2E in scratch org — issue → PR → apply PR

### Phase 7 — Documentation + GitHub App Manifest
- README, architecture.md, developer-guide.md, admin-guide.md
- `.github/app.yml`
- **Verify:** Quickstart from fresh clone; all doc links resolve

---

## Verification (End-to-End)

1. Fresh clone → `pnpm install` → `pnpm lint/typecheck/build` green
2. Scratch org: open onboarding issue → PR created in golden-path
3. Merge PR → apply-config PR opens in target repo with correct files
4. Consumer repo: `uses:` reference → CI green for build/test/security/release
5. Drift check runs and reports correctly on a scratch repo
