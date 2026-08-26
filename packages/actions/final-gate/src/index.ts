import * as core from '@actions/core';
import { formatFailureMessage, parseResults, summarize } from './action';

function main() {
    try {
        const resultsInput = core.getInput('results');
        const coverage = core.getInput('coverage');
        if (coverage) {
            console.log(`coverage=${coverage}%`);
        }

        const { passed, failures } = summarize(parseResults(resultsInput));
        core.setOutput('passed', passed ? 'true' : 'false');

        if (!passed) {
            core.setFailed(`failed jobs: ${formatFailureMessage(failures)}`);
        } else {
            console.log('all checks passed');
        }
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

main();
