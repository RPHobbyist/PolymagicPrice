import { describe, it, expect } from "vitest";
import { isPrintFinished } from "./printerState";

describe("isPrintFinished", () => {
    it("completes on an explicit finish state", () => {
        expect(isPrintFinished("RUNNING", "FINISH", 0, 40)).toBe(true);
    });
    it("does not complete when a cancelled print drops to IDLE mid-way", () => {
        expect(isPrintFinished("RUNNING", "IDLE", 0, 42)).toBe(false);
    });
    it("completes on IDLE once progress reached the end", () => {
        expect(isPrintFinished("RUNNING", "IDLE", 100, 99)).toBe(true);
        expect(isPrintFinished("RUNNING", "IDLE", 0, 99)).toBe(true);
    });
    it("ignores transitions that did not start from RUNNING", () => {
        expect(isPrintFinished("PAUSE", "FINISH", 100, 100)).toBe(false);
        expect(isPrintFinished(undefined, "IDLE", 100, 100)).toBe(false);
    });
});
