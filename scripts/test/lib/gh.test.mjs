import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ghSh } from '../../lib/gh.mjs';

describe('gh', () => {
  it('returns empty string for invalid command', () => {
    const result = ghSh('nonexistent-gh-command-xyz');
    assert.equal(result, '');
  });

  it('returns a string type', () => {
    const result = ghSh('--version');
    assert.equal(typeof result, 'string');
  });
});
