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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, Cloud } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { BambuDevice } from "@/types/printer";

interface PrinterConnectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    machineName: string;
    onConnect: (connectionDetails: { ip?: string; accessCode: string; serial: string; cloudMode?: boolean }) => void;
}

export function PrinterConnectDialog({
    open,
    onOpenChange,
    machineName,
    onConnect
}: PrinterConnectDialogProps) {
    const [activeTab, setActiveTab] = useState("local");
    const [isLoading, setIsLoading] = useState(false);

    // Local State
    const [ip, setIp] = useState("");
    const [accessCode, setAccessCode] = useState("");
    const [serial, setSerial] = useState("");

    // Cloud State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [authStep, setAuthStep] = useState<'login' | 'verify'>('login');
    const [devices, setDevices] = useState<BambuDevice[]>([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const handleLocalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            onConnect({ ip, accessCode, serial });
            setIsLoading(false);
            onOpenChange(false);
        }, 500);
    };

    const handleCloudLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!window.electronAPI?.bambu) {
            toast.error("Cloud login only available in Desktop App");
            return;
        }
        setIsLoading(true);
        try {
            await window.electronAPI.bambu.login({ email, password }); // Try standard login
            handleLoginSuccess();
        } catch (error) {
            const err = error as Error;
            console.error(err);
            if (err.message.includes('EMAIL_CODE_REQUIRED')) {
                setAuthStep('verify');
                toast.info("Verification code sent to your email.");
            } else if (err.message.includes('MFA_CODE_REQUIRED')) {
                setAuthStep('verify');
                toast.info("Enter your authenticator app code.");
            } else if (err.message.includes('2FA_REQUIRED')) {
                setAuthStep('verify');
                toast.info("2FA Code Required. Please check your email/app.");
            } else {
                toast.error(err.message || "Login failed");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await window.electronAPI.bambu.login({ email, password, code: verificationCode });
            handleLoginSuccess();
        } catch (error) {
            const err = error as Error;
            console.error(err);
            toast.error(err.message || "Verification failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginSuccess = async () => {
        toast.success("Logged in to Bambu Cloud");
        setIsLoggedIn(true);
        setAuthStep('login'); // Reset step
        setPassword(""); // Clear password from memory
        setVerificationCode("");

        // Fetch devices
        const deviceList = await window.electronAPI.bambu.getDevices();
        setDevices(deviceList);
    };

    const handleSelectDevice = (device: BambuDevice) => {
        // Connect via cloud mode - no IP needed
        toast.info(`Connecting to ${device.name} via cloud...`);
        onConnect({
            serial: device.dev_id,
            accessCode: "", // Backend will use cached code
            cloudMode: true
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wifi className="w-5 h-5" />
                        Connect to {machineName}
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="local">Local Network</TabsTrigger>
                        <TabsTrigger value="cloud">Bambu Account</TabsTrigger>
                    </TabsList>

                    <TabsContent value="local">
                        <form onSubmit={handleLocalSubmit} className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="ip" className="text-right">IP Address</Label>
                                <Input id="ip" name="ip" autoComplete="off" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.100" className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="accessCode" className="text-right">Access Code</Label>
                                <Input
                                    id="accessCode"
                                    name="accessCode"
                                    autoComplete="off"
                                    type="password"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                    placeholder={serial ? "Managed by Cloud" : "Found on printer screen"}
                                    className="col-span-3"
                                    disabled={!!serial && accessCode === ""}
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="serial" className="text-right">Serial No.</Label>
                                <Input id="serial" name="serial" autoComplete="off" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Printer Serial Number" className="col-span-3" required />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isLoading}>{isLoading ? "Connecting..." : "Connect"}</Button>
                            </DialogFooter>
                        </form>
                    </TabsContent>

                    <TabsContent value="cloud">
                        {!isLoggedIn ? (
                            <form onSubmit={authStep === 'login' ? handleCloudLogin : handleVerifySubmit} className="grid gap-4 py-4">
                                {authStep === 'login' ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input id="email" name="email" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input id="password" name="password" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded text-sm text-amber-600 mb-2">
                                            Two-Factor Authentication is enabled. Please enter the verification code sent to your email or generated by your authenticator app.
                                        </div>
                                        <Label htmlFor="code">Verification Code</Label>
                                        <Input
                                            id="code"
                                            name="code"
                                            autoComplete="one-time-code"
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value)}
                                            placeholder="Enter 6-digit code"
                                            autoFocus
                                            required
                                        />
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    {authStep === 'verify' && (
                                        <Button type="button" variant="outline" onClick={() => setAuthStep('login')} disabled={isLoading}>
                                            Back
                                        </Button>
                                    )}
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? "Processing..." : authStep === 'login' ? "Login to Bambu Lab" : "Verify Code"}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="py-4 space-y-4">
                                <p className="text-sm text-muted-foreground">Select a device to import credentials:</p>
                                <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                                    {devices.map((dev) => (
                                        <div key={dev.dev_id} className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-accent/50" onClick={() => handleSelectDevice(dev)}>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-medium truncate">{dev.name}</span>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">{dev.model}</Badge>
                                                    <span className="font-mono">{dev.dev_id}</span>
                                                </div>
                                            </div>
                                            {dev.online ? <Badge variant="default" className="bg-green-600/10 text-green-600 border-green-600/20 hover:bg-green-600/20">Online</Badge> : <Badge variant="outline">Offline</Badge>}
                                        </div>
                                    ))}
                                    {devices.length === 0 && <p className="text-center text-sm text-muted-foreground italic">No devices found.</p>}
                                </div>
                                <Button variant="outline" className="w-full" onClick={() => setIsLoggedIn(false)}>Log Out</Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
