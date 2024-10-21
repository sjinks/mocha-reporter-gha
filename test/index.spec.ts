import { equal, match } from 'node:assert/strict';
import Mocha, { Context, Runner, Suite } from 'mocha';
import Reporter from '../lib';

const failedTest = new Mocha.Test('generates a report on failure', function () {
    equal(2, 1, 'Expected 2 to equal 1');
});

const successfulTest = new Mocha.Test('successful test', function (done) {
    done();
});

function hookStdout(
    callback: (
        orig: typeof process.stdout.write,
        ...params: Parameters<typeof process.stdout.write>
    ) => ReturnType<typeof process.stdout.write>,
): () => void {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const old_write = process.stdout.write;

    process.stdout.write = (function (write) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return function (...params: any): ReturnType<typeof process.stdout.write> {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            return callback(write, params);
        };
    })(old_write);

    return (): void => {
        process.stdout.write = old_write;
    };
}

let result = '';
const hook = (
    _orig: typeof process.stdout.write,
    s: string | Uint8Array,
    encoding: unknown,
    // eslint-disable-next-line @typescript-eslint/ban-types
    cb: Function | undefined,
): boolean => {
    const callback = typeof encoding === 'function' ? encoding : cb;

    result += s.toString();
    callback?.();
    return true;
};

describe('GitHub Actions Reporter', function () {
    let mocha: Mocha;
    let context: Context;
    let suite: Suite;
    let runner: Runner;

    beforeEach(function () {
        mocha = new Mocha({
            reporter: Reporter,
        });
        context = new Context();
        suite = new Suite('Test Suite', context);
        runner = new Runner(suite, { delay: false });

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        new mocha._reporter(runner, {}); // NOSONAR
    });

    it('should generate a report on failure', function (done) {
        suite.addTest(failedTest);

        result = '';
        const unhook = hookStdout(hook);

        runner.run(function (failureCount) {
            unhook();
            equal(failureCount, 1);

            const lines = result.trim().split('\n');
            equal(lines.length, 3);
            equal(lines[0], '::group::Mocha Annotations');
            match(
                lines[1]!,
                /^::error title=Test Suite » generates a report on failure,file=[^,]+,line=\d+,col=\d+::Expected 2 to equal 1/u,
            );
            equal(lines[2], '::endgroup::');

            done();
        });
    });

    it('should not generate anything on success', function (done) {
        suite.addTest(successfulTest);

        result = '';
        const unhook = hookStdout(hook);

        runner.run(function (failureCount) {
            unhook();
            equal(failureCount, 0);
            equal(result, '');
            done();
        });
    });
});
