import * as core from '@actions/core';
import { context } from '@actions/github';
import { exec } from '@golden-path/core';
import { computeChangedFiles } from './action';

interface PullRequestPayload {
    base?: { sha?: string };
    head?: { sha?: string };
}

function getPatterns(): string[] {
    const raw = core.getInput('paths');
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
    } catch {
        return [];
    }
}

function main() {
    try {
        const pr = (context.payload.pull_request ?? undefined) as PullRequestPayload | undefined;
        const changed = computeChangedFiles(
            { baseSha: pr?.base?.sha ?? '', headSha: pr?.head?.sha ?? '', patterns: getPatterns() },
            exec,
        );
        core.setOutput('changed', changed ? 'true' : 'false');
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

main();
