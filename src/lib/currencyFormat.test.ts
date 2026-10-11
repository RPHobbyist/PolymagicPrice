import { describe, it, expect } from "vitest";
import { currencyDigits } from "./currencyFormat";

describe("currencyDigits", () => {
    it("knows currencies without or with extra minor units", () => {
        expect(currencyDigits("JPY")).toBe(0);
        expect(currencyDigits("KRW")).toBe(0);
        expect(currencyDigits("USD")).toBe(2);
        expect(currencyDigits("KWD")).toBe(3);
    });
    it("falls back to 2 for nonsense", () => {
        expect(currencyDigits("???")).toBe(2);
    });
});
