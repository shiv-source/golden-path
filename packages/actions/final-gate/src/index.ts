import { readFile } from 'node:fs/promises';
import * as core from '@actions/core';
import { buildReport, COMMENT_MARKER, formatFailureMessage, parseResults, summarize } from './action';

function parseCoverage(value: string): number | null {
    if (!value) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

// Enforce the coverage floor and log the value. Returns false on failure.
function checkCoverage(name: string, value: string, floor: number): boolean {
    const pct = parseCoverage(value);
    if (pct === null) {
        core.setFailed(`invalid ${name}: "${value}"`);
        return false;
    }
    console.log(`${name}=${value}% floor=${floor}%`);
    if (floor > 0 && pct < floor) {
        core.setFailed(`${name} ${value}% is below floor ${floor}%`);
        return false;
    }
    return true;
}

// Post or update the gate report comment on the pull request that triggered
// the run. Requires issues: write (PRs are issues) and github.token access.
async function upsertComment(report: string): Promise<void> {
    const token = process.env.GITHUB_TOKEN;
    const repository = process.env.GITHUB_REPOSITORY;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!token || !repository || !eventPath) {
        console.warn('skipping PR comment: missing GITHUB_TOKEN / GITHUB_REPOSITORY / GITHUB_EVENT_PATH');
        return;
    }

    let number: number | undefined;
    try {
        const event = JSON.parse(await readFile(eventPath, 'utf8'));
        number = event.pull_request?.number ?? event.issue?.number;
    } catch (error) {
        console.warn(
            `skipping PR comment: could not read event payload (${error instanceof Error ? error.message : String(error)})`,
        );
        return;
    }
    if (typeof number !== 'number') {
        console.warn('skipping PR comment: run is not on a pull request');
        return;
    }

    const [owner, repo] = repository.split('/');
    const base = `https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`;
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
    };

    try {
        const listResponse = await fetch(`${base}?per_page=100`, { headers });
        if (listResponse.ok) {
            const comments = (await listResponse.json()) as Array<{ id: number; body?: string }>;
            const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));
            if (existing) {
                const updateResponse = await fetch(`${base}/${existing.id}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ body: report }),
                });
                if (!updateResponse.ok) {
                    console.warn(
                        `failed to update PR comment: ${updateResponse.status} ${await updateResponse.text()}`,
                    );
                    return;
                }
                console.log('updated quality gate PR comment');
                return;
            }
        }
        const createResponse = await fetch(base, { method: 'POST', headers, body: JSON.stringify({ body: report }) });
        if (!createResponse.ok) {
            console.warn(`failed to post PR comment: ${createResponse.status} ${await createResponse.text()}`);
            return;
        }
        console.log('posted quality gate PR comment');
    } catch (error) {
        console.warn(`failed to post PR comment: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function main() {
    try {
        const results = parseResults(core.getInput('results'));
        const coverage = core.getInput('coverage');
        const coverageFloor = Number(core.getInput('coverage-floor') || '0') || 0;
        const webCoverage = core.getInput('web-coverage');
        const webCoverageFloor = Number(core.getInput('web-coverage-floor') || '0') || 0;

        const { passed, failures } = summarize(results);
        core.setOutput('passed', passed ? 'true' : 'false');

        let ok = true;
        if (coverage && !checkCoverage('coverage', coverage, coverageFloor)) ok = false;
        if (webCoverage && !checkCoverage('web-coverage', webCoverage, webCoverageFloor)) ok = false;

        if (!passed) {
            core.setFailed(`failed jobs: ${formatFailureMessage(failures)}`);
            ok = false;
        } else if (ok) {
            console.log('all checks passed');
        }

        if (core.getInput('pr-comment') === 'true') {
            await upsertComment(buildReport(results, { coverage, coverageFloor, webCoverage, webCoverageFloor }));
        }
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

void main();
