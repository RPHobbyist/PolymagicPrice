import { describe, it, expect } from "vitest";
import { findCommandBlocks } from "./commandBlocks";
import { renderSafeText } from "./guardrails";

describe("findCommandBlocks", () => {
    it("parses a simple command with a payload", () => {
        const blocks = findCommandBlocks('[CMD:SET_CONSTANT {"id":"labor","value":25}] done');
        expect(blocks).toHaveLength(1);
        expect(blocks[0].command).toBe("SET_CONSTANT");
        expect(blocks[0].payloadRaw).toBe('{"id":"labor","value":25}');
    });

    it("parses a command with no payload", () => {
        const blocks = findCommandBlocks("[CMD:GENERATE_REPORT]");
        expect(blocks).toHaveLength(1);
        expect(blocks[0].payloadRaw).toBeNull();
    });

    it("finds multiple blocks in one message", () => {
        const blocks = findCommandBlocks(
            '[CMD:SET_CONSTANT {"id":"labor","value":25}] and [CMD:GENERATE_REPORT {"type":"FINANCIAL"}]'
        );
        expect(blocks.map(b => b.command)).toEqual(["SET_CONSTANT", "GENERATE_REPORT"]);
    });

    it("does not terminate early when a string value contains a literal '}]'", () => {
        // This is the exact shape that broke the old non-greedy regex: the
        // payload's title value contains "}]" as plain characters, well
        // before the block's real close.
        const content =
            '[CMD:CREATE_NOTIFICATION {"title":"steps done}]","message":"ok","type":"INFO"}] AFTERMATH';
        const blocks = findCommandBlocks(content);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].payloadRaw).toBe('{"title":"steps done}]","message":"ok","type":"INFO"}');
        expect(JSON.parse(blocks[0].payloadRaw!)).toEqual({
            title: "steps done}]",
            message: "ok",
            type: "INFO",
        });
        expect(content.slice(blocks[0].end)).toBe(" AFTERMATH");
    });

    it("skips a payload whose braces never close (still streaming)", () => {
        const blocks = findCommandBlocks('[CMD:SET_CONSTANT {"id":"lab');
        expect(blocks).toHaveLength(0);
    });

    it("tolerates whitespace between the payload's closing brace and ']'", () => {
        // Small local models are exactly the kind prone to stray whitespace
        // here — without tolerance the block went unrecognised entirely.
        for (const gap of [' ', '\n', '\t', '  \n']) {
            const content = `[CMD:SET_CONSTANT {"id":"labor","value":50}${gap}] done`;
            const blocks = findCommandBlocks(content);
            expect(blocks, `gap=${JSON.stringify(gap)}`).toHaveLength(1);
            expect(blocks[0].payloadRaw).toBe('{"id":"labor","value":50}');
        }
    });

    it("tolerates whitespace between the command name and the payload", () => {
        const blocks = findCommandBlocks('[CMD:SET_CONSTANT\n  {"id":"labor","value":50}]');
        expect(blocks).toHaveLength(1);
        expect(blocks[0].payloadRaw).toBe('{"id":"labor","value":50}');
    });

    it("does not treat a bracket in prose as a command", () => {
        const blocks = findCommandBlocks("Status: [In Progress], see [Confidential] notes.");
        expect(blocks).toHaveLength(0);
    });
});

describe("renderSafeText with adversarial payloads", () => {
    it("never leaks raw JSON when a payload value contains '}]'", () => {
        const content =
            '[CMD:CREATE_NOTIFICATION {"title":"steps done}]","message":"ok","type":"INFO"}] AFTERMATH';
        const rendered = renderSafeText(content);

        expect(rendered).toBe("AFTERMATH");
        expect(rendered).not.toContain("{");
        expect(rendered).not.toContain("title");
    });

    it("still hides a block that is genuinely mid-stream", () => {
        expect(renderSafeText('Working on it [CMD:SET_CONSTANT {"id":"lab')).toBe("Working on it ");
    });

    it("does not eat trailing prose after a malformed, complete-looking block", () => {
        // "[CMD:FOO bar]" has an uppercase command name but no valid payload
        // shape and isn't recognised — it must not swallow the real answer
        // that follows it once the message is complete.
        const rendered = renderSafeText("intro [CMD:FOO bar] the real answer continues here");
        expect(rendered).toContain("the real answer continues here");
    });
});
