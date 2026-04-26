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

export default function SettingsAI() {
    const [settings, setSettings] = useState(getAISettings());
    const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
    const [models, setModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    const fetchModels = useCallback(async () => {
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
    }, [settings.port, settings.model]);

    useEffect(() => {
        if (settings.enabled) {
            fetchModels();
        }
    }, [settings.enabled, settings.port, fetchModels]);

    const handleSave = () => {
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
                    <Label htmlFor="ai-enable" className="text-sm font-medium">
                        {settings.enabled ? "AI Active" : "AI Inactive"}
                    </Label>
                    <Switch
                        id="ai-enable"
                        checked={settings.enabled}
                        onCheckedChange={(v) => {
                            setSettings({ ...settings, enabled: v });
                            if (v) testConnection();
                        }}
                    />
                </div>
            </div>

            <Card className="border-primary/10 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
                {!settings.enabled && (
                    <div className="p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
                            <Bot className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-medium">Local AI is Disconnected</h3>
                            <p className="text-sm text-slate-600 max-w-sm mx-auto">
                                Enable the switch above to connect to your local Ollama instance and unlock smart manufacturing insights.
                            </p>
                        </div>
                    </div>
                )}
                
                {settings.enabled && (
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
                                    value={settings.port}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val !== "" && parseInt(val) < 0) return;
                                        setSettings({ ...settings, port: Number(val) });
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
                                <li className="pl-1 leading-relaxed">
                                    <strong className="text-slate-900 font-bold">Enable Web Access</strong>: If using the <strong className="text-slate-900 font-bold">hosted web version</strong>, you must allow cross-origin requests. Stop Ollama, then restart it with:
                                    <div className="mt-2 space-y-1.5">
                                        <div><span className="text-slate-500 text-[10px]">Windows (PowerShell):</span></div>
                                        <code className="block bg-muted px-2 py-1 rounded text-slate-900 font-mono text-[11px] break-all">$env:OLLAMA_ORIGINS="*"; ollama serve</code>
                                        <div><span className="text-slate-500 text-[10px]">Mac / Linux:</span></div>
                                        <code className="block bg-muted px-2 py-1 rounded text-slate-900 font-mono text-[11px] break-all">OLLAMA_ORIGINS=* ollama serve</code>
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-slate-500">This step is <strong>not needed</strong> for the Desktop App — only for the web version.</p>
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
