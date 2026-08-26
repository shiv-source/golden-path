# Go library

A minimal Go module wired to the golden-path Go gates and GitHub releases — no
container deployment.

## Pipeline

- **CI** (`.github/workflows/ci.yaml`) — calls the config-driven orchestrator:
    - `go` gates via `build-test-go.yaml`: golangci-lint (pinned direct binary),
      `go test -race` with a coverage floor, and a cross-compile matrix.
      Change detection skips the Go gates when no Go files changed on a PR.
    - `security-scan`, `secret-scan`, `codespell`, `actionlint`.
    - a single `final-gate` job aggregates everything into one required check.
- **Release** (`.github/workflows/release.yaml`) — `release-github.yaml` creates a
  tag + GitHub Release with generated notes.

## Files

| File                             | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `.github/golden-path.yaml`       | The contract — edit this to tune every gate |
| `.github/workflows/ci.yaml`      | One job that calls the orchestrator         |
| `.github/workflows/release.yaml` | Tag → GitHub Release                        |

## Tuning

```yaml
go:
    - working-directory: .
      coverage-floor: 80 # relax the coverage gate
      cross-compile:
          goos: [linux, darwin] # narrow the build matrix
```

Edit the config only; the workflows stay untouched.
