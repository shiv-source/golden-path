import type * as Generated from './types.generated';

// The schema's generated types describe the *raw* config (every key optional).
// The normalized config is always fully populated (deepMerge fills defaults),
// so these Strict* aliases derive required, deeply-nested shapes from the
// schema types — keeping the schema as the single source of truth.

export type RequiredDeep<T> = T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]-?: RequiredDeep<T[K]> }
      : T;

export type GoldenPathConfig = RequiredDeep<Generated.GoldenPathConfig>;
export type GoTarget = RequiredDeep<Generated.GoTarget>;
export type NodeTarget = RequiredDeep<Generated.NodeTarget>;
export type LintConfig = RequiredDeep<Generated.LintConfig>;
export type ChangeDetectionConfig = RequiredDeep<Generated.ChangeDetection>;
export type CrossCompileConfig = RequiredDeep<Generated.CrossCompile>;
export type ScanConfig = RequiredDeep<Generated.ScanConfig>;
export type SecretScanConfig = RequiredDeep<Generated.SecretScanConfig>;
export type CodespellConfig = RequiredDeep<Generated.CodespellConfig>;
export type FlagConfig = RequiredDeep<Generated.FlagConfig>;

/** Raw, un-normalized config as accepted by the JSON Schema (keys optional). */
export type ConfigInput = Generated.GoldenPathConfig;
