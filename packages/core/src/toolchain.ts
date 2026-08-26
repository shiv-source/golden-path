// Central catalog of tool versions. This is the single source of truth for
// every pinned tool the platform installs. Renovate bumps these values and a
// single PR propagates the new version to all consuming repositories.

export interface Toolchain {
    /** golangci-lint release tag (direct binary install) */
    golangciLint: string;
    /** Node.js LTS major */
    node: string;
    /** pnpm major */
    pnpm: string;
    /** codespell (PyPI) */
    codespell: string;
    /** actionlint release tag */
    actionlint: string;
    /** betterleaks release tag */
    betterleaks: string;
    /** Renovate version */
    renovate: string;
    /** GitGuardian ggshield (PyPI) */
    ggshield: string;
}

export const TOOLCHAIN: Toolchain = {
    golangciLint: 'v2.13.1',
    node: '22',
    pnpm: '6',
    codespell: '2.4.3',
    actionlint: 'v1.7.12',
    betterleaks: 'v1.8.1',
    renovate: '44.26.0',
    ggshield: '1.38.0',
};
