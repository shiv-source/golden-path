// Determine which repository configs changed in the latest push.
// Returns repo names extracted from changed files in repositories/.
// Used by apply-repository-config.yml.

import { execSync } from 'node:child_process';
import { basename } from 'node:path';

/**
 * Get repo names from changed config files in the last commit.
 * @returns {string[]}
 */
export function getChangedRepos() {
  const changed = execSync('git diff --name-only HEAD~1 HEAD -- repositories/')
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);

  return changed.map((f) => basename(f, '.yaml'));
}
