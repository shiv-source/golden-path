// Merge profile files into a flat file tree.
// Profiles higher in the list take priority (later profiles override earlier ones).
// Returns a list of files with conflict detection.

/**
 * @param {Array<{ name: string, files: Array<{ path: string, content: string }> }>} profiles
 * @returns {{ files: Array<{ path: string, content: string, source: string }>, conflicts: Array<{ path: string, sources: string[], message: string }> }}
 */
export function mergeProfiles(profiles) {
    /** @type {Map<string, { content: string, source: string }>} */
    const fileMap = new Map();
    /** @type {Array<{ path: string, sources: string[], message: string }>} */
    const conflicts = [];

    for (const profile of profiles) {
        for (const file of profile.files) {
            const existing = fileMap.get(file.path);
            if (existing && existing.content !== file.content) {
                conflicts.push({
                    path: file.path,
                    sources: [existing.source, profile.name],
                    message: `CONFLICT: ${file.path} has different content in "${existing.source}" and "${profile.name}". Manual review required.`,
                });
                // Keep the later profile's version (higher priority)
                fileMap.set(file.path, { content: file.content, source: profile.name });
            } else if (!existing) {
                fileMap.set(file.path, { content: file.content, source: profile.name });
            }
            // If same content, skip (idempotent)
        }
    }

    const files = Array.from(fileMap.entries()).map(([path, { content, source }]) => ({
        path,
        content,
        source,
    }));

    return { files, conflicts };
}
