import * as core from '@actions/core';
import { exec } from '@golden-path/core';
import { runCoverageGate } from './action';

function main() {
    try {
        const workingDirectory = core.getInput('working-directory');
        const floor = Number(core.getInput('floor') || '0') || 0;
        const testArgs = core.getInput('test-args') || '-race -coverprofile=coverage.out ./...';

        const outcome = runCoverageGate({ workingDirectory, testArgs }, exec);
        if (!outcome.ok) {
            if (outcome.output) {
                console.error(outcome.output);
            }
            core.setFailed(outcome.reason);
            return;
        }

        core.setOutput('coverage', String(outcome.coverage));
        console.log(`coverage=${outcome.coverage}% floor=${floor}%`);
        if (floor > 0 && outcome.coverage < floor) {
            core.setFailed(`coverage ${outcome.coverage}% is below floor ${floor}%`);
        }
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

main();
