export interface CrossCompileConfig {
    enabled: boolean;
    goos: string[];
    goarch: string[];
}

export interface ChangeDetectionConfig {
    enabled: boolean;
    paths: string[];
}

export interface GoConfig {
    enabled: boolean;
    go_version: string;
    go_version_file: string;
    working_directory: string;
    change_detection: ChangeDetectionConfig;
    coverage_floor: number;
    cross_compile: CrossCompileConfig;
    final_gate: boolean;
}

export interface ScanConfig {
    enabled: boolean;
    language: string;
}

export interface SecretScanConfig {
    enabled: boolean;
    tool: string;
}

export interface FlagConfig {
    enabled: boolean;
}

export interface GoldenPathConfig {
    version: number;
    language: string;
    go: GoConfig;
    security_scan: ScanConfig;
    secret_scan: SecretScanConfig;
    codespell: FlagConfig;
    actionlint: FlagConfig;
}
