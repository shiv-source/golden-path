# Golden Path — Internal Developer Platform Design

**Date:** 2026-08-06
**Status:** Draft
**Audience:** Platform engineering team

## 1. Overview

An internal developer platform for a large GitHub Organization (100+ repos, 15+ teams). It provides standardized reusable CI/CD workflows, an automated repository onboarding system, org-wide policy enforcement, and a dashboard for visibility into repo health, compliance, and activity.

### Goals

1. **Consistency** — every repo uses the same battle-tested CI/CD, linting, and security tooling
2. **Compliance** — org-wide standards enforced systematically, not via manual audits
3. **Developer velocity** — new repos are production-ready in minutes; new hires understand the landscape immediately

### Non-Goals

- Does not replace individual team CI/CD — teams can extend or add jobs alongside the reusable workflows
- Does not manage deployments — deploy workflows are templates teams customize
- Does not handle secrets management beyond inheriting org-level secrets into workflows

---

## 2. Tech Stack

| Layer              | Choice                                  | Version           |
| ------------------ | --------------------------------------- | ----------------- |
| Runtime            | Node.js                                 | 22.x LTS          |
| Package Manager    | pnpm                                    | 10.x              |
| Backend Framework  | NestJS                                  | 11.x              |
| Frontend           | React SPA (Vite)                        | 19.x              |
| UI Components      | shadcn/ui + Tailwind CSS                | Latest            |
| Charts             | chart.js + react-chartjs-2              | Latest            |
| Database           | MongoDB via @nestjs/mongoose + Mongoose | Latest            |
| GitHub REST API    | @octokit/rest                           | Latest            |
| GitHub GraphQL API | @octokit/graphql                        | Latest            |
| Webhooks           | @octokit/webhooks                       | Latest            |
| Auth               | @nestjs/passport + passport-github2     | Latest            |
| Cron               | @nestjs/schedule                        | Latest            |
| Language           | TypeScript                              | 5.x (strict mode) |
| Monorepo           | pnpm workspaces + Turborepo             | Latest            |

---

## 3. Repository Structure

```
golden-path/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
│
├── apps/
│   ├── backend/                    # NestJS application
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/             # guards, filters, interceptors
│   │   │   ├── auth/               # GitHub OAuth module
│   │   │   ├── github/             # Octokit wrapper, webhook handler
│   │   │   ├── onboarding/         # issue parsing, validation, config gen
│   │   │   ├── profiles/           # profile CRUD, merging logic
│   │   │   ├── repositories/       # repo config management
│   │   │   ├── dashboard/          # API aggregation for frontend
│   │   │   ├── policies/           # policy engine, drift detection
│   │   │   ├── scheduler/          # cron jobs (@nestjs/schedule)
│   │   │   └── app/                # serve React SPA in production
│   │   ├── test/
│   │   └── package.json
│   │
│   └── frontend/                   # React SPA (Vite)
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── components/         # shadcn/ui based
│       │   ├── pages/              # overview, repo-list, repo-detail, profiles, drift, settings
│       │   ├── hooks/              # data fetching, auth
│       │   ├── lib/                # API client, chart config
│       │   └── types/              # re-exports from shared
│       ├── index.html
│       └── package.json
│
├── packages/
│   └── shared/                     # TypeScript types shared by both apps
│       ├── src/
│       │   ├── repo-config.ts
│       │   ├── profile.ts
│       │   ├── dashboard.ts
│       │   └── webhook.ts
│       └── package.json
│
├── profiles/                       # profile file templates
│   ├── common/                     # .editorconfig, CODEOWNERS, SECURITY.md, etc.
│   ├── node-library/               # eslint, prettier, tsconfig, commitlint
│   ├── node-service/               # node-library + Dockerfile, deploy config
│   └── go-service/                 # golangci-lint, gofmt, Dockerfile
│
├── repositories/                   # per-repo config (generated + manual)
│   └── *.yaml
│
├── .github/
│   ├── workflows/                  # reusable workflows + onboarding + apply-config
│   ├── ISSUE_TEMPLATE/
│   │   └── repository-onboarding.yml
│   └── app.yml                     # GitHub App manifest
│
├── docs/
│   ├── architecture.md
│   ├── developer-guide.md
│   └── admin-guide.md
│
└── scripts/
```

