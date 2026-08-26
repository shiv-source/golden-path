export interface JobResult {
    job: string;
    result: string;
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
