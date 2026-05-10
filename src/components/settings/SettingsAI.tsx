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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { getAISettings, saveAISettings } from "@/lib/core/sessionStorage";
import { ollamaClient } from "@/services/ai/OllamaClient";
import { isPortForbidden } from "@/lib/sanitization";
import { toast } from "sonner";
import { Bot, Save, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { isAIAllowed } from "@/lib/utils";

export default function SettingsAI() {
    const [settings, setSettings] = useState(getAISettings());
    const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
    const [models, setModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    const isAllowed = isAIAllowed;

    const fetchModels = useCallback(async () => {
        if (!isAllowed) return;
        setIsLoadingModels(true);
        try {
            const available = await ollamaClient.listModels(settings.port);
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
    }, [settings.port, settings.model, isAllowed]);

    useEffect(() => {
        if (settings.enabled && isAllowed) {
            fetchModels();
        }
    }, [settings.enabled, settings.port, fetchModels, isAllowed]);

    const handleSave = () => {
        if (!isAllowed) {
            toast.error("Local AI is only available on Desktop (or localhost development)");
            return;
        }

        // Port Blacklisting
        if (isPortForbidden(settings.port)) {
            toast.error(`Port ${settings.port} is restricted for system security.`);
            return;
        }

        ollamaClient.resetStatus();
        saveAISettings(settings);
        toast.success("AI Settings saved successfully");
    };

    const testConnection = async () => {
        if (!isAllowed) return;
        ollamaClient.resetStatus();
        setTestStatus("testing");
        try {
            const isConnected = await ollamaClient.testConnection(settings.port);
            setTestStatus(isConnected ? "success" : "error");
            if (isConnected) fetchModels();
        } catch {
            setTestStatus("error");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold text-foreground">Local AI</h2>
                    <p className="text-sm text-slate-600">Configure your offline AI assistant for quoting, insights, and shop analytics via Ollama.</p>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                    <Label htmlFor="ai-enable" className={`text-sm font-medium ${!isAllowed ? 'text-slate-600' : ''}`}>
                        {(isAllowed && settings.enabled) ? "AI Active" : "AI Inactive"}
                        {!isAllowed && " (Localhost Only)"}
                    </Label>
                    <Switch
                        id="ai-enable"
                        checked={isAllowed && settings.enabled}
                        onCheckedChange={isAllowed ? (v) => {
                            setSettings({ ...settings, enabled: v });
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
                            <Bot className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-medium">Local AI is {isAllowed ? "Disconnected" : "Deactivated"}</h3>
                            <p className="text-sm text-slate-600 max-w-sm mx-auto">
                                {isAllowed 
                                    ? "Enable the switch above to connect to your local Ollama instance and unlock smart manufacturing insights."
                                    : "This feature is restricted to the desktop version or localhost for privacy and security. Local AI requires a locally accessible connection."
                                }
                            </p>
                        </div>

                        {!isAllowed && (
                            <div className="mt-8 p-6 rounded-xl bg-slate-50 text-slate-900 text-left max-w-2xl mx-auto space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-500">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                    <span className="text-[10px] text-slate-400 font-mono ml-2 uppercase tracking-widest font-bold">Self-Host Instructions</span>
                                </div>
                                <div className="space-y-4 font-mono text-xs">
                                    <div className="space-y-1">
                                        <p className="text-slate-400 font-medium"># 1. Clone the repository</p>
                                        <p className="text-indigo-600">git clone https://github.com/RPHobbyist/PolymagicPrice.git</p>
                                        <p className="text-indigo-600">cd PolymagicPrice</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-400 font-medium"># 2. Install dependencies</p>
                                        <p className="text-indigo-600">npm install</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-slate-400 font-medium"># 3. Run locally</p>
                                        <p className="text-emerald-600 font-bold underline">npm run dev</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 leading-relaxed italic">
                                    After running, visit <span className="text-slate-600 font-bold">http://localhost:8080</span> to use local AI offline.
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {settings.enabled && isAllowed && (
                    <CardContent className="p-6 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Controls */}
                        <div className="space-y-8">
                          {/* Connection */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="ollama-port" className="flex items-center gap-1.5">
                                    Ollama Port
                                </Label>
                                <Input
                                    id="ollama-port"
                                    type="number"
                                    value={settings.port || ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "") {
                                            setSettings({ ...settings, port: 0 });
                                            return;
                                        }
                                        const num = parseInt(val);
                                        if (val !== "" && num < 0) return;
                                        setSettings({ ...settings, port: isNaN(num) ? 0 : num });
                                    }}
                                    min={1}
                                    max={65535}
                                    className="font-mono"
                                />
                                {testStatus === "success" && (
                                    <p className="text-sm text-green-600 flex items-center gap-1 font-medium">
                                        <CheckCircle2 className="w-4 h-4" /> Connection successful — {models.length} model{models.length !== 1 ? "s" : ""} available
                                    </p>
                                )}
                                {testStatus === "error" && (
                                    <p className="text-sm text-destructive flex items-center gap-1">
                                        <XCircle className="w-4 h-4" /> Connection failed — is Ollama running on port {settings.port}?
                                    </p>
                                )}
                            </div>

                            {/* Model Selector */}
                            <div className="space-y-2">
                                <Label htmlFor="ai-model" className="flex items-center gap-1.5">
                                    Model
                                </Label>
                                {models.length > 0 ? (
                                    <Select
                                        value={settings.model}
                                        onValueChange={(v) => setSettings({ ...settings, model: v })}
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
                                        onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                                        placeholder="e.g. llama3, mistral, gemma"
                                        maxLength={100}
                                    />
                                )}
                                {isLoadingModels && (
                                    <p className="text-xs text-slate-600 flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Detecting models...
                                    </p>
                                )}
                                {!isLoadingModels && models.length === 0 && testStatus !== "error" && (
                                    <p className="text-xs text-slate-600">
                                        Type a model name manually to connect.
                                    </p>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Guide */}
                        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 shadow-sm h-fit">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                Ollama Connection Guide
                            </h3>
                            <ol className="text-xs space-y-4 text-slate-600 list-decimal ml-4">
                                <li className="pl-1">
                                    <strong className="text-slate-900 font-bold">Install</strong>: Download and run <strong className="text-slate-900 font-bold">Ollama</strong> from <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-primary hover:underline underline-offset-4 inline-flex items-center gap-1">ollama.com <ExternalLink className="w-3 h-3" /></a>. Default port: <code className="bg-muted px-1.5 py-0.5 rounded text-slate-900 font-mono">11434</code>.
                                </li>
                                <li className="pl-1">
                                    <strong className="text-slate-900 font-bold">Download Model</strong>: Open the Ollama app and download your favourite model (we recommend <code className="bg-muted px-1.5 py-0.5 rounded text-slate-900 font-mono">gemma3:1b</code>).
                                </li>
                                <li className="pl-1">
                                    <strong className="text-slate-900 font-bold">Initialize</strong>: Enable the switch above and click <strong className="text-slate-900 font-bold">"Save Settings"</strong> to link to your local AI.
                                </li>
                                <li className="pl-1 leading-relaxed">
                                    <strong className="text-slate-900 font-bold">AI Chatbot</strong>: This is where you ask questions related to tools, insights, notifications, reminders, etc.
                                </li>
                            </ol>
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