---

## 4. Layered Platform Architecture

The platform is built and adopted in layers, each delivering standalone value:

| Layer | Name                | What                                                               | Value                                                     |
| ----- | ------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| 1     | Reusable Workflows  | Standardized build/test/deploy/security/release workflows          | Immediate — one `uses:` line for production-grade CI      |
| 2     | Onboarding System   | Issue form → validate → generate config → PR into golden-path      | Eliminates manual repo setup, ensures baseline compliance |
| 3     | Dashboard           | Repo health, activity, compliance, drift visibility                | Single pane of glass for org-wide repo status             |
| 4     | Policy Engine + App | GitHub App listens to org events, enforces policies, detects drift | Proactive governance, audit-ready                         |

---

## 5. Backend API Design (NestJS)

### Module Architecture

- **AuthModule** — GitHub OAuth, session management, role-based guards
- **GitHubModule** — Octokit wrapper (REST + GraphQL), rate limiting, webhook receiver
- **ProfilesModule** — CRUD for profile definitions, file merge logic
- **ReposModule** — Per-repo config CRUD, validation, sync orchestration
- **OnboardingModule** — Issue form parsing, repository validation, config generation, PR creation
- **DashboardModule** — Data aggregation from MongoDB cache, health/activity/compliance scoring
- **PolicyModule** — Drift detection, rule evaluation, enforcement actions
- **SchedulerModule** — Cron jobs for cache refresh, drift scans, weekly digest
- **AuditModule** — Change logging, who-did-what-when

### Key Endpoints

```
GET    /api/auth/login                → redirect to GitHub OAuth
GET    /api/auth/callback             → OAuth callback
GET    /api/auth/me                   → current user + permissions

GET    /api/dashboard/overview        → org-level stats (compliance%, repo counts)
GET    /api/dashboard/repos           → paginated, filterable repo list with health
GET    /api/dashboard/repos/:name     → single repo detail (activity, config, drift)
GET    /api/dashboard/activity        → top repos by commits/PRs, CI minutes
GET    /api/dashboard/risk            → dormant repos, stale ownership, dependency rot
GET    /api/dashboard/trends          → compliance over time, adoption rate

GET    /api/profiles                  → list all profiles
POST   /api/profiles                  → create new profile (admin)
PUT    /api/profiles/:name            → update profile (admin)
POST   /api/profiles/:name/preview    → dry-run merge against a repo

GET    /api/repos                     → list configured repos
GET    /api/repos/:name               → get repo config
POST   /api/repos/:name/apply         → trigger config application (manual dispatch)
GET    /api/repos/:name/drift         → compare declared vs actual config

POST   /api/webhooks/github           → GitHub webhook receiver
```

### Architecture Principles

1. **Cache GitHub API aggressively** — dashboard reads from MongoDB, refreshed hourly by scheduler. Webhooks update cache in real-time for active repos
2. **Idempotent** — applying a profile twice produces the same result
3. **Never overwrite silently** — conflicts are flagged for manual resolution via PR comments
4. **Audit trail** — every config change, profile application, and policy enforcement is logged

---

## 6. MongoDB Schema

### Collection: `repos`

