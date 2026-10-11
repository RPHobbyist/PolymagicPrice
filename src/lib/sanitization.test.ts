/*
 * Text that a shop typed has to come back out the way it went in.
 *
 * `sanitize` REMOVES `& " ' \``, and it ran on the way into storage, so a customer called
 * "Tom's Prints & Co." was stored — and invoiced — as "Toms Prints  Co." with no way back. These
 * tests pin the split: `sanitizeText` for anything a person wrote, `sanitize` for structural
 * values and for text that came out of the AI.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { sanitize, sanitizeText, sanitizeObject, escapeHTML } from "./sanitization";
import { saveCustomer, getCustomers, saveQuote, getQuotes } from "./core/sessionStorage";
import { QuoteData } from "@/types/quote";

describe("sanitizeText", () => {
    it("keeps the punctuation that belongs in a name", () => {
        expect(sanitizeText("Tom's Prints & Co.")).toBe("Tom's Prints & Co.");
        expect(sanitizeText('He said "rush job"')).toBe('He said "rush job"');
        expect(sanitizeText("Ångström Bâtiment 3 — bay 4")).toBe("Ångström Bâtiment 3 — bay 4");
    });

    it("still removes angle brackets and control characters", () => {
        expect(sanitizeText("<script>alert(1)</script>")).toBe("scriptalert(1)/script");
        expect(sanitizeText("line\u0000break\u001f")).toBe("linebreak");
    });

    it("trims and handles absent values", () => {
        expect(sanitizeText("  spaced  ")).toBe("spaced");
        expect(sanitizeText(undefined as unknown as string)).toBe("");
        expect(sanitizeText(null as unknown as string)).toBe("");
    });
});

describe("sanitize (structural values and AI output)", () => {
    it("still strips the whole metacharacter set", () => {
        expect(sanitize("Tom's Prints & Co.")).toBe("Toms Prints  Co.");
        expect(sanitize("<b>x</b>")).toBe("bx/b");
    });
});

describe("sanitizeObject", () => {
    it("cleans strings held directly in an array, not only those held by a key", () => {
        const cleaned = sanitizeObject({ tags: ["<b>vip</b>", "rush"], nested: [{ name: "<i>x</i>" }] }, sanitizeText);
        expect(cleaned).toEqual({ tags: ["bvip/b", "rush"], nested: [{ name: "ix/i" }] });
    });

    it("cleans a bare array of strings", () => {
        expect(sanitizeObject(["a<b>", null, 3])).toEqual(["ab", null, 3]);
    });
});

describe("escapeHTML", () => {
    it("escapes what sanitizeText now lets through, which is what makes that safe", () => {
        expect(escapeHTML("Tom's Prints & Co.")).toBe("Tom&#39;s Prints &amp; Co.");
        expect(escapeHTML('say "hi"')).toBe("say &quot;hi&quot;");
    });
});

describe("round trip through storage", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("stores and returns a customer's name unchanged", () => {
        saveCustomer({ name: "Tom's Prints & Co.", email: "tom@example.com" } as never);

        const [stored] = getCustomers();
        expect(stored.name).toBe("Tom's Prints & Co.");
    });

    it("stores and returns a quote's project name and notes unchanged", () => {
        saveQuote({
            projectName: 'Bracket "v2" & jig',
            clientName: "O'Brien Engineering",
            notes: "Colour: black & grey; don't ship before Friday",
            totalPrice: 100,
        } as unknown as QuoteData);

        const [stored] = getQuotes();
        expect(stored.projectName).toBe('Bracket "v2" & jig');
        expect(stored.clientName).toBe("O'Brien Engineering");
        expect(stored.notes).toBe("Colour: black & grey; don't ship before Friday");
    });

    it("keeps stripping angle brackets on the way in", () => {
        saveCustomer({ name: "<img src=x onerror=1>Mallory", email: "m@example.com" } as never);

        const [stored] = getCustomers();
        expect(stored.name).toBe("img src=x onerror=1Mallory");
    });
});
