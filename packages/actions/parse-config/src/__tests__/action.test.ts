import { DEFAULTS } from '@golden-path/core';
import { describe, expect, it } from 'vitest';
import { parseConfig, toOutputs } from '../action';

function missingFile(): never {
    throw Object.assign(new Error(`ENOENT: no such file`), { code: 'ENOENT' });
}

describe('toOutputs', () => {
    it('serializes booleans as strings and config as JSON', () => {
        const outputs = toOutputs(DEFAULTS);
        expect(outputs.language).toBe('go');
        expect(outputs.go_enabled).toBe('true');
        expect(outputs.security_enabled).toBe('true');
        expect(JSON.parse(outputs.config)).toEqual(DEFAULTS);
    });

    it('reflects disabled gates', () => {
        const outputs = toOutputs({
            ...DEFAULTS,
            go: { ...DEFAULTS.go, enabled: false },
            codespell: { enabled: false },
        });
        expect(outputs.go_enabled).toBe('false');
        expect(outputs.codespell_enabled).toBe('false');
    });
});

describe('parseConfig', () => {
    it('parses a present file into normalized outputs', () => {
        const readFile = () => `version: 1\nlanguage: go\ngo:\n  coverage-floor: 95\n`;
        const { outputs, missing, config } = parseConfig('.github/golden-path.yml', readFile);
        expect(missing).toBe(false);
        expect(config.go.coverage_floor).toBe(95);
        expect(config.go.working_directory).toBe('.');
        expect(outputs.go_enabled).toBe('true');
        expect(outputs.config).toBe(JSON.stringify(config));
    });

    it('falls back to defaults when the file is missing', () => {
        const { missing, config, outputs } = parseConfig('missing.yml', missingFile);
        expect(missing).toBe(true);
        expect(config.language).toBe('go');
        expect(config.go.cross_compile.enabled).toBe(false);
        expect(outputs.language).toBe('go');
    });

    it('rethrows non-ENOENT errors', () => {
        const readFile = () => {
            throw new Error('boom');
        };
        expect(() => parseConfig('x.yml', readFile)).toThrow('boom');
    });
});
