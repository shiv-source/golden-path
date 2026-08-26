import { normalizeConfig, parseYaml } from '@golden-path/core';
import type { GoldenPathConfig } from '@golden-path/core';

export interface ParseConfigOutputs {
    config: string;
    language: string;
    go_enabled: string;
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
        language: config.language,
        go_enabled: String(config.go.enabled),
        security_enabled: String(config.security_scan.enabled),
        secret_scan_enabled: String(config.secret_scan.enabled),
        codespell_enabled: String(config.codespell.enabled),
        actionlint_enabled: String(config.actionlint.enabled),
    };
}

export function parseConfig(configPath: string, readFile: ReadFile): ParseConfigResult {
    try {
        const text = readFile(configPath);
        const config = normalizeConfig(parseYaml(text));
        return { config, outputs: toOutputs(config), missing: false };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        const config = normalizeConfig({});
        return { config, outputs: toOutputs(config), missing: true };
    }
}
