import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { validateConfig } from '../config';

const examplesDir = resolve(import.meta.dirname, '../../../../examples');

function exampleDirs(): string[] {
    return readdirSync(examplesDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
}

describe('example configs', () => {
    it('every example golden-path.yaml is valid against the schema', () => {
        const bad: string[] = [];
        for (const dir of exampleDirs()) {
            const configPath = resolve(examplesDir, dir, '.github', 'golden-path.yaml');
            try {
                const raw = readFileSync(configPath, 'utf8');
                const { errors } = validateConfig(parse(raw));
                if (errors.length > 0) bad.push(`${dir}: ${errors.join('; ')}`);
            } catch {
                bad.push(`${dir}: config file missing or unreadable`);
            }
        }
        expect(bad).toEqual([]);
    });

    it('each example has a README.md', () => {
        const missing = exampleDirs().filter((d) => {
            try {
                readFileSync(resolve(examplesDir, d, 'README.md'), 'utf8');
                return false;
            } catch {
                return true;
            }
        });
        expect(missing).toEqual([]);
    });
});
