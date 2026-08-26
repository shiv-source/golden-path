import { parse } from 'yaml';
import type { GoldenPathConfig } from './types';

// Defaults are "batteries included": presence of the config file opts a repo
// into the full gate set; consumers disable individual gates with enabled: false.
export const DEFAULTS: GoldenPathConfig = {
    version: 1,
    language: 'go',
    go: {
        enabled: true,
        go_version: 'stable',
        go_version_file: '',
        working_directory: '.',
        change_detection: {
            enabled: true,
            paths: ['**/*.go', 'go.mod', 'go.sum', '.golangci.yml', '.github/'],
        },
        coverage_floor: 0,
        cross_compile: {
            enabled: false,
            goos: ['linux', 'darwin', 'windows'],
            goarch: ['amd64', 'arm64'],
        },
        final_gate: true,
    },
    security_scan: { enabled: true, language: 'go' },
    secret_scan: { enabled: true, tool: 'betterleaks' },
    codespell: { enabled: true },
    actionlint: { enabled: true },
};

export function parseYaml(text: string): unknown {
    return parse(text) ?? {};
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Recursively convert kebab-case keys to snake_case.
export function keysToSnake(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => (isPlainObject(item) ? keysToSnake(item) : item));
    }
    if (!isPlainObject(value)) return value;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
        const snake = key.replace(/-([a-z])/g, (_, c: string) => `_${c.toLowerCase()}`);
        out[snake] = isPlainObject(val) ? keysToSnake(val) : val;
    }
    return out;
}

// Deep-merge user values over defaults (user wins). Arrays replace wholesale.
export function deepMerge(defaults: unknown, overrides: unknown): unknown {
    if (!isPlainObject(defaults) || !isPlainObject(overrides)) return overrides ?? defaults;
    const out: Record<string, unknown> = { ...defaults };
    for (const [key, value] of Object.entries(overrides)) {
        if (isPlainObject(value) && isPlainObject(defaults[key])) {
            out[key] = deepMerge(defaults[key], value);
        } else {
            out[key] = value;
        }
    }
    return out;
}

// Normalize a parsed config document against DEFAULTS.
export function normalizeConfig(raw: unknown): GoldenPathConfig {
    const snake = keysToSnake(raw);
    return deepMerge(keysToSnake(DEFAULTS), snake) as GoldenPathConfig;
}
