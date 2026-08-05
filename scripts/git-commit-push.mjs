// Git operations for workflow automation — configure, branch, commit, push.
// Called from onboarding and apply-repository-config workflows.

/**
 * Configure git user for the current workflow run.
 */
export function configureGit() {
  const { execSync } = require('node:child_process');
  execSync('git config user.name "github-actions[bot]"');
  execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
}

/**
 * Create a branch, stage files, commit, and push.
 * @param {object} opts
 * @param {string} opts.branch - branch name
 * @param {string} opts.message - commit message
 * @param {string} [opts.cwd] - working directory (defaults to current)
 * @param {string} [opts.files] - files to stage (defaults to all)
 * @returns {{ pushed: boolean, skipped: boolean }}
 */
export function commitAndPush(opts) {
  const { execSync } = require('node:child_process');
  const { branch, message, cwd, files } = opts;
  const options = cwd ? { cwd } : {};

  execSync(`git checkout -b "${branch}"`, options);

  if (files) {
    execSync(`git add ${files}`, options);
  } else {
    execSync('git add -A', options);
  }

  try {
    execSync(`git commit -m "${message}"`, options);
  } catch {
    // No changes to commit — not an error
    return { pushed: false, skipped: true };
  }

  execSync(`git push origin "${branch}" --force`, options);
  return { pushed: true, skipped: false };
}
