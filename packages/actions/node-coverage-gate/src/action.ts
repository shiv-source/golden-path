export interface CoverageTotals {
    total: number;
    covered: number;
    pct: number;
}

export interface CoverageSummaryTotal {
    statements: CoverageTotals;
    branches: CoverageTotals;
    functions: CoverageTotals;
    lines: CoverageTotals;
}

export interface CoverageSummary {
    total: CoverageSummaryTotal;
}

export interface CoverageOutcome {
    coverage: number;
    covered: number;
    total: number;
    ok: boolean;
}

// Parse vitest's coverage/coverage-summary.json (statements are the canonical
// overall metric) and compare against the configured floor. Returns null when
// the JSON is malformed or the summary lacks a total.statements block.
export function parseCoverageSummary(text: string, floor: number): CoverageOutcome | null {
    let json: CoverageSummary;
    try {
        json = JSON.parse(text) as CoverageSummary;
    } catch {
        return null;
    }
    const statements = json?.total?.statements;
    if (statements == null || typeof statements.pct !== 'number') return null;
    return {
        coverage: statements.pct,
        covered: statements.covered ?? 0,
        total: statements.total ?? 0,
        ok: floor <= 0 || statements.pct >= floor,
    };
}
