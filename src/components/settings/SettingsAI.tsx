/*
 * PolymagicPrice - AI Settings
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

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { getAISettings, saveAISettings, getAIAudit, clearAIAudit, clearAIChat } from "@/lib/core/sessionStorage";
import { AIAuditEntry, AISettings } from "@/types/quote";
import { ollamaClient } from "@/services/ai/OllamaClient";
import { isValidLocalAIPort } from "@/lib/sanitization";
import { toast } from "sonner";
import { Bot, Save, CheckCircle2, XCircle, Loader2, ExternalLink, Copy, ShieldCheck } from "lucide-react";
import { isAIAllowed, isDesktop } from "@/lib/utils";

const CONTEXT_LENGTHS = [2048, 4096, 8192, 16384, 32768];

export default function SettingsAI() {
    const [settings, setSettings] = useState<AISettings>(getAISettings());
    const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
    const [models, setModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [audit, setAudit] = useState<AIAuditEntry[]>([]);
    const [showAudit, setShowAudit] = useState(false);

    const isAllowed = isAIAllowed;
    const originsCommand = `OLLAMA_ORIGINS=file://*,null,http://localhost:*`;

    const update = <K extends keyof AISettings>(key: K, value: AISettings[K]) =>
        setSettings(prev => ({ ...prev, [key]: value }));

    const fetchModels = useCallback(async () => {
        if (!isAllowed) return;
        setIsLoadingModels(true);
        try {
            const available = await ollamaClient.listModels({ host: settings.host, port: settings.port });
            setModels(available);
            // Auto-select first model if current model not in list
            if (available.length > 0 && !available.includes(settings.model)) {
                setSettings(prev => ({ ...prev, model: available[0] }));
            }
        } catch {
            setModels([]);
        } finally {
            setIsLoadingModels(false);
        }
    }, [settings.host, settings.port, settings.model, isAllowed]);

    useEffect(() => {
        if (settings.enabled && isAllowed) {
            fetchModels();
        }
    }, [settings.enabled, settings.host, settings.port, fetchModels, isAllowed]);

    const handleSave = () => {
        if (!isAllowed) {
            toast.error("Local AI is only available on Desktop (or localhost development)");
            return;
        }

        if (!isValidLocalAIPort(settings.port)) {
            toast.error(`Port ${settings.port} is not a valid port number.`);
            return;
        }

        ollamaClient.resetStatus();
        saveAISettings(settings);
        setSettings(getAISettings());
        toast.success("AI settings saved");
    };

    const testConnection = async () => {
        if (!isAllowed) return;
        ollamaClient.resetStatus();
        setTestStatus("testing");
        try {
            const isConnected = await ollamaClient.testConnection({ host: settings.host, port: settings.port });
            setTestStatus(isConnected ? "success" : "error");
            if (isConnected) fetchModels();
        } catch {
            setTestStatus("error");
        }
    };

    const toggleAudit = () => {
        if (!showAudit) setAudit(getAIAudit().slice().reverse());
        setShowAudit(v => !v);
    };

    const copyOrigins = async () => {
        try {
            await navigator.clipboard.writeText(originsCommand);
            toast.success("Copied");
        } catch {
            toast.error("Could not copy");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold text-foreground">Local AI</h2>
                    <p className="text-sm text-muted-foreground">Configure your offline AI assistant for quoting, insights, and shop analytics via Ollama.</p>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                    <Label htmlFor="ai-enable" className={`text-sm font-medium ${!isAllowed ? 'text-muted-foreground' : ''}`}>
                        {(isAllowed && settings.enabled) ? "AI Active" : "AI Inactive"}
                        {!isAllowed && " (Localhost Only)"}
                    </Label>
                    <Switch
                        id="ai-enable"
                        checked={isAllowed && settings.enabled}
                        onCheckedChange={isAllowed ? (v) => {
                            update("enabled", v);
                            if (v) testConnection();
                        } : () => toast.info("Local AI features are restricted to the desktop version or localhost for privacy and security.")}
                        disabled={!isAllowed}
                    />
                </div>
            </div>

            <Card className="border-primary/10 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
                {(!settings.enabled || !isAllowed) && (
                    <div className="p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                            <Bot className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-medium">Local AI is {isAllowed ? "Disconnected" : "Deactivated"}</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                {isAllowed
                                    ? "Enable the switch above to connect to your local Ollama instance and unlock smart manufacturing insights."
                                    : "This feature is restricted to the desktop version or localhost for privacy and security. Local AI requires a locally accessible connection."
                                }
                            </p>
                        </div>

                        {!isAllowed && (
                            <div className="mt-8 p-6 rounded-xl bg-muted/40 text-foreground text-left max-w-2xl mx-auto space-y-4 shadow-xl border border-border animate-in fade-in zoom-in-95 duration-500">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                    <span className="text-[10px] text-muted-foreground font-mono ml-2 uppercase tracking-widest font-bold">Self-Host Instructions</span>
                                </div>
                                <div className="space-y-4 font-mono text-xs">
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground font-medium"># 1. Clone the repository</p>
                                        <p className="text-primary">git clone https://github.com/RPHobbyist/PolymagicPrice.git</p>
                                        <p className="text-primary">cd PolymagicPrice</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground font-medium"># 2. Install dependencies</p>
                                        <p className="text-primary">npm install</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground font-medium"># 3. Run locally</p>
                                        <p className="text-emerald-600 font-bold underline">npm run dev</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-border text-[10px] text-muted-foreground leading-relaxed italic">
                                    After running, visit <span className="text-foreground font-bold">http://localhost:8080</span> to use local AI offline.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {settings.enabled && isAllowed && (
                    <CardContent className="p-6 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Controls */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="ollama-host">Host</Label>
                                        <Select
                                            value={settings.host}
                                            onValueChange={(v) => update("host", v as AISettings["host"])}
                                        >
                                            <SelectTrigger id="ollama-host">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="localhost">localhost</SelectItem>
                                                <SelectItem value="127.0.0.1">127.0.0.1</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[11px] text-muted-foreground">Loopback only — shop data never leaves this machine.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="ollama-port">Port</Label>
                                        <Input
                                            id="ollama-port"
                                            type="number"
                                            value={settings.port || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "") {
                                                    update("port", 0);
                                                    return;
                                                }
                                                const num = parseInt(val);
                                                if (num < 0) return;
                                                update("port", isNaN(num) ? 0 : num);
                                            }}
                                            min={1}
                                            max={65535}
                                            className="font-mono"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="ai-model">Model</Label>
                                        {models.length > 0 ? (
                                            <Select
                                                value={settings.model}
                                                onValueChange={(v) => update("model", v)}
                                            >
                                                <SelectTrigger id="ai-model">
                                                    <SelectValue placeholder="Select a model" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {models.map((model) => (
                                                        <SelectItem key={model} value={model}>
                                                            <span className="font-mono text-sm">{model}</span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                id="ai-model"
                                                value={settings.model}
                                                onChange={(e) => update("model", e.target.value)}
                                                placeholder="e.g. llama3, mistral, gemma"
                                                maxLength={100}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <Button variant="outline" size="sm" onClick={testConnection} disabled={testStatus === "testing"}>
                                        {testStatus === "testing" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                                        Test connection
                                    </Button>
                                    {testStatus === "success" && (
                                        <p className="text-sm text-green-600 flex items-center gap-1 font-medium">
                                            <CheckCircle2 className="w-4 h-4" /> Connected — {models.length} model{models.length !== 1 ? "s" : ""} available
                                        </p>
                                    )}
                                    {testStatus === "error" && (
                                        <p className="text-sm text-destructive flex items-center gap-1">
                                            <XCircle className="w-4 h-4" /> No response from {settings.host}:{settings.port}
                                        </p>
                                    )}
                                    {isLoadingModels && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Detecting models…
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-context">Context length</Label>
                                        <Select
                                            value={String(settings.contextLength)}
                                            onValueChange={(v) => update("contextLength", parseInt(v))}
                                        >
                                            <SelectTrigger id="ai-context">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CONTEXT_LENGTHS.map(len => (
                                                    <SelectItem key={len} value={String(len)}>{len.toLocaleString()} tokens</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[11px] text-muted-foreground">Must be supported by the selected model.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="ai-timeout">Response timeout (seconds)</Label>
                                        <Input
                                            id="ai-timeout"
                                            type="number"
                                            min={10}
                                            max={300}
                                            value={Math.round(settings.requestTimeoutMs / 1000)}
                                            onChange={(e) => {
                                                const seconds = parseInt(e.target.value);
                                                update("requestTimeoutMs", isNaN(seconds) ? 90_000 : seconds * 1000);
                                            }}
                                            className="font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Temperature</Label>
                                        <span className="text-sm font-medium text-primary">{settings.temperature.toFixed(2)}</span>
                                    </div>
                                    <Slider
                                        value={[settings.temperature]}
                                        onValueChange={(v) => update("temperature", v[0])}
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        aria-label="Model temperature"
                                    />
                                    <p className="text-[11px] text-muted-foreground">Lower is more repeatable — recommended for shop analytics.</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <Label htmlFor="ai-redact">Redact personal details</Label>
                                            <p className="text-[11px] text-muted-foreground">Remove emails, phone and card numbers from AI answers.</p>
                                        </div>
                                        <Switch id="ai-redact" checked={settings.redactPII} onCheckedChange={(v) => update("redactPII", v)} />
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <Label htmlFor="ai-persist">Keep chat history</Label>
                                            <p className="text-[11px] text-muted-foreground">Stores the transcript locally so it survives a reload.</p>
                                        </div>
                                        <Switch id="ai-persist" checked={settings.persistChat} onCheckedChange={(v) => update("persistChat", v)} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="ai-instructions">Shop instructions (optional)</Label>
                                    <Textarea
                                        id="ai-instructions"
                                        value={settings.customInstructions || ""}
                                        onChange={(e) => update("customInstructions", e.target.value)}
                                        placeholder="e.g. We quote in batches of 10, always mention lead time, our house material is PETG."
                                        maxLength={1000}
                                        rows={3}
                                    />
                                    <p className="text-[11px] text-muted-foreground">Appended to the assistant's built-in rules. Safety rules always win.</p>
                                </div>
                            </div>

                            {/* Right Column: Guide */}
                            <div className="space-y-4">
                                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 shadow-sm h-fit">
                                    <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                        Ollama Connection Guide
                                    </h3>
                                    <ol className="text-xs space-y-4 text-muted-foreground list-decimal ml-4">
                                        <li className="pl-1">
                                            <strong className="text-foreground font-bold">Install</strong>: Download and run <strong className="text-foreground font-bold">Ollama</strong> from <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-primary hover:underline underline-offset-4 inline-flex items-center gap-1">ollama.com <ExternalLink className="w-3 h-3" /></a>. Default port: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">11434</code>.
                                        </li>
                                        <li className="pl-1">
                                            <strong className="text-foreground font-bold">Pull a model</strong>: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">ollama pull gemma3:1b</code> (small and fast) or <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">llama3</code>.
                                        </li>
                                        <li className="pl-1">
                                            <strong className="text-foreground font-bold">Connect</strong>: Pick the model above, click <strong className="text-foreground font-bold">Test connection</strong>, then <strong className="text-foreground font-bold">Save settings</strong>.
                                        </li>
                                        <li className="pl-1 leading-relaxed">
                                            <strong className="text-foreground font-bold">Ask away</strong>: open the assistant with the robot button, bottom-right of any page.
                                        </li>
                                    </ol>
                                </div>

                                {isDesktop && (
                                    <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-3">
                                        <h3 className="text-sm font-semibold text-foreground">Desktop app: allow the connection</h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            The desktop app runs from a local file, so Ollama must be told to accept it. Set this
                                            environment variable and restart Ollama:
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-background px-2 py-1.5 rounded font-mono text-[11px] break-all border border-border">{originsCommand}</code>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyOrigins} aria-label="Copy OLLAMA_ORIGINS value">
                                                <Copy className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            On Windows: <code className="font-mono">setx OLLAMA_ORIGINS "file://*,null,http://localhost:*"</code>
                                        </p>
                                    </div>
                                )}

                                <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                                            <ShieldCheck className="w-4 h-4 text-primary" /> Activity log
                                        </h3>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAudit}>
                                            {showAudit ? "Hide" : "Show"}
                                        </Button>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        Every action the assistant proposed, and what you approved or rejected. Stored locally.
                                    </p>
                                    {showAudit && (
                                        <div className="space-y-2">
                                            <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-background/60 divide-y divide-border">
                                                {audit.length === 0 ? (
                                                    <p className="p-3 text-[11px] text-muted-foreground italic">Nothing recorded yet.</p>
                                                ) : audit.map((entry, i) => (
                                                    <div key={i} className="p-2 text-[11px] flex gap-2">
                                                        <span className="font-mono text-muted-foreground shrink-0">
                                                            {new Date(entry.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                        <span className="font-semibold shrink-0">{entry.event}</span>
                                                        <span className="text-muted-foreground truncate" title={entry.detail}>
                                                            {entry.command}: {entry.detail}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => { clearAIAudit(); setAudit([]); toast.success("Activity log cleared"); }}
                                                >
                                                    Clear log
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => { clearAIChat(); toast.success("Stored chat cleared"); }}
                                                >
                                                    Clear stored chat
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={handleSave}
                                className="bg-gradient-accent text-white gap-2 px-8 shadow-md"
                            >
                                <Save className="w-4 h-4" /> Save Settings
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
