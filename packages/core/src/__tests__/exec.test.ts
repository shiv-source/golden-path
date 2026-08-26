import { describe, expect, it } from 'vitest';
import { createExec, exec, type ExecResult, type ExecRunner } from '../exec';

describe('createExec', () => {
    it('delegates to the injected runner', () => {
        const fake: ExecRunner = () => ({ code: 0, stdout: 'out', stderr: '' });
        const runner = createExec(fake);
        expect(runner('echo hi')).toEqual({ code: 0, stdout: 'out', stderr: '' });
    });

    it('surfaces non-zero exits as a result, not a throw', () => {
        const fake: ExecRunner = () => ({ code: 2, stdout: '', stderr: 'boom' });
        const runner = createExec(fake);
        const result = runner('false');
        expect(result.code).toBe(2);
        expect(result.stderr).toBe('boom');
    });
});

describe('exec', () => {
    it('returns stdout for a successful command', () => {
        const result = exec('echo hello');
        expect(result.code).toBe(0);
        expect(result.stdout.trim()).toBe('hello');
    });

    it('returns a non-zero code for a failing command', () => {
        const result = exec('node -e "process.exit(3)"');
        expect(result.code).toBe(3);
    });
});

describe('ExecResult', () => {
    it('shapes results consistently', () => {
        const result: ExecResult = { code: 0, stdout: '', stderr: '' };
        expect(result).toHaveProperty('code');
        expect(result).toHaveProperty('stdout');
        expect(result).toHaveProperty('stderr');
    });
});
