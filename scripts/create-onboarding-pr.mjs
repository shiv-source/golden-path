// Create the onboarding PR in golden-path.
// Called from repository-onboarding workflow.

import { configureGit, commitAndPush } from './git-commit-push.mjs';
import { openOrReusePR } from './open-or-reuse-pr.mjs';

/**
 * @param {object} opts
 * @param {string} opts.repoName
 * @param {string} opts.language
 * @param {string} opts.type
 * @param {string[]} opts.profiles
 * @returns {Promise<{ url: string, reused: boolean }>}
 */
export async function createOnboardingPR({ repoName, language, type, profiles }) {
    configureGit();
    const branch = `feature/onboard-${repoName}`;
    commitAndPush({ branch, message: `chore: onboard ${repoName}`, files: 'repositories/' });

    return openOrReusePR({
        repo: process.env.GITHUB_REPOSITORY ?? '',
        baseBranch: 'main',
        headBranch: branch,
        title: `Onboard ${repoName}`,
        body: [
            '## Repository Onboarding',
            '',
            `**Repository:** \`${repoName}\``,
            `**Language:** ${language}`,
            `**Type:** ${type}`,
            `**Profiles:** ${profiles.join(', ')}`,
            '',
            `Generated \`repositories/${repoName}.yaml\`.`,
            '',
            'Once merged, `apply-repository-config.yaml` will apply the standard configuration.',
        ].join('\n'),
    });
}
