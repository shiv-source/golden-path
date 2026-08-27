import { readFileSync } from 'node:fs';
import * as core from '@actions/core';
import { MARKER, formatFailureMessage, parseResults, renderPrBody, renderSummary, summarize } from './action';
import type { CoverageInput, ReportContext } from './action';

interface IssueComment {
    id: number;
    body?: string;
}

function context(): ReportContext {
    return {
        repository: process.env.GITHUB_REPOSITORY ?? '',
        serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
        runId: process.env.GITHUB_RUN_ID ?? '',
        runNumber: process.env.GITHUB_RUN_NUMBER ?? '',
        sha: process.env.GITHUB_SHA ?? '',
    };
}

function coverageInput(): CoverageInput {
    return {
        coverage: core.getInput('coverage'),
        coverageFloor: core.getInput('coverage-floor'),
        webCoverage: core.getInput('web-coverage'),
        webCoverageFloor: core.getInput('web-coverage-floor'),
    };
}

// The PR number from the triggering event when the run is pull_request
// triggered (final-gate is workflow_call, so the event payload is the
// caller's event). Returns null for non-PR runs — the PR comment is a
// nicety, never a gate.
function eventPullRequestNumber(): number | null {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) return null;
    try {
        const event = JSON.parse(readFileSync(eventPath, 'utf8')) as { pull_request?: { number?: number } };
        return event.pull_request?.number ?? null;
    } catch {
        return null;
    }
}

async function findMarkerComment(pr: number, token: string): Promise<IssueComment | null> {
    const ctx = context();
    const base = `${ctx.serverUrl}/api/v3/repos/${ctx.repository}/issues/${pr}/comments`;
    for (let page = 1; ; page++) {
        const response = await fetch(`${base}?per_page=100&page=${page}`, {
            headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
        });
        if (!response.ok) {
            throw new Error(`fetch comments [${response.status}]: ${await response.text()}`);
        }
        const comments = (await response.json()) as IssueComment[];
        if (!Array.isArray(comments)) break;
        const match = comments.find((comment) => (comment.body ?? '').includes(MARKER));
        if (match) return match;
        if (comments.length < 100) break;
    }
    return null;
}

async function upsertReportComment(pr: number, token: string, body: string): Promise<void> {
    const ctx = context();
    const existing = await findMarkerComment(pr, token);
    const url = existing
        ? `${ctx.serverUrl}/api/v3/repos/${ctx.repository}/issues/comments/${existing.id}`
        : `${ctx.serverUrl}/api/v3/repos/${ctx.repository}/issues/${pr}/comments`;
    const response = await fetch(url, {
        method: existing ? 'PATCH' : 'POST',
        headers: {
            authorization: `Bearer ${token}`,
            accept: 'application/vnd.github+json',
            'x-github-api-version': '2022-11-28',
            'content-type': 'application/json',
        },
        body: JSON.stringify({ body }),
    });
    if (!response.ok) {
        throw new Error(`update PR comment [${response.status}]: ${await response.text()}`);
    }
}

async function main() {
    try {
        const results = parseResults(core.getInput('results'));
        const { passed, failures } = summarize(results);
        const coverage = coverageInput();

        core.setOutput('passed', passed ? 'true' : 'false');
        core.setOutput('failed', String(failures.length));
        core.setOutput('passed_count', String(results.length - failures.length));
        core.setOutput('total', String(results.length));

        // Gate first — always enforced, independent of the report below.
        if (!passed) {
            core.setFailed(`failed jobs: ${formatFailureMessage(failures)}`);
        } else {
            console.log('all checks passed');
        }

        // Report and PR comment are a nicety — never let a comment failure
        // change the gate's outcome.
        if (core.getInput('report').toLowerCase() !== 'false') {
            try {
                const ctx = context();
                await core.summary.addRaw(renderSummary(results, failures, coverage, ctx)).write();

                if (core.getInput('pr-comment').toLowerCase() !== 'false') {
                    const token = core.getInput('token');
                    const pr = eventPullRequestNumber();
                    if (pr && token) {
                        await upsertReportComment(pr, token, renderPrBody(results, failures, coverage, ctx));
                    }
                }
            } catch (error) {
                console.error(`final-gate: report skipped — ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

void main();
