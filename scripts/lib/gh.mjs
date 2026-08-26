// Shared GitHub CLI helper. Wraps `gh` command execution with consistent error handling.
// Used by open-or-reuse-pr.mjs, compliance-check.mjs, and any script that calls GitHub APIs.

import { execSync } from 'node:child_process';

/**
 * Execute a GitHub CLI command and return trimmed stdout.
 * Returns empty string on any error — callers should check for empty results.
 * @param {string} cmd — gh command without the leading `gh` (e.g., "pr list --json url")
 * @param {import('node:child_process').ExecSyncOptions} [options]
 * @returns {string}
 */
export function ghSh(cmd, options) {
    try {
        return execSync(`gh ${cmd}`, { encoding: 'utf-8', stdio: 'pipe', ...options }).trim();
    } catch {
        return '';
    }
}
