# Architecture

## System Overview

```
┌───────────────────────────────────────────────────────┐
│  golden-path (this repo)                               │
│                                                        │
│  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ Reusable         │  │ Onboarding System            │ │
│  │ Workflows        │  │                              │ │
│  │ (GitHub Actions) │  │ Issue Form → Parse → Validate│ │
│  │                  │  │ → Generate Config → PR       │ │
│  │ • build-test     │  │                              │ │
│  │ • security-scan  │  │ → Merge PR → Apply Config →  │ │
│  │ • release-npm    │  │   PR in Target Repo          │ │
│  │ • deploy-service │  └─────────────────────────────┘ │
│  │ • compliance     │                                  │
│  │ • deps-automerge │  ┌─────────────────────────────┐ │
│  └─────────────────┘  │ Profile Templates             │ │
│                       │ common/ node-library/          │ │
│  ┌─────────────────┐  │ node-service/ go-service/     │ │
│  │ Scripts (.mjs)   │  └─────────────────────────────┘ │
│  │ parse/generate/  │                                  │
│  │ merge/compliance │  ┌─────────────────────────────┐ │
│  │ profile-map      │  │ Repo Configs                 │ │
│  └─────────────────┘  │ repositories/*.yaml           │ │
│                       └─────────────────────────────┘ │
└──────────────────────┬────────────────────────────────┘
                       │
                       │ uses: golden-path/.github/workflows/*.yml@main
                       ▼
┌───────────────────────────────────────────────────────┐
│  100+ Target Repositories (across the org)             │
│  Each repo has a thin .github/workflows/ci.yml calling │
│  golden-path reusable workflows                       │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│  platform-observability (sibling repo)                 │
│  NestJS + React dashboard, policy engine, GitHub App   │
│  Reads repos/*.yaml from golden-path via GitHub API    │
└───────────────────────────────────────────────────────┘
```

## Onboarding Flow

```
Developer → Issue Form → repository-onboarding.yml
  ↓
1. Parse issue body (parse-onboarding-issue.mjs)
2. Validate repo exists in org (gh CLI)
3. Map language + type → profile list (profile-map.mjs)
4. Generate repositories/<name>.yaml (generate-repo-config.mjs)
5. Create branch feature/onboard-<repo>
6. Commit config → Open PR against golden-path main
7. Comment on issue with PR link
  ↓
PR Merged → apply-repository-config.yml triggers
  ↓
1. Read repositories/<name>.yaml
2. Resolve profiles → merged file list (merge-profiles.mjs)
3. Clone target repo
4. Copy profile files → detect conflicts
5. Open PR in target repo: "Apply organization standard configuration"
  ↓
PR description lists every file, source profile, and justification.
Conflicts flagged as "CONFLICT — manual review needed."
```

## Design Principles

- **No build step** — scripts are plain `.mjs`, run directly by Node.js
- **Zero runtime deps** — scripts use only Node.js stdlib + `gh` CLI
- **Idempotent** — re-running onboarding or config application is safe
- **Never overwrite silently** — conflicts flagged for manual review
- **Profile composition** — profiles inherit via `inherits` chain in config; common + language-specific files merged deterministically
