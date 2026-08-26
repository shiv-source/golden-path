import type { ExecRunner } from '@golden-path/core';
import { describe, expect, it } from 'vitest';
import { parseTotalCoverage, runCoverageGate, summarizeExecOutput, type CoverageGateOptions } from '../action';

const options: CoverageGateOptions = {
    workingDirectory: '.',
    testArgs: '-race -coverprofile=coverage.out ./...',
};

describe('parseTotalCoverage', () => {
    it('extracts the total from go tool cover output', () => {
        const stdout = ['pkg/foo.go:1:5\tFoo\t77.8%', 'total:\t(statements)\t94.2%'].join('\n');
        expect(parseTotalCoverage(stdout)).toBe(94.2);
    });

    it('returns null when the total line is absent', () => {
        expect(parseTotalCoverage('nothing here')).toBeNull();
    });

    it('returns null when the total line has no percentage', () => {
        expect(parseTotalCoverage('total:\t(statements)\t')).toBeNull();
    });
});

describe('summarizeExecOutput', () => {
    it('joins stdout and stderr', () => {
        expect(summarizeExecOutput({ stdout: 'ok', stderr: '' })).toBe('ok');
        expect(summarizeExecOutput({ stdout: 'a', stderr: 'b' })).toBe('a\nb');
    });

    it('truncates oversized output keeping the tail', () => {
        const result = summarizeExecOutput({ stdout: 'x'.repeat(5000), stderr: '' }, 100);
        expect(result).toContain('(truncated)');
        expect(result.length).toBeLessThan(200);
        expect(result.endsWith('x'.repeat(100))).toBe(true);
    });
});

describe('runCoverageGate', () => {
    function staged(coverStdout: string): ExecRunner {
        return (cmd) =>
            cmd.startsWith('go test')
                ? { code: 0, stdout: 'ok', stderr: '' }
                : { code: 0, stdout: coverStdout, stderr: '' };
    }

    it('returns the coverage when tests pass', () => {
        const exec = staged('total:\t(statements)\t95.0%');
        expect(runCoverageGate(options, exec)).toEqual({ ok: true, coverage: 95 });
    });

    it('passes the working directory to go commands', () => {
        const commands: string[] = [];
        const exec: ExecRunner = (cmd, opts) => {
            commands.push(`${cmd} @ ${opts?.cwd ?? ''}`);
            return cmd.startsWith('go test')
                ? { code: 0, stdout: 'ok', stderr: '' }
                : { code: 0, stdout: 'total:\t(statements)\t80.0%', stderr: '' };
        };
        runCoverageGate({ ...options, workingDirectory: 'svc/' }, exec);
        expect(commands.every((c) => c.endsWith('@ svc/'))).toBe(true);
    });

    it('fails when go test fails and surfaces the output', () => {
        const exec: ExecRunner = () => ({ code: 1, stdout: '--- FAIL: TestFoo ---', stderr: 'FAIL' });
        expect(runCoverageGate(options, exec)).toEqual({
            ok: false,
            reason: 'tests-failed',
            output: '--- FAIL: TestFoo ---\nFAIL',
        });
    });

    it('fails when go tool cover fails and surfaces the output', () => {
        const exec: ExecRunner = (cmd) =>
            cmd.startsWith('go test')
                ? { code: 0, stdout: 'ok', stderr: '' }
                : { code: 1, stdout: '', stderr: 'no such file: coverage.out' };
        expect(runCoverageGate(options, exec)).toEqual({
            ok: false,
            reason: 'cover-command-failed',
            output: 'no such file: coverage.out',
        });
    });

    it('fails when the total line is missing', () => {
        const stdout = 'pkg/foo.go:1:5\tFoo\t77.8%';
        expect(runCoverageGate(options, staged(stdout))).toEqual({
            ok: false,
            reason: 'no-total-line',
            output: stdout,
        });
    });
});
