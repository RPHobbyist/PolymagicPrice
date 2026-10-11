import { describe, it, expect, beforeEach } from "vitest";
import { saveMachine, getMachines } from "./sessionStorage";

describe("saveMachine", () => {
    beforeEach(() => localStorage.clear());

    it("keeps runtime, maintenance and cert pin when the edit form omits them", () => {
        const m = saveMachine({ name: "P1", hourly_cost: 2, power_consumption_watts: 150, print_type: "FDM" } as never);
        saveMachine({
            ...m,
            totalRuntimeHours: 120,
            totalPowerCost: 18,
            lastMaintenanceHours: 100,
            lastMaintenanceDate: "2026-01-01",
            certFingerprint: "AA:BB",
        } as never);

        // The settings form posts only the fields it shows.
        saveMachine({ id: m.id, name: "P1 renamed", hourly_cost: 3, power_consumption_watts: 150, print_type: "FDM" } as never);

        const after = getMachines().find(x => x.id === m.id)!;
        expect(after.name).toBe("P1 renamed");
        expect(after.hourly_cost).toBe(3);
        expect(after.totalRuntimeHours).toBe(120);
        expect(after.totalPowerCost).toBe(18);
        expect(after.lastMaintenanceHours).toBe(100);
        expect(after.lastMaintenanceDate).toBe("2026-01-01");
        expect(after.certFingerprint).toBe("AA:BB");
    });

    it("still lets a caller set the counters explicitly", () => {
        const m = saveMachine({ name: "P1", hourly_cost: 2, power_consumption_watts: 150, print_type: "FDM", totalRuntimeHours: 5 } as never);
        saveMachine({ ...m, totalRuntimeHours: 0 } as never);
        expect(getMachines()[0].totalRuntimeHours).toBe(0);
    });
});
