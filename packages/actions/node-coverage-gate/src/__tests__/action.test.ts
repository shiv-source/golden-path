import { describe, expect, it } from 'vitest';
import { parseCoverageSummary } from '../action';

const summary = {
    total: {
        statements: { total: 100, covered: 92, skipped: 0, pct: 92 },
        branches: { total: 50, covered: 40, skipped: 0, pct: 80 },
        functions: { total: 30, covered: 28, skipped: 0, pct: 93.33 },
        lines: { total: 100, covered: 92, skipped: 0, pct: 92 },
    },
};

describe('parseCoverageSummary', () => {
    it('extracts statements coverage, covered/total, and passes above the floor', () => {
        const outcome = parseCoverageSummary(JSON.stringify(summary), 90);
        expect(outcome).toEqual({ coverage: 92, covered: 92, total: 100, ok: true });
    });

    it('fails below the floor', () => {
        const outcome = parseCoverageSummary(JSON.stringify(summary), 95);
        expect(outcome?.ok).toBe(false);
        expect(outcome?.coverage).toBe(92);
    });

    it('a zero/absent floor never fails', () => {
        expect(parseCoverageSummary(JSON.stringify(summary), 0)?.ok).toBe(true);
    });

    it('returns null on malformed JSON', () => {
        expect(parseCoverageSummary('not json', 90)).toBeNull();
    });

    it('returns null when total.statements is missing', () => {
        expect(parseCoverageSummary('{"total":{}}', 90)).toBeNull();
        expect(parseCoverageSummary('{}', 90)).toBeNull();
    });
});
