import picomatch from 'picomatch';

// Build a matcher for a list of glob patterns (picomatch, dotfiles enabled).
// A trailing slash pattern like ".github/" is treated as "everything under
// .github/" (picomatch needs ".github/**" for that).
export function makeMatcher(patterns: string[]): (file: string) => boolean {
    const normalized = patterns.map((pattern) => (pattern.endsWith('/') ? `${pattern}**` : pattern));
    return picomatch(normalized, { dot: true });
}

export function matchesAny(patterns: string[], files: string[]): boolean {
    if (patterns.length === 0) return false;
    const isMatch = makeMatcher(patterns);
    return files.some((file) => isMatch(file));
}
