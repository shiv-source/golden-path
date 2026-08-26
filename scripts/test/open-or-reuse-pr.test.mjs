import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openOrReusePR } from '../open-or-reuse-pr.mjs';

describe('open-or-reuse-pr', () => {
    it('exports a function', () => {
        assert.equal(typeof openOrReusePR, 'function');
    });

    it('returns url and reused properties on failure (no gh token)', async () => {
        // Without a GitHub token in the environment, ghSh returns empty strings.
        // openOrReusePR should handle this gracefully and return a result.
        const result = await openOrReusePR({
            repo: 'test-org/test-repo',
            baseBranch: 'main',
            headBranch: 'feature/test',
            title: 'Test PR',
            body: 'Test body',
        });

        assert.equal(typeof result.url, 'string');
        assert.equal(typeof result.reused, 'boolean');
    });
});
