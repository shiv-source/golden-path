import { describe, expect, it } from 'vitest';
import { computeAssignees, intersectAssignable } from '../action';

describe('computeAssignees', () => {
    it('puts the author first, then unique commit authors', () => {
        const assignees = computeAssignees({
            author: 'ada',
            commitAuthors: ['grace', 'ada', 'alan'],
            exclude: [],
        });
        expect(assignees).toEqual(['ada', 'grace', 'alan']);
    });

    it('dedupes case-insensitively and keeps the first occurrence', () => {
        const assignees = computeAssignees({
            author: 'Ada',
            commitAuthors: ['ada', 'GRACE', 'grace'],
            exclude: [],
        });
        expect(assignees).toEqual(['Ada', 'GRACE']);
    });

    it('drops excluded users (bots) case-insensitively', () => {
        const assignees = computeAssignees({
            author: 'dependabot[bot]',
            commitAuthors: ['ada', 'Renovate[bot]'],
            exclude: ['dependabot[bot]', 'renovate[bot]'],
        });
        expect(assignees).toEqual(['ada']);
    });

    it('ignores empty and whitespace-only logins', () => {
        const assignees = computeAssignees({
            author: '  ',
            commitAuthors: ['', 'ada', null as unknown as string],
            exclude: [],
        });
        expect(assignees).toEqual(['ada']);
    });

    it('returns an empty set when everyone is excluded', () => {
        const assignees = computeAssignees({
            author: 'ada',
            commitAuthors: ['grace'],
            exclude: ['ada', 'grace'],
        });
        expect(assignees).toEqual([]);
    });
});

describe('intersectAssignable', () => {
    it('keeps only assignees present in the assignable list, case-insensitively', () => {
        expect(intersectAssignable(['Ada', 'grace', 'outsider'], ['ada', 'GRACE', 'linus'])).toEqual(['Ada', 'grace']);
    });

    it('returns [] when none are assignable or the list is empty', () => {
        expect(intersectAssignable(['ada'], ['outsider'])).toEqual([]);
        expect(intersectAssignable([], ['ada'])).toEqual([]);
        expect(intersectAssignable(['ada'], [])).toEqual([]);
    });
});
