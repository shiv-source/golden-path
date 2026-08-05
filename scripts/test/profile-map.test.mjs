import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveProfilesFor,
  getSupportedLanguages,
  getSupportedTypes,
} from '../lib/profile-map.mjs';

describe('profile-map', () => {
  describe('resolveProfilesFor', () => {
    it('returns common + node-library for node/library', () => {
      assert.deepEqual(resolveProfilesFor('node', 'library'), ['common', 'node-library']);
    });

    it('returns common + node-service for node/service', () => {
      assert.deepEqual(resolveProfilesFor('node', 'service'), ['common', 'node-service']);
    });

    it('returns common + go-service for go/service', () => {
      assert.deepEqual(resolveProfilesFor('go', 'service'), ['common', 'go-service']);
    });

    it('returns common only for node/docs', () => {
      assert.deepEqual(resolveProfilesFor('node', 'docs'), ['common']);
    });

    it('returns common + node-library for node/frontend', () => {
      assert.deepEqual(resolveProfilesFor('node', 'frontend'), ['common', 'node-library']);
    });

    it('returns common + node-library for node/cli', () => {
      assert.deepEqual(resolveProfilesFor('node', 'cli'), ['common', 'node-library']);
    });

    it('throws for unknown language', () => {
      assert.throws(() => resolveProfilesFor('rust', 'service'), /No profile mapping/);
    });

    it('throws for unknown type', () => {
      assert.throws(() => resolveProfilesFor('node', 'mobile'), /No profile mapping/);
    });
  });

  describe('getSupportedLanguages', () => {
    it('returns array including node and go', () => {
      const languages = getSupportedLanguages();
      assert.ok(languages.includes('node'));
      assert.ok(languages.includes('go'));
      assert.ok(languages.includes('python'));
      assert.ok(languages.includes('java'));
    });
  });

  describe('getSupportedTypes', () => {
    it('returns node types', () => {
      const types = getSupportedTypes('node');
      assert.deepEqual(types.sort(), ['library', 'service', 'frontend', 'cli', 'docs'].sort());
    });

    it('returns empty array for unknown language', () => {
      assert.deepEqual(getSupportedTypes('rust'), []);
    });
  });
});
