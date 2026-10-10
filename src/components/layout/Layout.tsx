import { Outlet } from "react-router-dom";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { Footer } from "@/components/layout/Footer";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { useState, lazy, Suspense } from "react";
import { useUI } from "@/contexts/UIContext";
import { isWhatsNewDue } from "@/components/feedback/whatsNewVersion";

import { useAIStatus } from "@/hooks/useAIStatus";
import { isAIAllowed } from "@/lib/utils";

/*
 * Everything below loads on demand.
 *
 * `Layout` is imported eagerly by App, so anything it imports lands in the entry chunk that every
 * visitor parses before first paint. That chunk was carrying the whole assistant — react-markdown
 * and its micromark parser — plus framer-motion, for a chat that only ever renders on desktop or
 * localhost (`isAIAllowed`), and two dialogs that are closed until someone opens them.
 */
const AIChatDialog = lazy(() => import("@/components/ai/AIChatDialog").then(m => ({ default: m.AIChatDialog })));
const WhatsNewDialog = lazy(() => import("@/components/feedback/WhatsNewDialog").then(m => ({ default: m.WhatsNewDialog })));
const FeedbackDialog = lazy(() => import("@/components/feedback/FeedbackDialog").then(m => ({ default: m.FeedbackDialog })));
const AssistantLauncher = lazy(() => import("@/components/ai/AssistantLauncher"));

const Layout = () => {
    const { showWhatsNew, setShowWhatsNew, showFeedback, setShowFeedback } = useUI();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const { status } = useAIStatus();

    // Once the assistant has been opened it stays mounted for the rest of the session: the
    // conversation lives in component state unless the shop turned on chat persistence, so
    // unmounting on close would throw the thread away mid-conversation.
    const [chatEverOpened, setChatEverOpened] = useState(false);

    // The release notes announce themselves once per version. Deciding that here, from a
    // localStorage read, means a shop already on this version never downloads the dialog.
    const [whatsNewDue] = useState(isWhatsNewDue);

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
                            {/* Keeps a page-level crash inside the page: the sidebar and every
                                other screen stay usable instead of the root boundary blanking
                                the whole app. */}
                            <RouteErrorBoundary>
                                <Outlet />
                            </RouteErrorBoundary>
                        </div>
                        
                        {/* Standalone Bot-Shape AI Assistant Button.
                            Hidden where local AI cannot run at all (hosted web), so users
                            aren't offered an assistant that can only report "disabled". */}
                        {!isChatOpen && isAIAllowed && (
                            <Suspense fallback={null}>
                                <AssistantLauncher
                                    status={status}
                                    onOpen={() => { setChatEverOpened(true); setIsChatOpen(true); }}
                                />
                            </Suspense>
                        )}
                    </main>
                </div>
            </div>

            {/* Fixed Industrial Footer - Full Width */}
            <Footer />

            {/* Global Dialogs — each fetched only once it is actually wanted. */}
            <Suspense fallback={null}>
                {(showWhatsNew || whatsNewDue) && (
                    <WhatsNewDialog
                        externalOpen={showWhatsNew}
                        onExternalOpenChange={setShowWhatsNew}
                    />
                )}
                {showFeedback && (
                    <FeedbackDialog
                        open={showFeedback}
                        onOpenChange={setShowFeedback}
                    />
                )}
                {isAIAllowed && (isChatOpen || chatEverOpened) && (
                    <AIChatDialog
                        open={isChatOpen}
                        onOpenChange={setIsChatOpen}
                    />
                )}
            </Suspense>
        </div>
    );
};

export default Layout;
