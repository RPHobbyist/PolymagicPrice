import { ProductionJob } from "@/types/production";

/** Material per unit, in grams (FDM) or ml (resin), from the quote's own parameters. */
export const perUnitMaterial = (job: ProductionJob): number =>
    parseFloat((job.quote.parameters?.filamentWeight as string) || (job.quote.parameters?.resinVolume as string) || "0") || 0;

/** Failed units whose extra material has not yet been taken off the spool. */
export const pendingFailedUnits = (job: ProductionJob): number =>
    Math.max(0, Math.floor(Number(job.quote.failedUnits || 0)) - (job.failedUnitsDeducted || 0));

/**
 * Units a reprint consumes. A failed part's first attempt is already inside the original
 * deduction, so a reprint only adds the failures not yet re-deducted. With no failure count
 * recorded the whole quantity is assumed to be reprinted.
 */
export const reprintUnits = (job: ProductionJob): number =>
    Number(job.quote.failedUnits || 0) > 0 ? pendingFailedUnits(job) : Math.max(1, job.quote.quantity || 1);

/**
 * What deleting a job may put back on the spool. Only a print still in progress has material
 * that never became parts; finished, failed or queued jobs already burned theirs.
 */
export const restorableOnRemoval = (job: ProductionJob): number =>
    job.status === "printing" ? (job.attemptDeducted ?? job.inventoryDeducted ?? 0) : 0;
