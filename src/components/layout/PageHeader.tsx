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
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUI } from "@/contexts/UIContext";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    description?: string; // Alternative to subtitle if needed
    actions?: ReactNode;
    className?: string;
    maxWidth?: string;
}

export const PageHeader = ({ 
    title, 
    subtitle, 
    description, 
    actions, 
    className,
    maxWidth = "max-w-[1800px]"
}: PageHeaderProps) => {
    const { openFeedback, openWhatsNew } = useUI();

    return (
        <header className={cn(
            "border-b border-border bg-white sticky top-0 z-50 shadow-card shrink-0",
            className
        )}>
            <div className={cn("container mx-auto px-6 h-20 flex items-center justify-between", maxWidth)}>
                <div className="flex flex-col">
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-800 leading-tight">
                        {title}
                    </h1>
                    {(subtitle || description) && (
                        <p className="text-xs sm:text-sm text-slate-500 font-normal leading-none mt-0.5">
                            {subtitle || description}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {actions && (
                        <div className="flex items-center gap-3 mr-3 border-r pr-3 border-border">
                            {actions}
                        </div>
                    )}

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={openFeedback}
                            className="flex h-8 px-3 bg-background hover:bg-muted text-xs sm:text-sm border-input font-medium"
                        >
                            Feedback
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={openWhatsNew}
                            className="h-8 px-3 bg-background hover:bg-muted text-xs sm:text-sm border-input font-medium animate-breathe-yellow whitespace-nowrap"
                        >
                            What's New
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
};
