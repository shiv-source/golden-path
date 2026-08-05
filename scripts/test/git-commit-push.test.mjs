import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { configureGit, commitAndPush } from '../git-commit-push.mjs';

const silent = { stdio: 'pipe' };

describe('git-commit-push', () => {
  describe('configureGit', () => {
    it('exports a function', () => {
      assert.equal(typeof configureGit, 'function');
    });
  });

  describe('commitAndPush', () => {
    it('skips when there are no new changes', () => {
      const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
      try {
        execSync('git init -b main', { cwd: dir, ...silent });
        execSync('git config user.email "test@test.com"', { cwd: dir, ...silent });
        execSync('git config user.name "Test"', { cwd: dir, ...silent });
        writeFileSync(join(dir, 'README.md'), '# test');
        execSync('git add -A', { cwd: dir, ...silent });
        execSync('git commit -m "init"', { cwd: dir, ...silent });

        const result = commitAndPush({
          branch: 'feature/test',
          cwd: dir,
          message: 'test commit',
        });

        assert.equal(result.skipped, true);
        assert.equal(result.pushed, false);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it('commits when there are new changes (push fails without remote)', () => {
      const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
      try {
        execSync('git init -b main', { cwd: dir, ...silent });
        execSync('git config user.email "test@test.com"', { cwd: dir, ...silent });
        execSync('git config user.name "Test"', { cwd: dir, ...silent });
        writeFileSync(join(dir, 'README.md'), '# test');
        execSync('git add -A', { cwd: dir, ...silent });
        execSync('git commit -m "init"', { cwd: dir, ...silent });

        writeFileSync(join(dir, 'new-file.txt'), 'content');

        const result = commitAndPush({
          branch: 'feature/test-2',
          cwd: dir,
          message: 'test commit',
        });

        assert.equal(result.skipped, false);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
