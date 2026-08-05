import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readProfiles } from '../read-profiles.mjs';
import { getChangedRepos } from '../get-changed-repos.mjs';
import { mergeProfiles } from '../merge-profiles.mjs';

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const profilesDir = resolve(workspace, 'profiles');

describe('read-profiles', () => {
  it('reads profiles from the filesystem', () => {
    const profiles = readProfiles({ profilesDir, names: ['common'] });
    assert.ok(profiles.length >= 1);
    const common = profiles.find((p) => p.name === 'common');
    assert.ok(common);
    assert.ok(common.files.length > 0);
    // Should contain .editorconfig
    assert.ok(common.files.some((f) => f.path === '.editorconfig'));
  });

  it('skips missing profile directories gracefully', () => {
    const profiles = readProfiles({ profilesDir, names: ['nonexistent'] });
    assert.deepEqual(profiles, []);
  });
});

describe('get-changed-repos', () => {
  it('returns an array', () => {
    const result = getChangedRepos();
    assert.ok(Array.isArray(result));
  });
});

describe('profile integration', () => {
  it('readProfiles + mergeProfiles produces valid merged file tree', () => {
    const profiles = readProfiles({ profilesDir, names: ['common', 'node-library'] });
    assert.ok(profiles.length === 2);

    const { files, conflicts } = mergeProfiles(profiles);
    assert.ok(files.length > 0);
    // node-library profile files should be present
    assert.ok(files.some((f) => f.path === '.prettierrc'));
    // common profile files should be present
    assert.ok(files.some((f) => f.path === 'CODEOWNERS'));
  });
});
