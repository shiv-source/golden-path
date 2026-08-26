# Monorepo (Go + Node)

A repository with both a Go service and a Node package, driven by one
orchestrator. Both language gates run in parallel off the same config file.

## Pipeline

- **CI** (`.github/workflows/ci.yaml`) — calls `golden-path-ci.yaml` once; the
  orchestrator fans out to both `build-test-go.yaml` and `build-test-node.yaml`
  plus the scans/linters, then aggregates everything into a single `final-gate`
  check.
- Each language gate runs in its own sub-directory (`working-directory`), so
  this scales to any number of packages.

## Files

| File                        | Purpose                                 |
| --------------------------- | --------------------------------------- |
| `.github/golden-path.yaml`  | Both `go:` and `node:` sections enabled |
| `.github/workflows/ci.yaml` | One job that calls the orchestrator     |

## Layout this example assumes

```
services/api/     # Go module (go.mod)
packages/web/     # Node package (package.json + lockfile)
```

The `go.working-directory` and `node.working-directory` settings point the
gates at the right sub-directories. Change detection scopes each gate's
change paths to its own tree so a frontend-only PR doesn't run Go tests.

## Tuning

Each list entry is an independent target with its own `working-directory`:

```yaml
go:
    - working-directory: services/api
      change-detection:
          paths: ['services/api/**', 'go.mod', 'go.sum', '.golangci.yaml']
    - working-directory: services/worker
      coverage-floor: 60
node:
    - working-directory: packages/web
      package-manager: pnpm
    - working-directory: packages/cli
      shard-count: 2
```

Add more packages by adding another target to the relevant list.
