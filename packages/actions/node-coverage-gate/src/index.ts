import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as core from '@actions/core';
import { exec } from '@golden-path/core';
import { parseCoverageSummary } from './action';

function main() {
    try {
        const workingDirectory = core.getInput('working-directory');
        const command = core.getInput('coverage-command');
        const floor = Number(core.getInput('floor') || '0') || 0;
        const summaryPath = core.getInput('coverage-summary-path') || 'coverage/coverage-summary.json';

        const result = exec(command, { cwd: workingDirectory || '.' });
        if (result.code !== 0) {
            console.error(result.stderr || result.stdout);
            core.setFailed(`coverage command failed with exit code ${result.code}: ${command}`);
            return;
        }

        let summaryText: string;
        try {
            summaryText = readFileSync(path.join(workingDirectory || '.', summaryPath), 'utf8');
        } catch {
            core.setFailed(
                `coverage summary not found at ${summaryPath} — the coverage run failed or did not write it`,
            );
            return;
        }

        const outcome = parseCoverageSummary(summaryText, floor);
        if (!outcome) {
            core.setFailed(`could not parse coverage summary at ${summaryPath}`);
            return;
        }

        core.setOutput('coverage', String(outcome.coverage));
        core.setOutput('coverage_covered', String(outcome.covered));
        core.setOutput('coverage_total', String(outcome.total));
        console.log(`coverage=${outcome.coverage}% floor=${floor}% statements=${outcome.covered}/${outcome.total}`);
        if (!outcome.ok) {
            core.setFailed(`coverage ${outcome.coverage}% is below floor ${floor}%`);
        }
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

main();
