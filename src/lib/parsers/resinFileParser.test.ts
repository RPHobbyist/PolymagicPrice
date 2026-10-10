/*
 * The resin parser produces the print time and resin volume a quote is priced on, and it had no
 * tests at all. These build real headers byte by byte, which is also the check that the mixed
 * endianness in `parseCxdlpv4` is right: the reference implementation (UVtools
 * CrealityCXDLPv4File.cs) marks only MagicSize and Version as big-endian, and gives PrinterModel a
 * big-endian length prefix, while every field after it is little-endian.
 */
import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";
import { parseResinFile } from "./resinFileParser";

/*
 * JSZip reads a Blob through `FileReader`, which Node does not provide, so the SL1 path — the one
 * format that is a ZIP — cannot be exercised here without this. It is a faithful stand-in for the
 * one method JSZip calls, not a stub of the parser itself.
 */
if (typeof globalThis.FileReader === "undefined") {
    class NodeFileReader {
        result: ArrayBuffer | null = null;
        error: unknown = null;
        onload: ((event: { target: NodeFileReader }) => void) | null = null;
        onerror: ((event: { target: NodeFileReader }) => void) | null = null;

        readAsArrayBuffer(blob: Blob) {
            blob.arrayBuffer().then(
                buffer => {
                    this.result = buffer;
                    this.onload?.({ target: this });
                },
                error => {
                    this.error = error;
                    this.onerror?.({ target: this });
                }
            );
        }
    }
    (globalThis as { FileReader?: unknown }).FileReader = NodeFileReader;
}

/** A File-like object over a buffer: the parser only uses `name`, `size`, `slice` and `arrayBuffer`. */
const asFile = (name: string, bytes: Uint8Array): File => {
    const blob = new Blob([bytes as unknown as BlobPart]);
    return Object.assign(blob, {
        name,
        lastModified: Date.now(),
        webkitRelativePath: "",
    }) as File;
};

interface Cxdlp {
    printerModel?: string;
    layerCount?: number;
    printTimeSeconds?: number;
    volumeMl?: number;
    magic?: string;
}

/** Writes a CXDLPv4 header in the layout the parser documents, followed by a print-parameters block. */
const cxdlpv4 = ({
    printerModel = "HALOT-ONE",
    layerCount = 1200,
    printTimeSeconds = 7200,
    volumeMl = 42.5,
    magic = "CXSW3DV2\0",
}: Cxdlp = {}): Uint8Array => {
    const buffer = new ArrayBuffer(512);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    let offset = 0;

    view.setUint32(offset, magic.length, false); // MagicSize, big-endian
    offset += 4;
    for (let i = 0; i < magic.length; i++) bytes[offset + i] = magic.charCodeAt(i);
    offset += magic.length;

    view.setUint16(offset, 4, false); // Version, big-endian
    offset += 2;

    const model = `${printerModel}\0`;
    view.setUint32(offset, model.length, false); // length prefix, big-endian
    offset += 4;
    for (let i = 0; i < model.length; i++) bytes[offset + i] = model.charCodeAt(i);
    offset += model.length;

    offset += 4; // ResolutionX/Y
    offset += 12; // BedSizeX/Y/Z
    offset += 4; // PrintHeight
    offset += 4; // LayerHeight
    offset += 4; // BottomLayersCount
    offset += 4; // PreviewSmallOffsetAddress
    offset += 4; // LayersDefinitionOffsetAddress

    view.setUint32(offset, layerCount, true);
    offset += 4;
    view.setUint32(offset, 0, true); // PreviewLargeOffsetAddress: none, so no thumbnail work
    offset += 4;
    view.setUint32(offset, printTimeSeconds, true);
    offset += 4;
    offset += 4; // ProjectorType

    const printParamsOffset = 400;
    view.setUint32(offset, printParamsOffset, true);

    // PrintParameters: five floats of lift/speed settings, then the volume.
    view.setFloat32(printParamsOffset + 20, volumeMl, true);

    return bytes;
};

describe("parseResinFile — cxdlpv4", () => {
    it("reads the printer model, layer count, print time and volume", async () => {
        const data = await parseResinFile(asFile("job.cxdlpv4", cxdlpv4()));

        expect(data.printerModel).toBe("HALOT-ONE");
        expect(data.layerCount).toBe(1200);
        expect(data.printTimeHours).toBe(2);
        expect(data.resinVolumeMl).toBe(42.5);
    });

    it("leaves implausible figures for manual entry instead of pricing on them", async () => {
        const data = await parseResinFile(
            asFile("job.cxdlpv4", cxdlpv4({ printTimeSeconds: 999999, volumeMl: 50000, layerCount: 0 }))
        );

        expect(data.printTimeHours).toBe(0);
        expect(data.resinVolumeMl).toBe(0);
        expect(data.layerCount).toBeUndefined();
    });

    it("falls back to the generic scanner when the magic does not match", async () => {
        const data = await parseResinFile(asFile("job.cxdlpv4", cxdlpv4({ magic: "NOTCXDLP\0" })));

        // The generic path refuses to guess; what matters is that it does not throw or invent.
        expect(data.printTimeHours).toBeGreaterThanOrEqual(0);
        expect(data.resinVolumeMl).toBe(0);
    });

    it("survives a truncated file", async () => {
        const truncated = cxdlpv4().slice(0, 20);
        const data = await parseResinFile(asFile("job.cxdlpv4", truncated));

        expect(data.printTimeHours).toBe(0);
        expect(data.resinVolumeMl).toBe(0);
    });
});

describe("parseResinFile — SL1", () => {
    const sl1 = async (config: string): Promise<Uint8Array> => {
        const zip = new JSZip();
        zip.file("config.ini", config);
        return zip.generateAsync({ type: "uint8array" });
    };

    it("reads printTime, usedMaterial and the layer counts from config.ini", async () => {
        const bytes = await sl1(
            ["printTime = 5400", "usedMaterial = 36.5", "numFast = 800", "numSlow = 0", "numFade = 0"].join("\n")
        );
        const data = await parseResinFile(asFile("job.sl1", bytes));

        expect(data.printTimeHours).toBe(1.5);
        expect(data.resinVolumeMl).toBe(36.5);
        expect(data.layerCount).toBe(800);
    });

    it("returns zeros, not a throw, when the archive has no config", async () => {
        const zip = new JSZip();
        zip.file("readme.txt", "nothing useful here");
        const bytes = await zip.generateAsync({ type: "uint8array" });

        const data = await parseResinFile(asFile("job.sl1", bytes));

        expect(data.printTimeHours).toBe(0);
        expect(data.resinVolumeMl).toBe(0);
    });
});

describe("parseResinFile — unsupported input", () => {
    it("returns zeros for an extension it does not handle", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        const data = await parseResinFile(asFile("job.zip", new Uint8Array(64)));

        expect(data).toEqual({ printTimeHours: 0, resinVolumeMl: 0 });
        warn.mockRestore();
    });
});
