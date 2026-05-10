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
import { NavLink } from "react-router-dom";
import { 
    Home,
    Calculator, 
    Printer, 
    Calendar, 
    ClipboardList, 
    ReceiptIndianRupee, 
    Settings,
    Database,
    Bell,
    BookOpen
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItemProps {
    icon: LucideIcon;
    label: string;
    path: string;
    isNotification?: boolean;
}

const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Calculator, label: "Cost Calculator", path: "/cost-calculator" },
    { icon: ClipboardList, label: "Order Manager", path: "/order-manager" },
    { icon: Printer, label: "Print Manager", path: "/print-manager" },
    { icon: Calendar, label: "Capacity Planner", path: "/capacity-planner" },
    { icon: ReceiptIndianRupee, label: "Billing & Analysis", path: "/billing-analysis" },
    { icon: Bell, label: "Notification", path: "/notification", isNotification: true },
    { icon: BookOpen, label: "Tool Guide", path: "/tool-guide" },
    { icon: Database, label: "Database Manager", path: "/database-manager" },
];

import { useLocation } from "react-router-dom";

const NavItem = ({ icon: Icon, label, path, isNotification }: NavItemProps) => {
    const { unreadCount } = useNotifications();
    const location = useLocation();
    const isActive = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
    const isHome = path === "/";

    return (
        <div className="w-full flex justify-center py-0.5 relative z-[60]">
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <NavLink
                        to={path}
                        target={path === "/" ? "_blank" : undefined}
                        rel={path === "/" ? "noopener noreferrer" : undefined}
                        aria-label={label}
                        className={cn(
                            "flex items-center justify-center h-10 w-10 rounded-lg transition-all duration-200 group relative select-none cursor-pointer pointer-events-auto",
                            isActive 
                                ? isHome
                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                                    : "bg-primary text-white shadow-md" 
                                : isHome
                                    ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                    : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                        )}
                    >
                        <Icon className={cn(
                            "w-5 h-5 shrink-0 transition-all", 
                            isActive 
                                ? "text-white scale-110" 
                                : isHome
                                    ? "text-emerald-600 group-hover:text-emerald-700 scale-105"
                                    : "text-slate-700 group-hover:text-slate-900"
                        )} />
                        {isNotification && unreadCount > 0 && (
                            <Badge 
                                className={cn(
                                    "absolute -top-1 -right-1 flex items-center justify-center bg-destructive text-white border-2 border-slate-50 font-semibold animate-in zoom-in duration-300 pointer-events-none",
                                    unreadCount > 9 ? "h-5 min-w-[1.4rem] px-1 rounded-full text-[9px]" : "h-5 w-5 p-0 rounded-full text-[10px]"
                                )}
                            >
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                        )}
                        <span className="sr-only">{label}</span>
                    </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="z-[100] bg-slate-900 text-white border-slate-700 font-semibold text-[10px] uppercase tracking-wider">
                    {label}
                </TooltipContent>
            </Tooltip>
        </div>
    );
};

export const AppSidebar = () => {
    return (
        <TooltipProvider>
            <aside 
                className="h-full bg-slate-50 border-r border-slate-200 flex flex-col transition-all duration-300 z-50 shrink-0 w-[64px] relative"
            >
                {/* Unified Navigation Column - Completely Fixed & Compact */}
                <div className="flex-1 py-5 flex flex-col items-center gap-4 overflow-hidden px-2 relative">
                    {/* All Navigation Items in a single stable flow */}
                    <div className="flex flex-col items-center gap-2.5 w-full">
                        {navItems.map((item) => (
                            <NavItem key={item.path} {...item} />
                        ))}
                    </div>

                    {/* Bottom Settings - Separated by mt-auto wrapper for layout stability */}
                    <div className="mt-auto pb-2 pt-2 border-t border-slate-200/60 w-full flex flex-col items-center gap-2.5">
                        <NavItem icon={Settings} label="Settings" path="/settings" />
                    </div>
                </div>
            </aside>
        </TooltipProvider>
    );
};
