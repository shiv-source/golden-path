// DO NOT EDIT. Generated from schemas/golden-path.schema.json by scripts/gen-types.mjs.
// Run `pnpm gen:types` after changing the schema.

/**
 * Configuration contract for the golden-path developer platform (v2). Language gates are opt-in target lists; unknown keys are rejected so typos fail loudly instead of being silently ignored.
 */
export interface GoldenPathConfig {
    version?: 2;
    /**
     * Go targets to build/test. Presence in the list enables the Go gate.
     */
    go?: GoTarget[];
    /**
     * Node.js targets to build/test. Presence in the list enables the Node gate.
     */
    node?: NodeTarget[];
    security_scan?: ScanConfig;
    secret_scan?: SecretScanConfig;
    codespell?: FlagConfig;
    actionlint?: FlagConfig;
}
export interface GoTarget {
    go_version?: string;
    go_version_file?: string;
    working_directory?: string;
    change_detection?: ChangeDetection;
    coverage_floor?: number;
    cross_compile?: CrossCompile;
    lint?: LintConfig;
    final_gate?: boolean;
}
export interface ChangeDetection {
    enabled?: boolean;
    paths?: string[];
}
export interface CrossCompile {
    enabled?: boolean;
    goos?: string[];
    goarch?: string[];
}
export interface LintConfig {
    golangci_lint_version?: string;
    config?: string;
    timeout?: string;
    args?: string;
}
export interface NodeTarget {
    node_version?: string;
    package_manager?: 'auto' | 'npm' | 'pnpm' | 'yarn';
    working_directory?: string;
    shard_count?: number;
    lint_command?: string;
    typecheck_command?: string;
    test_command?: string;
    build_command?: string;
    final_gate?: boolean;
}
export interface ScanConfig {
    enabled?: boolean;
    language?: 'go' | 'node' | 'python' | 'java';
}
export interface SecretScanConfig {
    enabled?: boolean;
    tool?: 'betterleaks' | 'ggshield';
}
export interface FlagConfig {
    enabled?: boolean;
}
