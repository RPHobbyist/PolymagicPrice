/*
 * PolymagicPrice - AI Chat Dialog
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

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ollamaClient, type ChatMessage } from "../../services/ai/OllamaClient";
import { gatherContext, buildSystemMessages } from "../../services/ai/contextManager";
import {
    sanitizeAIInput,
    sanitizeAIOutput,
    stripCommands,
    processAICommands,
    executeHILCommand,
    checkRateLimit,
    trimConversationHistory,
    MAX_CONVERSATION_TURNS,
} from "../../services/ai/guardrails";
import { getAISettings } from "@/lib/core/sessionStorage";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { Bot, User, Loader2, Send, ShieldCheck, Trash2, BarChart3, PackageSearch, TrendingUp } from "lucide-react";
import { cn, isAIAllowed } from "@/lib/utils";
import ReactMarkdown from "react-markdown";



interface DisplayMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    pendingAction?: {
        command: string;
        payload: Record<string, unknown>;
        message: string;
    };
}

interface AIChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}



const QUICK_ACTIONS = [
    { label: "System Audit", icon: ShieldCheck, prompt: "SYSTEM AUDIT: Perform a full diagnostic check on my shop health. Check for delayed orders, maintenance issues, and capacity overload. [PROTOCOL: Ask 3 clarifying questions before showing data]" },
    { label: "Profit Analysis", icon: TrendingUp, prompt: "PERFORM PROFIT ANALYSIS: Analyze my current profit margins. [PROTOCOL: Ask 3 clarifying questions before showing data]" },
    { label: "Stock Alerts", icon: PackageSearch, prompt: "INVENTORY CHECK: Check my material inventory for alerts. [PROTOCOL: Ask 3 clarifying questions before showing data]" },
    { label: "Shop Summary", icon: BarChart3, prompt: "BUSINESS OVERVIEW: Give me a complete overview of my shop. [PROTOCOL: Ask 3 clarifying questions before showing data]" },
];



export const AIChatDialog = ({ open, onOpenChange }: AIChatDialogProps) => {
    const isAllowed = isAIAllowed;
    const [messages, setMessages] = useState<DisplayMessage[]>([
        {
            role: "assistant",
            content: "Welcome to your **PolymagicPrice Command Center**. I have full access to your shop data — materials, machines, quotes, customers, and inventory.\n\nAsk me anything about your business, or use the quick actions below.",
            timestamp: new Date(),
        },
    ]);
    const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const { addNotification } = useNotifications();

    const settings = getAISettings();

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Check connection when dialog opens
    useEffect(() => {
        if (open && isAllowed && settings.enabled) {
            ollamaClient.testConnection().then(setIsConnected);
        }
    }, [open, settings.enabled, isAllowed]);

    // ---- Send Message (Streaming + Guardrails) ----
    const handleSend = useCallback(async (overridePrompt?: string) => {
        const rawText = overridePrompt || input.trim();
        if (!rawText || isTyping) return;

        // Rate limit check
        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
            toast.warning(`Please wait ${Math.ceil(rateCheck.waitMs / 1000)}s between messages.`);
            return;
        }

        // Input sanitization
        const inputCheck = sanitizeAIInput(rawText);
        if (!inputCheck.safe) {
            toast.error(inputCheck.reason || "Input rejected by safety filter.");
            return;
        }
        const safeInput = inputCheck.sanitized;
        // Strip technical protocols from display
        const displayContent = rawText.replace(/\[PROTOCOL:.*?\]/g, "").trim();
        const userMsg: DisplayMessage = { role: "user", content: displayContent, timestamp: new Date() };
        
        setMessages(prev => [...prev, userMsg]);
        if (!overridePrompt) setInput("");
        setIsTyping(true);

        // Build conversation history for multi-turn
        const context = gatherContext();
        const systemMsg = buildSystemMessages(context);

        // Trim conversation history
        const trimmedHistory = trimConversationHistory(conversationHistory, MAX_CONVERSATION_TURNS) as ChatMessage[];

        const newHistory: ChatMessage[] = [
            systemMsg,
            ...trimmedHistory,
            { role: "user", content: safeInput },
        ];

        // Add streaming placeholder
        const streamingMsg: DisplayMessage = {
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isStreaming: true,
        };
        setMessages(prev => [...prev, streamingMsg]);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            let fullResponse = "";

            for await (const token of ollamaClient.chatStream(newHistory, controller.signal)) {
                fullResponse += token;
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        content: stripCommands(fullResponse),
                    };
                    return updated;
                });
            }

            // Output sanitization
            const safeOutput = sanitizeAIOutput(fullResponse);

            // Finalize message for display (stripped)
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: stripCommands(safeOutput),
                    isStreaming: false,
                };
                return updated;
            });

            // Update conversation history with raw output (including commands)
            // This ensures the AI knows it sent the command
            const commandResults = processAICommands(safeOutput);

            // Handle HIL: If any command is pending, attach it to the message for approval
            const pendingAction = commandResults.find(res => res.pending);
            
            if (pendingAction) {
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        pendingAction: {
                            command: pendingAction.command,
                            payload: pendingAction.payload,
                            message: pendingAction.message
                        }
                    };
                    return updated;
                });
            }
            
            
            setConversationHistory(prev => [
                ...prev,
                { role: "user", content: safeInput },
                { role: "assistant", content: safeOutput },
                // Sanitized feedback: Avoid echoing raw command names to prevent reflection attacks
                ...commandResults.map(res => ({
                    role: "system" as const,
                    content: `[ACTION RESULT: ${res.executed ? 'completed' : res.pending ? 'awaiting approval' : 'rejected'} — ${res.message.replace(/\[CMD:[^\]]*\]/g, '').trim()}]`
                }))
            ]);
        } catch (error: unknown) {
            if (error instanceof Error && error.name === "AbortError") {
                setMessages(prev => {
                    const updated = [...prev];
                    if (updated[updated.length - 1].isStreaming) {
                        updated[updated.length - 1] = {
                            ...updated[updated.length - 1],
                            content: updated[updated.length - 1].content + "\n\n*[Response cancelled]*",
                            isStreaming: false,
                        };
                    }
                    return updated;
                });
            } else {
                toast.error(error instanceof Error ? error.message : "Failed to connect to Local AI");
                setMessages(prev => {
                    const updated = [...prev];
                    if (updated[updated.length - 1].isStreaming) {
                        updated[updated.length - 1] = {
                            ...updated[updated.length - 1],
                            content: "⚠️ Could not connect to Ollama. Make sure it's running locally.",
                            isStreaming: false,
                        };
                    }
                    return updated;
                });
            }
        } finally {
            setIsTyping(false);
            abortControllerRef.current = null;
        }
    }, [input, isTyping, conversationHistory]);

    const handleApproveAction = async (msgIndex: number) => {
        const msg = messages[msgIndex];
        if (!msg.pendingAction) return;

        const { command, payload } = msg.pendingAction;
        const result = executeHILCommand(command, payload, addNotification);

        if (result.executed) {
            // Update message to show success
            setMessages(prev => {
                const updated = [...prev];
                updated[msgIndex] = {
                    ...updated[msgIndex],
                    pendingAction: undefined, // Clear action
                    content: updated[msgIndex].content + `\n\n✅ **Action Approved**: ${result.message}`
                };
                return updated;
            });

            // Add to conversation history so AI knows it was approved
            setConversationHistory(prev => [
                ...prev,
                { role: "system" as const, content: `[HIL ACTION APPROVED: ${command} - ${result.message}]` }
            ]);
        }
    };

    const handleRejectAction = (msgIndex: number) => {
        const msg = messages[msgIndex];
        if (!msg.pendingAction) return;

        setMessages(prev => {
            const updated = [...prev];
            updated[msgIndex] = {
                ...updated[msgIndex],
                pendingAction: undefined,
                content: updated[msgIndex].content + `\n\n❌ **Action Rejected by user**.`
            };
            return updated;
        });

        setConversationHistory(prev => [
            ...prev,
            { role: "system" as const, content: `[HIL ACTION REJECTED BY USER: ${msg.pendingAction?.command}]` }
        ]);
    };

    // ---- Clear Chat ----
    const handleClear = useCallback(() => {
        setMessages([{
            role: "assistant",
            content: "Chat cleared. How can I help you?",
            timestamp: new Date(),
        }]);
        setConversationHistory([]);
    }, []);

    // ---- Stop Streaming ----
    const handleStop = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0 bg-card border-l overflow-hidden">
                {/* Header: Clean Minimalist Strip */}
                <SheetHeader className="p-3 pr-10 border-b bg-white relative">
                    <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                            <img 
                                src="/ai-bot-icon.jpg" 
                                alt="Bot" 
                                className="w-10 h-10 rounded-full border-2 border-slate-100 shadow-sm"
                            />
                            <div className={cn(
                                "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm",
                                isConnected === true ? "bg-emerald-500" :
                                isConnected === false ? "bg-red-500" :
                                "bg-slate-300"
                            )} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <SheetTitle className="text-sm font-semibold tracking-tight text-slate-900 truncate">
                                AI Assistant
                            </SheetTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-medium text-slate-400">
                                    {settings.model || "Offline"}
                                </span>
                                <span className="text-[10px] font-medium text-blue-500 flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                                    Local
                                </span>
                            </div>
                        </div>
                    </div>
                </SheetHeader>



                {/* Messages: Tactical Flow */}
                <ScrollArea className="flex-1 p-3">
                    <div className="space-y-4 pb-4 pt-2">
                        {messages.map((msg, i) => (
                            <React.Fragment key={i}>
                                <div className={cn(
                                    "flex gap-2.5 max-w-[92%]",
                                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}>
                                    <div className={cn(
                                        "w-7 h-7 shrink-0 flex items-center justify-center text-slate-400",
                                    )}>
                                        {msg.role === "assistant" ? (
                                            <Bot className="w-4 h-4" />
                                        ) : (
                                            <User className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className={cn(
                                        "rounded-xl px-3.5 py-2.5 text-sm shadow-sm",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-slate-100/80 text-slate-700 rounded-tl-none border border-slate-200/50"
                                    )}>
                                        <div className={cn(
                                            "leading-relaxed prose prose-sm dark:prose-invert max-w-none",
                                            "[&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-1",
                                            "[&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm",
                                            "[&_strong]:font-bold [&_strong]:text-slate-900",
                                            "[&_code]:text-xs [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono",
                                            "[&_pre]:bg-slate-950/5 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:text-xs [&_pre]:border [&_pre]:border-slate-200/50",
                                            msg.role === "user" && "[&_*]:text-primary-foreground [&_strong]:text-white"
                                        )}>
                                            <ReactMarkdown 
                                                skipHtml={true}
                                                disallowedElements={['script', 'iframe', 'style', 'html', 'body', 'link', 'object', 'embed']}
                                                unwrapDisallowed={true}
                                                components={{
                                                    a: ({...props}) => (
                                                        <a 
                                                            {...props} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="text-blue-600 hover:underline font-medium"
                                                        />
                                                    )
                                                }}
                                                urlTransform={(uri) => {
                                                    const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
                                                    try {
                                                        const url = new URL(uri, window.location.href);
                                                        if (safeProtocols.includes(url.protocol)) return uri;
                                                    } catch {
                                                        // Handle relative paths or invalid URLs
                                                        if (uri.startsWith('/') || uri.startsWith('./')) return uri;
                                                    }
                                                    console.warn(`[Security] Blocked unsafe URI in markdown [${uri}]`);
                                                    return ""; // Destroy unsafe links
                                                }}
                                            >
                                                {msg.content || " "}
                                            </ReactMarkdown>
                                            {msg.isStreaming && (
                                                <span className="inline-block w-1.5 h-4 bg-primary/40 animate-pulse ml-1 rounded-full align-middle" />
                                            )}
                                        </div>
                                        <div className={cn(
                                            "text-[9px] mt-1.5 font-mono uppercase tracking-widest opacity-40 text-right",
                                            msg.role === "user" && "text-primary-foreground/70"
                                        )}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                                        </div>
                                    </div>
                                </div>
    
                                {/* HIL Approval Card */}
                                {msg.pendingAction && (
                                    <div className="ml-10 mr-4 mb-4 p-4 rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2 text-primary">
                                            <ShieldCheck className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Action Approval Required</span>
                                        </div>
                                        <div className="text-sm text-slate-700 bg-white/50 p-3 rounded-lg border border-slate-200">
                                            <div className="font-semibold mb-1">{msg.pendingAction.command.replace('_', ' ')}</div>
                                            <pre className="text-[10px] font-mono whitespace-pre-wrap break-all opacity-70">
                                                {JSON.stringify(msg.pendingAction.payload, null, 2)}
                                            </pre>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                size="sm" 
                                                className="flex-1 bg-primary text-white hover:bg-primary/90"
                                                onClick={() => handleApproveAction(i)}
                                            >
                                                Approve
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
                                                onClick={() => handleRejectAction(i)}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}



                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                {/* Footer: Tactical Action Deck + Terminal Input */}
                <div className="border-t bg-slate-50/90 backdrop-blur-xl">
                    {conversationHistory.length === 0 && !isTyping && settings.enabled && (
                        <div className="px-3 pt-3 pb-2">
                            <div className="grid grid-cols-2 gap-2">
                                {QUICK_ACTIONS.map((action) => (
                                    <button
                                        key={action.label}
                                        onClick={() => handleSend(action.prompt)}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl text-left
                                                 bg-white hover:bg-slate-50 border border-slate-100
                                                 transition-all duration-200 group active:scale-[0.98]"
                                    >
                                        <div className="text-slate-400 group-hover:text-primary transition-colors shrink-0">
                                            <action.icon className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[11px] font-semibold text-slate-700 truncate">{action.label}</span>
                                            <span className="text-[9px] text-slate-400 leading-none mt-0.5">Run analysis</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}



                    <div className="p-3 mb-2 flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClear}
                            className="h-9 w-9 shrink-0 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                            title="Clear Chat"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="relative flex-1 group">
                             <Input
                                placeholder={settings.enabled ? "Ask anything..." : "Offline..."}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                disabled={!settings.enabled || isTyping}
                                className="bg-slate-50/50 border-slate-200/60 h-9 px-3 text-slate-800 placeholder:text-slate-400 
                                         focus-visible:ring-primary/10 focus-visible:border-primary/30 rounded-lg text-sm"
                                maxLength={2000}
                            />
                        </div>
                        {isTyping ? (
                            <Button 
                                className="shrink-0 h-9 w-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white p-0 flex items-center justify-center" 
                                onClick={handleStop} 
                                title="Abort Generation"
                            >
                                <div className="w-3 h-3 rounded-sm bg-white" />
                            </Button>
                        ) : (
                            <Button 
                                className={cn(
                                    "shrink-0 h-9 w-9 rounded-lg transition-all duration-300 p-0 flex items-center justify-center",
                                    input.trim() ? "bg-primary hover:bg-primary/90 shadow-md shadow-primary/10" : "bg-slate-100 text-slate-400"
                                )}
                                onClick={() => handleSend()} 
                                disabled={!settings.enabled || !input.trim()}
                                aria-label="Send message"
                            >
                                <Send className="w-4 h-4 transition-transform" />
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
