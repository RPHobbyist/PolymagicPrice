/*
 * The print time a card shows must be the print time the quote was costed with.
 *
 * `calculateTotalTime` carried its own parser, which read "1:30" the way parseFloat does — 1 —
 * while the pricing engine read the same field as 1.5 h through parseTimeToHours. The production
 * board therefore displayed an hour less work than the shop had charged for.
 */
import { describe, it, expect } from "vitest";
import { calculateTotalTime, pick, stripFileExtension } from "./utils";

describe("calculateTotalTime", () => {
    it("reads H:MM exactly as the pricing engine does", () => {
        expect(calculateTotalTime("1:30", 1)).toBe("1h 30m");
        expect(calculateTotalTime("1:30", 2)).toBe("3h");
        expect(calculateTotalTime("0:45", 4)).toBe("3h");
    });

    it("still reads the formats it always did", () => {
        expect(calculateTotalTime("2h 30m", 2)).toBe("5h");
        expect(calculateTotalTime("1.5h", 2)).toBe("3h");
        expect(calculateTotalTime("90m", 2)).toBe("3h");
        expect(calculateTotalTime("3", 2)).toBe("6h");
    });

    it("formats a single unit through the same path rather than echoing the input", () => {
        expect(calculateTotalTime("90m", 1)).toBe("1h 30m");
        expect(calculateTotalTime("2.25", 1)).toBe("2h 15m");
    });

    it("says 0h for a missing time and refuses to invent one", () => {
        expect(calculateTotalTime(undefined, 3)).toBe("0h");
        expect(calculateTotalTime("", 3)).toBe("0h");
        expect(calculateTotalTime("not a time", 3)).toBe("0m");
    });

    it("caps an absurd entry instead of rendering Infinity", () => {
        expect(calculateTotalTime("999999h", 100000)).toBe("87600h");
    });

    it("treats a zero or negative quantity as one unit, as the engine does", () => {
        expect(calculateTotalTime("2h", 0)).toBe("2h");
        expect(calculateTotalTime("2h", -5)).toBe("2h");
    });
});

describe("pick", () => {
    it("keeps a deliberate zero instead of falling through to a default", () => {
        expect(pick(0, "40", "15")).toBe("0");
        expect(pick("", "40", "15")).toBe("40");
        expect(pick(undefined, undefined, "15")).toBe("15");
    });
});

describe("stripFileExtension", () => {
    it("drops the extension and survives a name that has none", () => {
        expect(stripFileExtension("bracket-v3.gcode")).toBe("bracket-v3");
        expect(stripFileExtension("bracket-v3")).toBe("bracket-v3");
        expect(stripFileExtension("")).toBe("Unnamed Model");
    });
});
