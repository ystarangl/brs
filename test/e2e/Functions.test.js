const path = require("path");

const { execute } = require("../../lib/");
const BrsError = require("../../lib/Error");

const { createMockStreams, resourceFile, allArgs } = require("./E2ETests");

describe("end to end functions", () => {
    let outputStreams;

    beforeAll(() => {
        outputStreams = createMockStreams();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    test("function/arguments.brs", () => {
        return execute(resourceFile(path.join("function", "arguments.brs")), outputStreams).then(() => {
            expect(BrsError.found()).toBe(false);
            expect(
                allArgs(outputStreams.stdout.write).filter(arg => arg !== "\n")
            ).toEqual([
                "noArgsFunc",
                "requiredArgsFunc:", "1", "2",
                "typedArgsFunc:", "2.5", "3", "false",
                "optionalArgsFunc:", "-5", "2", "-10"
            ]);
        });
    });

    test("function/return.brs", () => {
        return execute(resourceFile(path.join("function", "return.brs")), outputStreams).then(() => {
            expect(BrsError.found()).toBe(false);
            expect(
                allArgs(outputStreams.stdout.write).filter(arg => arg !== "\n")
            ).toEqual([
                "staticReturn",
                "conditionalReturn:", "5",
                "conditionalReturn:", "invalid",
                "forLoopReturn:", "2",
                "whileLoopReturn:", "3"
            ]);
        });
    });
});