/*
 * Completion dates are promises a shop makes to a customer, so the arithmetic behind them is
 * pinned here.
 *
 * The bug these tests were written for: `addDays` passed a fractional day count to `setDate`,
 * which truncates, so a 4.375-day job promised day 4 while the same job with weekends excluded
 * used Math.ceil and promised day 5. A job shorter than a day reported "completes today".
 */
import { describe, it, expect } from "vitest";
import { calculateCapacity, analyzeDeadline, formatHours } from "./capacityCalculator";
import { CapacityQuery, Machine } from "@/types/quote";

const machine = (id: string, name = id): Machine => ({
    id,
    name,
    hourly_cost: 2,
    power_consumption_watts: 150,
    print_type: "FDM",
});

/** A Monday, so the weekend-skipping branch has somewhere to skip to. */
const START = "2026-01-05T09:00:00Z";

const query = (over: Partial<CapacityQuery> = {}): CapacityQuery => ({
    quantity: 10,
    printTimePerUnit: 3.5,
    workHoursPerDay: 8,
    startDate: START,
    ...over,
});

/** Whole days between two dates, which is what the planner's promise amounts to. */
const dayGap = (from: Date, to: Date): number =>
    Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));

describe("calculateCapacity — completion date", () => {
    it("rounds a partial day up rather than dropping it", () => {
        // 10 units x 3.5 h on one machine = 35 h; at 8 h/day that is 4.375 days.
        const q = query({ includeWeekends: true });
        const result = calculateCapacity(q, [machine("m1")]);

        expect(result.estimatedDays).toBeCloseTo(4.375, 3);
        expect(dayGap(new Date(q.startDate!), result.completionDate)).toBe(5);
    });

    it("does not finish a sub-day job before it starts", () => {
        const q = query({ quantity: 1, printTimePerUnit: 3, includeWeekends: true });
        const result = calculateCapacity(q, [machine("m1")]);

        expect(result.estimatedDays).toBeLessThan(1);
        expect(result.completionDate.getTime()).toBeGreaterThan(new Date(q.startDate!).getTime());
        expect(dayGap(new Date(q.startDate!), result.completionDate)).toBe(1);
    });

    it("never promises an earlier date with weekends on than with weekends off", () => {
        const withWeekends = calculateCapacity(query({ includeWeekends: true }), [machine("m1")]);
        const withoutWeekends = calculateCapacity(query({ includeWeekends: false }), [machine("m1")]);

        expect(withWeekends.completionDate.getTime()).toBeLessThanOrEqual(
            withoutWeekends.completionDate.getTime()
        );
    });

    it("skips Saturday and Sunday when weekend working is off", () => {
        // 4.375 days of work from a Monday, weekends excluded, lands on the following Monday.
        const q = query({ includeWeekends: false });
        const result = calculateCapacity(q, [machine("m1")]);

        expect(result.completionDate.getDay()).not.toBe(0);
        expect(result.completionDate.getDay()).not.toBe(6);
        expect(dayGap(new Date(q.startDate!), result.completionDate)).toBe(7);
    });
});

describe("calculateCapacity — distribution", () => {
    it("spreads units round-robin and reports the bottleneck machine's hours", () => {
        const result = calculateCapacity(query({ quantity: 7 }), [machine("m1"), machine("m2")]);

        expect(result.breakdown.map(b => b.unitsAssigned)).toEqual([4, 3]);
        expect(result.totalPrintHours).toBeCloseTo(24.5, 5);
        // The bottleneck is 4 units x 3.5 h = 14 h, at 8 h/day.
        expect(result.estimatedDays).toBeCloseTo(1.75, 5);
    });

    it("includes turnover time in labour hours but not in print hours", () => {
        const result = calculateCapacity(
            query({ quantity: 4, printTimePerUnit: 2, turnoverTimePerUnit: 0.5 }),
            [machine("m1")]
        );

        expect(result.totalPrintHours).toBe(8);
        expect(result.totalLaborHours).toBe(10);
    });

    it("returns an empty result rather than -Infinity when no machine is selected", () => {
        const result = calculateCapacity(query(), []);

        expect(result.machineCount).toBe(0);
        expect(result.estimatedDays).toBe(0);
        expect(result.breakdown).toEqual([]);
        expect(Number.isFinite(result.completionDate.getTime())).toBe(true);
    });

    it("does not divide by zero when efficiency or the working day is zero", () => {
        const result = calculateCapacity(
            query({ workHoursPerDay: 0, efficiency: 0 }),
            [machine("m1")]
        );

        expect(Number.isFinite(result.estimatedDays)).toBe(true);
        expect(Number.isFinite(result.completionDate.getTime())).toBe(true);
    });
});

describe("analyzeDeadline", () => {
    it("meets a deadline that is comfortably beyond the completion date", () => {
        const verdict = analyzeDeadline(
            query({ includeWeekends: true }),
            [machine("m1")],
            new Date("2026-01-31T09:00:00Z")
        );

        expect(verdict.canMeet).toBe(true);
        expect(verdict.recoveryPlan).toBeUndefined();
    });

    it("offers more machines than are in use when the deadline cannot be met", () => {
        const verdict = analyzeDeadline(
            query({ quantity: 40, includeWeekends: true }),
            [machine("m1")],
            new Date("2026-01-07T09:00:00Z")
        );

        expect(verdict.canMeet).toBe(false);
        expect(verdict.recoveryPlan?.machinesNeeded).toBeGreaterThan(1);
        expect(verdict.recoveryPlan?.hoursPerDayNeeded).toBeLessThanOrEqual(24);
    });

    it("reports no plan and no days when there is no machine to plan with", () => {
        const verdict = analyzeDeadline(query(), [], new Date("2026-01-07T09:00:00Z"));

        expect(verdict.canMeet).toBe(false);
        expect(verdict.daysNeeded).toBe(0);
        expect(verdict.recoveryPlan).toBeUndefined();
    });
});

describe("formatHours", () => {
    it("reads as a shop would say it", () => {
        expect(formatHours(0.5)).toBe("30 min");
        expect(formatHours(2)).toBe("2h");
        expect(formatHours(2.25)).toBe("2h 15m");
    });
});
