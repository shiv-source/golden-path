# platform-hub — Implementation Plan

**Date:** 2026-08-06
**Status:** Ready for implementation
**Repo:** `our-org/platform-hub` (to be created)

## Scope

Platform-observability is the **hosted web application** that provides visibility, governance, and policy enforcement for the org. It defines its own types in a local `packages/shared/` workspace package shared between backend and frontend.

### What Lives Here

| Layer                 | What                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| 3. Policy Engine      | Rule evaluation, drift detection, compliance scoring, lifecycle classification        |
| 4. GitHub App Backend | Webhook receiver, event handlers, proactive enforcement                               |
| 5. Dashboard          | NestJS 11 backend + React 19 SPA with chart.js, service catalog, repo health/activity |

### What Lives in golden-path

| Layer                 | What                                                                      |
| --------------------- | ------------------------------------------------------------------------- |
| 1. Reusable Workflows | 10 standardized CI/CD workflows                                           |
| 2. Onboarding System  | Issue form, onboarding + apply-config workflows, scripts, profile mapping |
| 3. Profile Templates  | File templates applied by onboarding                                      |

---

## Tech Stack

| Layer              | Choice                                     | Version       |
| ------------------ | ------------------------------------------ | ------------- |
| Runtime            | Node.js                                    | 22.x LTS      |
| Package Manager    | pnpm                                       | 10.x          |
| Backend Framework  | NestJS                                     | 11.x          |
| Frontend           | React SPA (Vite)                           | 19.x          |
| UI Components      | shadcn/ui + Tailwind CSS                   | Latest        |
| Charts             | chart.js + react-chartjs-2                 | Latest        |
| Database           | MongoDB                                    | 7.x           |
| ORM                | @nestjs/mongoose + Mongoose                | Latest        |
| GitHub REST API    | @octokit/rest                              | Latest        |
| GitHub GraphQL API | @octokit/graphql                           | Latest        |
| Webhooks           | @octokit/webhooks                          | Latest        |
| Auth               | @nestjs/passport + passport-github2        | Latest        |
| Cron               | @nestjs/schedule                           | Latest        |
| Shared Types       | Local `packages/shared/` workspace package | `workspace:*` |
| Language           | TypeScript                                 | 5.x (strict)  |
| Monorepo           | pnpm workspaces + Turborepo                | Latest        |

---

## Repository Structure

