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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, CalendarDays, Building2, Paintbrush, ArrowRight, Users, Hammer, PlaySquare, FileCode, X } from "lucide-react";

const CURRENT_VERSION = "1.3.1"; // Bumped version for new features
const STORAGE_KEY = "last_seen_version";

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
        // Only auto-open if not externally controlled
        if (externalOpen === undefined) {
            const lastSeen = localStorage.getItem(STORAGE_KEY);
            if (lastSeen !== CURRENT_VERSION) {
                // Small delay to appear after app load
                const timer = setTimeout(() => setInternalOpen(true), 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [externalOpen]);

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
                            <DialogTitle className="text-2xl font-bold tracking-tight">What's New</DialogTitle>
                            <div className="flex items-center gap-2 bg-white/10 w-fit px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm border border-white/20 !text-white">
                                <span>New Update {CURRENT_VERSION}</span>
                            </div>
                        </div>
                        <DialogDescription className="text-primary-foreground/90 text-sm">
                            Check out the latest improvements.
                        </DialogDescription>
                    </div>
                </div>

                {/* Features List */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">

                    <FeatureItem
                        icon={<FileCode className="w-5 h-5 text-green-500" />}
                        title="Saved Projects"
                        description="Save frequently printed files to a library. Reload details for both FDM and Resin without re-uploading."
                    />

                    <FeatureItem
                        icon={<Package className="w-5 h-5 text-blue-500" />}
                        title="Order Manager Board"
                        description="Visualize production flow. Track orders from Pending to Delivery."
                    />

                    <FeatureItem
                        icon={<CalendarDays className="w-5 h-5 text-purple-500" />}
                        title="Capacity Planner"
                        description="Plan big projects. Select printers to see estimated completion times."
                    />

                    <FeatureItem
                        icon={<Package className="w-5 h-5 text-orange-500" />}
                        title="Inventory Management"
                        description="Track filament and resin stock. Automatically deducts usage."
                    />

                    <FeatureItem
                        icon={<Building2 className="w-5 h-5 text-emerald-500" />}
                        title="Company Settings"
                        description="Personalize your brand with logo and custom footer on quotes."
                    />

                    <FeatureItem
                        icon={<Paintbrush className="w-5 h-5 text-pink-500" />}
                        title="Cleaner Interface"
                        description="Polished look with unified styles for a professional experience."
                    />

                    <FeatureItem
                        icon={<Users className="w-5 h-5 text-cyan-500" />}
                        title="Employee Assignment"
                        description="Delegate work by assigning employees to specific print jobs."
                    />

                    <FeatureItem
                        icon={<Hammer className="w-5 h-5 text-yellow-500" />}
                        title="Post Processing"
                        description="Calculate finishing costs, now including painting options."
                    />

                    <FeatureItem
                        icon={<Building2 className="w-5 h-5 text-indigo-500" />}
                        title="Performance Boost"
                        description="Faster and more stable application performance."
                    />

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
                        Let's Explore
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const FeatureItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex gap-3 items-start">
        <div className="shrink-0 p-1.5 bg-muted rounded-md mt-0.5">
            {icon}
        </div>
        <div className="space-y-0.5">
            <h3 className="font-medium text-sm leading-none">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
            </p>
        </div>
    </div>
);

export default WhatsNewDialog;
