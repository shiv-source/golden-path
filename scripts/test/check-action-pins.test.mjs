import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkActionPins } from '../check-action-pins.mjs';

async function writeFixture(content) {
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'pin-'));
    const file = join(dir, 'w.yaml');
    writeFileSync(file, content);
    return file;
}

describe('check-action-pins', () => {
    it('accepts commit-SHA-pinned third-party actions', async () => {
        const file = await writeFixture('- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1\n');
        const { violations, checked } = checkActionPins([file]);
        assert.equal(violations.length, 0);
        assert.equal(checked, 1);
    });

    it('rejects non-SHA third-party refs and flags the location, allows self refs', async () => {
        const file = await writeFixture(
            [
                '- uses: actions/checkout@v4',
                '- uses: actions/setup-go@v7',
                '- uses: shiv-source/golden-path/.github/actions/x@main',
                '',
            ].join('\n'),
        );
        const { violations, checked } = checkActionPins([file]);
        assert.equal(violations.length, 2);
        assert.match(violations[0], /actions\/checkout/);
        assert.match(violations[0], /:1:/);
        assert.match(violations[1], /actions\/setup-go/);
        assert.equal(checked, 2);
    });

    it('rejects a SHA that does not match the canonical catalog', async () => {
        const file = await writeFixture(
            '- uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9\n- uses: actions/cache@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n',
        );
        const { violations } = checkActionPins([file]);
        assert.equal(violations.length, 1);
        assert.match(violations[0], /canonical version/);
        assert.match(violations[0], /actions\/cache/);
    });

    it('rejects third-party actions missing from the canonical catalog', async () => {
        const file = await writeFixture('- uses: some-org/brand-new-action@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n');
        const { violations } = checkActionPins([file]);
        assert.equal(violations.length, 1);
        assert.match(violations[0], /canonical catalog/);
    });

    it('passes against the real .github tree', () => {
        const { violations } = checkActionPins();
        assert.equal(violations.length, 0, violations.join('\n'));
    });
});
