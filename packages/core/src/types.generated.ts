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
    codespell?: CodespellConfig;
    actionlint?: FlagConfig;
}
export interface GoTarget {
    name?: string;
    go_version?: string;
    go_version_file?: string;
    working_directory?: string;
    setup_command?: string;
    test_args?: string;
    change_detection?: ChangeDetection;
    coverage_floor?: number;
    cross_compile?: CrossCompile;
    lint?: LintConfig;
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
    name?: string;
    node_version?: string;
    package_manager?: 'auto' | 'npm' | 'pnpm' | 'yarn';
    working_directory?: string;
    shard_count?: number;
    lint_command?: string;
    typecheck_command?: string;
    test_command?: string;
    build_command?: string;
    change_detection?: NodeChangeDetection;
    coverage_command?: string;
    coverage_floor?: number;
    coverage_summary_path?: string;
}
export interface NodeChangeDetection {
    enabled?: boolean;
    paths?: string[];
}
export interface ScanConfig {
    enabled?: boolean;
    setup_command?: string;
    /**
     * CodeQL language (empty = auto-detect the repo's languages)
     */
    language?: '' | 'go' | 'node' | 'python' | 'java';
}
export interface SecretScanConfig {
    enabled?: boolean;
    tool?: 'betterleaks' | 'ggshield';
}
export interface CodespellConfig {
    enabled?: boolean;
    /**
     * Comma-separated glob patterns of paths for codespell to skip (vendor dirs, lockfiles, generated bundles)
     */
    skip?: string;
    /**
     * Path to a codespell ignore-words file (one word per line) for intentional/technical terms
     */
    ignore_words_file?: string;
    /**
     * Extra arguments passed to codespell
     */
    args?: string;
}
export interface FlagConfig {
    enabled?: boolean;
}
