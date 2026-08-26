import { DEFAULTS } from '@golden-path/core';
import { describe, expect, it } from 'vitest';
import { parseConfig, toOutputs } from '../action';

function missingFile(): never {
    throw Object.assign(new Error(`ENOENT: no such file`), { code: 'ENOENT' });
}

describe('toOutputs', () => {
    it('serializes booleans as strings and config as JSON', () => {
        const outputs = toOutputs(DEFAULTS);
        expect(outputs.security_enabled).toBe('true');
        expect(outputs.secret_scan_enabled).toBe('true');
        expect(outputs.codespell_enabled).toBe('true');
        expect(outputs.actionlint_enabled).toBe('true');
        expect(outputs.valid).toBe('true');
        expect(outputs.validation_errors).toBe('[]');
        expect(JSON.parse(outputs.config)).toEqual(DEFAULTS);
    });

    it('reflects disabled gates', () => {
        const outputs = toOutputs({
            ...DEFAULTS,
            codespell: { enabled: false },
            actionlint: { enabled: false },
        });
        expect(outputs.codespell_enabled).toBe('false');
        expect(outputs.actionlint_enabled).toBe('false');
    });
});

describe('parseConfig', () => {
    it('parses a present file into normalized outputs', () => {
        const readFile = () => `version: 2\ngo:\n  - coverage-floor: 95\n  - working-directory: cmd/tool\n`;
        const { outputs, missing, config } = parseConfig('.github/golden-path.yaml', readFile);
        expect(missing).toBe(false);
        expect(config.go).toHaveLength(2);
        expect(config.go[0]?.coverage_floor).toBe(95);
        expect(config.go[0]?.working_directory).toBe('.');
        expect(config.go[1]?.working_directory).toBe('cmd/tool');
        expect(config.go[1]?.lint?.golangci_lint_version).toBe('v2.13.1');
        expect(config.node).toEqual([]);
        expect(outputs.config).toBe(JSON.stringify(config));
    });

    it('falls back to defaults when the file is missing (no gates)', () => {
        const { missing, config, outputs } = parseConfig('missing.yaml', missingFile);
        expect(missing).toBe(true);
        expect(config.go).toEqual([]);
        expect(config.node).toEqual([]);
        expect(config.secret_scan.tool).toBe('betterleaks');
        expect(outputs.security_enabled).toBe('true');
    });

    it('reports actionable validation errors for unknown keys', () => {
        const readFile = () => `version: 2\ngo:\n  - covrage-floor: 95\n`;
        const { outputs, missing } = parseConfig('x.yaml', readFile);
        expect(missing).toBe(false);
        expect(outputs.valid).toBe('false');
        const errors = JSON.parse(outputs.validation_errors) as string[];
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.join(' ')).toMatch(/covrage_floor/);
    });

    it('rethrows non-ENOENT errors', () => {
        const readFile = () => {
            throw new Error('boom');
        };
        expect(() => parseConfig('x.yaml', readFile)).toThrow('boom');
    });
});
