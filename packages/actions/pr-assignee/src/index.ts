import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { computeAssignees, intersectAssignable } from './action';

interface PullRequestPayload {
    number?: number;
    user?: { login?: string } | null;
}

async function main() {
    try {
        const pr = (context.payload.pull_request ?? undefined) as PullRequestPayload | undefined;
        core.setOutput('assigned', '[]');

        if (!pr?.number || !pr.user?.login) {
            core.info('pr-assignee: no pull_request payload or author in the event; skipping');
            return;
        }

        const token = core.getInput('token');
        const exclude = core
            .getInput('exclude-users')
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean);
        const filterAssignable = core.getInput('filter-assignable').toLowerCase() !== 'false';

        const octokit = getOctokit(token);
        const { owner, repo } = context.repo;

        // Every commit author across all pages — `gh api` without --paginate
        // only returns the first 30, silently dropping authors on larger PRs.
        const commitAuthors: string[] = [];
        for await (const page of octokit.paginate.iterator(octokit.rest.pulls.listCommits, {
            owner,
            repo,
            pull_number: pr.number,
            per_page: 100,
        })) {
            for (const commit of page.data) {
                if (commit.author?.login) commitAuthors.push(commit.author.login);
            }
        }

        let assignees = computeAssignees({ author: pr.user.login, commitAuthors, exclude });

        if (filterAssignable && assignees.length > 0) {
            const assignable: string[] = [];
            for await (const page of octokit.paginate.iterator(octokit.rest.issues.listAssignees, {
                owner,
                repo,
                issue_number: pr.number,
                per_page: 100,
            })) {
                for (const user of page.data) {
                    if (user.login) assignable.push(user.login);
                }
            }
            assignees = intersectAssignable(assignees, assignable);
        }

        if (assignees.length === 0) {
            core.info('pr-assignee: no assignees to add (all authors excluded or not assignable); skipping');
            return;
        }

        await octokit.rest.issues.addAssignees({
            owner,
            repo,
            issue_number: pr.number,
            assignees,
        });

        core.setOutput('assigned', JSON.stringify(assignees));
        core.info(`pr-assignee: assigned ${assignees.join(', ')} to #${pr.number}`);
        await core.summary
            .addRaw(
                `Assigned PR [#${pr.number}](https://github.com/${owner}/${repo}/pull/${pr.number}) to ${assignees.join(', ')}`,
            )
            .write();
    } catch (error) {
        // Convenience only — never fail the run on a side-effect that a human
        // can fix after the fact. Adds, never replaces: existing assignments
        // (including manual ones) are never touched.
        core.warning(`pr-assignee: ${error instanceof Error ? error.message : String(error)}`);
    }
}

void main();
