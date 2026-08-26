// Parse a GitHub issue-form YAML body into structured onboarding fields.
// Issue forms use YAML front-matter-like format with `### Field Name` headers.

/**
 * @param {string} body — raw issue body from GitHub issue form
 * @returns {{ repoName: string, type: string, language: string, options: string[] }}
 */
export function parseOnboardingIssue(body) {
    if (!body || typeof body !== 'string') {
        throw new Error('Issue body is required and must be a string');
    }

    const fields = {};

    // Parse markdown headings (### Field Name) followed by content
    const sections = body.split(/(?=### )/);
    for (const section of sections) {
        const lines = section.trim().split('\n');
        const header = lines[0]
            ?.replace(/^###\s+/, '')
            .trim()
            .toLowerCase();
        const content = lines.slice(1).join('\n').trim();

        if (!header) continue;

        if (header.includes('repository name')) {
            fields.repoName = content;
        } else if (header.includes('repository type') || header.includes('type')) {
            fields.type = extractFirstNonEmpty(content);
        } else if (header.includes('language') || header.includes('programming language')) {
            fields.language = extractFirstNonEmpty(content);
        } else if (header.includes('optional') || header.includes('features') || header.includes('options')) {
            fields.options = extractCheckboxOptions(content);
        }
    }

    const repoName = (fields.repoName ?? '').trim();
    if (!/^[A-Za-z0-9._-]+$/.test(repoName)) {
        throw new Error(
            `Invalid repository name "${repoName}". Must contain only letters, digits, dots, hyphens, and underscores.`,
        );
    }

    return {
        repoName,
        type: normalizeField(fields.type ?? ''),
        language: normalizeField(fields.language ?? ''),
        options: fields.options ?? [],
    };
}

/**
 * Normalize a field value: lowercase, replace spaces/slashes with dashes.
 * @param {string} value
 * @returns {string}
 */
const NORMALIZE_MAP = {
    nodejs: 'node',
    documentation: 'docs',
};

function normalizeField(value) {
    const normalized = value
        .toLowerCase()
        .replace(/[\s/]+/g, '-')
        .replace(/\./g, '');
    return NORMALIZE_MAP[normalized] ?? normalized;
}

/**
 * Extract the first non-empty line after the heading.
 * @param {string} content
 * @returns {string}
 */
function extractFirstNonEmpty(content) {
    return (
        content
            .split('\n')
            .map((l) => l.trim())
            .find((l) => l.length > 0) ?? ''
    );
}

/**
 * Extract checked options from checkbox markdown (e.g., - [X] CodeQL).
 * @param {string} content
 * @returns {string[]}
 */
function extractCheckboxOptions(content) {
    const options = [];
    for (const line of content.split('\n')) {
        const match = line.match(/- \[[xX]\]\s+(.+)/);
        if (match?.[1]) {
            options.push(match[1].trim().toLowerCase());
        }
    }
    return options;
}
