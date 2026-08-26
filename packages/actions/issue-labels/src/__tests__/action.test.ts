import { describe, expect, it } from 'vitest';
import { computeLabels, loadConfig, missingLabels, normalizeLabel, parseFields, sectionValues } from '../action';
import type { LabelConfig } from '../action';

const config: LabelConfig = {
    types: ['bug', 'feature', 'enhancement', 'documentation', 'chore', 'refactor', 'test', 'performance', 'ci'],
    priorities: ['p-critical', 'p-high', 'p-medium', 'p-low'],
    areas: [
        'api',
        'chat',
        'cli',
        'github',
        'index',
        'search',
        'settings',
        'store',
        'sync',
        'ui',
        'webui',
        'wiki',
        'tooling',
    ],
    fields: { 'Change type': 'type', Priority: 'priority', 'Area(s)': 'areas' },
    bugSignals: ['Summary', 'Steps to reproduce'],
    bugLabel: 'bug',
};

const bugBody = `### Environment

v1.2.3, darwin, make dev

### Summary

The X panel shows Y instead of Z when the index rebuilds

### Steps to reproduce

1. Run \`thoth serve --dev\`
2. Search for "logo"
3. Click the result

\`\`\`bash
# not a field heading, but could look like one:
### this is inside a code fence
\`\`\`

### Expected behavior

It should render inline.

### Actual behavior

It stays a link.

### Evidence

internal/index/sync.go:66

### Priority

- p-high

### Area(s)

- [x] api — internal/api (REST + WS)
- [x] index — internal/index (FTS5, watcher)

### Label check

- [x] Applied the type (bug is pre-applied), priority, and area label(s) per the repo rulebook.

### Notes / context

none
`;

const featureBody = `### Change type

- enhancement — improvement to an existing capability

### Problem / motivation

We cannot filter the dashboard by date.

### Use cases

As a user, I want to see last week's notes.

### Proposed behavior

A date range filter on the dashboard.

### Acceptance criteria

- [ ] Given a date range, only notes in range render
- [ ] Tests added in web/src/pages/dashboard/DashboardPage.test.tsx

### Priority

- p-medium

### Area(s)

- [x] webui — internal/webui embed
- [x] search — search UI/behavior

### Label check

- [x] Applied the type, priority, and area label(s).
`;

describe('loadConfig', () => {
    it('parses a JSON label config', () => {
        const loaded = loadConfig('config.json', () => JSON.stringify(config));
        expect(loaded).toEqual(config);
    });
});

describe('computeLabels', () => {
    it('bug template body maps to bug type, priority, and areas', () => {
        const labels = computeLabels(bugBody, config);
        expect(labels.sort()).toEqual(['api', 'bug', 'index', 'p-high']);
    });

    it('feature template body maps to its change type, priority, and areas', () => {
        const labels = computeLabels(featureBody, config);
        expect(labels.sort()).toEqual(['enhancement', 'p-medium', 'search', 'webui']);
    });

    it('blank (non-template) body yields no labels', () => {
        expect(computeLabels('', config)).toEqual([]);
        expect(computeLabels('just some markdown, no form sections\n- [x] foo\n', config)).toEqual([]);
    });

    it('values outside the whitelist are dropped, never applied', () => {
        const body = bugBody
            .replace('- p-high', '- p-emergency')
            .replace('- [x] api — internal/api (REST + WS)', '- [x] core — not a real area');
        expect(computeLabels(body, config).sort()).toEqual(['bug', 'index']);
    });

    it('an existing type label suppresses the bug fallback', () => {
        expect(computeLabels(featureBody, config)).not.toContain('bug');
    });

    it('type stays exactly one label even if a body lists several', () => {
        const body = featureBody.replace(
            '- enhancement — improvement to an existing capability',
            '- feature — new capability\n- enhancement — improvement to an existing capability',
        );
        expect(computeLabels(body, config).sort()).toEqual(['feature', 'p-medium', 'search', 'webui']);
    });

    it('a malformed config (unknown kind, non-array set) is skipped, not crashed on', () => {
        const broken: LabelConfig = {
            ...config,
            fields: { ...config.fields, 'Change type': 'bogus' as LabelConfig['fields'][string] },
        };
        expect(computeLabels(featureBody, broken).sort()).toEqual(['p-medium', 'search', 'webui']);
    });
});

describe('parseFields', () => {
    it('a ### line inside a code fence is not treated as a field heading', () => {
        const fields = parseFields(bugBody);
        expect(Object.keys(fields).sort()).toEqual([
            'Actual behavior',
            'Area(s)',
            'Environment',
            'Evidence',
            'Expected behavior',
            'Label check',
            'Notes / context',
            'Priority',
            'Steps to reproduce',
            'Summary',
        ]);
        const steps = fields['Steps to reproduce'];
        expect(steps).toContain('### this is inside a code fence');
    });
});

describe('sectionValues', () => {
    it('single-select answers come through as list items', () => {
        expect(sectionValues(['- p-critical', '- [x] api', 'plain text is ignored'])).toEqual(['p-critical', 'api']);
    });
});

describe('normalizeLabel', () => {
    it('normalization strips descriptions, case, and whitespace', () => {
        expect(normalizeLabel('  API — internal/api (REST + WS) ', config.areas)).toBe('api');
        expect(normalizeLabel('P-High', config.priorities)).toBe('p-high');
        expect(normalizeLabel('feature - new capability', config.types)).toBe('feature');
        expect(normalizeLabel('p-high', config.priorities)).toBe('p-high');
    });
});

describe('missingLabels', () => {
    it('is case-insensitive and never re-lists present or user labels', () => {
        expect(missingLabels(['bug', 'p-high', 'api'], ['Bug', 'ui', 'p-high'])).toEqual(['api']);
        expect(missingLabels(['bug', 'p-high'], ['bug', 'p-high', 'help wanted'])).toEqual([]);
    });
});
