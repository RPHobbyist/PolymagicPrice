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

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ollamaClient, OllamaError, type ChatMessage } from "@/services/ai/OllamaClient";
import { gatherContext, buildSystemMessages } from "@/services/ai/contextManager";
import {
    sanitizeAIInput,
    renderSafeText,
    redactSensitive,
    finalizeAIOutput,
    checkRateLimit,
    trimConversationHistory,
    MAX_CONVERSATION_TURNS,
    MAX_INPUT_LENGTH,
} from "@/services/ai/guardrails";
import {
    processAICommands,
    executeHILCommand,
    recordCommandRejection,
} from "@/services/ai/commands";
import { getAIChat, saveAIChat, clearAIChat, appendAIAudit } from "@/lib/core/sessionStorage";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { useCurrency } from "@/hooks/useCurrency";
import { useAISettings } from "@/hooks/useAISettings";
import { makeFormatters } from "@/lib/currencyFormat";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Bot, User, Send, ShieldCheck, Trash2, BarChart3, PackageSearch, TrendingUp, Copy, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PendingAction {
    command: string;
    payload: Record<string, unknown>;
    message: string;
}

interface DisplayMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    pendingActions?: PendingAction[];
}

interface AIChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const GREETING =
    "Ask me anything about your shop — profitability, capacity, stock, customers or a specific order. Everything is answered from your local data.";

const QUICK_ACTIONS = [
    {
        label: "Shop Health",
        icon: ShieldCheck,
        prompt: "Give me a shop health summary: delayed orders, machines needing maintenance, capacity and any stock problems, with the numbers.",
    },
    {
        label: "Profit Analysis",
        icon: TrendingUp,
        prompt: "Analyse my profit: total revenue, profit, average margin and how the last 30 days compare with the 30 days before.",
    },
    {
        label: "Stock Alerts",
        icon: PackageSearch,
        prompt: "Which materials are low or heavily reserved, and how much of each do I have left?",
    },
    {
        label: "Shop Summary",
        icon: BarChart3,
        prompt: "Give me a short overview of the business: orders, revenue, busiest machine and most used material.",
    },
];

const initialMessages = (persistChat: boolean): DisplayMessage[] => {
    if (persistChat) {
        const stored = getAIChat();
        if (stored.length > 0) {
            return stored.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: new Date(m.timestamp),
            }));
        }
    }
    return [{ role: "assistant", content: GREETING, timestamp: new Date() }];
};

