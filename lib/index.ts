import { AnnotationProperties, endGroup, error, startGroup } from '@actions/core';
import mocha from 'mocha';

interface ErrorLocation {
    file: string;
    line: number;
    column: number;
}

class GitHubActionsReporter extends mocha.reporters.Base {
    private failedTests: mocha.Test[] = [];

    public constructor(runner: mocha.Runner, options?: mocha.MochaOptions) {
        super(runner, options);

        runner.on(mocha.Runner.constants.EVENT_RUN_BEGIN, this._onStart);
        runner.on(mocha.Runner.constants.EVENT_TEST_FAIL, this._onFailedTest);
        runner.on(mocha.Runner.constants.EVENT_RUN_END, this._onEnd);
    }

    private readonly _onStart = (): void => {
        this.failedTests = [];
    };

    private readonly _onFailedTest = (test: mocha.Test): void => {
        this.failedTests.push(test);
    };

    private readonly _onEnd = (): void => {
        if (this.failedTests.length > 0) {
            startGroup('Mocha Annotations');
            this.failedTests.forEach(this._testVisitor);
            endGroup();
        }
    };

    private readonly _testVisitor = (test: mocha.Test): void => {
        // istanbul ignore else
        if (test.err) {
            const { message } = test.err;
            const location = this._parseStackTrace(test.err.stack);
            const properties: AnnotationProperties = {
                title: test.titlePath().join(' » '),
                file: location ? location.file : undefined,
                startLine: location ? location.line : undefined,
                startColumn: location ? location.column : undefined,
            };

            error(message, properties);
        }
    };

    /**
     * @see https://github.com/findmypast-oss/mocha-json-streamier-reporter/blob/master/lib/parse-stack-trace.js#L5
     */
    // eslint-disable-next-line class-methods-use-this
    private _parseStackTrace(stack?: string): ErrorLocation | null {
        // istanbul ignore else
        if (stack) {
            const matches = /^\s*at Context[^(]+\(([^()]+):(\d+):(\d+)\)/gmu.exec(stack);
            // istanbul ignore else
            if (matches) {
                return {
                    file: matches[1],
                    line: parseInt(matches[2], 10),
                    column: parseInt(matches[3], 10),
                };
            }
        }

        // istanbul ignore next
        return null;
    }
}

export = GitHubActionsReporter;
