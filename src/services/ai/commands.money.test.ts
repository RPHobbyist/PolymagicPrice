import { describe, it, expect } from "vitest";
import { displayToBaseMoney } from "./commands";

describe("displayToBaseMoney", () => {
    it("converts money constants from display to base currency", () => {
        expect(displayToBaseMoney("labor", 30, 2)).toBe(15);
        expect(displayToBaseMoney("electricity", 0.3, 3)).toBe(0.1);
    });
    it("leaves percentages and emission factors alone", () => {
        expect(displayToBaseMoney("markup", 30, 2)).toBe(30);
        expect(displayToBaseMoney("grid_intensity", 473, 2)).toBe(473);
    });
    it("ignores a nonsense rate", () => {
        expect(displayToBaseMoney("labor", 15, 0)).toBe(15);
        expect(displayToBaseMoney("labor", 15, NaN)).toBe(15);
    });
});
