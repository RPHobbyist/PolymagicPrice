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
import { ArrowRight, PlaySquare, X, Layout, Calendar, ReceiptIndianRupee, Bell, BookOpen, Settings, Printer } from "lucide-react";

const CURRENT_VERSION = "2.0.0"; // Major UI & Advanced Features Update
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
                            <DialogTitle className="text-2xl font-bold tracking-tight">What's New</DialogTitle>
                            <div className="flex items-center justify-center bg-white/10 w-fit px-3 h-5 rounded-full text-[10px] font-bold backdrop-blur-sm border border-white/20 !text-white uppercase tracking-wider">
                                <span className="leading-none">New Update {CURRENT_VERSION}</span>
                            </div>
                        </div>
                        <DialogDescription className="text-primary-foreground/90 text-sm">
                            Powered by Local AI models via Ollama.
                        </DialogDescription>
                    </div>
                </div>

                {/* Features List */}
                <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">

                    <FeatureItem
                        icon={<Layout className="w-6 h-6 text-slate-700" />}
                        title="Brand New UI"
                        description="A complete visual overhaul featuring a modern, high-contrast industrial design for better efficiency."
                    />

                    <FeatureItem
                        icon={<Calendar className="w-6 h-6 text-slate-700" />}
                        title="Advanced Capacity Planner"
                        description="Forecast production timelines and optimize printer utilization with precision."
                    />

                    <FeatureItem
                        icon={<ReceiptIndianRupee className="w-6 h-6 text-slate-700" />}
                        title="Advanced Billing & Analysis"
                        description="Deep financial insights, profit tracking, and professional reporting at your fingertips."
                    />

                    <FeatureItem
                        icon={<Bell className="w-6 h-6 text-slate-700" />}
                        title="Notification Center"
                        description="Stay synchronized with real-time system alerts and job status updates."
                    />

                    <FeatureItem
                        icon={<BookOpen className="w-6 h-6 text-slate-700" />}
                        title="Tool Guide"
                        description="Comprehensive interactive documentation to help you master the Polymagic ecosystem."
                    />

                    <FeatureItem
                        icon={<Settings className="w-6 h-6 text-slate-700" />}
                        title="Advanced Machine Settings"
                        description="Granular control over machine profiles and encrypted security credentials."
                    />

                    <FeatureItem
                        icon={<Printer className="w-6 h-6 text-slate-700" />}
                        title="Printer Manager"
                        description="Manage your fleet with real-time status tracking for both online and offline printers."
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


