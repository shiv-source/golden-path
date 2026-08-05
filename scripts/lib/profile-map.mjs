// Profile mapping — maps language + type to profile list.
// Keep in sync with platform-observability's packages/shared/src/profile-map.ts.

const PROFILE_MAP = {
  node: {
    library: ['common', 'node-library'],
    service: ['common', 'node-service'],
    frontend: ['common', 'node-library'],
    cli: ['common', 'node-library'],
    docs: ['common'],
  },
  go: {
    service: ['common', 'go-service'],
  },
  python: {
    service: ['common', 'python-service'],
  },
  java: {
    service: ['common', 'java-service'],
  },
};

/**
 * @param {string} language
 * @param {string} type
 * @returns {string[]}
 */
export function resolveProfilesFor(language, type) {
  const profiles = PROFILE_MAP[language]?.[type];
  if (!profiles) {
    throw new Error(`No profile mapping for language="${language}" type="${type}"`);
  }
  return profiles;
}

/**
 * @returns {string[]}
 */
export function getSupportedLanguages() {
  return Object.keys(PROFILE_MAP);
}

/**
 * @param {string} language
 * @returns {string[]}
 */
export function getSupportedTypes(language) {
  return Object.keys(PROFILE_MAP[language] ?? {});
}
