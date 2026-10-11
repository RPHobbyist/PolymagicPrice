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

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlaySquare, X, Calculator, Zap } from "lucide-react";

import { CURRENT_VERSION, WHATS_NEW_STORAGE_KEY as STORAGE_KEY } from "./whatsNewVersion";

export const WhatsNewDialog = ({
    trigger,
    externalOpen,
    onExternalOpenChange
}: {
    trigger?: React.ReactNode;
    externalOpen?: boolean;
    onExternalOpenChange?: (open: boolean) => void;
}) => {
    const [internalOpen, setInternalOpen] = useState(false);

    // Use external control if provided, otherwise use internal state
    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = onExternalOpenChange || setInternalOpen;

    useEffect(() => {
        // Only auto-open if the version has changed
        const lastSeen = localStorage.getItem(STORAGE_KEY);
        if (lastSeen !== CURRENT_VERSION) {
            // Small delay to appear after app load
            const timer = setTimeout(() => {
                setOpen(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [setOpen]); // Run on mount or version change

    const handleClose = () => {
        localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) handleClose();
        }}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-md bg-card border-border p-0 overflow-hidden gap-0 [&>button]:hidden">
                {/* Header Banner */}
                <div className="bg-primary p-4 text-primary-foreground relative overflow-hidden">
                    <DialogClose className="absolute right-4 top-4 p-1 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none !text-white bg-white/10 hover:bg-white/20 z-50">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-1">
                            <DialogTitle className="text-2xl font-semibold tracking-tight">What's new</DialogTitle>
                            <span className="text-sm opacity-80">v{CURRENT_VERSION}</span>
                        </div>
                        <DialogDescription className="text-primary-foreground/90 text-sm">
                            Pricing options and more reliable totals.
                        </DialogDescription>
                    </div>
                </div>

                {/* Features List */}
                <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">

                    <FeatureItem
                        icon={<Calculator className="w-6 h-6 text-slate-700" />}
                        title="Revenue now means accepted work"
                        description="Revenue, profit and averages count quotes from Approved to Delivered. Quotes still waiting for a yes show separately as 'awaiting approval', so your totals may look lower than before. Shipping is not counted as revenue."
                    />

                    <FeatureItem
                        icon={<Zap className="w-6 h-6 text-slate-700" />}
                        title="More accurate pricing"
                        description="New optional settings: a print failure rate and material waste (Settings, Constants), a minimum charge, and per-quote discount, shipping and margin pricing. Tax is added on invoices from Company Settings. Machines with a measured wattage now price electricity from it. Nothing changes until you set them."
                    />

                    <FeatureItem
                        icon={<Calculator className="w-6 h-6 text-slate-700" />}
                        title="Stock and capacity fixes"
                        description="Failed prints are no longer deducted from stock more than once, cancelled orders release their job, and the capacity forecast no longer assumes an 85% failure chance on fresh installs."
                    />

                    <div className="pt-1 space-y-2">
                        <h2 className="text-sm font-semibold text-foreground">Also in 2.0</h2>
                        <ul className="list-disc pl-5 space-y-1.5 text-[13px] text-muted-foreground leading-relaxed">
                            <li><span className="text-foreground font-medium">Capacity Planner:</span> check an order fits before its deadline on the printers you pick.</li>
                            <li><span className="text-foreground font-medium">Billing &amp; Analysis:</span> revenue, profit and margin across your saved quotes.</li>
                            <li><span className="text-foreground font-medium">Notifications:</span> late orders, maintenance due, low spools and price drift in one list.</li>
                            <li><span className="text-foreground font-medium">Print Manager:</span> drag jobs onto printers and see what's printing.</li>
                            <li><span className="text-foreground font-medium">Machines:</span> build volume, power draw and maintenance schedule per printer.</li>
                            <li><span className="text-foreground font-medium">Tool Guide:</span> step-by-step help for every screen.</li>
                        </ul>
                    </div>

                </div>

                {/* Footer */}
                <DialogFooter className="p-4 pt-2 bg-muted/20 border-t border-border flex gap-2">
                    <Button variant="ghost" size="sm" className="w-full gap-2 text-sm h-9" asChild>
                        <a href="https://www.youtube.com/playlist?list=PLwLQ_Xr7StXiMV7_xrYweyu3AdNJex-H9" target="_blank" rel="noopener noreferrer">
                            <PlaySquare className="w-4 h-4" />
                            Tutorials
                        </a>
                    </Button>
                    <Button onClick={handleClose} size="sm" className="w-full gap-2 text-sm h-9">
                        Got it
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const FeatureItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex gap-4 items-start">
        <div className="shrink-0 mt-1">
            {icon}
        </div>
        <div className="space-y-1.5">
            <h2 className="font-semibold text-base leading-none tracking-tight">{title}</h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
                {description}
            </p>
        </div>
    </div>
);