```
platform-hub/
├── package.json                    # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
├── docker-compose.yml              # MongoDB for local dev
│
├── packages/
│   └── shared/                     # TypeScript types shared between backend and frontend
│       ├── src/
│       │   ├── index.ts
│       │   ├── repo-config.ts      # RepoConfig, RepoType, RepoLanguage, RepoOptions
│       │   ├── profile.ts          # Profile, ProfileFile, MergeResult, Conflict
│       │   ├── profile-map.ts      # resolveProfilesFor() — keep in sync with golden-path
│       │   ├── dashboard.ts        # Overview, RepoSummary, Paginated<T>
│       │   ├── webhook.ts          # WebhookEvent discriminated union
│       │   ├── auth.ts             # User, UserRole
│       │   └── audit.ts            # AuditLogEntry
│       ├── tsconfig.json
│       └── package.json
│
├── apps/
│   ├── backend/                    # NestJS 11 application
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── http-exception.filter.ts
│   │   │   │   ├── transform.interceptor.ts
│   │   │   │   ├── paginated.ts
│   │   │   │   ├── logger.middleware.ts
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   ├── config/
│   │   │   │   └── configuration.ts
│   │   │   ├── health/
│   │   │   │   └── health.controller.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── github-oauth.strategy.ts
│   │   │   │   ├── session.serializer.ts
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── users.schema.ts
│   │   │   ├── github/
│   │   │   │   ├── github.module.ts
│   │   │   │   ├── github.service.ts
│   │   │   │   ├── github-retry.plugin.ts
│   │   │   │   ├── circuit-breaker.ts
│   │   │   │   ├── webhook.controller.ts
│   │   │   │   ├── webhook-signature.guard.ts
│   │   │   │   └── webhook-handler.registry.ts
│   │   │   ├── profiles/
│   │   │   │   ├── profiles.module.ts
│   │   │   │   ├── profiles.controller.ts
│   │   │   │   ├── profiles.service.ts
│   │   │   │   ├── profile-merge.service.ts
│   │   │   │   └── profiles.schema.ts
│   │   │   ├── repositories/
│   │   │   │   ├── repositories.module.ts
│   │   │   │   ├── repositories.controller.ts
│   │   │   │   ├── repositories.service.ts
│   │   │   │   ├── repo-validator.service.ts
│   │   │   │   ├── repo-config.store.ts
│   │   │   │   └── repos.schema.ts
│   │   │   ├── dashboard/
│   │   │   │   ├── dashboard.module.ts
│   │   │   │   ├── dashboard.controller.ts
│   │   │   │   ├── dashboard.service.ts
│   │   │   │   ├── snapshot.service.ts
│   │   │   │   ├── score.ts
│   │   │   │   ├── dashboard-snapshot.schema.ts
│   │   │   │   └── seed-demo.ts
│   │   │   ├── policies/
│   │   │   │   ├── policies.module.ts
│   │   │   │   ├── policy.rule.ts
│   │   │   │   ├── policy.service.ts
│   │   │   │   ├── drift.service.ts
│   │   │   │   ├── drift.controller.ts
│   │   │   │   └── rules/
│   │   │   │       ├── branch-protection.rule.ts
│   │   │   │       ├── secret-scanning.rule.ts
│   │   │   │       ├── code-scanning.rule.ts
│   │   │   │       ├── required-files.rule.ts
│   │   │   │       ├── workflows-configured.rule.ts
│   │   │   │       ├── ownership.rule.ts
│   │   │   │       └── inactivity.rule.ts
│   │   │   ├── audit/
│   │   │   │   ├── audit.module.ts
│   │   │   │   ├── audit.controller.ts
│   │   │   │   ├── audit.service.ts
│   │   │   │   ├── audit.interceptor.ts
│   │   │   │   └── audit-log.schema.ts
│   │   │   ├── scheduler/
│   │   │   │   ├── scheduler.module.ts
│   │   │   │   ├── cache-refresh.job.ts
│   │   │   │   ├── drift-scan.job.ts
│   │   │   │   └── snapshot.job.ts
│   │   │   └── app/
│   │   │       └── serve-static.module.ts
│   │   ├── test/
│   │   │   ├── setup.ts
│   │   │   └── health.e2e-spec.ts
│   │   ├── .env.example
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── frontend/                   # React 19 SPA (Vite)
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── index.css           # Tailwind v4 theme tokens
│       │   ├── components/
│       │   │   ├── ui/             # shadcn/ui primitives
│       │   │   │   ├── button.tsx
│       │   │   │   ├── card.tsx
│       │   │   │   ├── badge.tsx
│       │   │   │   ├── table.tsx
│       │   │   │   ├── input.tsx
│       │   │   │   ├── select.tsx
│       │   │   │   ├── dialog.tsx
│       │   │   │   ├── tabs.tsx
│       │   │   │   ├── dropdown-menu.tsx
│       │   │   │   ├── skeleton.tsx
│       │   │   │   ├── tooltip.tsx
│       │   │   │   └── sonner.tsx
│       │   │   ├── layout/
│       │   │   │   ├── app-shell.tsx
│       │   │   │   ├── sidebar.tsx
│       │   │   │   └── topbar.tsx
│       │   │   ├── charts/
│       │   │   │   ├── compliance-trend.chart.tsx
│       │   │   │   ├── activity-bar.chart.tsx
│       │   │   │   ├── ci-usage.chart.tsx
│       │   │   │   ├── language-doughnut.chart.tsx
│       │   │   │   └── drift-breakdown.chart.tsx
│       │   │   └── dashboard/
│       │   │       ├── stat-card.tsx
│       │   │       ├── needs-attention-list.tsx
│       │   │       ├── repo-table.tsx
│       │   │       ├── filter-bar.tsx
│       │   │       ├── bulk-action-bar.tsx
│       │   │       ├── activity-timeline.tsx
│       │   │       ├── compliance-card.tsx
│       │   │       ├── drift-card.tsx
│       │   │       ├── profiles-card.tsx
│       │   │       └── profile-form.tsx
│       │   ├── pages/
│       │   │   ├── login.tsx
│       │   │   ├── not-found.tsx
│       │   │   ├── overview.tsx
│       │   │   ├── repos.tsx
│       │   │   ├── repo-detail.tsx
│       │   │   ├── drift.tsx
│       │   │   ├── profiles.tsx
│       │   │   └── settings.tsx
│       │   ├── hooks/
│       │   │   ├── use-auth.ts
│       │   │   ├── use-dashboard.ts
│       │   │   ├── use-repos.ts
│       │   │   ├── use-repo-detail.ts
│       │   │   ├── use-drift.ts
│       │   │   └── use-profiles.ts
│       │   ├── lib/
│       │   │   ├── utils.ts
│       │   │   ├── api.ts
│       │   │   ├── query-keys.ts
│       │   │   └── charts.ts
│       │   └── types/
│       │       └── index.ts        # re-exports from packages/shared
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
│
├── .github/
│   └── app.yml                     # GitHub App manifest
│
├── docs/
│   └── architecture.md
│
└── README.md
```

