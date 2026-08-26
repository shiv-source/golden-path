import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeProfiles } from '../merge-profiles.mjs';

describe('merge-profiles', () => {
    const commonProfile = {
        name: 'common',
        files: [
            { path: '.editorconfig', content: 'root = true' },
            { path: 'CODEOWNERS', content: '* @team' },
        ],
    };

    const nodeLibraryProfile = {
        name: 'node-library',
        files: [
            { path: '.prettierrc', content: '{ "semi": true }' },
            { path: '.editorconfig', content: 'root = true\n[*]\nindent_size = 2' },
        ],
    };

    it('merges two profiles with conflict detection', () => {
        const { files, conflicts } = mergeProfiles([commonProfile, nodeLibraryProfile]);

        assert.equal(files.length, 3);
        assert.ok(files.find((f) => f.path === '.editorconfig'));
        assert.ok(files.find((f) => f.path === 'CODEOWNERS'));
        assert.ok(files.find((f) => f.path === '.prettierrc'));

        // .editorconfig differs between profiles → conflict
        assert.equal(conflicts.length, 1);
        assert.equal(conflicts[0].path, '.editorconfig');
        assert.ok(conflicts[0].message.includes('CONFLICT'));
    });

    it('is idempotent — same input produces same output', () => {
        const result1 = mergeProfiles([commonProfile, nodeLibraryProfile]);
        const result2 = mergeProfiles([commonProfile, nodeLibraryProfile]);

        assert.deepEqual(result1, result2);
    });

    it('no conflict when files have same content', () => {
        const profileA = {
            name: 'a',
            files: [{ path: 'shared.txt', content: 'same' }],
        };
        const profileB = {
            name: 'b',
            files: [{ path: 'shared.txt', content: 'same' }],
        };

        const { files, conflicts } = mergeProfiles([profileA, profileB]);
        assert.equal(files.length, 1);
        assert.equal(conflicts.length, 0);
    });

    it('later profile wins on conflict', () => {
        const profileA = { name: 'a', files: [{ path: 'file.txt', content: 'version A' }] };
        const profileB = { name: 'b', files: [{ path: 'file.txt', content: 'version B' }] };

        const { files } = mergeProfiles([profileA, profileB]);
        assert.equal(files[0].content, 'version B');
        assert.equal(files[0].source, 'b');
    });

    it('handles empty profile list', () => {
        const { files, conflicts } = mergeProfiles([]);
        assert.deepEqual(files, []);
        assert.deepEqual(conflicts, []);
    });
});