```typescript
interface Repo {
  _id: ObjectId;
  name: string;
  fullName: string;
  defaultBranch: string;
  language: 'node' | 'go';
  type: 'service' | 'library' | 'frontend' | 'cli' | 'docs';
  visibility: 'private' | 'public' | 'internal';
  profiles: string[];
  options: {
    codeql: boolean;
    gitleaks: boolean;
    dependabot: boolean;
    releaseAutomation: boolean;
  };
  activity: {
    lastCommit: Date;
    lastPush: Date;
    lastPRMerged: Date;
    commitsLast90d: number;
    activeContributors30d: number;
    openPRAge: number;
  };
  compliance: {
    score: number; // 0–100
    requiredFilesPresent: boolean;
    branchProtectionEnabled: boolean;
    secretScanningEnabled: boolean;
    codeScanningEnabled: boolean;
    workflowsConfigured: boolean;
  };
  drift: {
    status: 'clean' | 'drifted' | 'unmanaged';
    lastChecked: Date;
    details: Array<{ file: string; expected: string; actual: string }>;
  };
  lifecycle: {
    status: 'active' | 'dormant' | 'dead' | 'archiving';
    archivedAt: Date | null;
    suggestedAction: string | null;
  };
  metadata: {
    created: Date;
    updated: Date;
    syncedAt: Date;
  };
}
```

### Collection: `profiles`

```typescript
interface Profile {
  _id: ObjectId;
  name: string;
  displayName: string;
  language: string;
  type: string;
  files: Array<{ path: string; content: string; template?: boolean }>;
  inherits: string[];
  version: number;
  updatedAt: Date;
}
```

### Collection: `audit_logs`

```typescript
interface AuditLog {
  _id: ObjectId;
  action: string;
  repoName: string;
  user: string;
  details: Record<string, unknown>;
  timestamp: Date;
}
```

### Collection: `dashboard_snapshots`

```typescript
interface DashboardSnapshot {
  _id: ObjectId;
  date: Date;
  totalRepos: number;
  managedRepos: number;
  unmanagedRepos: number;
  avgCompliance: number;
  dormantCount: number;
  rawData: Record<string, unknown>;
}
```

### Collection: `users`

```typescript
interface User {
  _id: ObjectId;
  githubId: number;
  login: string;
  avatarUrl: string;
  role: 'admin' | 'viewer';
  createdAt: Date;
}
```

---

## 7. Reusable Workflows

### Workflow Catalog

| Workflow              | File                          | Purpose                                              |
| --------------------- | ----------------------------- | ---------------------------------------------------- |
| Build & Test (Node)   | `build-test-node.yml`         | Install → lint → typecheck → test (sharded) → build  |
| Build & Test (Go)     | `build-test-go.yml`           | Lint → vet → test → build                            |
| Security Scan         | `security-scan.yml`           | Gitleaks + CodeQL (language parameterized)           |
| Deploy (Service)      | `deploy-service.yml`          | Docker build → push → deploy                         |
| Release (npm)         | `release-npm.yml`             | Conventional commits → version → changelog → publish |
| Dependency Update     | `dependency-update.yml`       | Dependabot auto-merge for non-breaking updates       |
| Compliance Check      | `compliance-check.yml`        | Verify required files + branch protection            |
| Repository Onboarding | `repository-onboarding.yml`   | Issue-driven: parse → validate → config → PR         |
| Apply Config          | `apply-repository-config.yml` | Profile merge → PR into target repo                  |
| Drift Check           | `drift-check.yml`             | Scheduled drift scan                                 |

### Usage Pattern

Target repos call reusable workflows with a single `uses:` reference:

```yaml
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
- **Security scans are advisory** — don't block builds, findings surface in dashboard
- **Reusable workflows** (not composite actions) — visible as separate CI jobs, independently retryable

### `release-npm.yml` Key Behaviors

- Reads conventional commits via `release-please` for version bumps (`feat:` → minor, `fix:` → patch, `feat!:` → major)
- Generates changelog automatically
- Creates GitHub Release + git tag
- Publishes to configurable registry (npm, GitHub Packages, custom)
- Supports scoped packages, npm provenance, and dry-run mode

---

## 8. Onboarding System

### Flow

```
Developer creates issue using form
  ↓
Issue form collects: repo name, language, type, options
  ↓
GitHub Action triggers on issue.opened or issue.labeled("approved")
  ↓
