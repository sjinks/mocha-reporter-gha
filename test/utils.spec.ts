import { AssertionError } from 'node:assert';
import { deepEqual, equal } from 'node:assert/strict';
import { EventData, describe, test } from 'node:test';
import { TestEvent } from 'node:test/reporters';
import {
    escapeData,
    escapeProperty,
    generateSummary,
    getLocationInfo,
    isSubtestsFailedError,
    transformFilename,
} from '../lib/utils';

interface TestError extends Error {
    code?: string;
    failureType?: string;
}

const createTestError = (message: string, code: string | undefined, failureType: string | undefined): TestError => {
    const result = new Error(message) as TestError;
    if (code !== undefined) {
        result.code = code;
    }

    if (failureType !== undefined) {
        result.failureType = failureType;
    }

    return result;
};

void describe('utils', async () => {
    await test('escapeData', () => {
        equal(escapeData(''), '');
        equal(escapeData('Hello, World!'), 'Hello, World!');
        equal(escapeData('Hello, World 100%!\r\n'), 'Hello, World 100%25!%0D%0A');
    });

    await test('escapeProperty', () => {
        equal(escapeProperty(''), '');
        equal(escapeProperty('Hello, World!'), 'Hello%2C World!');
        equal(escapeProperty('Hello, World: 100%!\r\n'), 'Hello%2C World%3A 100%25!%0D%0A');
    });

    await describe('transformFilename', async () => {
        await test('should process undefined', () => {
            equal(transformFilename(undefined), undefined);
        });

        await test('should process file:// URL', () => {
            equal(transformFilename('file:///path/to/file?query'), '/path/to/file');
        });

        await test('should process non-file URL', () => {
            const input = '/path/to/file';
            equal(transformFilename(input), input);
        });
    });

    await describe('isSubtestsFailedError', async () => {
        const nonTestErrors: Record<string, TestError> = {
            'Plain Error': createTestError('Plain Error', undefined, undefined),
            'No failureType': createTestError('No failureType', 'ERR_TEST_FAILURE', undefined),
            'No code': createTestError('No code', undefined, 'subtestsFailed'),
            testCodeFailure: createTestError('non-subtestsFailed', 'ERR_TEST_FAILURE', 'testCodeFailure'),
        };

        for (const [name, error] of Object.entries(nonTestErrors)) {
            // eslint-disable-next-line no-await-in-loop
            await test(`should return false for ${name}`, () => {
                equal(isSubtestsFailedError(error), false);
            });
        }

        await test('should return true for subtestsFailed', () => {
            const error = createTestError('subtestsFailed', 'ERR_TEST_FAILURE', 'subtestsFailed');
            equal(isSubtestsFailedError(error), true);
        });
    });

    await describe('getLocationInfo', async () => {
        await test('return undefined for test:watch:drained-like events', () => {
            const expected = [undefined, undefined, undefined];
            const actual = getLocationInfo({ type: 'test:watch:drained', data: undefined });
            deepEqual(actual, expected);
        });

        await test('should handle non-ERR_TEST_FAILURE errors', () => {
            const expectedFile = 'node-reporter-gha/test/integration/test.ts';
            const expectedLine = 2;
            const expectedColumn = 196;
            const event: TestEvent = {
                type: 'test:fail',
                data: {
                    parentId: undefined,
                    tags: [],
                    testId: 1,
                    name: 'will generate a report entry on failure',
                    nesting: 1,
                    testNumber: 1,
                    details: {
                        duration_ms: 0.941569,
                        error: new Error('Expected 2 to equal 1', { cause: new Error() }) as EventData.Error,
                    },
                    line: expectedLine,
                    column: expectedColumn,
                    file: expectedFile,
                },
            };

            const expected = [expectedLine, expectedColumn, expectedFile];
            const actual = getLocationInfo(event);
            deepEqual(actual, expected);
        });

        await test('should extract location from stack trace', () => {
            const expectedFile = '/node-reporter-gha/test/integration/fail.spec.mjs';
            const expectedLine = 17;
            const expectedColumn = 13;
            const cause = new AssertionError({ actual: 1, expected: 2, operator: 'strictEqual' });
            cause.stack =
                'AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n' +
                '\n' +
                '1 !== 2\n' +
                '\n' +
                `    at TestContext.<anonymous> (file://${expectedFile}:${expectedLine}:${expectedColumn})\n` +
                '    at Test.runInAsyncScope (node:async_hooks:206:9)\n' +
                '    at Test.run (node:internal/test_runner/test:656:25)\n' +
                '    at Test.start (node:internal/test_runner/test:565:17)\n' +
                '    at node:internal/test_runner/test:987:71\n' +
                '    at node:internal/per_context/primordials:487:82\n' +
                '    at new Promise (<anonymous>)\n' +
                '    at new SafePromise (node:internal/per_context/primordials:455:29)\n' +
                '    at node:internal/per_context/primordials:487:9\n' +
                '    at Array.map (<anonymous>)\n';
            const error = new Error('Expected 2 to equal 1', { cause }) as TestError;
            error.code = 'ERR_TEST_FAILURE';
            error.failureType = 'testCodeFailure';

            const event = {
                type: 'test:fail',
                data: {
                    parentId: undefined,
                    tags: [],
                    testId: 1,
                    name: 'will generate a report entry on failure',
                    nesting: 1,
                    testNumber: 1,
                    details: { duration_ms: 0.941569, error: error as EventData.Error },
                    line: 15,
                    column: 15,
                    file: `file://${expectedFile}`,
                },
            } satisfies TestEvent;

            const expected = [expectedLine, expectedColumn, expectedFile];
            const actual = getLocationInfo(event);
            deepEqual(actual, expected);
        });

        await test('should extract fall back to looking for TestContext when file is not in the trace', () => {
            const expectedFile = '/node-reporter-gha/test/integration/fail.spec.mjs';
            const expectedLine = 17;
            const expectedColumn = 13;
            const cause = new AssertionError({ actual: 1, expected: 2, operator: 'strictEqual' });
            cause.stack =
                'AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n' +
                '\n' +
                '1 !== 2\n' +
                '\n' +
                `    at TestContext.<anonymous> (file:///node-reporter-gha/test/integration/fail.spec.mts:${expectedLine}:${expectedColumn})\n` +
                '    at Test.runInAsyncScope (node:async_hooks:206:9)\n' +
                '    at Test.run (node:internal/test_runner/test:656:25)\n' +
                '    at Test.start (node:internal/test_runner/test:565:17)\n' +
                '    at node:internal/test_runner/test:987:71\n' +
                '    at node:internal/per_context/primordials:487:82\n' +
                '    at new Promise (<anonymous>)\n' +
                '    at new SafePromise (node:internal/per_context/primordials:455:29)\n' +
                '    at node:internal/per_context/primordials:487:9\n' +
                '    at Array.map (<anonymous>)\n';
            const error = new Error('Expected 2 to equal 1', { cause }) as TestError;
            error.code = 'ERR_TEST_FAILURE';
            error.failureType = 'testCodeFailure';

            const event: TestEvent = {
                type: 'test:fail',
                data: {
                    parentId: undefined,
                    tags: [],
                    testId: 1,
                    name: 'will generate a report entry on failure',
                    nesting: 1,
                    testNumber: 1,
                    details: { duration_ms: 0.941569, error: error as EventData.Error },
                    line: 15,
                    column: 15,
                    file: `file://${expectedFile}`,
                },
            };

            const expected = [expectedLine, expectedColumn, expectedFile];
            const actual = getLocationInfo(event);
            deepEqual(actual, expected);
        });
    });

    await test('generateSummary', () => {
        const stats: Record<string, string> = {
            tests: '2',
            suites: '1',
            pass: '1',
            fail: '1',
            cancelled: '0',
            skipped: '0',
            todo: '0',
            duration_ms: '78.399083',
            unknown: '-1',
        };

        const expected =
            `## Test Summary\n\n<table><tbody>\n` +
            `<tr><th align="left">Total Tests</th><td>2</td></tr>\n` +
            `<tr><th align="left">Test Suites</th><td>1</td></tr>\n` +
            `<tr><th align="left">Tests Passed</th><td>1</td></tr>\n` +
            `<tr><th align="left">Tests Failed</th><td>1</td></tr>\n` +
            `<tr><th align="left">Tests Canceled</th><td>0</td></tr>\n` +
            `<tr><th align="left">Test Skipped</th><td>0</td></tr>\n` +
            `<tr><th align="left">Incomplete Tests</th><td>0</td></tr>\n` +
            `<tr><th align="left">Duration</th><td>78.399083</td></tr>\n` +
            `<tr><th align="left">unknown</th><td>-1</td></tr>\n` +
            `</tbody></table>\n\n`;
        const actual = generateSummary(stats);
        equal(actual, expected);
    });
});
