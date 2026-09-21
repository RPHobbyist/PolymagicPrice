import { describe, it, expect } from "vitest";
import { parseTimeToHours, totalPrintHours } from "./time";

describe("parseTimeToHours", () => {
    it("reads decimals, H:MM and unit suffixes the same way", () => {
        expect(parseTimeToHours(2)).toBe(2);
        expect(parseTimeToHours("2.5")).toBe(2.5);
        // The case that used to differ between production (1.5) and the dashboard (1.0).
        expect(parseTimeToHours("1:30")).toBeCloseTo(1.5, 6);
        expect(parseTimeToHours("0:45")).toBeCloseTo(0.75, 6);
        expect(parseTimeToHours("1h 30m")).toBeCloseTo(1.5, 6);
        expect(parseTimeToHours("90m")).toBeCloseTo(1.5, 6);
    });

    it("never returns a negative or non-finite value", () => {
        expect(parseTimeToHours("")).toBe(0);
        expect(parseTimeToHours(undefined)).toBe(0);
        expect(parseTimeToHours(null)).toBe(0);
        expect(parseTimeToHours("abc")).toBe(0);
        expect(parseTimeToHours(-5)).toBe(0);
        expect(parseTimeToHours(Number.NaN)).toBe(0);
    });
});

describe("totalPrintHours", () => {
    it("scales a per-unit estimate by quantity", () => {
        expect(totalPrintHours("2", 4)).toBe(8);
    });

    it("treats an actual as the whole-job total and never multiplies it again", () => {
        expect(totalPrintHours("2", 4, 8)).toBe(8);
    });

    it("falls back to the estimate when no actual was recorded", () => {
        expect(totalPrintHours("1:30", 2, 0)).toBeCloseTo(3, 6);
        expect(totalPrintHours("1:30", 2, undefined)).toBeCloseTo(3, 6);
    });
});
