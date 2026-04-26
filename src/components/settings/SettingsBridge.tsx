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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Save, Info, Copy, CheckCircle2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { isPortForbidden } from "@/lib/sanitization";
import { getBridgeSettings, saveBridgeSettings } from "@/lib/core/sessionStorage";

export default function SettingsBridge() {
    const [settings, setSettings] = useState(getBridgeSettings());
    const [loading, setLoading] = useState(false);
    const [localIP, setLocalIP] = useState("localhost");
    const [lastSavedPort, setLastSavedPort] = useState(getBridgeSettings().port);
    const [apiKey, setApiKey] = useState("");
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const isDesktop = 'electronAPI' in window;

    // Use a local type for the bridge API to satisfy lints
    const bridgeApi = isDesktop ? (window as unknown as { electronAPI: { bridge: Record<string, unknown> } }).electronAPI.bridge : null;

    const checkStatus = useCallback(async () => {
        if (bridgeApi) {
            const isRunning = await (bridgeApi.status as () => Promise<boolean>)();
            setSettings(prev => ({ ...prev, enabled: isRunning }));
            
            if (bridgeApi.getIP) {
                const ip = await (bridgeApi.getIP as () => Promise<string>)();
                setLocalIP(ip);
            }

            if (bridgeApi.getKey) {
                const key = await (bridgeApi.getKey as () => Promise<string>)();
                setApiKey(key);
            }
        }
    }, [bridgeApi]);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);



    const handleSave = async () => {
        if (!('electronAPI' in window)) {
            toast.error("Polymagic Bridge is only available on Desktop");
            return;
        }

        // Port Blacklisting
        if (isPortForbidden(settings.port)) {
            toast.error(`Port ${settings.port} is restricted for system security.`);
            return;
        }

        if (settings.port < 1024 || settings.port > 65535) {
            toast.error("Please use a valid port between 1024 and 65535");
            return;
        }

        setLoading(true);
        try {
            const success = await window.electronAPI.bridge.toggle({ enabled: settings.enabled, port: settings.port });
            if (success) {
                saveBridgeSettings(settings);
                setLastSavedPort(settings.port);
                toast.success(`Polymagic Bridge ${settings.enabled ? 'started' : 'stopped'} successfully`);

            } else {
                toast.error("Failed to update Bridge status");
            }
        } catch (err: unknown) {
            console.error("Bridge save error:", err);
            toast.error("Polymagic Bridge communication error");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        const url = `http://${localIP}:${settings.port}`;
        navigator.clipboard.writeText(url);
        setCopiedUrl(true);
        toast.success("Connection URL copied to clipboard");
        setTimeout(() => setCopiedUrl(false), 2000);
    };


    const handleCopyKey = () => {
        navigator.clipboard.writeText(apiKey);
        setCopiedKey(true);
        toast.success("API Key copied to clipboard");
        setTimeout(() => setCopiedKey(false), 2000);
    };


    const handlePortChange = (val: string) => {
        if (val !== "" && parseInt(val) < 0) return;
        const num = parseInt(val);
        setSettings(prev => ({ ...prev, port: isNaN(num) ? 0 : num }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold text-foreground">Polymagic Bridge</h2>
                    <p className="text-sm text-slate-600">Acts as a virtual printer on your local network to receive files directly for instant quoting.</p>
                </div>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                    <Label htmlFor="sw-bridge" className={`text-sm font-medium ${!isDesktop ? 'text-slate-600' : ''}`}>
                        {settings.enabled ? "Bridge Active" : "Bridge Inactive"}
                        {!isDesktop && " (Desktop Only)"}
                    </Label>
                    <Switch 
                        id="sw-bridge" 
                        checked={settings.enabled} 
                        onCheckedChange={isDesktop ? (v) => setSettings({ ...settings, enabled: v }) : () => toast.info("Polymagic Bridge is only available in the desktop software.")}
                        disabled={!isDesktop}
                    />
                </div>
            </div>

            {settings.enabled && localIP !== "localhost" && localIP !== "127.0.0.1" && localIP !== "::1" && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 animate-in fade-in slide-in-from-top-1">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-bold">Insecure Network Connection</p>
                        <p className="text-xs leading-relaxed opacity-90">
                            The bridge is currently accessible at <span className="font-mono font-bold text-amber-800">{localIP}</span>. 
                            Since it uses unencrypted HTTP, your <span className="font-bold">API Key and G-code files</span> could be intercepted by anyone on your local network. 
                            For maximum security, use the bridge only on <span className="italic">localhost</span>.
                        </p>
                    </div>
                </div>
            )}

            <Card className="border-primary/10 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">

                            <div className="space-y-2 px-1">
                                    <div className="flex items-center justify-between">
                                        <Label>Bridge Port</Label>
                                        <div className="flex items-center gap-2">
                                            {settings.port !== lastSavedPort && settings.port !== 0 && (
                                                <span className="text-[10px] text-amber-600 font-bold animate-pulse flex items-center gap-1">
                                                    <Info className="w-3 h-3" /> Save Required
                                                </span>
                                            )}
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-6 px-2 text-[10px] gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10"
                                                onClick={isDesktop ? handleCopy : undefined}
                                                disabled={!settings.port || !isDesktop}
                                            >
                                                {copiedUrl ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                Copy URL
                                            </Button>

                                        </div>
                                    </div>
                                <Input 
                                    type="number" 
                                    min="0"
                                    maxLength={5}
                                    value={settings.port === 0 ? "" : settings.port} 
                                    onChange={(e) => handlePortChange(e.target.value)}
                                    placeholder="e.g. 50505"
                                    className={`max-w-[200px] ${settings.port !== lastSavedPort ? 'border-amber-500/50 bg-amber-500/5 shadow-[0_0_8px_rgba(245,158,11,0.05)]' : ''}`}
                                />
                                <p className="text-[10px] text-slate-600 italic font-medium">
                                    Standard range: 49152–65535
                                </p>

                                {apiKey && (
                                    <div className="pt-4 space-y-2 border-t border-border/50">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[11px] font-bold uppercase tracking-wider text-primary/70">Bridge API Key</Label>
                                            <div className="flex items-center gap-1.5">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 w-7 p-0 text-slate-600 hover:text-foreground"
                                                    onClick={() => setShowKey(!showKey)}
                                                    title={showKey ? "Hide API Key" : "Reveal API Key"}
                                                >
                                                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-7 px-3 text-[10px] gap-1.5 border-primary/20 hover:bg-primary/5"
                                                    onClick={handleCopyKey}
                                                >
                                                    {copiedKey ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                                    {copiedKey ? "Copied" : "Copy Key"}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 p-2 rounded-md font-mono text-[11px] break-all border border-border/50 text-slate-600 select-all font-medium">
                                            {showKey ? apiKey : '•'.repeat(Math.min(apiKey.length, 32)) + apiKey.slice(-4)}
                                        </div>
                                        <p className="text-[10px] text-slate-600">
                                            This key is required by your slicer to authenticate with Polymagic Price.
                                        </p>
                                    </div>
                                )}

                                
                                <div className="pt-2">
                                    <Button 
                                        onClick={isDesktop ? handleSave : () => toast.error("Please download the desktop app to use Polymagic Bridge")} 
                                        disabled={loading || !isDesktop}
                                        className="bg-gradient-accent text-white gap-2 px-6 shadow-md disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" /> Save Settings
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 shadow-sm h-fit">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                                Slicer Connection Guide
                            </h3>
                            <ol className="text-xs space-y-4 text-slate-600 list-decimal ml-4">
                                <li className="pl-1">
                                    <strong className="text-slate-900 font-bold">Initialize</strong>: Enable the bridge and click <strong className="text-slate-900 font-bold">"Save Settings"</strong> to start the virtual printer service.
                                </li>
                                <li className="pl-1">
                                    <strong className="text-slate-900 font-bold">Add Virtual Printer</strong>: In your slicer (OrcaSlicer, Bambu etc.), add a new printer and select <strong className="text-slate-900 font-bold">"OctoPrint"</strong> as the connection type.
                                </li>
                                <li className="pl-1">
                                    <strong className="text-slate-900 font-bold">Link Systems</strong>: Use <strong className="text-slate-900 font-bold">"Copy URL"</strong> and <strong className="text-slate-900 font-bold">"Copy Key"</strong> above. Paste the URL into the Host field and the Key into the API Key field in your slicer.
                                </li>
                                <li className="pl-1 leading-relaxed">
                                    <strong className="text-slate-900 font-bold">Instant Quoting</strong>: Click <strong className="text-slate-900 font-bold">"Send to Printer"</strong> in your slicer. The file will transfer instantly, and a new quote will open here automatically.
                                </li>

                            </ol>
                        </div>
                    </div>


                </CardContent>
            </Card>


        </div>
    );
}
