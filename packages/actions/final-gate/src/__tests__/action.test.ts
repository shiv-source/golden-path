import { describe, expect, it } from 'vitest';
import { buildReport, formatFailureMessage, parseResults, statusEmoji, summarize } from '../action';

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

describe('statusEmoji', () => {
    it('maps each result to an emoji', () => {
        expect(statusEmoji('success')).toBe(':white_check_mark:');
        expect(statusEmoji('failure')).toBe(':x:');
        expect(statusEmoji('cancelled')).toBe(':stop_sign:');
        expect(statusEmoji('skipped')).toBe(':heavy_minus_sign:');
    });
});

describe('buildReport', () => {
    it('renders a markdown table with the marker and coverage rows', () => {
        const report = buildReport(
            [
                { job: 'go', result: 'success' },
                { job: 'web', result: 'failure' },
            ],
            { coverage: '94.2', coverageFloor: 90, webCoverage: '91.5', webCoverageFloor: 80 },
        );
        expect(report).toContain('| go | :white_check_mark: success |');
        expect(report).toContain('| web | :x: failure |');
        expect(report).toContain('**Coverage:** 94.2% (floor 90%)');
        expect(report).toContain('**Web coverage:** 91.5% (floor 80%)');
        expect(report).toContain('<!-- golden-path-quality-gate -->');
    });

    it('omits coverage rows when no coverage is reported', () => {
        const report = buildReport([{ job: 'go', result: 'success' }]);
        expect(report).not.toContain('Coverage');
        expect(report).toContain('<!-- golden-path-quality-gate -->');
    });

    it('drops the floor suffix when the floor is zero', () => {
        const report = buildReport([], { coverage: '50', coverageFloor: 0 });
        expect(report).toContain('**Coverage:** 50%');
        expect(report).not.toContain('(floor');
    });
});
