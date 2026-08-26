import { parseYaml, validateConfig } from '@golden-path/core';
import type { GoldenPathConfig } from '@golden-path/core';

export interface ParseConfigOutputs {
    config: string;
    valid: string;
    validation_errors: string;
    security_enabled: string;
    secret_scan_enabled: string;
    codespell_enabled: string;
    actionlint_enabled: string;
}

export interface ParseConfigResult {
    config: GoldenPathConfig;
    outputs: ParseConfigOutputs;
    missing: boolean;
}

export type ReadFile = (path: string) => string;

export function toOutputs(config: GoldenPathConfig): ParseConfigOutputs {
    return {
        config: JSON.stringify(config),
        valid: 'true',
        validation_errors: '[]',
        security_enabled: String(config.security_scan.enabled),
        secret_scan_enabled: String(config.secret_scan.enabled),
        codespell_enabled: String(config.codespell.enabled),
        actionlint_enabled: String(config.actionlint.enabled),
    };
}

export function parseConfig(configPath: string, readFile: ReadFile): ParseConfigResult {
    try {
        const text = readFile(configPath);
        const { config, errors } = validateConfig(parseYaml(text));
        if (errors.length > 0) {
            return {
                config,
                outputs: {
                    ...toOutputs(config),
                    valid: 'false',
                    validation_errors: JSON.stringify(errors),
                },
                missing: false,
            };
        }
        return { config, outputs: toOutputs(config), missing: false };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        const { config } = validateConfig({});
        return { config, outputs: toOutputs(config), missing: true };
    }
}
