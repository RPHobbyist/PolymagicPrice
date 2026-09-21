import { describe, it, expect } from "vitest";
import { renderSafeText, redactSensitive, finalizeAIOutput } from "./guardrails";

const FINANCIAL_ANSWER =
    "Revenue data: 1234567.89 total. PolymagicPrice shows Bambu X1C at 12.50/hr. " +
    "Order #1234 used 250g of PETG. Data: revenue, cost, margin. Margin is 42.3%.";

describe("output cleanup", () => {
    it("leaves a realistic financial answer completely intact", () => {
        const { display } = finalizeAIOutput(FINANCIAL_ANSWER, { redactPII: true });
        expect(display).toBe(FINANCIAL_ANSWER);
        expect(display).not.toContain("[blocked");
        expect(display).not.toContain("redacted");
    });

    it("keeps plain numbers, ids and quantities out of the phone matcher", () => {
        const text = "Totals: 1234567890 grams, order 5551234567, ref 1234-5678-9012-3456-7890.";
        const { text: cleaned } = redactSensitive(text, { redactPII: true });
        expect(cleaned).toBe(text);
    });

    it("redacts real contact details", () => {
        const { text, findings } = redactSensitive(
            "Email sales@shop.com or call (555) 123-4567.",
            { redactPII: true }
        );
        expect(text).toContain("[email redacted]");
        expect(text).toContain("[phone redacted]");
        expect(findings).toHaveLength(2);
    });

    it("honours the redaction setting", () => {
        const raw = "Email sales@shop.com";
        expect(redactSensitive(raw, { redactPII: false }).text).toBe(raw);
    });

    it("strips command blocks and hides partial ones", () => {
        expect(renderSafeText('Done [CMD:ADD_CLIENT {"name":"Ann"}] now')).toBe("Done  now");
        expect(renderSafeText('Working on it [CMD:SET_CONSTANT {"id":"lab')).toBe("Working on it ");
    });

    it("is monotonic: every prefix renders as a prefix of the whole", () => {
        const full = 'Here is the plan.\n\n\n\nStep one [CMD:GENERATE_REPORT {"type":"FINANCIAL"}] and step two.';
        const rendered = renderSafeText(full);

        for (let i = 0; i <= full.length; i++) {
            const partial = renderSafeText(full.slice(0, i));
            expect(rendered.startsWith(partial)).toBe(true);
        }
    });

    it("is idempotent", () => {
        const once = renderSafeText(FINANCIAL_ANSWER);
        expect(renderSafeText(once)).toBe(once);

        const redactedOnce = redactSensitive("call (555) 123-4567", { redactPII: true }).text;
        expect(redactSensitive(redactedOnce, { redactPII: true }).text).toBe(redactedOnce);
    });

    it("redacts PII that sits directly against a command block", () => {
        // Splicing out a [CMD:...] block glues whatever was on either side of
        // it together. If redaction ran AFTER that splice, a phone/card
        // number immediately followed by a command block would end up glued
        // to the text that came after the block, making the digit-guard
        // treat it as "part of a longer number" and skip it — a real PII
        // leak that only "healed" once the message was already shown.
        // Callers MUST redact before stripping commands (finalizeAIOutput's
        // order), never the reverse.
        const raw =
            'Call the customer at 555-123-4567[CMD:SET_CONSTANT {"id":"labor","value":50}]800 more units queued.';

        const correctOrder = renderSafeText(redactSensitive(raw, { redactPII: true }).text);
        expect(correctOrder).toContain("[phone redacted]");
        expect(correctOrder).not.toContain("555-123-4567");

        const { display } = finalizeAIOutput(raw, { redactPII: true });
        expect(display).toContain("[phone redacted]");
        expect(display).not.toContain("555-123-4567");
    });
});
