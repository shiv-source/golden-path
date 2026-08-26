# Admin Guide

## Adding a New Language or Profile

### Step 1: Add the profile mapping

Edit `scripts/lib/profile-map.mjs`:

```javascript
const PROFILE_MAP = {
    // ...existing...
    rust: {
        service: ['common', 'rust-service'],
    },
};
```

### Step 2: Create the profile template

```bash
mkdir -p profiles/rust-service
```

Add the files your Rust services need (e.g., `rust-toolchain.toml`, `clippy.toml`, `Dockerfile`).

### Step 3: Update the issue form

Edit `.github/ISSUE_TEMPLATE/repository-onboarding.yml` — add `Rust` to the language dropdown.

### Step 4: Sync with platform-hub

The `packages/shared/src/profile-map.ts` in `platform-hub` has the same mapping table. Keep it in sync.

### Step 5: Create reusable workflow (optional)

If the language needs specific CI, add a reusable workflow (e.g., `build-test-rust.yaml`).

## Rolling Out Profile Updates

When you change a profile template (e.g., updating `eslint.config.js` in `node-library`):

1. Make the change in `profiles/node-library/` and open a PR
2. Merge to `main` — existing repos are NOT auto-updated
3. To apply the update to repos:
    - Use `workflow_dispatch` on `apply-repository-config.yaml` for specific repos
    - Or re-trigger onboarding for the affected repos
4. Repos get a new PR with the updated files — team reviews and merges

> **Design choice:** Profile updates are pull-based, not push-based. Teams own their repos and review config changes. This prevents surprise breakage.

## Adding a New Reusable Workflow

1. Create `./github/workflows/<name>.yaml` with `on: workflow_call`
2. Define inputs and secrets the consumer repos must provide
3. Keep the workflow focused — one concern per file
4. Document the inputs in `docs/developer-guide.md`
5. Test with a scratch consumer repo before announcing

## Managing Admin Access

Admin access to the golden-path repo is managed through GitHub team membership:

1. Go to **Settings** → **Collaborators and teams**
2. Add the **platform-engineering** team with **Write** or **Maintain** role
3. Only admins can modify workflow files, profile templates, and the onboarding system

## Compliance Requirements

The `compliance-check.yaml` workflow verifies:

- Required files exist (`.editorconfig`, `CODEOWNERS`, `SECURITY.md`)
- Branch protection is enabled on the default branch

To add a new compliance requirement:

1. Edit `scripts/compliance-check.mjs` to add the check
2. Update the `required-files` input default in `compliance-check.yaml`
3. Repos will be checked on their next CI run

## Troubleshooting

### Onboarding PR was created but apply-config didn't run

Check that `apply-repository-config.yaml` has `push` → `paths: repositories/**`. The config file must be in the `repositories/` directory.

### "Repository does not exist" error

The repo must already exist in the GitHub organization before onboarding. Create the repo first, then request onboarding.

### Conflicts flagged in apply-config PR

This means the target repo already has a file that conflicts with the profile template. The PR description lists the conflicting files — review manually and decide whether to keep the target repo's version or the standard version.
