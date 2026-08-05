// Apply profile configuration to a target repository.
// Orchestrates: read config → resolve profiles → merge files → clone target → write files → substitute tokens.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { readProfiles } from './read-profiles.mjs';
import { mergeProfiles } from './merge-profiles.mjs';

/**
 * @param {object} opts
 * @param {string} opts.workspace - GITHUB_WORKSPACE path
 * @param {string} opts.repoName - repository name (without owner)
 * @param {string} opts.targetRepo - full repo (owner/name) for cloning
 * @param {string} opts.org - GitHub organization/owner name
 * @returns {{ profiles: string[], filesCopied: number, conflictsFound: boolean, conflictsList: string }}
 */
export function applyConfig({ workspace, repoName, targetRepo, org }) {
  const configYaml = readFileSync(join(workspace, 'repositories', `${repoName}.yaml`), 'utf-8');
  const profileNames = [];
  for (const line of configYaml.split('\n')) {
    const m = line.match(/^\s{2}-\s(\S+)/);
    if (m && !line.trimStart().startsWith('#')) profileNames.push(m[1]);
  }

  const profiles = readProfiles({
    profilesDir: join(workspace, 'profiles'),
    names: profileNames,
  });
  const merged = mergeProfiles(profiles);

  const targetDir = join(workspace, 'target-repo');
  execSync(`gh repo clone ${targetRepo} ${targetDir}`, { stdio: 'inherit' });

  // Substitute org-specific values when applying to a different org
  const tokens = {
    'shiv-source': org,
    'hello@shivkumar.me': `security@${org}.com`,
  };

  for (const f of merged.files) {
    let content = f.content;
    for (const [token, value] of Object.entries(tokens)) {
      content = content.replaceAll(token, value);
    }
    const dest = join(targetDir, f.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }

  return {
    profiles: profileNames,
    filesCopied: merged.files.length,
    conflictsFound: merged.conflicts.length > 0,
    conflictsList: merged.conflicts.map((c) => `- \`${c.path}\`: ${c.message}`).join('\n'),
  };
}
