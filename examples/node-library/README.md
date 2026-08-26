# Node library

A Node.js/npm library wired to the golden-path Node gates and npm publishing.

## Pipeline

- **CI** (`.github/workflows/ci.yaml`) — calls the config-driven orchestrator:
    - `node` gates via `build-test-node.yaml`: lint, typecheck, sharded tests, and
      build. Dependencies are installed by the `setup-node` action (auto-detects
      npm/pnpm/yarn from your lockfile, pins versions, caches the store).
    - `security-scan`, `secret-scan`, `codespell`, `actionlint` — each
      skippable via `enabled: false`.
    - a single `final-gate` job aggregates everything into one required check.
- **Release** (`.github/workflows/release.yaml`) — `release-github-npm.yaml`:
  creates a GitHub Release, then publishes to npm with provenance. Set an
  `NPM_TOKEN` secret.

## Files

| File                             | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `.github/golden-path.yaml`       | The contract — edit this to tune every gate |
| `.github/workflows/ci.yaml`      | One job that calls the orchestrator         |
| `.github/workflows/release.yaml` | GitHub Release → npm publish                |

## Secrets

- `NPM_TOKEN` (required for release) — an npm token with `publish` access.

## Tuning

The `node` section of the config drives the build-test-node workflow directly:

```yaml
node:
    - working-directory: .
      node-version: '22'
      package-manager: auto # or npm | pnpm | yarn
      shard-count: 3 # parallel test shards
      lint-command: eslint .
      test-command: vitest run
```

If your repo uses pnpm, just commit a `pnpm-lock.yaml` — the `setup-node`
action detects it and runs `pnpm install --frozen-lockfile` automatically.
