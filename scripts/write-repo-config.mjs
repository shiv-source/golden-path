// Generate a repository config YAML and write it to disk.
// Called from repository-onboarding workflow.

import { join } from 'node:path';
import { writeFile } from './lib/fs.mjs';
import { generateRepoConfig } from './generate-repo-config.mjs';
import { resolveProfilesFor } from './lib/profile-map.mjs';

/**
 * @param {object} opts
 * @param {string} opts.workspace - GITHUB_WORKSPACE
 * @param {string} opts.repoName
 * @param {string} opts.type
 * @param {string} opts.language
 * @param {string[]} opts.options
 * @returns {{ profiles: string[] }}
 */
export function writeRepoConfig({ workspace, repoName, type, language, options }) {
    const yaml = generateRepoConfig({ repoName, type, language, options });
    const filePath = join(workspace, 'repositories', `${repoName}.yaml`);
    writeFile(filePath, yaml);

    return {
        profiles: resolveProfilesFor(language, type),
    };
}
