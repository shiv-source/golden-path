// Read profile file templates from the filesystem into structured objects.
// Walks each named profile directory, reads all files, and returns
// objects suitable for mergeProfiles().

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * @param {object} opts
 * @param {string} opts.profilesDir - path to the profiles/ directory
 * @param {string[]} opts.names - list of profile names to read
 * @returns {Array<{ name: string, files: Array<{ path: string, content: string }> }>}
 */
export function readProfiles({ profilesDir, names }) {
    /** @type {Array<{ name: string, files: Array<{ path: string, content: string }> }>} */
    const profiles = [];

    for (const name of names) {
        const profilePath = join(profilesDir, name);
        if (!existsSync(profilePath)) {
            console.warn(`Profile directory not found: ${profilePath}`);
            continue;
        }

        const files = [];
        walkDir(profilePath, profilePath, files);
        profiles.push({ name, files });
    }

    return profiles;
}

/**
 * Recursively walk a directory, collecting file paths and contents.
 * @param {string} dir - current directory
 * @param {string} base - base path for relative paths
 * @param {Array<{ path: string, content: string }>} files - accumulator
 */
function walkDir(dir, base, files) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath, base, files);
        } else {
            files.push({
                path: relative(base, fullPath),
                content: readFileSync(fullPath, 'utf-8'),
            });
        }
    }
}
