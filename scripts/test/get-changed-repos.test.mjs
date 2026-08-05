import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getChangedRepos } from '../get-changed-repos.mjs';

describe('get-changed-repos', () => {
  it('returns an array', () => {
    const result = getChangedRepos();
    assert.ok(Array.isArray(result));
  });

  it('returns array of strings', () => {
    const result = getChangedRepos();
    for (const item of result) {
      assert.equal(typeof item, 'string');
    }
  });
});
