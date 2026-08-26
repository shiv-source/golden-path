import type { ExecRunner } from '@golden-path/core';
import { describe, expect, it } from 'vitest';
import { computeChangedFiles, type ChangedFilesInput } from '../action';

const ok =
    (stdout: string): ExecRunner =>
    () => ({ code: 0, stdout, stderr: '' });
const base: ChangedFilesInput = {
    baseSha: 'abc123',
    headSha: 'def456',
    patterns: ['**/*.go', 'go.mod', '.github/'],
};

describe('computeChangedFiles', () => {
    it('runs every gate when there is no PR sha context (push/manual)', () => {
        expect(computeChangedFiles({ ...base, baseSha: '', headSha: '' }, ok(''))).toBe(true);
    });

    it('matches a Go source change on a PR', () => {
        expect(computeChangedFiles(base, ok('internal/agent.go\ndocs/readme.md\n'))).toBe(true);
    });

    it('returns false when nothing matches', () => {
        expect(computeChangedFiles(base, ok('docs/readme.md\nLICENSE.md\n'))).toBe(false);
    });

    it('runs every gate when the diff command fails', () => {
        const exec: ExecRunner = () => ({ code: 128, stdout: '', stderr: 'fatal: bad revision' });
        expect(computeChangedFiles(base, exec)).toBe(true);
    });

    it('returns false for an empty pattern list on a PR', () => {
        expect(computeChangedFiles({ ...base, patterns: [] }, ok('agent.go\n'))).toBe(false);
    });
});
