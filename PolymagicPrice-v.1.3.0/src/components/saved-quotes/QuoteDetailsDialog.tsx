/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuoteData } from "@/types/quote";
import { useCurrency } from "@/hooks/useCurrency";

interface QuoteDetailsDialogProps {
    quote: QuoteData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const QuoteDetailsDialog = memo(({ quote, open, onOpenChange }: QuoteDetailsDialogProps) => {
    const { formatPrice } = useCurrency();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Quote Details - {quote?.projectName}</DialogTitle>
                </DialogHeader>
                {quote && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <DetailItem label="Print Type" value={quote.printType} />
                            <DetailItem label="Client" value={quote.clientName || "-"} />
                            <DetailItem label="Material" value={quote.parameters.materialName || "-"} />
                            {/* Color display with swatches */}
                            <div>
                                <span className="text-muted-foreground text-xs uppercase tracking-wide">Colour</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {quote.printColour ? (
                                        quote.printColour.split(';').map((color, idx) => {
                                            const isHex = color.trim().startsWith('#');
                                            return (
                                                <div key={idx} className="flex items-center gap-2 bg-muted/30 px-2 py-1 rounded-md border border-border/50">
                                                    {isHex && (
                                                        <div
                                                            className="w-4 h-4 rounded-full border border-border shadow-sm"
                                                            style={{ backgroundColor: color.trim() }}
                                                        />
                                                    )}
                                                    <span className="font-medium text-foreground text-sm">{color.trim() || "?"}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="font-medium text-foreground">-</p>
                                    )}
                                </div>
                            </div>
                            <DetailItem label="Machine" value={quote.parameters.machineName || "-"} />
                        </div>

                        <div className="border-t border-border pt-4 space-y-3">
                            <h4 className="font-semibold text-foreground text-sm uppercase tracking-wide">Cost Breakdown</h4>
                            <div className="space-y-2">
                                <CostDetailRow label="Material Cost" value={quote.materialCost} formatPrice={formatPrice} />
                                <CostDetailRow label="Machine Time" value={quote.machineTimeCost} formatPrice={formatPrice} />
                                <CostDetailRow label="Electricity" value={quote.electricityCost} formatPrice={formatPrice} />
                                <CostDetailRow label="Labor Cost" value={quote.laborCost} formatPrice={formatPrice} />
                                {((quote.parameters.consumablesTotal || 0) > 0) && (
                                    <CostDetailRow label="Consumables" value={quote.parameters.consumablesTotal!} formatPrice={formatPrice} />
                                )}
                                <CostDetailRow label="Overhead" value={quote.overheadCost} formatPrice={formatPrice} />

                                <div className="my-2 border-t border-border/50" />

                                <CostDetailRow label="Subtotal" value={quote.subtotal} highlight formatPrice={formatPrice} />
                                <CostDetailRow label="Markup" value={quote.markup} formatPrice={formatPrice} />
                            </div>

                            <div className="border border-border rounded-xl p-4 mt-4 bg-muted/30">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-foreground">Total Price:</span>
                                    <span className="text-2xl font-bold text-foreground tabular-nums">
                                        {formatPrice(quote.totalPrice)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {quote.notes && (
                            <div className="border-t border-border pt-4">
                                <h4 className="font-semibold mb-2 text-foreground text-sm uppercase tracking-wide">Notes</h4>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg border border-border/50">
                                    {quote.notes}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
});

QuoteDetailsDialog.displayName = "QuoteDetailsDialog";

const DetailItem = memo(({ label, value }: { label: string; value: string }) => (
    <div>
        <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
        <p className="font-medium text-foreground mt-0.5 truncate" title={value}>{value}</p>
    </div>
));
DetailItem.displayName = "DetailItem";

const CostDetailRow = memo(({ label, value, highlight, formatPrice }: { label: string; value: number; highlight?: boolean, formatPrice: (val: number) => string }) => {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className={`text-muted-foreground ${highlight ? 'font-medium' : ''}`}>{label}:</span>
            <span className={`tabular-nums ${highlight ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                {formatPrice(value)}
            </span>
        </div>
    );
});
CostDetailRow.displayName = "CostDetailRow";
