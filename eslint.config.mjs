import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['node_modules/', 'coverage/', '**/dist/'],
    },
    {
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                URL: 'readonly',
                fetch: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'prefer-const': 'error',
            'no-duplicate-imports': 'error',
        },
    },
    {
        files: ['packages/**/*.ts'],
        extends: tseslint.configs.recommended,
    },
);
