// Verify that required files exist and branch protection is enabled on a repo.

import { ghSh } from './lib/gh.mjs';

/**
 * Check compliance for a repository.
 * @param {object} opts
 * @param {string} opts.workspace — path to the checked-out repo
 * @param {string[]} opts.requiredFiles — list of file paths that must exist
 * @param {boolean} opts.checkBranchProtection — whether to verify branch protection via gh CLI
 * @param {string} opts.repo — repository name (owner/name) for branch protection check
 * @returns {Promise<{ passed: boolean, missingFiles: string[], branchProtected: boolean, errors: string[] }>}
 */
export async function complianceCheck(opts) {
  const { workspace, requiredFiles, checkBranchProtection, repo } = opts;
  const errors = [];
  const missingFiles = [];
  let branchProtected = false;

  // Check required files
  const { existsSync } = await import('node:fs');
  const { resolve } = await import('node:path');

  for (const file of requiredFiles) {
    if (!existsSync(resolve(workspace, file))) {
      missingFiles.push(file);
      errors.push(`Missing required file: ${file}`);
    }
  }

  // Check branch protection
  if (checkBranchProtection && repo) {
    try {
      const result = await ghSh(`api repos/${repo}/branches/HEAD/protection --jq '.url // empty'`);
      branchProtected = result.length > 0;
      if (!branchProtected) {
        errors.push('Branch protection is not enabled on the default branch');
      }
    } catch {
      errors.push('Failed to check branch protection');
    }
  }

  return {
    passed: missingFiles.length === 0 && (branchProtected || !checkBranchProtection),
    missingFiles,
    branchProtected,
    errors,
  };
}
