// Generate TypeScript types from the golden-path config JSON Schema.
// The schema is the single source of truth; generated types are committed so
// consumers and the typechecker never depend on a build step.
//
// Usage: node scripts/gen-types.mjs [--check]
//   default: writes packages/core/src/types.generated.ts
//   --check: fails (exit 1) if the committed file is stale, without writing

import { compile } from 'json-schema-to-typescript';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = resolve(ROOT, 'schemas', 'golden-path.schema.json');
const outPath = resolve(ROOT, 'packages', 'core', 'src', 'types.generated.ts');
const check = process.argv.includes('--check');

const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const raw = await compile(schema, 'GoldenPathConfig', {
    bannerComment: `// DO NOT EDIT. Generated from schemas/golden-path.schema.json by scripts/gen-types.mjs.
// Run \`pnpm gen:types\` after changing the schema.`,
    additionalProperties: false,
});
const prettierConfig = (await prettier.resolveConfig(outPath)) ?? {};
const ts = await prettier.format(raw, { parser: 'typescript', ...prettierConfig });

if (check) {
    const current = readFileSync(outPath, 'utf8');
    if (current !== ts) {
        console.error(
            `[gen-types] ${outPath.replace(`${ROOT}/`, '')} is stale. Run \`pnpm gen:types\` and commit the result.`,
        );
        process.exit(1);
    }
    console.log(`[gen-types] OK: generated types are up to date`);
} else {
    writeFileSync(outPath, ts);
    console.log(`generated ${outPath.replace(`${ROOT}/`, '')}`);
}