---

## Backend Architecture (NestJS 11)

### Module Dependency Graph

```
AppModule
├── ConfigModule (global)
├── MongooseModule (async, from Config)
├── ScheduleModule
├── ThrottlerModule
├── HealthModule
│
├── AuthModule ────────────── depends on: UsersModule
├── UsersModule ───────────── depends on: MongoDB
│
├── GitHubModule (global) ─── depends on: ConfigModule
├── ProfilesModule ────────── depends on: MongoDB, AuthModule (guards)
├── RepositoriesModule ────── depends on: MongoDB, GitHubModule, AuthModule
├── DashboardModule ───────── depends on: MongoDB, RepositoriesModule
├── PoliciesModule ────────── depends on: MongoDB, GitHubModule, RepositoriesModule
├── SchedulerModule ───────── depends on: GitHubModule, DashboardModule, PoliciesModule
├── AuditModule ───────────── depends on: MongoDB, AuthModule
└── ServeStaticModule ─────── serves frontend in production
```

### Key Endpoints

```
# Auth
GET    /api/auth/login                → redirect to GitHub OAuth
GET    /api/auth/callback             → OAuth callback
GET    /api/auth/me                   → current user + permissions
POST   /api/auth/logout               → clear session

# Dashboard
GET    /api/dashboard/overview        → org-level stats (compliance%, repo counts)
GET    /api/dashboard/repos           → paginated, filterable repo list with health
GET    /api/dashboard/repos/:name     → single repo detail (activity, config, drift)
GET    /api/dashboard/activity        → top repos by commits/PRs, CI minutes
GET    /api/dashboard/risk            → dormant repos, stale ownership, dependency rot
GET    /api/dashboard/trends          → compliance over time, adoption rate

# Profiles (admin: create/update)
GET    /api/profiles                  → list all profiles
POST   /api/profiles                  → create new profile (admin)
PUT    /api/profiles/:name            → update profile (admin)
POST   /api/profiles/:name/preview    → dry-run merge against a repo

# Repositories
GET    /api/repos                     → list configured repos
GET    /api/repos/:name               → get repo config
POST   /api/repos/:name/apply         → trigger config application (manual dispatch)
GET    /api/repos/:name/drift         → compare declared vs actual config

# Drift
GET    /api/drift                     → all drifted repos with details

# Audit (admin)
GET    /api/audit                     → paginated audit log

# Scheduler (admin)
POST   /api/scheduler/run/:job        → manual trigger (cache-refresh, drift-scan, snapshot)

# Webhooks (no auth, signature verified)
POST   /api/webhooks/github           → GitHub webhook receiver

# Health
GET    /api/health                    → app + MongoDB connection state
```

### Architecture Principles

1. **Cache GitHub API aggressively** — dashboard reads from MongoDB, refreshed hourly by scheduler. Webhooks update cache in real-time
2. **Idempotent** — applying a profile twice produces the same result
3. **Never overwrite silently** — conflicts flagged for manual resolution via PR comments
4. **Audit trail** — every config change, profile application, and policy enforcement is logged
5. **Graceful degradation** — if GitHub API is down, dashboard shows cached data with "last updated" timestamp

### Environment Variables

```bash
PORT=3000
MONGO_URI=mongodb://localhost:27017/platform-hub
GITHUB_CLIENT_ID=          # OAuth App client ID
GITHUB_CLIENT_SECRET=      # OAuth App client secret
GITHUB_TOKEN=              # PAT or installation token for API access
GITHUB_WEBHOOK_SECRET=     # Webhook signature secret
GITHUB_ORG=                # GitHub organization name
GITHUB_ADMIN_LOGINS=       # comma-separated GitHub usernames promoted to admin
BASE_URL=http://localhost:3000
SESSION_SECRET=             # cookie signing secret
```

