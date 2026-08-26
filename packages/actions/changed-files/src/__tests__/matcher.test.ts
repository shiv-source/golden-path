import { describe, expect, it } from 'vitest';
import { makeMatcher, matchesAny } from '../matcher';

describe('makeMatcher', () => {
    it('matches globstar and wildcard patterns (dotfiles enabled)', () => {
        const isMatch = makeMatcher(['**/*.go', 'go.mod', '.github/']);
        expect(isMatch('agent.go')).toBe(true);
        expect(isMatch('internal/agent.go')).toBe(true);
        expect(isMatch('agent.txt')).toBe(false);
        expect(isMatch('.github/workflows/ci.yml')).toBe(true);
        expect(isMatch('.gitignore')).toBe(false);
    });

    it('matches dotfiles with an explicit dot pattern', () => {
        const isMatch = makeMatcher(['.golangci.yml']);
        expect(isMatch('.golangci.yml')).toBe(true);
    });

    it('normalizes a trailing-slash directory pattern', () => {
        const isMatch = makeMatcher(['.github/']);
        expect(isMatch('.github/workflows/ci.yml')).toBe(true);
        expect(isMatch('src/index.ts')).toBe(false);
    });
});

describe('matchesAny', () => {
    const patterns = ['**/*.go', 'go.mod', 'go.sum', '.golangci.yml', '.github/'];

    it('matches a Go source change', () => {
        expect(matchesAny(patterns, ['internal/agent.go'])).toBe(true);
    });

    it('matches a go.mod change', () => {
        expect(matchesAny(patterns, ['go.mod'])).toBe(true);
    });

    it('matches a workflow change', () => {
        expect(matchesAny(patterns, ['.github/workflows/ci.yml'])).toBe(true);
    });

    it('does not match unrelated files', () => {
        expect(matchesAny(patterns, ['docs/README.md', 'LICENSE.md'])).toBe(false);
    });

    it('returns false for an empty pattern list', () => {
        expect(matchesAny([], ['agent.go'])).toBe(false);
    });
});