1. Parse issue body → extract fields
2. Validate repo exists in org (via gh CLI)
3. Map language + type → profile list (e.g., node+service → common + node-service)
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
```

### Issue Form Fields

- Repository name (required)
- Repository type: service | library | frontend | CLI | documentation
- Programming language: Node.js | Go | Python | Java
- Optional features: CodeQL | Gitleaks | Dependabot | Release automation

---

## 9. Dashboard Design

### Pages

| Route          | Page         | Purpose                         |
| -------------- | ------------ | ------------------------------- |
| `/`            | Overview     | Org summary cards + trend chart |
| `/repos`       | Repo List    | Filterable, sortable repo table |
| `/repos/:name` | Repo Detail  | Single repo deep-dive           |
| `/profiles`    | Profiles     | Admin: manage profiles          |
| `/drift`       | Drift Report | Repos that have drifted         |
| `/settings`    | Settings     | Platform config, access         |

### Key Components

**Overview Page:**

- StatCards (total repos, compliance %, dormant, unmanaged)
- ComplianceTrendChart (line, last 12 weeks)
- ActivityLeaderboard (top 10 repos by commits)
- NeedsAttentionList (dormant, missing owners, drifted, single-owner repos)
- CIUsageChart (bar, top CI consumers)

**Repo List Page:**

- FilterBar (language, status, team, profile)
- RepoTable (sortable: name, status, activity bar, compliance score, risk badge)
- BulkActionBar (archive selected, re-sync selected)

**Repo Detail Page:**

- RepoHeader (name, language, type, status badge)
- ActivityTimeline (commits, PRs, releases)
- ComplianceCard (score + breakdown)
- DriftCard (expected vs actual, diff view)
- ProfilesCard (applied profiles, last sync)

### Chart.js Usage

| Chart                 | Type               | Data                                      |
| --------------------- | ------------------ | ----------------------------------------- |
| Compliance trend      | `line` with fill   | % compliance over time, with target line  |
| Repo activity         | `bar` (horizontal) | Commits/PRs per repo, top 10              |
| CI usage              | `bar` (stacked)    | Minutes by repo, colored by workflow type |
| Language distribution | `doughnut`         | Repos per language                        |
| Drift breakdown       | `bar`              | Drifted repos by severity                 |

---

## 10. GitHub App

- **Name:** Golden Path (`golden-path-bot`)
- **Installation:** Org-level, all repos
- **Permissions:** Repository metadata (read), contents (read/write), issues (read/write), PRs (read/write), org admin (read)
- **Events:** `repository.created`, `repository.deleted`, `push`, `branch_protection_rule.*`, `issues.opened`, `pull_request.opened`
- **Capabilities:** Auto-detect new repos, enforce branch protection + secret scanning + CodeQL, detect config drift, drive service catalog

---

## 11. Error Handling

| Layer         | Strategy                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------- |
| GitHub API    | Exponential backoff, circuit breaker for rate limits; errors surface in dashboard + logs    |
| Onboarding    | Validation errors → comment on issue with fix instructions; never fail silently             |
| Profile apply | Conflict detection → PR marks files as "CONFLICT — manual review needed"                    |
| Webhooks      | Verify signature → process → retry with backoff; poison messages logged + alerted           |
| Dashboard     | Graceful degradation — show cached data with "last updated" timestamp if GitHub API is down |

---

## 12. Testing Strategy

| What                | Tool                        | Target                              |
| ------------------- | --------------------------- | ----------------------------------- |
| NestJS services     | Jest + Supertest            | Unit + integration, >80% coverage   |
| Profile merge logic | Jest unit tests             | Every profile combination           |
| Dashboard API       | Jest + Supertest            | Every endpoint with mocked MongoDB  |
| Frontend components | Vitest + Testing Library    | Key pages + chart rendering         |
| Webhook handler     | Jest + Octokit test helpers | Every event type                    |
| Workflows           | `act` or manual             | Smoke test per workflow             |
| E2E                 | Playwright (later)          | Happy path: issue → onboard → apply |

---

## 13. What's Out of Scope (v1)

- Custom GitHub App (start with Actions-based flows; App is Layer 4)
- Automated archival/deletion (recommendations only, no auto-action)
- Multi-registry deploy support beyond Docker + npm
- Custom RBAC beyond admin/viewer roles
- Notifications beyond GitHub issue comments and dashboard