---

## Layer 3 — Policy Engine

Runs as `PoliciesModule`. Evaluates rules against cached repo data + live GitHub API state.

### Rule Set

| Rule              | File                           | Checks                                                                | Severity |
| ----------------- | ------------------------------ | --------------------------------------------------------------------- | -------- |
| Branch Protection | `branch-protection.rule.ts`    | Requires PRs, requires reviews, no force push, requires status checks | Critical |
| Secret Scanning   | `secret-scanning.rule.ts`      | GitHub secret scanning enabled + push protection on                   | Critical |
| Code Scanning     | `code-scanning.rule.ts`        | CodeQL enabled and configured                                         | High     |
| Required Files    | `required-files.rule.ts`       | CODEOWNERS, SECURITY.md, .editorconfig, dependabot.yml present        | High     |
| Workflows         | `workflows-configured.rule.ts` | CI workflow calling golden-path reusable workflows present            | Medium   |
| Ownership         | `ownership.rule.ts`            | ≥2 CODEOWNERS, CODEOWNER has committed in last 90 days                | High     |
| Inactivity        | `inactivity.rule.ts`           | Last commit <6mo (active), 6-12mo (dormant), >12mo (dead)             | Info     |

### Rule Interface

```typescript
interface Rule {
  id: string;
  category: 'security' | 'compliance' | 'governance' | 'health';
  severity: 'critical' | 'high' | 'medium' | 'info';
  evaluate(repo: RepoDocument, githubState: GitHubRepoState): Promise<RuleResult>;
}

interface RuleResult {
  passed: boolean;
  score: number; // 0–100 contribution to compliance score
  details: string; // human-readable explanation
  fix?: string; // suggested remediation
}
```

### Drift Detection

Compares declared config (`repositories/*.yaml` + resolved profiles) against actual GitHub repo state. Produces:

- **Status:** `clean` | `drifted` | `unmanaged`
- **Details:** file-level diff (expected path + content vs actual)
- **Age:** how long the drift has existed

### Lifecycle Classification

| Status      | Condition               | Suggested Action          |
| ----------- | ----------------------- | ------------------------- |
| `active`    | Last commit < 6 months  | None                      |
| `dormant`   | Last commit 6–12 months | Review, consider archival |
| `dead`      | Last commit > 12 months | Archive                   |
| `archiving` | Marked for archival     | Monitor archival PR       |

---

## Layer 4 — GitHub App Backend

The NestJS backend serves as the webhook receiver for the GitHub App. In v1.1, the App provides proactive governance.

### App Capabilities (v1.1)

- **Event listener** — subscribes to `repository.created`, `repository.deleted`, `push`, `branch_protection_rule.*`, `issues.opened`, `pull_request.opened`
- **Auto-detection** — new repos without config get an auto-created draft PR or gentle issue
- **Policy enforcement** — auto-enables branch protection, secret scanning, CodeQL on new repos matching profiles
- **Drift remediation** — detects config drift in real-time; opens fix PRs or alerts
- **Service catalog updates** — repo create/delete/archive events update MongoDB cache instantly

### Permissions

- Repository metadata: read
- Repository contents: read/write
- Issues: read/write
- Pull requests: read/write
- Organization administration: read

### Installation

Org-level, all repos. Webhook URL → `POST /api/webhooks/github`.

---

## Layer 5 — Dashboard (React 19 + Vite)

### Pages

