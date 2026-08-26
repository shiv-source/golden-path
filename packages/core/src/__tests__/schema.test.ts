import { describe, expect, it } from 'vitest';
import schema from '../../../../schemas/golden-path.schema.json';
import { TOOLCHAIN } from '../toolchain';

describe('schema <-> toolchain sync', () => {
    it('schema tool defaults match the TOOLCHAIN catalog', () => {
        const go = schema.$defs.goTarget.properties;
        const node = schema.$defs.nodeTarget.properties;
        expect(go.lint.$ref).toBe('#/$defs/lintConfig');
        expect(schema.$defs.lintConfig.properties.golangci_lint_version.default).toBe(TOOLCHAIN.golangciLint);
        expect(node.node_version.default).toBe(TOOLCHAIN.node);
    });

    it('language gates are opt-in target lists', () => {
        const properties = schema.properties as Record<
            string,
            { type?: string; default?: unknown; items?: { $ref?: string } }
        >;
        expect(properties.go?.type).toBe('array');
        expect(properties.node?.type).toBe('array');
        expect(properties.go?.default).toEqual([]);
        expect(properties.node?.default).toEqual([]);
        expect(properties.language).toBeUndefined();
        expect(properties.go?.items?.$ref).toBe('#/$defs/goTarget');
        expect(properties.node?.items?.$ref).toBe('#/$defs/nodeTarget');
    });
});
