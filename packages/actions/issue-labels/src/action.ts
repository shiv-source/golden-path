export const ALLOWED_KINDS = { type: 'types', priority: 'priorities', areas: 'areas' } as const;

export type LabelKind = keyof typeof ALLOWED_KINDS;

export interface LabelConfig {
    types: string[];
    priorities: string[];
    areas: string[];
    fields: Record<string, LabelKind>;
    bugSignals: string[];
    bugLabel: string;
}

export type ReadFile = (path: string) => string;

export function loadConfig(path: string, readFile: ReadFile): LabelConfig {
    return JSON.parse(readFile(path)) as LabelConfig;
}

// Split an issue body into its form sections. GitHub renders each form field
// as a `### <label>` heading; textarea content (and any markdown the author
// added) sits between them. Code fences are tracked so a `###` inside a code
// block — e.g. a bash example in "Steps to reproduce" — is never mistaken for
// a field heading.
export function parseFields(body: string): Record<string, string[]> {
    const fields: Record<string, string[]> = {};
    let current: string | null = null;
    let inFence = false;
    for (const raw of (body ?? '').split(/\r?\n/)) {
        const line = raw.trim();
        if (/^```/.test(line)) {
            inFence = !inFence;
            continue;
        }
        if (!inFence) {
            const match = /^###\s+(.+)$/.exec(line);
            const heading = match?.[1];
            if (heading) {
                current = heading;
                fields[current] = [];
                continue;
            }
        }
        if (current) fields[current]?.push(line);
    }
    return fields;
}

// A field's answer lines: single-select dropdowns render as `- <value>`,
// multi-selects and checkboxes as `- [x] <value>`. Free-form text (inputs,
// textareas) is not a list item and is ignored — only the selections are label
// candidates.
export function sectionValues(lines: string[]): string[] {
    const values: string[] = [];
    for (const line of lines ?? []) {
        const checked = /^[-*]\s*\[[ xX]\]\s*(.+)$/.exec(line);
        const checkedValue = checked?.[1];
        if (checkedValue) {
            values.push(checkedValue.trim());
            continue;
        }
        const item = /^[-*]\s+(.+)$/.exec(line);
        const itemValue = item?.[1];
        if (itemValue) values.push(itemValue.trim());
    }
    return values;
}

// Template options carry a description after an em/en/hyphen separator
// (`api — internal/api (REST + WS)`, `p-high`, `feature — new capability`).
// Normalize to the bare, lowercase label name and accept it only when it is in
// the whitelist — this is what makes the action add-only and abuse-proof: a
// value that is not a known three-tier label is dropped, never applied.
export function normalizeLabel(raw: string, allowed: string[]): string | null {
    const parts = raw.split(/\s*[—–-]\s+/);
    const name = (parts[0] ?? raw).trim().toLowerCase();
    return allowed.includes(name) ? name : null;
}

function pickLabelValues(lines: string[], allowed: string[]): string[] {
    return sectionValues(lines)
        .map((value) => normalizeLabel(value, allowed))
        .filter((label): label is string => label !== null);
}

// Derive the bare-minimum label set from an issue body:
//   - type     ← "Change type" field (feature/enhancement), or the bug
//                template's own sections (Summary + Steps to reproduce) → bug
//   - priority ← "Priority" field
//   - areas    ← "Area(s)" field, one label per selected area
// Blank issues (no template) and bodies edited into non-form markdown yield
// an empty set and are left untouched.
export function computeLabels(body: string, config: LabelConfig): string[] {
    const fields = parseFields(body);
    const labels = new Set<string>();
    let typeAssigned = false;

    for (const [heading, kind] of Object.entries(config.fields ?? {})) {
        const allowedKey = ALLOWED_KINDS[kind];
        const allowed = config[allowedKey];
        if (!allowedKey || !Array.isArray(allowed) || !fields[heading]) continue;
        let picked = pickLabelValues(fields[heading], allowed);
        if (kind === 'type') picked = picked.slice(0, 1);
        if (picked.length > 0 && kind === 'type') typeAssigned = true;
        for (const label of picked) labels.add(label);
    }

    if (!typeAssigned && (config.bugSignals ?? []).every((signal) => fields[signal])) {
        labels.add(config.bugLabel);
    }

    return [...labels];
}

// Add-only delta: labels the issue does not already carry. Matching is
// case-insensitive; existing labels — including any the user added by hand —
// are never part of the result and therefore never touched.
export function missingLabels(desired: string[], currentNames: string[]): string[] {
    const current = new Set((currentNames ?? []).map((name) => name.toLowerCase()));
    return desired.filter((label) => !current.has(label));
}