| Route          | Page         | Content                                                                                                                                                                                                                        |
| -------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`            | Overview     | StatCards (total repos, compliance%, dormant, unmanaged) + ComplianceTrendChart (line) + ActivityLeaderboard (top 10 repos) + NeedsAttentionList (dormant, missing owners, drifted, single-owner) + CIUsageChart (stacked bar) |
| `/repos`       | Repo List    | FilterBar (language, status, team, profile) + RepoTable (sortable: name, status, activity bar, compliance score, risk badge) + BulkActionBar                                                                                   |
| `/repos/:name` | Repo Detail  | RepoHeader (name, language, type, status badge) + ActivityTimeline + ComplianceCard (score + breakdown by rule) + DriftCard (expected vs actual diff view) + ProfilesCard (applied profiles, last sync)                        |
| `/drift`       | Drift Report | DriftSummary (total drifted, by severity) + DriftTable (repo, file, expected, actual, age) + RemediateButton (bulk open fix PRs)                                                                                               |
| `/profiles`    | Profiles     | Admin CRUD for profiles + dry-run preview (`POST /api/profiles/:name/preview`)                                                                                                                                                 |
| `/settings`    | Settings     | Platform config, admin user management                                                                                                                                                                                         |

### Chart.js Usage

| Chart                 | Type               | Data                                      | Page         |
| --------------------- | ------------------ | ----------------------------------------- | ------------ |
| Compliance trend      | `line` with fill   | % compliance over 12 weeks, target line   | Overview     |
| Repo activity         | `bar` (horizontal) | Commits/PRs per repo, top 10              | Overview     |
| CI usage              | `bar` (stacked)    | Minutes by repo, colored by workflow type | Overview     |
| Language distribution | `doughnut`         | Repos per language                        | Overview     |
| Drift breakdown       | `bar`              | Drifted repos by severity                 | Drift Report |

### Centralized Chart Config

`lib/charts.ts` holds shared chart.js defaults: palette, tooltip/axis formatting, dark/light theme tokens. Only `line`, `bar`, and `doughnut` components are registered (no dead chart types).

---

## MongoDB Schema

### Collection: `repos`

```typescript
{
  name: string;                    // "my-api"
  fullName: string;                // "myorg/my-api"
  defaultBranch: string;           // "main"
  language: 'node' | 'go' | 'python' | 'java';
  type: 'service' | 'library' | 'frontend' | 'cli' | 'docs';
  visibility: 'private' | 'public' | 'internal';
  profiles: string[];              // ["common", "node-service"]
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
    score: number;                 // 0–100
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
// Index: { name: 1 } unique
```

### Collection: `profiles`

```typescript
{
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
{
  action: string;
  repoName: string;
  user: string;
  details: Record<string, unknown>;
  timestamp: Date;
}
// Index: { timestamp: -1 }
```

### Collection: `dashboard_snapshots`

```typescript
{
  date: Date;
  totalRepos: number;
  managedRepos: number;
  unmanagedRepos: number;
  avgCompliance: number;
  dormantCount: number;
  rawData: Record<string, unknown>;
}
// Index: { date: 1 } unique
```

### Collection: `users`

```typescript
{
  githubId: number;
  login: string;
  avatarUrl: string;
  role: 'admin' | 'viewer';
  createdAt: Date;
}
// Index: { githubId: 1 } unique
```

---

## Error Handling

| Layer         | Strategy                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| GitHub API    | Exponential backoff, circuit breaker for rate limits; errors surface in dashboard as banners + audit logs |
| Onboarding    | Validation errors → comment on issue with specific fix instructions; never fail silently                  |
| Profile Apply | Conflict detection → PR marks files as "CONFLICT — manual review needed"                                  |
| Webhooks      | Verify signature → process → retry with backoff; poison messages logged + alerted                         |
| Dashboard     | Graceful degradation — show cached data with "last updated" timestamp                                     |

---

## Testing Strategy

| What                | Tool                        | Target                                      |
| ------------------- | --------------------------- | ------------------------------------------- |
| NestJS services     | Jest + Supertest            | Unit + integration, >80% coverage           |
| Profile merge logic | Jest unit tests             | Every profile combination                   |
| Dashboard API       | Jest + Supertest            | Every endpoint with mocked MongoDB          |
| Frontend components | Vitest + Testing Library    | Key pages + chart rendering                 |
| Webhook handler     | Jest + Octokit test helpers | Every event type                            |
| E2E                 | Playwright (later)          | Happy path: login → dashboard → repo detail |

---

## Engineering Conventions

- **TypeScript:** `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`
- **No dead code:** ESLint `no-unused-vars: error`, `consistent-type-imports: error`; every file wired on the commit it appears
- **API envelope:** `{ data: ... }` via `TransformInterceptor`; consistent error shape via `HttpExceptionFilter`
- **Validation:** Backend DTOs use `class-validator`; global `ValidationPipe({ whitelist: true, transform: true })`
- **Types from shared:** Frontend types re-export from local `packages/shared/` — never define domain types locally
- **MongoDB:** `mongoose.set('strictQuery', true)`; indexes declared in schemas
- **pnpm 10:** `onlyBuiltDependencies` for esbuild/@swc/core; `engine-strict=true` via `.npmrc`

---

## Implementation Phases

### Phase 1 — Scaffolding

- pnpm workspace, tsconfig, turbo.json, eslint, CI
- Root `docker-compose.yml` (MongoDB)
- Placeholder `package.json` for apps/backend, apps/frontend, packages/shared
- **Verify:** `pnpm install` + `pnpm lint/typecheck/build` green

### Phase 2 — Shared Types Package

- Create `packages/shared/` with all domain types
- `profile-map.ts` — `resolveProfilesFor()` lookup table
- Unit tests
- **Verify:** `pnpm build` emits dist + d.ts; tests green

> **Note:** The profile mapping must stay in sync with golden-path's `scripts/lib/profile-map.mjs`. Both repos maintain their own copy.

### Phase 3 — Backend Core

- NestJS 11 scaffold: `main.ts`, `app.module.ts`
- MongoDB connection (MongooseModule)
- Health check (`GET /api/health`)
- Typed config (`@nestjs/config` with `configuration.ts`)
- Global filters, interceptors, pipes
- `.env.example`
- **Verify:** `docker compose up mongo` + dev → `/api/health` returns `{ mongo: 'connected' }`

### Phase 4 — Auth

- GitHub OAuth via `passport-github2`
- Session management (`connect-mongo`)
- Users collection + service
- Auth guard, roles guard, `@Roles()` decorator
- Admin promotion via env list
- **Verify:** OAuth flow → `/api/auth/me` returns user

### Phase 5 — GitHub Module

- Octokit wrapper (REST + GraphQL)
- Exponential backoff + rate-limit circuit breaker
- Webhook receiver (`POST /api/webhooks/github`)
- Webhook signature verification
- Event handler registry (`@nestjs/event-emitter`)
- **Verify:** Unit tests for retry/backoff/signature

### Phase 6 — Profiles Module

- Profile CRUD (schema + controller)
- Profile merge engine (inherits chain, cycle detection, conflict detection)
- Dry-run preview endpoint
- **Verify:** Unit tests for all merge combos; e2e with memory Mongo

### Phase 7 — Repositories Module

- Repo config CRUD (schema with nested subdocs)
- Validation service
- Config store (bridge to golden-path `repositories/*.yaml`)
- `GET /api/repos/:name/drift` (stub, wired in P10)
- **Verify:** e2e with seeded repos

### Phase 8 — Dashboard Module

- Dashboard controller + service (all 6 endpoints)
- Compliance scoring helper (`score.ts`)
- Snapshot service + schema
- Seed script (10–15 demo repos)
- **Verify:** e2e with seeded Mongo; seed script populates

### Phase 9 — Audit + Scheduler

- Audit log schema + service + interceptor
- Scheduler: cache-refresh (hourly), drift-scan (daily), snapshot (weekly)
- Manual trigger endpoint
- **Verify:** Run jobs manually; repos updated, audit rows written

### Phase 10 — Policy Engine

- Rule interface + 7 rules
- Policy service (runs ruleset, composes score)
- Drift service (declared vs actual comparison)
- Drift controller (`GET /api/drift`)
- Wire into repos drift endpoint + scheduler drift-scan
- **Verify:** Unit tests per rule; e2e for drift; seed drifted repo → reports details

### Phase 11 — Frontend Scaffold

- Vite + React 19 + Tailwind v4 + react-router-dom 7
- @tanstack/react-query 5
- shadcn/ui primitives
- AppShell (sidebar + topbar), login page, 404 page
- Typed API client, query keys, auth hook
- **Verify:** Login, sidebar navigation, placeholder pages

### Phase 12 — Frontend Pages + Charts

- chart.js config (centralized, selective registration)
- 5 chart components
- Dashboard components (stat-card, repo-table, filter-bar, etc.)
- All 6 pages wired to API hooks
- **Verify:** All pages render with seeded data; charts draw; admin CRUD works

### Phase 13 — Documentation + GitHub App Manifest

- README, architecture.md
- `.github/app.yml` — GitHub App manifest
- `.github/workflows/ci.yml`
- **Verify:** Quickstart from fresh clone

---

## Verification (End-to-End)

1. `pnpm install` from clean clone — no errors
2. `docker compose up mongo` + `pnpm dev` — backend + frontend running
3. `pnpm --filter backend seed` — demo data populated
4. Dashboard renders all 6 pages with charts
5. `pnpm turbo run lint typecheck test build` — all green
6. Login via GitHub OAuth → admin routes accessible
7. Profile create → preview merge works
8. Policy rules score a seeded drifted repo correctly
