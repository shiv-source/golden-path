import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateRepoConfig } from '../generate-repo-config.mjs';

describe('generate-repo-config', () => {
  it('generates config for node service with options', () => {
    const result = generateRepoConfig({
      repoName: 'my-api',
      type: 'service',
      language: 'node',
      options: ['codeql', 'gitleaks', 'dependabot', 'release-automation'],
    });

    assert.ok(result.includes('repository: my-api'));
    assert.ok(result.includes('common'));
    assert.ok(result.includes('node-service'));
    assert.ok(result.includes('codeql: true'));
    assert.ok(result.includes('gitleaks: true'));
    assert.ok(result.includes('dependabot: true'));
    assert.ok(result.includes('releaseAutomation: true'));
  });

  it('generates config with false options when none selected', () => {
    const result = generateRepoConfig({
      repoName: 'my-lib',
      type: 'library',
      language: 'node',
      options: [],
    });

    assert.ok(result.includes('repository: my-lib'));
    assert.ok(result.includes('common'));
    assert.ok(result.includes('node-library'));
    assert.ok(result.includes('codeql: false'));
    assert.ok(result.includes('gitleaks: false'));
  });

  it('throws on missing repoName', () => {
    assert.throws(
      () => generateRepoConfig({ repoName: '', type: 'service', language: 'node', options: [] }),
      /repoName/,
    );
  });

  it('throws on missing type', () => {
    assert.throws(
      () => generateRepoConfig({ repoName: 'x', type: '', language: 'node', options: [] }),
      /type/,
    );
  });

  it('throws on unknown language/type combo', () => {
    assert.throws(
      () => generateRepoConfig({ repoName: 'x', type: 'service', language: 'rust', options: [] }),
      /No profile mapping/,
    );
  });
});
