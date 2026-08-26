# Golden Path Examples

End-to-end, copy-paste examples of consuming the golden-path reusable workflows
and actions from your own repositories. Each example is a self-contained
consumer repo: a thin `.github/workflows/ci.yaml`, a `.github/golden-path.yaml`
config, and (where relevant) release/deploy workflows.

## How it works

1. Add a `.github/golden-path.yaml` config — this is the **only** file you edit
   day-to-day. It is validated against the strict JSON Schema
   (`schemas/golden-path.schema.json`): unknown keys or invalid values fail CI
   with an actionable error.
2. Add a one-job `.github/workflows/ci.yaml` that calls the orchestrator:
    ```yaml
    jobs:
        golden-path:
            uses: shiv-source/golden-path/.github/workflows/golden-path-ci.yaml@v1
            with: { config-path: .github/golden-path.yaml }
            secrets: inherit
    ```
3. The orchestrator fans out to the language gates, scans, and linters, and
   reports a single aggregated check.

All third-party actions are pinned to immutable commit SHAs inside golden-path.
The orchestrator (`golden-path-ci.yaml`) is the config-driven entry point — one
job that fans out to the language gates, scans, and linters — so consumers never
write YAML orchestration or version pins.

## The examples

| Example                        | Stack        | Demonstrates                                                                          |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------------- |
| [`go-service`](go-service)     | Go service   | Go gates (lint/test/build, coverage, cross-compile) + scans + release + Docker deploy |
| [`go-library`](go-library)     | Go module    | Go gates + GitHub release (no deploy)                                                 |
| [`node-library`](node-library) | npm library  | Node gates (lint/typecheck/test/build) + npm + GitHub release                         |
| [`node-service`](node-service) | Node service | Node gates + Docker deploy                                                            |
| [`monorepo`](monorepo)         | Go + Node    | Both language gates behind one orchestrator                                           |

## Reusable workflow catalog

Reference for the full set of composable workflows:

| Workflow                                                               | Purpose                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `golden-path-ci.yaml`                                                  | Config-driven orchestrator (entry point)                      |
| `build-test-go.yaml`                                                   | Single Go target: lint → test (coverage gate) → build         |
| `build-test-node.yaml`                                                 | Single Node target: lint → typecheck → test (sharded) → build |
| `security-scan.yaml`                                                   | Gitleaks + CodeQL                                             |
| `secret-scan-betterleaks.yaml` / `secret-scan-ggshield.yaml`           | Secret scanning                                               |
| `codespell.yaml`                                                       | Spell check                                                   |
| `actionlint.yaml`                                                      | GitHub Actions workflow lint                                  |
| `release-github.yaml` / `release-npm.yaml` / `release-github-npm.yaml` | Release automation                                            |
| `deploy-service.yaml` / `deploy-s3.yaml`                               | Container / S3 deployment                                     |
| `dependency-update.yaml`                                               | Dependabot auto-merge                                         |
| `renovate.yaml` / `stale-issue.yaml`                                   | Dependency + issue hygiene                                    |

The orchestrator fans out one `build-test-go` / `build-test-node` run **per
configured target**, so a polyglot monorepo lists each package as a target.

## Adding an example to a real repo

1. `cp -r examples/<example>/. .`
2. Replace `shiv-source/golden-path` with your organization's golden-path repo.
3. Set the required secrets (`NPM_TOKEN`, `REGISTRY_TOKEN`, …) in the repo.
4. Delete the workflows you don't need (e.g. `release.yaml` for a library).
