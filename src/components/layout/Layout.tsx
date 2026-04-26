import { Outlet } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { useState } from "react";
import { WhatsNewDialog } from "@/components/feedback/WhatsNewDialog";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { useUI } from "@/contexts/UIContext";
import { AIChatDialog } from "@/components/ai/AIChatDialog";
import { 
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAIStatus } from "@/hooks/useAIStatus";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const BOT_POSITION_KEY = "ai_bot_position";

const Layout = () => {
    const { showWhatsNew, setShowWhatsNew, showFeedback, setShowFeedback } = useUI();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const { status } = useAIStatus();

    // Draggable position state
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
        localStorage.setItem(BOT_POSITION_KEY, JSON.stringify(newPos));
    };

    const getStatusColor = () => {
        switch (status) {
            case "connected": return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
            case "disconnected": return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";
            case "disabled": return "bg-slate-300";
            default: return "bg-slate-400 animate-pulse";
        }
    };

    const getStatusTitle = () => {
        switch (status) {
            case "connected": return "Print Assistant Online (Local AI Connected)";
            case "disconnected": return "Ollama Offline - Check if local service is running";
            case "disabled": return "AI Assistant Disabled in Settings";
            default: return "Checking connection...";
        }
    };

    return (
        <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-slate-100/50">
            {/* Top Brand Header */}
            <AppHeader />

            <div className="flex-1 flex overflow-hidden w-full max-w-[1800px] mx-auto bg-white shadow-card relative z-0">
                {/* Fixed Side Navigation */}
                <AppSidebar />
                
                {/* Main Workspace */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50">
                    <main className="flex-1 w-full overflow-y-auto scrollbar-none relative flex flex-col">
                        <div className="flex-1 flex flex-col">
                            <Outlet />
                        </div>
                        
                        {/* Standalone Bot-Shape AI Assistant Button */}
                        {!isChatOpen && (
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
                                                onClick={() => setIsChatOpen(true)}
                                                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start from blocking click
                                                aria-label="Toggle AI Assistant"
                                                className="relative group transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus-visible:outline-none active:outline-none ring-0 focus:ring-0 outline-none"
                                            >
                                                <div className="relative group">
                                                    <img 
                                                        src="./ai-bot-icon.jpg" 
                                                        alt="AI Assistant" 
                                                        className={cn(
                                                            "w-16 h-16 rounded-full border-2 shadow-xl group-hover:scale-110 transition-transform duration-300 object-cover",
                                                            status === "disconnected" ? "border-red-200 grayscale-[20%]" : "border-primary/20"
                                                        )}
                                                    />
                                                    <span 
                                                        className={cn(
                                                            "absolute top-0 right-0 w-4 h-4 border-2 border-white rounded-full transition-colors duration-300",
                                                            getStatusColor()
                                                        )} 
                                                    ></span>
                                                </div>
                                                
                                                {/* Invisible Hitbox for better usability */}
                                                <div className="absolute inset-0 -m-4 rounded-full bg-transparent" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="font-medium">
                                            {getStatusTitle()}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </motion.div>
                        )}
                    </main>
                </div>
            </div>

            {/* Fixed Industrial Footer - Full Width */}
            <Footer />

            {/* Global Dialogs */}
            <WhatsNewDialog 
                externalOpen={showWhatsNew}
                onExternalOpenChange={setShowWhatsNew}
            />
            <FeedbackDialog 
                open={showFeedback}
                onOpenChange={setShowFeedback}
            />
            <AIChatDialog 
                open={isChatOpen} 
                onOpenChange={setIsChatOpen} 
            />
        </div>
    );
};

export default Layout;
