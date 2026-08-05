import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { getChangedRepos } from '../get-changed-repos.mjs';

describe('get-changed-repos', () => {
  // Use the root commit as before — guaranteed to exist on any clone
  const rootCommit = execSync('git rev-list --max-parents=0 HEAD').toString().trim();

  it('returns an array', () => {
    const result = getChangedRepos(rootCommit, 'HEAD');
    assert.ok(Array.isArray(result));
  });

  it('returns array of strings', () => {
    const result = getChangedRepos(rootCommit, 'HEAD');
    for (const item of result) {
      assert.equal(typeof item, 'string');
    }
  });
});
