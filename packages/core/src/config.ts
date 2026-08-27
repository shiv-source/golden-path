import { default as Ajv, type JSONSchemaType, type ErrorObject } from 'ajv/dist/2020';
import { default as betterAjvErrors } from 'better-ajv-errors';
import { parse } from 'yaml';
import schema from '../../../schemas/golden-path.schema.json';
import type { ConfigInput, GoldenPathConfig, GoTarget, NodeTarget } from './types';
import { TOOLCHAIN } from './toolchain';

// Language gates are opt-in: an empty go:/node: list disables the gate. Each
// list entry is a target whose missing fields fall back to these defaults.
export const GO_TARGET_DEFAULTS: GoTarget = {
    go_version: 'stable',
    go_version_file: '',
    working_directory: '.',
    change_detection: {
        enabled: true,
        paths: ['**/*.go', 'go.mod', 'go.sum', '.golangci.yaml', '.github/'],
    },
    coverage_floor: 0,
    cross_compile: {
        enabled: false,
        goos: ['linux', 'darwin', 'windows'],
        goarch: ['amd64', 'arm64'],
    },
    lint: {
        golangci_lint_version: TOOLCHAIN.golangciLint,
        config: '.golangci.yaml',
        timeout: '5m',
        args: '',
    },
    final_gate: true,
};

export const NODE_TARGET_DEFAULTS: NodeTarget = {
    node_version: TOOLCHAIN.node,
    package_manager: 'auto',
    working_directory: '.',
    shard_count: 3,
    lint_command: 'npm run lint',
    typecheck_command: 'npm run typecheck',
    test_command: 'npm test',
    build_command: 'npm run build',
    coverage_command: '',
    coverage_floor: 0,
    change_detection: {
        enabled: true,
        paths: [
            '**/*.{ts,tsx,js,jsx,mjs,cjs}',
            'package.json',
            'pnpm-lock.yaml',
            'yarn.lock',
            'package-lock.json',
            '.github/',
        ],
    },
    final_gate: true,
};

export const DEFAULTS: GoldenPathConfig = {
    version: 2,
    go: [],
    node: [],
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

// Recursively convert kebab-case keys to snake_case (including array items).
export function keysToSnake(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => (isPlainObject(item) ? keysToSnake(item) : item));
    }
    if (!isPlainObject(value)) return value;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
        const snake = key.replace(/-([a-z])/g, (_, c: string) => `_${c.toLowerCase()}`);
        out[snake] = isPlainObject(val) || Array.isArray(val) ? keysToSnake(val) : val;
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

// Normalize a parsed config document against the defaults. Language gates are
// target lists: merge per-target defaults into every item so a bare
// `{ working-directory: x }` target still gets coverage_floor, lint, etc.
export function normalizeConfig(raw: unknown): GoldenPathConfig {
    const snake = keysToSnake(raw);
    const merged = deepMerge(keysToSnake(DEFAULTS), snake) as GoldenPathConfig;
    merged.go = merged.go.map((target) => deepMerge(GO_TARGET_DEFAULTS, target) as GoTarget);
    merged.node = merged.node.map((target) => deepMerge(NODE_TARGET_DEFAULTS, target) as NodeTarget);
    return merged;
}

// ---- Validation (strict) ----
// The JSON Schema is the contract. Unknown keys and invalid values fail loudly
// with actionable messages instead of being silently ignored.

const ajv = new Ajv({ allErrors: true, strict: true, useDefaults: false });
const validate = ajv.compile(schema as unknown as JSONSchemaType<ConfigInput>);

export interface ConfigValidation {
    config: GoldenPathConfig;
    errors: string[];
}

export function formatValidationErrors(errors: ErrorObject[], data: unknown): string[] {
    const formatted = betterAjvErrors(schema as object, data, errors, { format: 'js' });
    return formatted.map((e) => (e.suggestion ? `${e.error} (${e.suggestion})` : e.error));
}

export function validateConfig(raw: unknown): ConfigValidation {
    const snake = keysToSnake(raw);
    const valid = validate(snake as ConfigInput);
    return {
        config: normalizeConfig(snake),
        errors: valid ? [] : formatValidationErrors(validate.errors ?? [], snake),
    };
}
