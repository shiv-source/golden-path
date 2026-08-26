import { describe, expect, it } from 'vitest';
import { DEFAULTS, deepMerge, keysToSnake, normalizeConfig, parseYaml } from '../config';

describe('parseYaml', () => {
    it('parses nested maps, lists, scalars, and comments', () => {
        const yaml = `
# comment
version: 1
language: go

go:
  enabled: true
  working-directory: .
  coverage-floor: 90
  cross-compile:
    enabled: false
    goos: [linux, darwin]
`;
        expect(parseYaml(yaml)).toEqual({
            version: 1,
            language: 'go',
            go: {
                enabled: true,
                'working-directory': '.',
                'coverage-floor': 90,
                'cross-compile': { enabled: false, goos: ['linux', 'darwin'] },
            },
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
    it('converts kebab-case keys to snake_case recursively', () => {
        const input = {
            'go-version-file': 'go.mod',
            'working-directory': '.',
            'cross-compile': { 'final-gate': true },
        };
        expect(keysToSnake(input)).toEqual({
            go_version_file: 'go.mod',
            working_directory: '.',
            cross_compile: { final_gate: true },
        });
    });
});

describe('deepMerge', () => {
    it('lets overrides win without clobbering untouched defaults', () => {
        const merged = deepMerge(DEFAULTS, {
            go: { coverage_floor: 95 },
            secret_scan: { tool: 'ggshield' },
        });
        expect(merged).toMatchObject({
            go: { coverage_floor: 95, working_directory: '.' },
            secret_scan: { tool: 'ggshield' },
            codespell: { enabled: true },
        });
    });

    it('replaces arrays wholesale', () => {
        const merged = deepMerge(DEFAULTS, {
            go: { cross_compile: { goos: ['linux'] } },
        });
        const go = (merged as typeof DEFAULTS).go;
        expect(go.cross_compile.goos).toEqual(['linux']);
    });
});

describe('normalizeConfig', () => {
    it('applies defaults and snake_cases the result', () => {
        const config = normalizeConfig({ go: { 'coverage-floor': 95, enabled: true } });
        expect(config.go.coverage_floor).toBe(95);
        expect(config.go.cross_compile.enabled).toBe(false);
        expect(config.go.go_version).toBe('stable');
        expect(config.language).toBe('go');
    });

    it('normalizes an empty document to the defaults', () => {
        const config = normalizeConfig({});
        expect(config).toEqual(DEFAULTS);
        expect(config.version).toBe(1);
        expect(config.go.change_detection.paths).toContain('**/*.go');
    });
});
