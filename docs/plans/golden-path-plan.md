# golden-path — Implementation Plan

**Date:** 2026-08-06
**Status:** Ready for implementation
**Repo:** `our-org/golden-path`

## Scope

Golden-path is the **toolkit** consumed by 100+ repos across the org. It does NOT contain the dashboard — the dashboard lives in the sibling repo [`platform-observability`](../../../platform-observability/docs/plans/platform-observability-plan.md).

### What Lives Here

| Layer                 | What                                                              |
| --------------------- | ----------------------------------------------------------------- |
| 1. Reusable Workflows | 10 standardized CI/CD workflows callable via `uses:`              |
| 2. Onboarding System  | Issue form → validate → generate config → PR                      |
| 3. Profile Templates  | File templates for common, node-library, node-service, go-service |

### What Lives in platform-observability

| Layer            | What                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| 3. Policy Engine | Rule evaluation, drift detection, compliance scoring                      |
| 4. GitHub App    | Webhook receiver, event handlers, proactive enforcement, app manifest     |
| 5. Dashboard     | NestJS + React app with charts, service catalog, health/activity tracking |

---

## Repository Structure

```
golden-path/
├── package.json                    # minimal — eslint + prettier devDeps only
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # platform-repo CI (lint scripts, check workflow syntax)
│   │   ├── build-test-node.yml     # reusable
│   │   ├── build-test-go.yml       # reusable
│   │   ├── security-scan.yml       # reusable
│   │   ├── release-npm.yml         # reusable
│   │   ├── deploy-service.yml      # reusable
│   │   ├── dependency-update.yml   # reusable
│   │   ├── compliance-check.yml    # reusable
│   │   ├── repository-onboarding.yml
│   │   └── apply-repository-config.yml
│   ├── ISSUE_TEMPLATE/
│   │   └── repository-onboarding.yml
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
│       └── Dockerfile
│
├── repositories/                   # per-repo config (generated + manual)
│   └── *.yaml
│
├── scripts/                        # plain .mjs — no TypeScript, no build step
│   ├── lib/
│   │   └── profile-map.mjs         # resolveProfilesFor(language, type) — lookup table
│   ├── parse-onboarding-issue.mjs
│   ├── generate-repo-config.mjs
│   ├── merge-profiles.mjs
│   ├── open-or-reuse-pr.mjs
│   ├── compliance-check.mjs
│
├── docs/
│   ├── architecture.md
│   ├── developer-guide.md
│   └── admin-guide.md
│
└── README.md
```

**No monorepo, no TypeScript, no shared package, no turbo.** The only language here is YAML + plain `.mjs` scripts. The `platform-observability` repo defines its own types.

---

## Layer 1 — Reusable Workflows

Standardized CI/CD callable from any repo with one `uses:` line.

### Workflow Catalog

