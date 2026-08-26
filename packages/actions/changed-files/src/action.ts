import type { ExecRunner } from '@golden-path/core';
import { matchesAny } from './matcher';

export interface ChangedFilesInput {
    baseSha: string;
    headSha: string;
    patterns: string[];
}

// Compute whether any changed files match the patterns. On push/manual runs
// there is no base/head SHA, so every gate runs (changed = true). When the
// diff command fails we are conservative and run every gate.
export function computeChangedFiles(input: ChangedFilesInput, exec: ExecRunner): boolean {
    const { baseSha, headSha, patterns } = input;
    if (!baseSha || !headSha) return true;

    const result = exec(`git diff --name-only "${baseSha}...${headSha}"`);
    if (result.code !== 0) return true;

    const files = result.stdout.split(/\r?\n/).filter(Boolean);
    return matchesAny(patterns, files);
}