const ChatBody = ({ open, onOpenChange }: AIChatDialogProps) => {
    const settings = useAISettings();
    const { currency, conversionRate } = useCurrency();
    const { addNotification } = useNotifications();

    const [messages, setMessages] = useState<DisplayMessage[]>(() => initialMessages(settings.persistChat));
    const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    // A rapid double-click on Approve fires two synchronous event handlers
    // before React re-renders with the action removed from pendingActions —
    // without this lock, CREATE_NOTIFICATION (no duplicate check, unlike
    // ADD_CLIENT) could execute twice. Keyed by object identity, not index:
    // resolving one of several pending actions shifts the others' indices.
    const resolvingActionsRef = useRef<WeakSet<PendingAction>>(new WeakSet());

    const formatters = useMemo(
        () => makeFormatters(currency, conversionRate),
        [currency, conversionRate]
    );

    // Auto-scroll, but only when the user is already at the bottom: during a
    // stream this fires on every token and used to yank them back mid-read.
    useEffect(() => {
        const viewport = viewportRef.current?.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
        if (viewport) {
            const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
            if (distanceFromBottom > 120) return;
        }
        scrollRef.current?.scrollIntoView({ behavior: isTyping ? "auto" : "smooth" });
    }, [messages, isTyping]);

    // Persist the transcript (without the streaming placeholder). Skipped
    // while a response is streaming: the persisted content — completed
    // messages only — can't change mid-stream, so writing on every token
    // was pure waste; this writes once, right as the response settles.
    useEffect(() => {
        if (!settings.persistChat || isTyping) return;
        const persistable = messages
            .filter(m => !m.isStreaming && m.content.trim())
            .map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp.toISOString() }));
        saveAIChat(persistable);
    }, [messages, isTyping, settings.persistChat]);

    // Check connection when the panel opens or the target changes.
    useEffect(() => {
        if (open && settings.enabled) {
            ollamaClient.testConnection().then(setIsConnected);
        }
    }, [open, settings.enabled, settings.host, settings.port]);

    const handleSend = useCallback(async (overridePrompt?: string) => {
        const rawText = overridePrompt || input.trim();
        if (!rawText || isTyping) return;

        // Guardrails first: a rejected message shouldn't burn the rate-limit window.
        const inputCheck = sanitizeAIInput(rawText);
        if (!inputCheck.safe) {
            toast.error(inputCheck.reason || "Message rejected by the safety filter.");
            appendAIAudit({ event: 'BLOCKED', command: 'USER_INPUT', detail: inputCheck.reason || 'rejected' });
            return;
        }

        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
            toast.warning(`Please wait ${Math.ceil(rateCheck.waitMs / 1000)}s between messages.`);
            return;
        }

        const safeInput = inputCheck.sanitized;
        setMessages(prev => [...prev, { role: "user", content: rawText, timestamp: new Date() }]);
        if (!overridePrompt) setInput("");
        setIsTyping(true);

        const context = gatherContext();
        const systemMsg = buildSystemMessages(context, {
            fmt: formatters,
            userMessage: safeInput,
            budgetTokens: Math.min(1400, Math.floor(settings.contextLength * 0.4)),
            customInstructions: settings.customInstructions,
        });

        const trimmedHistory = trimConversationHistory(conversationHistory, MAX_CONVERSATION_TURNS);

        const newHistory: ChatMessage[] = [
            systemMsg,
            ...trimmedHistory,
            { role: "user", content: safeInput },
        ];

        setMessages(prev => [...prev, { role: "assistant", content: "", timestamp: new Date(), isStreaming: true }]);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            let fullResponse = "";

            for await (const token of ollamaClient.chatStream(newHistory, controller.signal)) {
                fullResponse += token;
                // Redact BEFORE stripping command blocks, matching finalizeAIOutput's
                // order — reversing it lets renderSafeText splice a phone/card number
                // flush against the char that followed a [CMD:...] block, which made
                // the digit-guard treat it as "inside a longer number" and skip it,
                // showing raw PII for the rest of the stream until the redact-then-
                // render final pass silently "healed" it on completion.
                const live = renderSafeText(redactSensitive(fullResponse, { redactPII: settings.redactPII }).text);
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...updated[updated.length - 1], content: live };
                    return updated;
                });
            }

            const finalized = finalizeAIOutput(fullResponse, { redactPII: settings.redactPII });
            if (finalized.findings.length > 0) {
                appendAIAudit({ event: 'REDACTED', command: 'RESPONSE', detail: finalized.findings.join(", ") });
            }

            // Commands are parsed from the raw text so redaction can't corrupt a payload.
            const commandResults = processAICommands(fullResponse);
            const pendingActions = commandResults
                .filter(res => res.pending && res.payload)
                .map(res => ({ command: res.command, payload: res.payload!, message: res.message }));

            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: finalized.display,
                    isStreaming: false,
                    pendingActions: pendingActions.length > 0 ? pendingActions : undefined,
                };
                return updated;
            });

            setConversationHistory(prev => [
                ...prev,
                { role: "user", content: safeInput },
                { role: "assistant", content: fullResponse },
                ...commandResults
                    .filter(res => !res.pending)
                    .map(res => ({
                        role: "system" as const,
                        content: `[ACTION RESULT: rejected — ${res.message}]`,
                    })),
            ]);
        } catch (error: unknown) {
            const ollamaError = error instanceof OllamaError ? error : null;
            const cancelled = ollamaError?.kind === 'aborted';
            const message = ollamaError
                ? ollamaError.userMessage
                : error instanceof Error ? error.message : "Failed to reach the local AI.";

            if (!cancelled) toast.error(message);

            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.isStreaming) {
                    updated[updated.length - 1] = {
                        ...last,
                        content: cancelled
                            ? `${last.content}\n\n*[Response cancelled]*`
                            : `⚠️ ${message}`,
                        isStreaming: false,
                    };
                }
                return updated;
            });
        } finally {
            setIsTyping(false);
            abortControllerRef.current = null;
        }
    }, [input, isTyping, conversationHistory, formatters, settings.contextLength, settings.customInstructions, settings.redactPII]);

    const resolveAction = useCallback((msgIndex: number, actionIndex: number, approve: boolean) => {
        const action = messages[msgIndex]?.pendingActions?.[actionIndex];
        if (!action) return;
        if (resolvingActionsRef.current.has(action)) return;
        resolvingActionsRef.current.add(action);

        // Run the command outside the state updater: updaters must stay pure, or
        // an approved action could execute twice.
        let note: string;
        try {
            if (approve) {
                const result = executeHILCommand(action.command, action.payload, addNotification);
                note = result.executed
                    ? `\n\n✅ **Approved**: ${result.message}`
                    : `\n\n⚠️ **Could not run ${action.command}**: ${result.message}`;
            } else {
                recordCommandRejection(action.command);
                note = `\n\n❌ **${action.command.replace(/_/g, " ")} rejected.**`;
            }
        } catch (err: unknown) {
            // Release the lock on failure (e.g. a full storage quota) so the
            // card stays actionable instead of silently no-op'ing forever.
            resolvingActionsRef.current.delete(action);
            toast.error(err instanceof Error ? err.message : `Could not run ${action.command}.`);
            return;
        }

        setMessages(prev => {
            const updated = [...prev];
            const message = updated[msgIndex];
            if (!message?.pendingActions) return prev;

            const remaining = message.pendingActions.filter((_, i) => i !== actionIndex);
            updated[msgIndex] = {
                ...message,
                content: message.content + note,
                pendingActions: remaining.length > 0 ? remaining : undefined,
            };
            return updated;
        });

        setConversationHistory(prev => [
            ...prev,
            {
                role: "system" as const,
                content: `[ACTION ${approve ? "APPROVED" : "REJECTED"} BY USER]`,
            },
        ]);
    }, [addNotification, messages]);

    const handleClear = useCallback(() => {
        setMessages([{ role: "assistant", content: GREETING, timestamp: new Date() }]);
        setConversationHistory([]);
        clearAIChat();
    }, []);

    const handleStop = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    const handleCopy = useCallback(async (index: number, content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(current => (current === index ? null : current)), 1500);
        } catch {
            toast.error("Could not copy to clipboard");
        }
    }, []);

    const showQuickActions = conversationHistory.length === 0 && !isTyping && settings.enabled;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0 bg-background border-l overflow-hidden">
                <SheetHeader className="p-3 pr-10 border-b bg-card relative">
                    <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                            <img
                                src="/ai-bot-icon.webp"
                                alt=""
                                className="w-10 h-10 rounded-full border-2 border-border shadow-sm"
                            />
                            <span
                                className={cn(
                                    "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background shadow-sm",
                                    isConnected === true ? "bg-emerald-500" :
                                        isConnected === false ? "bg-destructive" :
                                            "bg-muted-foreground/40"
                                )}
                            />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <SheetTitle className="text-sm font-semibold tracking-tight text-foreground truncate">
                                AI Assistant
                            </SheetTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-medium text-muted-foreground">
                                    {settings.model || "Offline"}
                                </span>
                                <span className="text-[10px] font-medium text-primary flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-primary" />
                                    Local
                                </span>
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 p-3">
                    <div className="space-y-4 pb-4 pt-2" aria-live="polite" aria-atomic="false" ref={viewportRef}>
                        {messages.map((msg, i) => (
                            <React.Fragment key={i}>
                                <div className={cn(
                                    "flex gap-2.5 max-w-[92%] group/msg",
                                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}>
                                    <div className="w-7 h-7 shrink-0 flex items-center justify-center text-muted-foreground">
                                        {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    </div>
                                    <div className={cn(
                                        "rounded-xl px-3.5 py-2.5 text-sm shadow-sm min-w-0",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-muted text-foreground rounded-tl-none border border-border/60"
                                    )}>
                                        <div className={cn(
                                            "leading-relaxed max-w-none break-words",
                                            "[&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:my-1.5 [&_ol]:pl-4 [&_ol]:list-decimal [&_li]:my-1",
                                            "[&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold",
                                            "[&_strong]:font-bold",
                                            "[&_code]:text-xs [&_code]:bg-background/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono",
                                            "[&_pre]:bg-background/60 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:text-xs [&_pre]:border [&_pre]:border-border [&_pre]:overflow-x-auto",
                                            "[&_table]:w-full [&_table]:text-xs [&_table]:my-2 [&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:border-border [&_th]:py-1 [&_td]:py-1 [&_td]:border-b [&_td]:border-border/40",
                                        )}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                skipHtml={true}
                                                disallowedElements={['script', 'iframe', 'style', 'html', 'body', 'link', 'object', 'embed']}
                                                unwrapDisallowed={true}
                                                components={{
                                                    a: ({ ...props }) => (
                                                        <a
                                                            {...props}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="underline underline-offset-2 font-medium"
                                                        />
                                                    )
                                                }}
                                                urlTransform={(uri) => {
                                                    // Load-bearing with skipHtml: this is what blocks
                                                    // javascript: and data: URLs in model output.
                                                    const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
                                                    try {
                                                        const url = new URL(uri, window.location.href);
                                                        if (safeProtocols.includes(url.protocol)) return uri;
                                                    } catch {
                                                        if (uri.startsWith('/') || uri.startsWith('./')) return uri;
                                                    }
                                                    console.warn(`[Security] Blocked unsafe URI in markdown [${uri}]`);
                                                    return "";
                                                }}
                                            >
                                                {msg.content || " "}
                                            </ReactMarkdown>
                                            {msg.isStreaming && (
                                                <span role="status" className="inline-block w-1.5 h-4 bg-primary/40 animate-pulse ml-1 rounded-full align-middle" />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-end gap-2 mt-1.5">
                                            {msg.role === "assistant" && !msg.isStreaming && msg.content.trim() && (
                                                <button
                                                    onClick={() => handleCopy(i, msg.content)}
                                                    className="opacity-0 group-hover/msg:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                                    aria-label="Copy message"
                                                    title="Copy message"
                                                >
                                                    {copiedIndex === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            )}
                                            <span className={cn(
                                                "text-[9px] font-mono uppercase tracking-widest opacity-50",
                                                msg.role === "user" && "text-primary-foreground/70"
                                            )}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {msg.pendingActions?.map((action, actionIndex) => (
                                    <div
                                        key={`${i}-${action.command}-${actionIndex}`}
                                        className="ml-10 mr-4 mb-4 p-4 rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-300"
                                    >
                                        <div className="flex items-center gap-2 text-primary">
                                            <ShieldCheck className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Action approval required</span>
                                        </div>
                                        <div className="text-sm text-foreground bg-background/60 p-3 rounded-lg border border-border">
                                            <div className="font-semibold mb-1">{action.command.replace(/_/g, " ")}</div>
                                            <pre className="text-[10px] font-mono whitespace-pre-wrap break-all opacity-70">
                                                {JSON.stringify(action.payload, null, 2)}
                                            </pre>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="flex-1" onClick={() => resolveAction(i, actionIndex, true)}>
                                                Approve
                                            </Button>
                                            <Button size="sm" variant="outline" className="flex-1" onClick={() => resolveAction(i, actionIndex, false)}>
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}

                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                <div className="border-t bg-card/80 backdrop-blur-xl">
                    {showQuickActions && (
                        <div className="px-3 pt-3 pb-2">
                            <div className="grid grid-cols-2 gap-2">
                                {QUICK_ACTIONS.map((action) => (
                                    <button
                                        key={action.label}
                                        onClick={() => handleSend(action.prompt)}
                                        className="flex items-center gap-2.5 p-2.5 rounded-xl text-left bg-background hover:bg-muted border border-border
                                                 transition-all duration-200 group active:scale-[0.98]"
                                    >
                                        <span className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                                            <action.icon className="w-3.5 h-3.5" />
                                        </span>
                                        <span className="flex flex-col min-w-0">
                                            <span className="text-[11px] font-semibold text-foreground truncate">{action.label}</span>
                                            <span className="text-[9px] text-muted-foreground leading-none mt-0.5">Answer from local data</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isConnected === false && settings.enabled && (
                        <div className="mx-3 mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-muted-foreground">
                            <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                            <span>
                                Ollama is not responding on {settings.host}:{settings.port}. Start it, then check Settings → Local AI.
                            </span>
                        </div>
                    )}

                    <div className="p-3 mb-2 flex items-end gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClear}
                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                            title="Clear chat"
                            aria-label="Clear chat"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <Textarea
                            placeholder={settings.enabled ? "Ask anything… (Shift+Enter for a new line)" : "Local AI is disabled in Settings"}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            disabled={!settings.enabled || isTyping}
                            className="flex-1 min-h-[36px] max-h-32 resize-none py-2 text-sm"
                            rows={1}
                            maxLength={MAX_INPUT_LENGTH}
                            aria-label="Message the AI assistant"
                        />
                        {isTyping ? (
                            <Button
                                className="shrink-0 h-9 w-9 rounded-lg p-0 flex items-center justify-center"
                                onClick={handleStop}
                                title="Stop generating"
                                aria-label="Stop generating"
                            >
                                <span className="w-3 h-3 rounded-sm bg-primary-foreground" />
                            </Button>
                        ) : (
                            <Button
                                className="shrink-0 h-9 w-9 rounded-lg p-0 flex items-center justify-center"
                                onClick={() => handleSend()}
                                disabled={!settings.enabled || !input.trim()}
                                aria-label="Send message"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export const AIChatDialog = (props: AIChatDialogProps) => (
    <ErrorBoundary
        fallback={
            <Sheet open={props.open} onOpenChange={props.onOpenChange}>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] p-6">
                    <SheetHeader>
                        <SheetTitle className="text-sm">AI Assistant</SheetTitle>
                    </SheetHeader>
                    <p className="mt-4 text-sm text-muted-foreground">
                        The assistant hit an unexpected error. Close and reopen this panel to start again.
                    </p>
                </SheetContent>
            </Sheet>
        }
    >
        <ChatBody {...props} />
    </ErrorBoundary>
);
