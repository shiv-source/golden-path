// Shared filesystem helpers. Used by scripts that write to disk.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Write content to a file, creating parent directories as needed.
 * @param {string} filePath - absolute path to the file
 * @param {string} content - file content
 */
export function writeFile(filePath, content) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
}
