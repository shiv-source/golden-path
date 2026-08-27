import { describe, expect, it } from 'vitest';
import {
    MARKER,
    coverageTable,
    formatFailureMessage,
    parseResults,
    renderPrBody,
    renderSummary,
    resultText,
    summarize,
} from '../action';
import type { CoverageInput, ReportContext } from '../action';

const ctx: ReportContext = {
    repository: 'owner/repo',
    serverUrl: 'https://github.com',
    runId: '123',
    runNumber: '7',
    sha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
};

describe('parseResults', () => {
    it('parses space-separated job=result pairs', () => {
        expect(parseResults('lint=success test=failure build=skipped')).toEqual([
            { job: 'lint', result: 'success' },
            { job: 'test', result: 'failure' },
            { job: 'build', result: 'skipped' },
        ]);
    });

    it('handles extra whitespace', () => {
        expect(parseResults('  lint=success   test=success  ')).toEqual([
            { job: 'lint', result: 'success' },
            { job: 'test', result: 'success' },
        ]);
    });

    it('returns an empty list for empty input', () => {
        expect(parseResults('')).toEqual([]);
        expect(parseResults('   ')).toEqual([]);
    });

    it('preserves bare specs (no "=") as job === result', () => {
        expect(parseResults('lint')).toEqual([{ job: 'lint', result: 'lint' }]);
    });
});

describe('summarize', () => {
    it('passes when all results are success or skipped', () => {
        expect(summarize(parseResults('lint=success test=success build=skipped')).passed).toBe(true);
    });

    it('fails on failure and cancelled results', () => {
        const { passed, failures } = summarize(parseResults('lint=success test=failure build=cancelled'));
        expect(passed).toBe(false);
        expect(failures.map((f) => f.job)).toEqual(['test', 'build']);
    });

    it('passes for an empty result set', () => {
        expect(summarize([]).passed).toBe(true);
    });
});

describe('formatFailureMessage', () => {
    it('formats failures for the error log', () => {
        const failures = [
            { job: 'test', result: 'failure' },
            { job: 'build', result: 'cancelled' },
        ];
        expect(formatFailureMessage(failures)).toBe('test(failure) build(cancelled)');
    });

    it('returns an empty string when there are no failures', () => {
        expect(formatFailureMessage([])).toBe('');
    });
});

describe('resultText', () => {
    it('maps known conclusions to emoji text', () => {
        expect(resultText('success')).toBe('✅ success');
        expect(resultText('failure')).toBe('❌ failure');
        expect(resultText('skipped')).toBe('⏭️ skipped');
    });

    it('falls back for unknown conclusions', () => {
        expect(resultText('in_progress')).toBe('⏳ in_progress');
    });
});

describe('coverageTable', () => {
    const cov: CoverageInput = { coverage: '94.2', coverageFloor: '90', webCoverage: '91.5', webCoverageFloor: '90' };

    it('renders backend and frontend rows with gate markers', () => {
        const table = coverageTable(cov);
        expect(table).toContain('| Area | Coverage | Floor | Gate |');
        expect(table).toContain('| Backend (Go) | **94.2%** | **90%** | ✅ |');
        expect(table).toContain('| Frontend (Node) | **91.5%** | **90%** | ✅ |');
    });

    it('marks a row below its floor with a fail marker', () => {
        const table = coverageTable({ ...cov, webCoverage: '88' });
        expect(table).toContain('| Frontend (Node) | **88%** | **90%** | ❌ |');
    });

    it('omits areas without coverage and returns null when none ran', () => {
        expect(coverageTable({ coverage: '50' })).not.toContain('Frontend');
        expect(coverageTable({})).toBeNull();
    });

    it('renders a missing floor as a dash', () => {
        expect(coverageTable({ coverage: '50' })).toContain('**50%** | — |');
    });
});

describe('renderSummary', () => {
    it('renders a pass title, run/commit links, and the job table', () => {
        const results = parseResults('go=success web=skipped');
        const summary = renderSummary(results, [], { coverage: '94', coverageFloor: '90' }, ctx);
        expect(summary).toContain('## CI passed ✅');
        expect(summary).toContain(`[owner/repo#7](https://github.com/owner/repo/actions/runs/123)`);
        expect(summary).toContain('`a1b2c3d4`');
        expect(summary).toContain('| go | ✅ success |');
        expect(summary).toContain('| web | ⏭️ skipped |');
    });

    it('renders a failure title and lists failures', () => {
        const results = parseResults('go=failure web=success');
        const summary = renderSummary(results, [results[0]!], {}, ctx);
        expect(summary).toContain('## CI failed ❌ — 1 job(s) failed');
        expect(summary).toContain('| go | ❌ failure |');
    });
});

describe('renderPrBody', () => {
    it('includes the marker and a details block', () => {
        const results = parseResults('go=success web=success');
        const body = renderPrBody(results, [], { webCoverage: '90' }, ctx);
        expect(body).toContain(MARKER);
        expect(body).toContain('### CI Report ✅');
        expect(body).toContain('**2/2 jobs passed**');
        expect(body).toContain('<summary>Job results</summary>');
        expect(body).toContain('| go | ✅ success |');
    });
});
