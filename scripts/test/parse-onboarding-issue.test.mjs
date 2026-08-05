import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseOnboardingIssue } from '../parse-onboarding-issue.mjs';

describe('parse-onboarding-issue', () => {
  it('parses a complete issue body', () => {
    const body = [
      '### Repository Name',
      'my-cool-service',
      '',
      '### Repository Type',
      'service',
      '',
      '### Programming Language',
      'node',
      '',
      '### Optional Features',
      '- [X] CodeQL',
      '- [X] Gitleaks',
      '- [ ] Dependabot',
      '- [X] Release automation',
    ].join('\n');

    const result = parseOnboardingIssue(body);
    assert.equal(result.repoName, 'my-cool-service');
    assert.equal(result.type, 'service');
    assert.equal(result.language, 'node');
    assert.deepEqual(result.options, ['codeql', 'gitleaks', 'release automation']);
  });

  it('handles empty body', () => {
    assert.throws(() => parseOnboardingIssue(''), /Issue body is required/);
  });

  it('handles null body', () => {
    assert.throws(() => parseOnboardingIssue(null), /Issue body is required/);
  });

  it('normalizes language field', () => {
    const body = ['### Programming Language', 'Node.js', '', '### Repository Type', 'Service'].join(
      '\n',
    );

    const result = parseOnboardingIssue(body);
    assert.equal(result.language, 'node');
    assert.equal(result.type, 'service');
  });

  it('returns empty arrays for missing sections', () => {
    const body = '### Random Heading\nsome content\n';
    const result = parseOnboardingIssue(body);
    assert.equal(result.repoName, '');
    assert.equal(result.type, '');
    assert.equal(result.language, '');
    assert.deepEqual(result.options, []);
  });
});
