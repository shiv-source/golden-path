import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { complianceCheck } from '../compliance-check.mjs';

describe('compliance-check', () => {
    it('passes when all required files exist', async () => {
        // Use this script's own directory as workspace — files exist
        const { fileURLToPath } = await import('node:url');
        const { dirname } = await import('node:path');
        const workspace = dirname(fileURLToPath(import.meta.url));

        const result = await complianceCheck({
            workspace,
            requiredFiles: ['compliance-check.test.mjs'],
            checkBranchProtection: false,
        });

        assert.equal(result.passed, true);
        assert.deepEqual(result.missingFiles, []);
    });

    it('fails when a required file is missing', async () => {
        const { fileURLToPath } = await import('node:url');
        const { dirname } = await import('node:path');
        const workspace = dirname(fileURLToPath(import.meta.url));

        const result = await complianceCheck({
            workspace,
            requiredFiles: ['nonexistent-file.xyz'],
            checkBranchProtection: false,
        });

        assert.equal(result.passed, false);
        assert.deepEqual(result.missingFiles, ['nonexistent-file.xyz']);
    });

    it('reports error messages for failures', async () => {
        const { fileURLToPath } = await import('node:url');
        const { dirname } = await import('node:path');
        const workspace = dirname(fileURLToPath(import.meta.url));

        const result = await complianceCheck({
            workspace,
            requiredFiles: ['missing.txt', 'also-missing.txt'],
            checkBranchProtection: false,
        });

        assert.equal(result.errors.length, 2);
        assert.ok(result.errors[0].includes('missing.txt'));
        assert.ok(result.errors[1].includes('also-missing.txt'));
    });
});
