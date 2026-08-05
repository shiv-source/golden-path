// Git operations for workflow automation — configure, branch, commit, push.
// Called from onboarding and apply-repository-config workflows.

import { execSync } from 'node:child_process';

/**
 * Configure git user for the current workflow run.
 * @param {string} [cwd] — working directory (defaults to current)
 */
export function configureGit(cwd) {
  const opts = cwd ? { cwd } : {};
  execSync('git config user.name "github-actions[bot]"', opts);
  execSync('git config user.email "github-actions[bot]@users.noreply.github.com"', opts);
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

  try {
    execSync(`git push origin "${branch}" --force`, options);
    return { pushed: true, skipped: false };
  } catch {
    // Push may fail in test environments with no remote
    return { pushed: false, skipped: false };
  }
}
