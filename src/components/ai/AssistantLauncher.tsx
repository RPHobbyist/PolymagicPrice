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

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const BOT_POSITION_KEY = "ai_bot_position";

interface AssistantLauncherProps {
    status: "connected" | "disconnected" | "disabled" | "checking";
    onOpen: () => void;
}

/**
 * The draggable assistant button.
 *
 * It lives in its own module because it is the only thing in the layout that needs framer-motion,
 * and the layout is in the entry chunk every visitor parses. The assistant is available on desktop
 * and localhost only, so on the hosted site this code is never fetched at all.
 */
const AssistantLauncher = ({ status, onOpen }: AssistantLauncherProps) => {
    const [botPosition, setBotPosition] = useState(() => {
        try {
            const saved = localStorage.getItem(BOT_POSITION_KEY);
            return saved ? JSON.parse(saved) : { x: 0, y: 0 };
        } catch {
            return { x: 0, y: 0 };
        }
    });

    const handleDragEnd = (_: unknown, info: { offset: { x: number; y: number } }) => {
        const newPos = {
            x: botPosition.x + info.offset.x,
            y: botPosition.y + info.offset.y
        };
        setBotPosition(newPos);
        try {
            localStorage.setItem(BOT_POSITION_KEY, JSON.stringify(newPos));
        } catch {
            // Where site data is blocked the button simply forgets where it was left.
        }
    };

    const statusColor = () => {
        switch (status) {
            case "connected": return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
            case "disconnected": return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
            case "disabled": return "bg-slate-300";
            default: return "bg-slate-400 animate-pulse";
        }
    };

    const statusTitle = () => {
        switch (status) {
            case "connected": return "Print Assistant Online (Local AI Connected)";
            case "disconnected": return "Ollama Offline - Check if local service is running";
            case "disabled": return "AI Assistant Disabled in Settings";
            default: return "Checking connection...";
        }
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            initial={botPosition}
            animate={botPosition}
            dragConstraints={{ left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 100, bottom: 0 }}
            className="fixed bottom-28 right-8 z-[60] cursor-grab active:cursor-grabbing select-none"
        >
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onOpen}
                            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start from blocking click
                            aria-label="Toggle AI Assistant"
                            className="relative group transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus-visible:outline-none active:outline-none ring-0 focus:ring-0 outline-none"
                        >
                            <div className="relative group">
                                <img
                                    src="/ai-bot-icon.webp"
                                    alt="AI Assistant"
                                    className={cn(
                                        "w-16 h-16 rounded-full border-2 shadow-xl group-hover:scale-110 transition-transform duration-300 object-cover",
                                        status === "disconnected" ? "border-red-200 grayscale-[20%]" : "border-primary/20"
                                    )}
                                />
                                <span
                                    className={cn(
                                        "absolute top-0 right-0 w-4 h-4 border-2 border-white rounded-full transition-colors duration-300",
                                        statusColor()
                                    )}
                                ></span>
                            </div>

                            {/* Invisible Hitbox for better usability */}
                            <div className="absolute inset-0 -m-4 rounded-full bg-transparent" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="font-medium">
                        {statusTitle()}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </motion.div>
    );
};

export default AssistantLauncher;
