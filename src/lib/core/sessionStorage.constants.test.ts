import { describe, it, expect, beforeEach } from "vitest";
import { getConstants, saveConstant, syncLatestDefaultConstants } from "./sessionStorage";

/**
 * The grid factor lives in the constants table so the shop edits it beside the electricity rate,
 * with no new settings screen. That convenience comes with two hazards, and both are covered here:
 * a visible constant is selectable in the calculator and gets ADDED TO A QUOTE'S PRICE, and the
 * constants table prefixes the currency symbol to any unit that starts with "/".
 */
describe("system constants", () => {
    beforeEach(() => localStorage.clear());

    it("reaches shops that installed before it existed, without touching their own values", () => {
        localStorage.setItem("session_constants", JSON.stringify([
            { id: "electricity", name: "Electricity Rate", value: 0.2, unit: "/kWh", is_visible: false },
        ]));

        expect(syncLatestDefaultConstants()).toBe(true);

        const constants = getConstants();
        expect(constants.find(c => c.id === "electricity")?.value).toBe(0.2);
        expect(constants.find(c => c.id === "grid_intensity")?.value).toBe(473);
    });

    it("adds nothing on a second run", () => {
        syncLatestDefaultConstants();
        expect(syncLatestDefaultConstants()).toBe(false);
    });

    it("can never become a selectable consumable, even if the switch is flipped", () => {
        syncLatestDefaultConstants();

        saveConstant({
            id: "grid_intensity",
            name: "Grid Emission Factor",
            value: 473,
            unit: "gCO2e/kWh",
            is_visible: true,
        });

        // The read path forces system constants hidden, and the calculator filters on that flag —
        // otherwise 473 would be offered as a consumable and land in the price of a quote.
        expect(getConstants().find(c => c.id === "grid_intensity")?.is_visible).toBe(false);
    });

    it("restores a system constant that was set while missing, rather than dropping the write", () => {
        // Saving against an id that is not in the list used to write nothing at all while reporting
        // success — so the assistant could say it had changed the grid factor when it had not.
        const saved = saveConstant({ id: "grid_intensity", name: "Grid Emission Factor", value: 500, unit: "gCO2e/kWh" });

        expect(saved?.value).toBe(500);
        expect(getConstants().find(c => c.id === "grid_intensity")?.value).toBe(500);
    });

    it("uses a unit the constants table will not decorate with a currency symbol", () => {
        syncLatestDefaultConstants();

        const grid = getConstants().find(c => c.id === "grid_intensity")!;
        expect(grid.unit).toBe("gCO2e/kWh");
        expect(grid.unit.startsWith("/")).toBe(false);
    });
});
