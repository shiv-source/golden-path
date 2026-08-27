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

// ---- Rich report (ported from thoth's ci-report) ----

export const MARKER = '<!-- golden-path-ci-report -->';

const RESULT_TEXT: Record<string, string> = {
    success: '✅ success',
    failure: '❌ failure',
    cancelled: '🚫 cancelled',
    skipped: '⏭️ skipped',
};

export function resultText(result: string): string {
    return RESULT_TEXT[result] ?? `⏳ ${result}`;
}

// Trim a coverage value, tolerate a trailing %, → number (null when empty).
function pct(value: string | undefined): number | null {
    const s = String(value ?? '')
        .trim()
        .replace(/%$/, '');
    return s === '' ? null : Number(s);
}

// One decimal, no trailing ".0".
function fmtPct(n: number): string {
    const v = Math.round(n * 10) / 10;
    return Number.isInteger(v) ? String(v) : String(v.toFixed(1));
}

export interface CoverageInput {
    coverage?: string;
    coverageFloor?: string;
    webCoverage?: string;
    webCoverageFloor?: string;
}

// The coverage table for the report — backend and frontend rows, each with
// its actual %, floor, and whether it clears the floor. Rows whose inputs are
// missing are omitted. Returns null when no area ran.
export function coverageTable(input: CoverageInput): string | null {
    const rows: { label: string; coverage: number; floor: number | null }[] = [];
    for (const [label, cov, floor] of [
        ['Backend (Go)', input.coverage, input.coverageFloor],
        ['Frontend (Node)', input.webCoverage, input.webCoverageFloor],
    ] as const) {
        const c = pct(cov);
        if (c === null) continue;
        rows.push({ label, coverage: c, floor: pct(floor) });
    }
    if (rows.length === 0) return null;

    const lines = ['| Area | Coverage | Floor | Gate |', '| --- | --- | --- | --- |'];
    for (const { label, coverage, floor } of rows) {
        const ok = floor === null ? null : coverage >= floor;
        const floorCell = floor === null ? '—' : `**${fmtPct(floor)}%**`;
        const gateCell = ok === null ? '' : ok ? '✅' : '❌';
        lines.push(`| ${label} | **${fmtPct(coverage)}%** | ${floorCell} | ${gateCell} |`);
    }
    return lines.join('\n');
}

export interface ReportContext {
    repository: string;
    serverUrl: string;
    runId: string;
    runNumber: string;
    sha: string;
}

// The step summary: title line, run/commit links, coverage table when known,
// then the job table. Rendered even when the gate fails — the exit code is
// decided only after writing it.
export function renderSummary(
    results: JobResult[],
    failures: JobResult[],
    coverage: CoverageInput,
    ctx: ReportContext,
): string {
    const run = `${ctx.serverUrl}/${ctx.repository}/actions/runs/${ctx.runId}`;
    const commit = `${ctx.serverUrl}/${ctx.repository}/commit/${ctx.sha}`;
    const lines = [failures.length > 0 ? `## CI failed ❌ — ${failures.length} job(s) failed` : '## CI passed ✅'];
    lines.push(
        '',
        `Run: [${ctx.repository}#${ctx.runNumber}](${run}) · commit [\`${ctx.sha.slice(0, 8)}\`](${commit})`,
    );
    const table = coverageTable(coverage);
    if (table) lines.push('', table);
    lines.push('', '| Job | Result |', '|---|---|');
    for (const r of results) lines.push(`| ${r.job} | ${resultText(r.result)} |`);
    return lines.join('\n');
}

// The report posted (and updated in place) as a PR comment. Same data as the
// step summary, wrapped for a comment and tagged with the marker so re-runs
// patch it instead of stacking new comments.
export function renderPrBody(
    results: JobResult[],
    failures: JobResult[],
    coverage: CoverageInput,
    ctx: ReportContext,
): string {
    const run = `${ctx.serverUrl}/${ctx.repository}/actions/runs/${ctx.runId}`;
    const commit = `${ctx.serverUrl}/${ctx.repository}/commit/${ctx.sha}`;
    const title = failures.length > 0 ? '### CI Report ❌' : '### CI Report ✅';
    const passed = results.length - failures.length;
    const lines = [
        MARKER,
        '',
        title,
        '',
        `**${passed}/${results.length} jobs passed** · [Run #${ctx.runNumber}](${run}) · commit [\`${ctx.sha.slice(0, 8)}\`](${commit})`,
    ];
    const table = coverageTable(coverage);
    if (table) lines.push('', table);
    lines.push(
        '',
        '<details>',
        '<summary>Job results</summary>',
        '',
        '| Job | Result |',
        '|---|---|',
        ...results.map((r) => `| ${r.job} | ${resultText(r.result)} |`),
        '</details>',
        '',
        '---',
        '🤖 Updated automatically on every run by [final-gate](https://github.com/shiv-source/golden-path/blob/main/.github/actions/final-gate/action.yaml)',
        '⛔ This check must pass before merging',
    );
    return lines.join('\n');
}
