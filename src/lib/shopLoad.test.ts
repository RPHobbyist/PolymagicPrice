import { describe, it, expect } from "vitest";
import { computeShopLoad } from "./shopLoad";
import { Machine, QuoteData } from "@/types/quote";
import { ProductionSettings } from "@/types/production";

const machine: Machine = { id: "m1", name: "M1", hourly_cost: 2, power_consumption_watts: 150, print_type: "FDM" };
const settings: ProductionSettings = { efficiency: 0, turnoverMinutes: 0, workHoursPerDay: 10, enabledMachineIds: [] };

const quote = (over: Record<string, unknown>) =>
    ({ id: "q", status: "APPROVED", quantity: 1, parameters: { printTime: "1" }, ...over }) as unknown as QuoteData;

describe("computeShopLoad", () => {
    it("does not multiply the whole-job actualPrintTime by quantity", () => {
        const load = computeShopLoad([quote({ quantity: 4, actualPrintTime: 8, status: "PRINTING" })], [machine], settings);
        expect(load.queuedPrintHours).toBe(8);
    });

    it("reads clock-style print times", () => {
        const load = computeShopLoad([quote({ quantity: 2, parameters: { printTime: "1:30" } })], [machine], settings);
        expect(load.queuedPrintHours).toBe(3);
    });

    it("only counts committed work", () => {
        const load = computeShopLoad(
            [quote({ status: "PENDING" }), quote({ status: "FAILED" }), quote({ status: "POST_PROCESSING" }), quote({ status: "APPROVED" })],
            [machine],
            settings
        );
        expect(load.queuedOrders).toBe(1);
    });

    it("treats the legacy default efficiency of 85 as a sane failure chance", () => {
        const q = [quote({ parameters: { printTime: "9" } })];
        const legacy = computeShopLoad(q, [machine], { ...settings, efficiency: 85 });
        const fresh = computeShopLoad(q, [machine], { ...settings, efficiency: 10 });
        expect(legacy.estimatedDays).toBe(fresh.estimatedDays);
    });
});
