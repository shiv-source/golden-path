import { readFileSync } from 'node:fs';
import * as core from '@actions/core';
import { parseConfig } from './action';

function main() {
    try {
        const configPath = core.getInput('config-path');
        const { outputs, missing } = parseConfig(configPath, (path) => readFileSync(path, 'utf8'));
        if (missing) {
            core.warning(`config file not found at ${configPath}; using defaults`);
        }
        if (outputs.valid === 'false') {
            const errors = JSON.parse(outputs.validation_errors) as string[];
            core.setFailed(`invalid golden-path config: ${errors.join('; ')}`);
            return;
        }
        for (const [name, value] of Object.entries(outputs)) {
            core.setOutput(name, value);
        }
    } catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}

main();
