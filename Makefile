# Golden Path — Development Makefile
# Usage: make <target>

.PHONY: help install test lint format format-check lint-workflows release-major release-minor release-patch

# Show available targets
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# Install dependencies and set up git hooks
install: ## Install deps + configure Husky
	npm ci

# Run 42 test suites via node --test
test: ## Run test suite
	npm test

# Lint scripts with ESLint
lint: ## Lint scripts
	npm run lint

# Format all files with Prettier
format: ## Format all files
	npm run format

# Check formatting without modifying files
format-check: ## Check formatting
	npm run format:check

# Lint GitHub Actions workflows with actionlint
lint-workflows: ## Lint workflows
	actionlint .github/workflows/*.yml

# Bump patch version and create GitHub Release
release-patch: ## Release patch (v1.0.0 → v1.0.1)
	./scripts/release.sh patch

# Bump minor version and create GitHub Release
release-minor: ## Release minor (v1.0.1 → v1.1.0)
	./scripts/release.sh minor

# Bump major version and create GitHub Release
release-major: ## Release major (v1.1.0 → v2.0.0)
	./scripts/release.sh major
