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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, PlaySquare } from "lucide-react";

const STORAGE_KEY = "brand_announcement_acknowledged";

export const BrandAnnouncement = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasAcknowledged = localStorage.getItem(STORAGE_KEY);
        if (!hasAcknowledged) {
            // Small delay to ensure smooth mounting animation
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem(STORAGE_KEY, "true");
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] border-none p-0 overflow-hidden bg-transparent shadow-none animate-burst">
                <div className="relative group">
                    {/* Animated background glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse-soft"></div>

                    <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-elevated">
                        {/* Header Area */}
                        <div className="h-32 bg-gradient-primary relative overflow-hidden flex items-center justify-center">
                            <div className="relative z-10 flex flex-col items-center">
                                <span className="text-primary-foreground/80 text-xs font-bold uppercase tracking-[0.2em] mb-1">New Identity</span>
                                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter drop-shadow-md">
                                    PolymagicPrice
                                </h1>
                            </div>
                        </div>

                        <div className="p-8">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold text-center mb-4">
                                    Welcome to PolymagicPrice
                                </DialogTitle>
                                <DialogDescription className="text-lg text-center leading-relaxed">
                                    We've rebranded! <span className="font-bold animate-rainbow-shimmer text-xl">PolymagicPrice</span> is the same powerful tool you love, but with a new name that reflects our commitment to making 3D print estimation feel like magic.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="mt-8 space-y-4">
                                <div className="flex flex-col gap-4 text-left max-w-md mx-auto">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-primary/10 p-2 rounded-full">
                                            <Zap className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">Faster Estimation</h4>
                                            <p className="text-sm text-muted-foreground">Optimized algorithms for lightning-fast price calculation.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-primary/10 p-2 rounded-full">
                                            <Shield className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">Open Source Magic</h4>
                                            <p className="text-sm text-muted-foreground">Fully AGPLv3 compliant. Your data, your tool, your magic.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 bg-primary/10 p-2 rounded-full">
                                            <PlaySquare className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">New Video Tutorials</h4>
                                            <p className="text-sm text-muted-foreground">Check out our new <a href="https://www.youtube.com/playlist?list=PLwLQ_Xr7StXiMV7_xrYweyu3AdNJex-H9" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">YouTube Playlist</a> for tips and tricks.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-8 flex flex-col sm:flex-row gap-4">
                                <Button
                                    onClick={handleClose}
                                    className="w-full sm:flex-1 h-12 text-lg font-semibold bg-gradient-primary hover:shadow-glow transition-all duration-300 group"
                                >
                                    Get Started
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </DialogFooter>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
