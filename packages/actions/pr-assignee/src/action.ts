export interface ComputeAssigneesInput {
    author: string;
    commitAuthors: string[];
    exclude: string[];
}

// Compute the default assignee set for a PR: the author first, then every
// commit author, deduplicated (case-insensitive) and with any excluded users
// (bots by default) dropped. First occurrence wins, so the author is never
// displaced by their own commit entry.
export function computeAssignees(input: ComputeAssigneesInput): string[] {
    const excluded = new Set((input.exclude ?? []).map((name) => name.trim().toLowerCase()));
    const seen = new Set<string>();
    const assignees: string[] = [];
    for (const raw of [input.author, ...(input.commitAuthors ?? [])]) {
        const name = (raw ?? '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (excluded.has(key)) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        assignees.push(name);
    }
    return assignees;
}

// Keep only assignees GitHub reports as assignable on the repo (members /
// collaborators). The Add assignees API rejects non-assignable users with a
// 422, and commits can be authored by people who are not assignable — so
// filtering first means one clean call instead of a failed one.
export function intersectAssignable(assignees: string[], assignable: string[]): string[] {
    const allowed = new Set((assignable ?? []).map((name) => name.toLowerCase()));
    return assignees.filter((name) => allowed.has(name.toLowerCase()));
}