| File                          | Purpose                                                  | Triggers                                      |
| ----------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| `build-test-node.yml`         | pnpm install → lint → typecheck → sharded test → build   | `workflow_call`                               |
| `build-test-go.yml`           | golangci-lint → vet → test → build                       | `workflow_call`                               |
| `security-scan.yml`           | Gitleaks + CodeQL (language parameterized, advisory)     | `workflow_call`                               |
| `release-npm.yml`             | Conventional commits → version → changelog → npm publish | `workflow_call`                               |
| `deploy-service.yml`          | Docker buildx → GHCR push → deploy                       | `workflow_call`                               |
| `dependency-update.yml`       | Dependabot auto-merge for non-breaking updates           | `workflow_call`                               |
| `compliance-check.yml`        | Verify required files + branch protection                | `workflow_call`                               |
| `repository-onboarding.yml`   | Issue-driven: parse → validate → config → PR             | `issues.opened`, `issues.labeled`             |
| `apply-repository-config.yml` | Profile merge → PR into target repo                      | `push` (repositories/**), `workflow_dispatch` |

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
3. Map language + type → profile list (via scripts/lib/profile-map.mjs)
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

### Profile Mapping (inlined in `scripts/lib/profile-map.mjs`)

```javascript
const PROFILE_MAP = {
  node: {
    library: ['common', 'node-library'],
    service: ['common', 'node-service'],
    frontend: ['common', 'node-library'],
    cli: ['common', 'node-library'],
    docs: ['common'],
  },
  go: { service: ['common', 'go-service'] },
  python: { service: ['common', 'python-service'] },
  java: { service: ['common', 'java-service'] },
};

export function resolveProfilesFor(language, type) {
  const profiles = PROFILE_MAP[language]?.[type];
  if (!profiles) throw new Error(`No profile mapping for ${language}/${type}`);
  return profiles;
}
```

### Idempotency

- Re-running onboarding for an already-configured repo detects existing `repositories/<name>.yaml` and skips
- Re-running onboarding for a repo with an open onboarding PR re-uses the existing PR
- Applying profiles twice produces the same result — files unchanged between runs produce no new PR

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
Dockerfile                — multi-stage Go build
```

---

## Scripts

All scripts are plain `.mjs` (Node ES modules) for zero-config execution in GitHub Actions. No TypeScript, no build step, no dependencies. Profile mapping lives in `scripts/lib/profile-map.mjs`.

> **Note:** The profile mapping table is duplicated between golden-path (`scripts/lib/profile-map.mjs`) and platform-observability (`packages/shared/`). This is intentional — a 15-line lookup table doesn't justify a shared package. Both repos must keep their copy in sync when adding new languages or profile types.

| Script                       | Purpose                                                       | Used By                           |
| ---------------------------- | ------------------------------------------------------------- | --------------------------------- |
| `lib/profile-map.mjs`        | `resolveProfilesFor(language, type)` — single source of truth | All scripts                       |
| `parse-onboarding-issue.mjs` | Parse issue-form YAML body → structured fields                | `repository-onboarding.yml`       |
| `generate-repo-config.mjs`   | Fields → `repositories/<name>.yaml`                           | `repository-onboarding.yml`       |
| `merge-profiles.mjs`         | Resolve profile list → merged file tree                       | `apply-repository-config.yml`     |
| `open-or-reuse-pr.mjs`       | Open PR or reuse existing (idempotent)                        | Both onboarding + apply workflows |
| `compliance-check.mjs`       | Verify required files + branch protection                     | `compliance-check.yml`            |

---

## Engineering Conventions

- **No TypeScript** — scripts are plain `.mjs`; workflows are YAML; profiles are static files
- **No dead files** — every script is consumed by a workflow; every profile file is referenced by a template
- **Testing:** Scripts — `node --test`; Workflows — `actionlint` + manual smoke
- **Commits:** Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branching:** Feature branches from `main`, squash-merge PRs

---

## Implementation Phases

### Phase 1 — Scaffolding

- `package.json` (minimal — eslint + prettier devDeps)
- `.editorconfig`, `.prettierrc`, `.prettierignore`, `.gitignore`, `.gitattributes`
- `.github/workflows/ci.yml` (lint scripts + actionlint check)
- **Verify:** `pnpm install` + `pnpm lint` passes; `actionlint` clean

### Phase 2 — Reusable Workflows (Part 1)

- `build-test-node.yml`, `build-test-go.yml`, `security-scan.yml`
- `compliance-check.yml`, `dependency-update.yml`
- **Verify:** `actionlint`; scratch consumer repo calls each workflow — all jobs green

### Phase 3 — Reusable Workflows (Part 2)

- `release-npm.yml`, `deploy-service.yml`
- **Verify:** `actionlint`; release dry-run produces correct version; deploy build green

### Phase 4 — Profile Templates

- `common/`, `node-library/`, `node-service/`, `go-service/`
- Example `repositories/my-api.yaml`
- **Verify:** Templates contain all required files; example config matches schema

### Phase 5 — Onboarding Scripts + Workflows

- `scripts/lib/profile-map.mjs` (single source of truth for profile mapping)
- All 5 workflow scripts with `node --test` tests
- `repository-onboarding.yml`, `apply-repository-config.yml`
- Issue form YAML
- **Verify:** E2E in scratch org — issue → PR → apply PR; duplicate re-run is no-op

### Phase 6 — Documentation

- README, architecture.md, developer-guide.md, admin-guide.md
- **Verify:** Quickstart from clean clone; all doc links resolve

---

## Verification (End-to-End)

1. Fresh clone → `pnpm install`
2. `actionlint` clean on all workflows
3. Scripts: `node --test scripts/test/` green
4. Scratch org: open onboarding issue → PR created in golden-path
5. Merge PR → apply-config PR opens in target repo with correct files; conflict detection works
6. Consumer repo: `uses:` references → CI green for build/test/security/release
