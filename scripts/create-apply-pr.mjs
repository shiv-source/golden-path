// Create the apply-config PR in the target repository.
// Called from apply-repository-config workflow.

import { configureGit, commitAndPush } from './git-commit-push.mjs';
import { openOrReusePR } from './open-or-reuse-pr.mjs';

/**
 * @param {object} opts
 * @param {string} opts.targetDir - path to cloned target repo
 * @param {string} opts.repo - full repo name (owner/repo)
 * @param {number} opts.filesCopied
 * @param {boolean} opts.conflictsFound
 * @param {string} opts.conflictsList
 * @returns {Promise<{ url: string, reused: boolean }>}
 */
export async function createApplyPR({
  targetDir,
  repo,
  filesCopied,
  conflictsFound,
  conflictsList,
}) {
  configureGit(targetDir);
  const branch = 'feature/apply-org-config';
  const { skipped } = commitAndPush({
    branch,
    cwd: targetDir,
    message: 'chore: apply organization standard configuration',
  });

  if (skipped) {
    console.log('No changes — skipping PR.');
    return { url: '', reused: true };
  }

  const conflicts = conflictsFound ? '\n### ⚠️ Conflicts Detected\n\n' + conflictsList + '\n' : '';

  return openOrReusePR({
    repo,
    baseBranch: 'main',
    headBranch: branch,
    title: 'Apply organization standard configuration',
    body: [
      '## Apply Organization Standard Configuration',
      '',
      'This PR applies standardized configuration from golden-path.',
      '',
      `**Repository:** \`${repo}\``,
      `**Files copied:** ${filesCopied}`,
      conflicts,
      '> Automatically generated. Please review carefully.',
    ]
      .filter(Boolean)
      .join('\n'),
  });
}
