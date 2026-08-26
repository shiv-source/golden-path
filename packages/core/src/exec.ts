import { execSync, type ExecSyncOptions } from 'node:child_process';

export interface ExecResult {
    code: number;
    stdout: string;
    stderr: string;
}

export type ExecRunner = (command: string, options?: ExecSyncOptions) => ExecResult;

function runCommand(command: string, options: ExecSyncOptions = {}): ExecResult {
    try {
        const stdout = execSync(command, { encoding: 'utf8', stdio: 'pipe', ...options });
        return { code: 0, stdout: String(stdout), stderr: '' };
    } catch (error) {
        const err = error as { status?: number; stdout?: unknown; stderr?: unknown };
        return {
            code: typeof err.status === 'number' ? err.status : 1,
            stdout: String(err.stdout ?? ''),
            stderr: String(err.stderr ?? ''),
        };
    }
}

// Returns an ExecRunner. A runner is injectable for tests; the default wraps
// child_process.execSync and never throws (failures surface via result.code).
export function createExec(runner?: ExecRunner): ExecRunner {
    return runner ?? runCommand;
}

export const exec = createExec();
