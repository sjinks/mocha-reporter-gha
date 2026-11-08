import { equal } from 'node:assert/strict';
import { EOL } from 'node:os';
import { describe, test } from 'node:test';
import { issueCommand } from '../lib/command';

void describe('command', async () => {
    await describe('issueCommand', async () => {
        await test('without properties, with message', () => {
            const command = 'group';
            const message = 'Test Failures';
            const expected = `::${command}::${message}${EOL}`;
            const actual = issueCommand(command, {}, message);
            equal(actual, expected);
        });

        await test('without properties and message', () => {
            const input = 'endgroup';
            const expected = `::${input}::${EOL}`;
            const actual = issueCommand(input);
            equal(actual, expected);
        });

        await test('ignore empty properties', () => {
            const command = 'error';
            const message = 'Error';
            const properties = { title: 'Test', file: undefined, line: 42, col: 0 };
            const expected = `::${command} title=${properties.title},line=${properties.line}::${message}${EOL}`;
            const actual = issueCommand(command, properties, message);
            equal(actual, expected);
        });
    });
});
