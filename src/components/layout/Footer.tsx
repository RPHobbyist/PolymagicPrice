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

import { Youtube, Download, ShieldCheck, Info, Github } from "lucide-react";
import { Suspense } from "react";
import { SYSTEM_CONFIG } from "@/lib/core/core-system";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { LicenseDialog } from "@/components/feedback/LicenseDialog";



export const Footer = () => {
    return (
        <footer className="w-full h-10 border-t border-border/50 bg-white/95 backdrop-blur-sm flex items-center shadow-[0_-1px_3px_rgba(0,0,0,0.05)] z-10" role="contentinfo">
            <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-muted-foreground">
                {/* Left: Links and credits */}
                <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1">
                        Made by <a href={SYSTEM_CONFIG.vendorLink} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-2">{SYSTEM_CONFIG.vendor}</a>
                    </span>


                    <div className="h-3 w-[1px] bg-border hidden md:block" />

                    <Suspense fallback={<span className="text-muted-foreground/60">License</span>}>
                        <LicenseDialog />
                    </Suspense>

                    <a
                        href={SYSTEM_CONFIG.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors whitespace-nowrap group"
                    >
                        <Github className="w-4 h-4" />
                        <span className="group-hover:underline decoration-foreground/20">GitHub</span>
                    </a>

                    <a
                        href={SYSTEM_CONFIG.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-primary transition-colors whitespace-nowrap group"
                    >
                        <Youtube className="w-4 h-4" />
                        <span className="group-hover:underline decoration-primary/20">Tutorial</span>
                    </a>

                    <a
                        href={SYSTEM_CONFIG.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-primary transition-colors whitespace-nowrap group"
                    >
                        <Download className="w-4 h-4" />
                        <span className="group-hover:underline decoration-primary/20">Download</span>
                    </a>
                </nav>


                {/* Right: Privacy notice with Tooltip for performance (LCP) */}
                <div className="flex items-center gap-3">
                    <TooltipProvider>
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full hover:bg-secondary/50 text-foreground/80 cursor-help transition-all duration-200">
                                    <ShieldCheck className="w-3.5 h-3.5 text-success" />
                                    <span className="font-medium">Private & Secure</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs p-3 glass border-border shadow-xl">
                                <div className="flex gap-2">
                                    <Info className="w-4 h-4 text-primary shrink-0" />
                                    <p>Your privacy matters — No user data is collected or stored on external servers. All data remains in your local storage.</p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </footer>
    );

};
