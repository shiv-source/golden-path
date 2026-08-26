import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import * as core from '@actions/core';
import { computeLabels, loadConfig, missingLabels } from './action';
import type { LabelConfig } from './action';

interface IssuePayload {
    number: number;
    labels?: { name: string }[];
    body?: string | null;
}

const GITHUB_API = 'https://api.github.com';

// Resolve the config path against the action directory first (the bundled
// default), then against the repo checkout so a consumer can point the `config`
// input at a repo-local file (e.g. `.github/issue-labels.json`).
function resolveConfigPath(input: string): string {
    const actionPath = path.resolve(path.join(__dirname, '..'), input);
    return existsSync(actionPath) ? actionPath : path.resolve(input);
}

async function main() {
    try {
        const eventPath = process.env.GITHUB_EVENT_PATH;
        const repository = process.env.GITHUB_REPOSITORY;
        const token = core.getInput('token') || process.env.GH_TOKEN;
        const configPath = resolveConfigPath(core.getInput('config') || 'config.json');

        core.setOutput('applied', '[]');

        if (!eventPath || !repository || !token) {
            core.setFailed('issue-labels: GITHUB_EVENT_PATH, GITHUB_REPOSITORY and a token are required');
            return;
        }

        const config: LabelConfig = loadConfig(configPath, (p) => readFileSync(p, 'utf8'));
        const event = JSON.parse(readFileSync(eventPath, 'utf8')) as { action?: string; issue?: IssuePayload };
        const issue = event.issue;

        if (!issue) {
            core.info('issue-labels: no issue in event payload; skipping');
            return;
        }
        if (!['opened', 'edited'].includes(event.action ?? '')) {
            core.info(`issue-labels: action "${event.action}" not handled; skipping`);
            return;
        }

        const desired = computeLabels(issue.body ?? '', config);
        if (desired.length === 0) {
            core.info('issue-labels: no three-tier labels derivable from the issue body (blank issue?); skipping');
            return;
        }

        const currentNames = (issue.labels ?? []).map((label) => label.name);
        const missing = missingLabels(desired, currentNames);
        if (missing.length === 0) {
            core.info(`issue-labels: bare-minimum labels already present (${desired.join(', ')}); nothing to add`);
            return;
        }

        const response = await fetch(`${GITHUB_API}/repos/${repository}/issues/${issue.number}/labels`, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${token}`,
                accept: 'application/vnd.github+json',
                'x-github-api-version': '2022-11-28',
                'content-type': 'application/json',
            },
            body: JSON.stringify({ labels: missing }),
        });

        if (!response.ok) {
            const detail = await response.text();
            const message = `issue-labels: failed to add labels [${response.status}] — ${detail}`;
            if (response.status === 422) {
                core.setFailed(
                    `${message} (a 422/Validation Failed means a label in the config does not exist on the repo yet)`,
                );
            } else {
                core.setFailed(message);
            }
            return;
        }

        core.setOutput('applied', JSON.stringify(missing));
        core.info(`issue-labels: applied ${missing.join(', ')} to #${issue.number}`);
        await core.summary
            .addRaw(
                `Applied bare-minimum labels to [#${issue.number}](https://github.com/${repository}/issues/${issue.number}): ${missing.join(', ')}`,
            )
            .write();
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

void main();
