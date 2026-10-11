/*
 * Saving to the G-code library.
 *
 * Both calculators build the record with a fresh `crypto.randomUUID()` and hand it over. A supplied
 * id was only ever treated as an update, so a new file was never written: the shop saw "File saved
 * to library successfully" and the library stayed empty.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { saveGcode, getGcodes } from "./sessionStorage";

const aFile = (id: string, name = "bracket") => ({
    id,
    name,
    filePath: `D:/jobs/${name}.gcode`,
    printTime: 2,
    filamentWeight: 40,
    createdAt: new Date().toISOString(),
});

describe("saving a G-code file to the library", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("stores a file that arrives with a new id", () => {
        const saved = saveGcode(aFile("7f3c-new"));

        expect(saved?.id).toBe("7f3c-new");
        expect(getGcodes().map(g => g.id)).toEqual(["7f3c-new"]);
    });

    it("updates rather than duplicates a file that is already there", () => {
        saveGcode(aFile("7f3c-new"));
        saveGcode({ ...aFile("7f3c-new"), name: "bracket v2" });

        expect(getGcodes()).toHaveLength(1);
        expect(getGcodes()[0].name).toBe("bracket v2");
    });
});
