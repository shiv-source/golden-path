# Go service

A production Go service wired to the full golden-path stack: Go gates
(lint, test with a coverage floor, cross-compile matrix), security/secret
scans, spelling + workflow lint, tagged releases, and Docker deployment.

## Pipeline

- **CI** (`.github/workflows/ci.yaml`) — calls the config-driven orchestrator:
    - `go` gates via `build-test-go.yaml`: golangci-lint (pinned direct binary),
      `go test -race` with a 90% coverage floor, and a linux/darwin/windows ×
      amd64/arm64 cross-compile matrix. Change detection skips the Go gates when
      no Go files changed on a PR.
    - `security-scan` (Gitleaks + CodeQL), `secret-scan` (Betterleaks),
      `codespell`, and `actionlint` — each skippable via `enabled: false`.
    - a single `final-gate` job aggregates everything into one required check.
- **Release** (`.github/workflows/release.yaml`) — tags + GitHub Release with
  generated notes (`release-github.yaml`).
- **Deploy** (`.github/workflows/deploy.yaml`) — builds and pushes a container to
  GHCR via `deploy-service.yaml` (`docker-build-push` atom). Set a
  `REGISTRY_TOKEN` secret; add a `deploy-command` to run after publish.

## Files

| File                             | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `.github/golden-path.yaml`       | The contract — edit this to tune every gate |
| `.github/workflows/ci.yaml`      | One job that calls the orchestrator         |
| `.github/workflows/release.yaml` | Tag → GitHub Release                        |
| `.github/workflows/deploy.yaml`  | Build → push image → optional deploy        |

## Secrets

- `REGISTRY_TOKEN` (required for deploy) — a token with `packages:write` on GHCR.

## Tuning

Edit `.github/golden-path.yaml` only:

```yaml
go:
    - working-directory: .
      coverage-floor: 85 # lower the coverage gate
      cross-compile: { enabled: false } # build linux/amd64 only
      lint: { golangci-lint-version: v2.13.1 }
codespell: { enabled: false } # drop a gate entirely
```

The workflow files stay untouched — the config drives everything.
