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
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QuoteData } from "@/types/quote";
import { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCustomer, getCompanySettings } from "@/lib/core/sessionStorage";
import { getOrderId } from "@/lib/utils/order-utils";

interface OrderEmailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quoteData: QuoteData;
}

const STATUS_MESSAGES: Record<string, string> = {
    PENDING: "Our team is currently preparing your files for the production queue. If you have any specific technical adjustments or questions before we begin the print, please simply reply to this email.",
    APPROVED: "Your project has been approved for production. We are currently scheduling it for the next available print slot on our machines.",
    PRINTING: "Your project is currently on the printer! We are monitoring the progress to ensure the highest quality output.",
    POST_PROCESSING: "Your print has successfully finished! It has now moved to our post-processing station where we will handle cleaning, support removal, and any required surface finishing.",
    DONE: "We have finished all post-processing and quality control checks. Your project is now complete and has been moved to our dispatch department for delivery preparation.",
    DISPATCHED: "Your order has been dispatched! It is currently on its way to you. You should receive it shortly.",
    DELIVERED: "We are happy to inform you that your order has been successfully delivered. We hope you are satisfied with the result!",
    FAILED: "We encountered a technical issue during the production of your order. Our team is already working on a solution and will update you shortly on the next steps.",
    CANCELLED: "This order has been cancelled. If you have any questions regarding this cancellation or would like to discuss future projects, please let us know."
};

export const OrderEmailModal = ({ open, onOpenChange, quoteData }: OrderEmailModalProps) => {
    const [copied, setCopied] = useState(false);

    const customer = useMemo(() => {
        if (quoteData.customerId) {
            return getCustomer(quoteData.customerId);
        }
        return null;
    }, [quoteData.customerId]);

    const company = useMemo(() => getCompanySettings(), []);

    const draft = useMemo(() => {
        const orderId = getOrderId(quoteData.id);
        const customerName = quoteData.clientName || customer?.name || "Valued Customer";
        const rawStatus = quoteData.status || "PENDING";
        let status = rawStatus.replace(/_/g, ' ');
        
        // Map internal status codes to professional human-readable labels used in the UI
        if (rawStatus === 'PENDING') status = 'QUOTED';
        else if (rawStatus === 'POST_PROCESSING') status = 'PRINT DONE';
        else if (rawStatus === 'DONE') status = 'FINISHED';
        
        status = status.toUpperCase();
        const projectName = quoteData.projectName || "Unnamed Project";
        const companyName = company?.name || "PolymagicPrice";
        const date = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        const statusMsg = STATUS_MESSAGES[rawStatus] || STATUS_MESSAGES.PENDING;

        return `Subject: Production Update | Order ${orderId} | Project: ${projectName}

Dear ${customerName},

We are reaching out to provide you with the latest status on your 3D printing project: Order ${orderId} ("${projectName}").

Current Status: ${status}

As of: ${date}

${statusMsg}

Thank you for trusting ${companyName} with your project.

Best regards,

The Production Team
${companyName}`.trim();
    }, [quoteData, customer, company]);

    const handleCopy = () => {
        navigator.clipboard.writeText(draft);
        setCopied(true);
        toast.success("Draft copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-card border-border shadow-elevated">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight font-heading">Draft Email</DialogTitle>
                    </div>
                    <DialogDescription>
                        A pre-formatted professional email update for your client.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mt-4">
                    <ScrollArea className="h-[430px] w-full rounded-xl border bg-muted/20 shadow-inner">
                        <div className="p-8 leading-relaxed">
                            <pre className="text-sm font-sans whitespace-pre-wrap leading-relaxed text-foreground">{draft}</pre>
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="mt-6 flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                        Close
                    </Button>
                    <Button 
                        onClick={handleCopy} 
                        className="flex-1 bg-primary hover:bg-primary/90 shadow-card"
                    >
                        {copied ? (
                            <><Check className="w-4 h-4 mr-2" /> COPIED</>
                        ) : (
                            <><Copy className="w-4 h-4 mr-2" /> COPY TO CLIPBOARD</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
