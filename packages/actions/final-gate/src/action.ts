export interface JobResult {
    job: string;
    result: string;
}

export interface CoverageReport {
    coverage?: string;
    coverageFloor?: number;
    webCoverage?: string;
    webCoverageFloor?: number;
}

// Parse a space-separated "job=result" list (e.g. "lint=success test=failure").
// A spec without "=" yields job === result, mirroring the original shell logic.
export function parseResults(input: string): JobResult[] {
    return input
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((spec) => {
            const eq = spec.indexOf('=');
            if (eq === -1) return { job: spec, result: spec };
            return { job: spec.slice(0, eq), result: spec.slice(eq + 1) };
        });
}

export function summarize(results: JobResult[]): { passed: boolean; failures: JobResult[] } {
    const failures = results.filter((r) => r.result === 'failure' || r.result === 'cancelled');
    return { passed: failures.length === 0, failures };
}

export function formatFailureMessage(failures: JobResult[]): string {
    return failures.map((f) => `${f.job}(${f.result})`).join(' ');
}

export function statusEmoji(result: string): string {
    switch (result) {
        case 'success':
            return ':white_check_mark:';
        case 'failure':
            return ':x:';
        case 'cancelled':
            return ':stop_sign:';
        default:
            return ':heavy_minus_sign:';
    }
}

// Marker that identifies this action's comment so upserts replace, not duplicate.
export const COMMENT_MARKER = 'golden-path-quality-gate';

export function buildReport(results: JobResult[], coverageReport: CoverageReport = {}): string {
    const lines: string[] = ['# Quality Gate', '', '| Check | Result |', '| --- | --- |'];
    for (const { job, result } of results) {
        lines.push(`| ${job} | ${statusEmoji(result)} ${result} |`);
    }
    if (coverageReport.coverage) {
        const floor = coverageReport.coverageFloor ? ` (floor ${coverageReport.coverageFloor}%)` : '';
        lines.push('', `**Coverage:** ${coverageReport.coverage}%${floor}`);
    }
    if (coverageReport.webCoverage) {
        const floor = coverageReport.webCoverageFloor ? ` (floor ${coverageReport.webCoverageFloor}%)` : '';
        lines.push('', `**Web coverage:** ${coverageReport.webCoverage}%${floor}`);
    }
    lines.push('', `<!-- ${COMMENT_MARKER} -->`);
    return lines.join('\n');
}
