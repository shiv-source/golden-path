import type { ExecResult, ExecRunner } from '@golden-path/core';

export interface CoverageGateOptions {
    workingDirectory: string;
    testArgs: string;
}

export type CoverageGateOutcome =
    | { ok: true; coverage: number }
    | { ok: false; reason: 'tests-failed' | 'cover-command-failed' | 'no-total-line'; output: string };

// Cap surfaced command output so a failed `go test` flood doesn't drown the
// job log. The tail carries the most useful failure context (failed test names).
export function summarizeExecOutput(result: Pick<ExecResult, 'stdout' | 'stderr'>, maxChars = 4000): string {
    const text = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    if (text.length <= maxChars) return text;
    return `... (truncated) ...\n${text.slice(-maxChars)}`;
}

// Parse the total coverage percentage from `go tool cover -func=coverage.out`.
// The total line looks like: "total:\t(statements)\t94.2%"
export function parseTotalCoverage(stdout: string): number | null {
    const line = stdout.split(/\r?\n/).find((l) => l.trimStart().startsWith('total:'));
    if (!line) return null;
    const match = line.match(/([\d.]+)%/);
    return match?.[1] ? Number(match[1]) : null;
}

export function runCoverageGate(options: CoverageGateOptions, exec: ExecRunner): CoverageGateOutcome {
    const cwd = options.workingDirectory || '.';

    const testResult = exec(`go test ${options.testArgs}`, { cwd });
    if (testResult.code !== 0) {
        return { ok: false, reason: 'tests-failed', output: summarizeExecOutput(testResult) };
    }

    const coverResult = exec('go tool cover -func=coverage.out', { cwd });
    if (coverResult.code !== 0) {
        return { ok: false, reason: 'cover-command-failed', output: summarizeExecOutput(coverResult) };
    }

    const coverage = parseTotalCoverage(coverResult.stdout);
    if (coverage === null) return { ok: false, reason: 'no-total-line', output: coverResult.stdout };

    return { ok: true, coverage };
}
