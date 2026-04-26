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

import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash2, Package, FileDown, X } from 'lucide-react';
import { useBatchQuote } from '@/hooks/useBatchQuote';
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from 'sonner';

const BatchSummary = memo(() => {
    const { batchItems, removeItem, clearBatch, batchTotals } = useBatchQuote();
    const { formatPrice } = useCurrency();

    const handleClearBatch = () => {
        if (batchItems.length === 0) return;
        clearBatch();
        toast.success('Batch cleared');
    };

    const handleExportBatch = () => {
        if (batchItems.length === 0) {
            toast.error('No items in batch to export');
            return;
        }

        const batchText = `
BATCH QUOTE SUMMARY
==========================================
Generated: ${new Date().toLocaleString()}
==========================================

ITEMS:
${batchItems.map((item, index) => `
${index + 1}. ${item.projectName || 'Unnamed Project'}
   Client: ${item.clientName || '-'}
   Type: ${item.printType}
   Quantity: ${item.quantity}
   Unit Price: ${formatPrice(item.unitPrice)}
   Total: ${formatPrice(item.totalPrice)}
`).join('')}

==========================================
BATCH TOTALS
==========================================
Total Items: ${batchTotals.totalItems}
Total Quantity: ${batchTotals.totalQuantity}
Material Cost: ${formatPrice(batchTotals.totalMaterialCost)}
Machine Time: ${formatPrice(batchTotals.totalMachineTimeCost)}
Electricity: ${formatPrice(batchTotals.totalElectricityCost)}
Labor: ${formatPrice(batchTotals.totalLaborCost)}
Overhead: ${formatPrice(batchTotals.totalOverheadCost)}
Markup: ${formatPrice(batchTotals.totalMarkup)}
==========================================
GRAND TOTAL: ${formatPrice(batchTotals.grandTotal)}
==========================================
    `.trim();

        const blob = new Blob([batchText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batch-quote-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Batch exported successfully');
    };

    if (batchItems.length === 0) {
        return (
            <Card className="p-6 shadow-card bg-card border-dashed border-2 border-border">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <h3 className="font-semibold text-lg mb-1">Batch Queue Empty</h3>
                    <p className="text-sm text-muted-foreground max-w-[250px]">
                        Add quotes to batch to create a multi-item order
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="shadow-elevated bg-card overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-primary p-4 text-primary-foreground">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        <h2 className="font-bold text-lg">Batch Queue</h2>
                    </div>
                    <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">
                        {batchTotals.totalItems} {batchTotals.totalItems === 1 ? 'item' : 'items'}
                    </span>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Items List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {batchItems.map((item, index) => (
                        <div
                            key={item.id || index}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group hover:bg-muted transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                    {item.projectName || 'Unnamed Project'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {item.printType} • Qty: {item.quantity} • {formatPrice(item.totalPrice)}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                    removeItem(index);
                                    toast.info('Item removed from batch');
                                }}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Total Quantity</span>
                        <span className="font-medium text-foreground">{batchTotals.totalQuantity}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>Material Cost</span>
                        <span className="font-medium text-foreground">{formatPrice(batchTotals.totalMaterialCost)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>Labor + Overhead</span>
                        <span className="font-medium text-foreground">
                            {formatPrice(batchTotals.totalLaborCost + batchTotals.totalOverheadCost)}
                        </span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                        <span className="font-semibold">Grand Total</span>
                        <span className="text-xl font-bold text-primary">{formatPrice(batchTotals.grandTotal)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={handleExportBatch}
                    >
                        <FileDown className="w-4 h-4 mr-2" />
                        Export as Text
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={handleClearBatch}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear
                    </Button>
                </div>
            </div>
        </Card>
    );
});

BatchSummary.displayName = 'BatchSummary';

export default BatchSummary;
