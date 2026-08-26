import { describe, expect, it } from 'vitest';
import {
    DEFAULTS,
    GO_TARGET_DEFAULTS,
    deepMerge,
    keysToSnake,
    normalizeConfig,
    parseYaml,
    validateConfig,
} from '../config';
import { TOOLCHAIN } from '../toolchain';

describe('parseYaml', () => {
    it('parses nested maps, lists, scalars, and comments', () => {
        const yaml = `
# comment
version: 2

go:
  - working-directory: .
    coverage-floor: 90
    cross-compile:
      goos: [linux, darwin]
`;
        expect(parseYaml(yaml)).toEqual({
            version: 2,
            go: [
                {
                    'working-directory': '.',
                    'coverage-floor': 90,
                    'cross-compile': { goos: ['linux', 'darwin'] },
                },
            ],
        });
    });

    it('handles block list items', () => {
        const yaml = `
paths:
  - '**/*.go'
  - go.mod
  - .github/
`;
        expect(parseYaml(yaml)).toEqual({ paths: ['**/*.go', 'go.mod', '.github/'] });
    });

    it('returns an empty object for empty documents', () => {
        expect(parseYaml('')).toEqual({});
    });
});

describe('keysToSnake', () => {
    it('converts kebab-case keys to snake_case recursively through arrays', () => {
        const input = {
            'go-version-file': 'go.mod',
            'working-directory': '.',
            'cross-compile': { 'final-gate': true },
            go: [{ 'coverage-floor': 90 }],
        };
        expect(keysToSnake(input)).toEqual({
            go_version_file: 'go.mod',
            working_directory: '.',
            cross_compile: { final_gate: true },
            go: [{ coverage_floor: 90 }],
        });
    });
});

describe('deepMerge', () => {
    it('lets overrides win without clobbering untouched defaults', () => {
        const merged = deepMerge({ a: { x: 1, y: 2 }, b: 3 }, { a: { x: 9 } });
        expect(merged).toEqual({ a: { x: 9, y: 2 }, b: 3 });
    });

    it('replaces arrays wholesale', () => {
        const merged = deepMerge({ a: [1, 2] }, { a: [3] });
        expect(merged).toEqual({ a: [3] });
    });
});

describe('normalizeConfig', () => {
    it('applies defaults and snake_cases each go target', () => {
        const config = normalizeConfig({ go: [{ 'coverage-floor': 95 }] });
        expect(config.go).toHaveLength(1);
        expect(config.go[0]?.coverage_floor).toBe(95);
        expect(config.go[0]?.cross_compile?.enabled).toBe(false);
        expect(config.go[0]?.go_version).toBe('stable');
        expect(config.go[0]?.lint?.golangci_lint_version).toBe(TOOLCHAIN.golangciLint);
    });

    it('normalizes an empty document to the defaults (no gates enabled)', () => {
        const config = normalizeConfig({});
        expect(config).toEqual(DEFAULTS);
        expect(config.version).toBe(2);
        expect(config.go).toEqual([]);
        expect(config.node).toEqual([]);
    });

    it('normalizes each node target with per-target defaults', () => {
        const config = normalizeConfig({ node: [{ 'shard-count': 5 }, {}] });
        expect(config.node).toHaveLength(2);
        expect(config.node[0]?.shard_count).toBe(5);
        expect(config.node[0]?.node_version).toBe(TOOLCHAIN.node);
        expect(config.node[1]?.build_command).toBe('npm run build');
        expect(config.node[1]?.working_directory).toBe('.');
    });

    it('supports multiple go targets with independent settings', () => {
        const config = normalizeConfig({
            go: [
                { 'working-directory': 'services/api' },
                { 'working-directory': 'services/worker', 'coverage-floor': 70 },
            ],
        });
        expect(config.go).toHaveLength(2);
        expect(config.go[0]?.working_directory).toBe('services/api');
        expect(config.go[0]?.coverage_floor).toBe(0);
        expect(config.go[1]?.coverage_floor).toBe(70);
        expect(config.go[1]?.go_version).toBe('stable');
    });

    it('exports target defaults consistent with the catalog', () => {
        expect(GO_TARGET_DEFAULTS.lint.golangci_lint_version).toBe(TOOLCHAIN.golangciLint);
        expect(GO_TARGET_DEFAULTS.working_directory).toBe('.');
    });
});

describe('validateConfig', () => {
    it('accepts a minimal valid config and normalizes it', () => {
        const { config, errors } = validateConfig({ go: [{ 'coverage-floor': 90 }] });
        expect(errors).toEqual([]);
        expect(config.go[0]?.coverage_floor).toBe(90);
    });

    it('rejects unknown keys inside a target with an actionable message', () => {
        const { errors } = validateConfig({ go: [{ 'covrage-floor': 90 }] });
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.join(' ')).toMatch(/covrage_floor/);
    });

    it('rejects unknown top-level sections', () => {
        const { errors } = validateConfig({ codeql: { enabled: true } });
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.join(' ')).toMatch(/codeql/);
    });

    it('rejects invalid enum values inside a target', () => {
        const { errors } = validateConfig({ node: [{ package_manager: 'bower' }] });
        expect(errors.length).toBeGreaterThan(0);
    });
});
