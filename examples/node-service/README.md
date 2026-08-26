# Node service

A Node.js service wired to the golden-path Node gates and Docker deployment.

## Pipeline

- **CI** (`.github/workflows/ci.yaml`) — calls the config-driven orchestrator:
    - `node` gates via `build-test-node.yaml`: lint, typecheck, sharded tests,
      build. The `setup-node` action auto-detects the package manager from the
      lockfile, pins versions, and caches the store.
    - `security-scan`, `secret-scan`, `codespell`, `actionlint`.
    - a single `final-gate` job aggregates everything into one required check.
- **Deploy** (`.github/workflows/deploy.yaml`) — `deploy-service.yaml` builds and
  pushes a container to GHCR and optionally runs a `deploy-command`.

## Files

| File                            | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `.github/golden-path.yaml`      | The contract — edit this to tune every gate |
| `.github/workflows/ci.yaml`     | One job that calls the orchestrator         |
| `.github/workflows/deploy.yaml` | Build → push image → optional deploy        |

## Secrets

- `REGISTRY_TOKEN` (required for deploy) — a token with `packages:write` on GHCR.

## Tuning

```yaml
node:
    - working-directory: .
      shard-count: 2
      build-command: pnpm build # if you commit a pnpm-lock.yaml
```

Edit the config only; the workflows stay untouched.
