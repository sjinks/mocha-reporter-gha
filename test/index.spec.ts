import assert from 'node:assert/strict';
import Mocha, { Context, Runner, Suite } from 'mocha';
import { expect } from 'chai';
import Reporter from '../lib';

const failedTest = new Mocha.Test('generates a report on failure', function () {
    // @ts-expect-error we need to generate `false` here
    assert(2 === 1, 'Expected 2 to equal 1');
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
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        new mocha._reporter(runner, {}); // NOSONAR
    });

    it('should generate a report on failure', function (done) {
        suite.addTest(failedTest);

        result = '';
        const unhook = hookStdout(hook);

        runner.run(function (failureCount) {
            unhook();
            expect(failureCount).to.equal(1);

            const lines = result.trim().split('\n');
            expect(lines).to.have.lengthOf(3);
            expect(lines[0]).to.equal('::group::Mocha Annotations');
            expect(lines[1]).to.match(
                /^::error title=Test Suite » generates a report on failure,file=[^,]+,line=\d+,col=\d+::Expected 2 to equal 1$/u,
            );
            expect(lines[2]).to.equal('::endgroup::');

            done();
        });
    });

    it('should not generate anything on success', function (done) {
        suite.addTest(successfulTest);

        result = '';
        const unhook = hookStdout(hook);

        runner.run(function (failureCount) {
            unhook();
            expect(failureCount).to.equal(0);
            expect(result).to.equal('');
            done();
        });
    });
});
