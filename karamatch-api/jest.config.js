/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    // Starts every run from freshly seeded data — see the file for why.
    globalSetup: "<rootDir>/jest.globalSetup.ts",
    // Every suite talks to the same MongoDB, so they run one after the other.
    // In parallel they hand each other's users the same id (getNextUserId reads
    // the highest id before inserting) and tokens end up on the wrong document.
    maxWorkers: 1
};
