// Bundle TypeScript actions into self-contained dist/index.cjs (CommonJS).
// Cross-repo consumers fetch the action but do NOT run `npm install`, so each
// action must ship a committed bundle that includes its dependencies and the
// shared @golden-path/core package.
//
// Usage: node scripts/build-actions.mjs [action-name...]
//   - no args: build every action in packages/actions
//   - args:    build only the named actions (e.g. node scripts/build-actions.mjs parse-config)

import { build } from 'esbuild';
import { readdirSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const ACTIONS_DIR = resolve(ROOT, '.github', 'actions');
const PACKAGES_ACTIONS_DIR = resolve(ROOT, 'packages', 'actions');
const CORE_ENTRY = resolve(ROOT, 'packages', 'core', 'src', 'index.ts');

/** @returns {string[]} action directories with a TypeScript entry */
function findActions() {
    return readdirSync(PACKAGES_ACTIONS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => existsSync(resolve(PACKAGES_ACTIONS_DIR, name, 'src', 'index.ts')));
}

/** @param {string} name */
async function buildAction(name) {
    const entry = resolve(PACKAGES_ACTIONS_DIR, name, 'src', 'index.ts');
    const outdir = resolve(ACTIONS_DIR, name, 'dist');
    // CommonJS is bundled (not ESM): @actions/core dynamically requires Node
    // builtins (e.g. tunnel -> require("net")), which ESM output cannot handle.
    // dist/index.cjs is unambiguous under the repo's "type": "module" root.
    rmSync(outdir, { recursive: true, force: true });
    await build({
        entryPoints: [entry],
        outfile: resolve(outdir, 'index.cjs'),
        bundle: true,
        platform: 'node',
        target: 'node20',
        format: 'cjs',
        logLevel: 'silent',
        alias: {
            // Bundle core source directly so the action is self-contained.
            '@golden-path/core': CORE_ENTRY,
        },
    });
    console.log(`bundled ${name} -> ${resolve(outdir, 'index.cjs').replace(`${ROOT}/`, '')}`);
}

const requested = process.argv.slice(2);
const names = requested.length > 0 ? requested : findActions();
if (names.length === 0) {
    console.log('no actions to bundle (expected packages/actions/<name>/src/index.ts)');
    process.exit(0);
}
await Promise.all(names.map(buildAction));
