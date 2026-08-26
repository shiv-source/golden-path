import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@golden-path/core': resolve(import.meta.dirname, 'packages/core/src/index.ts'),
        },
    },
    test: {
        include: ['packages/**/src/**/*.test.ts'],
        environment: 'node',
    },
});
