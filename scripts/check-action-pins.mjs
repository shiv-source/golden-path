// Governance check for golden-path's own .github: every third-party action
// reference must be pinned to an immutable 40-character commit SHA (never
// @main / @vX / @latest) AND match the canonical SHA in the catalog below.
// Bumping an action version is one line here (plus a grep), and CI fails on
// any drift. Self-references (shiv-source/golden-path, ./, $/) are allowed.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// Single source of truth for every third-party action version used by
// golden-path's workflows/actions. Key = action id as it appears in `uses:`.
export const CANONICAL_REFS = Object.freeze({
    'actions/checkout': '3d3c42e5aac5ba805825da76410c181273ba90b1', // v7.0.1
    'actions/setup-go': 'b7ad1dad31e06c5925ef5d2fc7ad053ef454303e', // v7.0.0
    'actions/setup-node': '820762786026740c76f36085b0efc47a31fe5020', // v7.0.0
    'actions/setup-python': '5fda3b95a4ea91299a34e894583c3862153e4b97', // v7.0.0
    'actions/cache': '55cc8345863c7cc4c66a329aec7e433d2d1c52a9', // v6.1.0
    'actions/stale': '4391f3da665fdf50b6810c1a66712fb9ba21aa93', // v11.0.0
    'actions/github-script': 'f28e40c7f34bde8b3046d885e986cb6290c5673b', // v7
    'pnpm/action-setup': '0977fd99725f1db4007ccb2928dbb4e90d06cc86', // v6.0.10
    'googleapis/release-please-action': '45996ed1f6d02564a971a2fa1b5860e934307cf7', // v5.0.0
    'gitleaks/gitleaks-action': 'e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e', // v3.0.0
    'github/codeql-action/init': '486fec2a3ea2626afcd8c7e9208b4f515078dd7e', // codeql-bundle-v2.26.4
    'github/codeql-action/analyze': '486fec2a3ea2626afcd8c7e9208b4f515078dd7e', // codeql-bundle-v2.26.4
    'docker/login-action': 'dbcb813823bdd20940b903addbd779551569679f', // v4.6.0
    'docker/build-push-action': '53b7df96c91f9c12dcc8a07bcb9ccacbed38856a', // v7.3.0
    'docker/metadata-action': 'dc802804100637a589fabce1cb79ff13a1411302', // v6.2.0
    'dependabot/fetch-metadata': '25dd0e34f4fe68f24cc83900b1fe3fe149efef98', // v3.1.0
    'aws-actions/configure-aws-credentials': 'e6de054238d6b7531b4efff3b6587d9aade6a06c', // v6.2.3
    'renovatebot/github-action': '5402b206248e5a8c8427a15102702eb9c1793efc', // v46.2.4
});

// owner/name[/subpath]@ref — captures third-party + self refs
const USES = /^\s*(?:-\s*)?uses:\s+(?<action>[\w.-]+\/[\w.-]+(?:\/[\w.-]+)?)@(?<ref>[A-Za-z0-9_.\-+]+)/;

const SHA = /^[0-9a-f]{40}$/;

function isSelfRef(action) {
    return action.startsWith('shiv-source/golden-path') || action.startsWith('./') || action.startsWith('$/');
}

function collectFiles() {
    const files = [];
    const wfDir = join(REPO_ROOT, '.github', 'workflows');
    const actionsDir = join(REPO_ROOT, '.github', 'actions');
    for (const f of readdirSync(wfDir).filter((f) => f.endsWith('.yaml'))) files.push(join(wfDir, f));
    if (existsSync(actionsDir)) {
        for (const d of readdirSync(actionsDir)) {
            const f = join(actionsDir, d, 'action.yaml');
            if (existsSync(f)) files.push(f);
        }
    }
    return files;
}

export function checkActionPins(files = collectFiles()) {
    const violations = [];
    let checked = 0;
    for (const file of files) {
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
            const m = USES.exec(line);
            if (!m) return;
            const { action, ref } = m.groups;
            if (isSelfRef(action)) return;
            checked += 1;
            const expected = CANONICAL_REFS[action];
            if (!expected) {
                violations.push(
                    `${file}:${i + 1}: third-party action ${action} is not in the canonical catalog (add it to CANONICAL_REFS)`,
                );
            } else if (!SHA.test(ref)) {
                violations.push(
                    `${file}:${i + 1}: third-party action ${action} is not pinned to a commit SHA (found ${ref})`,
                );
            } else if (ref !== expected) {
                violations.push(
                    `${file}:${i + 1}: third-party action ${action} is pinned to ${ref}, but the canonical version is ${expected}`,
                );
            }
        });
    }
    return { violations, checked };
}

export function main() {
    const { violations, checked } = checkActionPins();
    if (violations.length > 0) {
        console.error(`[check-action-pins] ${violations.length} unpinned action reference(s):`);
        for (const v of violations) console.error(`  - ${v}`);
        process.exitCode = 1;
    } else {
        console.log(`[check-action-pins] OK: ${checked} third-party action reference(s) pinned to commit SHAs`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
