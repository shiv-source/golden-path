// Open a PR or reuse an existing one (idempotent).
// Uses the GitHub CLI (`gh`) which must be available in the environment.

import { ghSh } from './lib/gh.mjs';

/**
 * @param {object} opts
 * @param {string} opts.repo — target repository (owner/name)
 * @param {string} opts.baseBranch — base branch for the PR
 * @param {string} opts.headBranch — feature branch name
 * @param {string} opts.title — PR title
 * @param {string} opts.body — PR description
 * @returns {Promise<{ url: string, reused: boolean }>}
 */
export async function openOrReusePR(opts) {
  const { repo, baseBranch, headBranch, title, body } = opts;

  // Check if a PR already exists for this branch
  const existingPr = await ghSh(
    `pr list --repo ${repo} --head ${headBranch} --json url --jq '.[0].url'`,
  );
  if (existingPr) {
    console.log(`PR already exists: ${existingPr}`);
    return { url: existingPr, reused: true };
  }

  // Create a new PR
  const url = await ghSh(
    `pr create --repo ${repo} --base ${baseBranch} --head ${headBranch} --title "${title}" --body "${body}"`,
  );
  console.log(`PR created: ${url}`);
  return { url, reused: false };
}
