import { describe, expect, it } from 'vitest';
import { formatFailureMessage, parseResults, summarize } from '../action';

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
