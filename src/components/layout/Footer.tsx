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

import { Youtube, Download, ShieldCheck, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import { SYSTEM_CONFIG } from "@/lib/core/core-system";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Lazy load the license dialog to reduce initial bundle size
const LicenseDialog = lazy(() => import("@/components/feedback/LicenseDialog").then(m => ({ default: m.LicenseDialog })));

// GitHub icon component (lucide-react doesn't have GitHub icon)
const GithubIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-4 h-4"
    >
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
);

export const Footer = () => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/80 backdrop-blur-md px-4 sm:px-6 py-1 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground shadow-lg">
            {/* Left: Links and credits */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
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
                    <GithubIcon />
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



                <Link to="/print-management" className="hover:text-primary transition-colors hover:underline decoration-primary/20">
                    Print Management
                </Link>
                <Link to="/order-management" className="hover:text-primary transition-colors hover:underline decoration-primary/20">
                    Order Management
                </Link>
            </div>


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

        </footer>
    );
};

export default Footer;
