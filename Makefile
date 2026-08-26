# Golden Path — Development Makefile
# Usage: make <target>

.PHONY: help install test lint typecheck format format-check lint-workflows build-actions release-major release-minor release-patch

# Show available targets
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# Install dependencies and set up git hooks
install: ## Install deps + configure Husky
	pnpm install

# Run the test suite (action TS tests via Vitest + scripts via node --test)
test: ## Run test suite
	pnpm test

# Lint scripts and TS packages with ESLint
lint: ## Lint scripts + packages
	pnpm run lint

# Typecheck the TS packages
typecheck: ## Typecheck TS packages
	pnpm typecheck

# Format all files with Prettier
format: ## Format all files
	pnpm run format

# Check formatting without modifying files
format-check: ## Check formatting
	pnpm run format:check

# Lint GitHub Actions workflows with actionlint
lint-workflows: ## Lint workflows
	actionlint .github/workflows/*.yml

# Re-bundle TypeScript actions into committed dist/index.cjs bundles
build-actions: ## Re-bundle package-backed actions (parse-config, changed-files, coverage-gate, final-gate)
	pnpm run build:actions

# Bump patch version and create GitHub Release
release-patch: ## Release patch (v1.0.0 → v1.0.1)
	./scripts/release.sh patch

# Bump minor version and create GitHub Release
release-minor: ## Release minor (v1.0.1 → v1.1.0)
	./scripts/release.sh minor

# Bump major version and create GitHub Release
release-major: ## Release major (v1.1.0 → v2.0.0)
	./scripts/release.sh major

# Delete local branches whose remote has been removed
cleanup-branches: ## Cleanup stale local branches
	./scripts/cleanup-branches.sh
