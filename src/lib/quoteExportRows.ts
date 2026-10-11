import { QuoteData } from "@/types/quote";
import { summariseQuote } from "@/lib/quoteCalculations";

export interface BreakdownRow {
    label: string;
    amount: number;
    /** Subtotal / markup / total rows, which text and spreadsheet exports emphasise. */
    emphasis?: boolean;
}

/**
 * Every money line of a quote, in the order they add up. One list feeds the text export, the
 * clipboard copy and the spreadsheet, so they can no longer disagree about which lines exist
 * (two of them used to leave out consumables and painting, so the lines shown did not sum to the
 * subtotal printed under them).
 */
export const quoteBreakdownRows = (quote: QuoteData): BreakdownRow[] => {
    const s = summariseQuote(quote);
    const rows: BreakdownRow[] = [
        { label: "Material", amount: quote.materialCost || 0 },
        { label: "Machine time", amount: quote.machineTimeCost || 0 },
        { label: "Electricity", amount: quote.electricityCost || 0 },
        { label: "Consumables", amount: s.consumablesTotal },
        { label: "Painting", amount: s.painting },
        { label: "Labor", amount: s.labour },
        { label: "Overhead", amount: s.overhead },
    ];
    return [
        ...rows.filter(r => r.amount !== 0 || ["Material", "Machine time", "Electricity", "Labor"].includes(r.label)),
        { label: "Subtotal", amount: s.subtotal, emphasis: true },
        { label: "Profit markup", amount: s.markup, emphasis: true },
        ...(s.minimumTopUp ? [{ label: "Minimum charge top-up", amount: s.minimumTopUp, emphasis: true }] : []),
        ...(s.discount ? [{ label: "Discount", amount: -s.discount, emphasis: true }] : []),
        ...(s.shipping ? [{ label: "Shipping", amount: s.shipping, emphasis: true }] : []),
        { label: "TOTAL PRICE", amount: s.total, emphasis: true },
    ];
};

/** Plain-text quote shared by the download and the clipboard copy. */
export const buildQuoteText = (quote: QuoteData, formatPrice: (n: number) => string, generatedAt?: Date): string => {
    const s = summariseQuote(quote);
    const lines = quoteBreakdownRows(quote).map(r => `${(r.label + ":").padEnd(22)} ${formatPrice(r.amount)}`);
    return [
        `3D PRINT QUOTE - ${quote.printType} Printing`,
        "==========================================",
        `Project: ${quote.projectName}`,
        `Colour: ${quote.printColour || "N/A"}`,
        `Quantity: ${s.quantity}${s.quantity > 1 ? ` (unit price ${formatPrice(quote.unitPrice)})` : ""}`,
        "",
        "COST BREAKDOWN (whole job):",
        ...lines,
        "==========================================",
        ...(generatedAt ? ["", `Generated: ${generatedAt.toLocaleString()}`] : []),
    ].join("\n");
};
