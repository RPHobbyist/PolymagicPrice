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

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, Wifi, Cloud, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { BambuDevice } from '@/types/printer';

interface PrinterConnectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConnected: (printer: BambuDevice) => void;
}

export function PrinterConnectionDialog({ open, onOpenChange, onConnected }: PrinterConnectionDialogProps) {
    const [loading, setLoading] = useState(false);
    const [cloudDevices, setCloudDevices] = useState<BambuDevice[]>([]);

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [needs2FA, setNeeds2FA] = useState(false);

    // Manual LAN State
    const [lanIp, setLanIp] = useState('');
    const [lanAccessCode, setLanAccessCode] = useState('');
    const [lanSerial, setLanSerial] = useState('');

    const isElectron = 'electronAPI' in window;

    const handleLogin = async () => {
        setLoading(true);
        try {
            await window.electronAPI.bambu.login({ email, password, code });
            toast.success('Logged in to Bambu Cloud');
            fetchCloudDevices();
            setNeeds2FA(false);
        } catch (error) {
            const err = error as Error;
            if (err.message.includes('MFA') || err.message.includes('EMAIL_CODE')) {
                setNeeds2FA(true);
                toast.info('Verification code required');
            } else {
                toast.error('Login failed: ' + err.message);
            }
        } finally {
            if (!needs2FA) setLoading(false);
        }
    };

    const fetchCloudDevices = async () => {
        setLoading(true);
        try {
            const devices = await window.electronAPI.bambu.getDevices();
            setCloudDevices(devices);
        } catch (error) {
            const err = error as Error;
            toast.error('Failed to fetch devices: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const connectDevice = async (device: BambuDevice) => {
        setLoading(true);
        try {
            await window.electronAPI.printer.connect({
                // Cloud connection might not strictly need IP if using MQTT proxy
                serial: device.dev_id,
                accessCode: device.access_code || '', // might be undefined if from cloud fetch
                cloudMode: true
            });
            toast.success(`Connected to ${device.name}`);
            onConnected(device);
            onOpenChange(false);
        } catch (error) {
            const err = error as Error;
            toast.error('Connection failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const connectLan = async () => {
        setLoading(true);
        try {
            await window.electronAPI.printer.connect({
                ip: lanIp,
                accessCode: lanAccessCode,
                serial: lanSerial || 'unknown_serial', // serial is required for MQTT topic
                cloudMode: false
            });
            toast.success(`Connected to ${lanIp}`);
            onConnected({ dev_id: lanSerial, name: 'LAN Printer', model: 'Unknown', id: lanSerial });
            onOpenChange(false);
        } catch (error) {
            const err = error as Error;
            toast.error('LAN Connection failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isElectron) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Desktop App Required</DialogTitle>
                        <DialogDescription>
                            Printer connection features are currently only available in the desktop version of the application due to browser security restrictions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end">
                        <Button onClick={() => onOpenChange(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Connect Printer</DialogTitle>
                    <DialogDescription>
                        Connect to your Bambu Lab printer via Cloud or LAN.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="cloud" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="cloud">Bambu Cloud</TabsTrigger>
                        <TabsTrigger value="lan">LAN Manual</TabsTrigger>
                    </TabsList>

                    <TabsContent value="cloud" className="space-y-4 py-4">
                        {!cloudDevices.length ? (
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="cloud-email">Email</Label>
                                    <Input id="cloud-email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cloud-password">Password</Label>
                                    <Input id="cloud-password" name="password" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                                {needs2FA && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="cloud-code">Verification Code</Label>
                                        <Input id="cloud-code" name="code" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
                                    </div>
                                )}
                                <Button onClick={handleLogin} disabled={loading} className="w-full">
                                    {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Cloud className="mr-2 h-4 w-4" />}
                                    {needs2FA ? 'Verify Login' : 'Login'}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-medium">My Devices</h3>
                                    <Button variant="ghost" size="sm" onClick={fetchCloudDevices}><RefreshCw className="h-4 w-4" /></Button>
                                </div>
                                <div className="grid gap-2">
                                    {cloudDevices.map((dev) => (
                                        <Card key={dev.dev_id} className="cursor-pointer hover:bg-accent" onClick={() => connectDevice(dev)}>
                                            <CardContent className="p-4 flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{dev.name}</span>
                                                    <span className="text-xs text-muted-foreground">{dev.model} • {dev.dev_id}</span>
                                                </div>
                                                <Button size="sm" variant="secondary">Connect</Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                <Button variant="outline" onClick={() => setCloudDevices([])} className="w-full">Login with different account</Button>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="lan" className="space-y-4 py-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>LAN Mode</AlertTitle>
                            <AlertDescription>
                                Requires Printer IP and Access Code. Ensure computer is on the same network.
                            </AlertDescription>
                        </Alert>
                        <div className="grid gap-2">
                            <Label htmlFor="lan-ip">Printer IP</Label>
                            <Input id="lan-ip" name="ip" autoComplete="off" value={lanIp} onChange={(e) => setLanIp(e.target.value)} placeholder="192.168.1.x" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lan-access-code">Access Code</Label>
                            <Input id="lan-access-code" name="accessCode" autoComplete="off" type="password" value={lanAccessCode} onChange={(e) => setLanAccessCode(e.target.value)} placeholder="From printer screen" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lan-serial">Serial Number (Optional but recommended)</Label>
                            <Input id="lan-serial" name="serial" autoComplete="off" value={lanSerial} onChange={(e) => setLanSerial(e.target.value)} placeholder="Printer Serial" />
                        </div>
                        <Button onClick={connectLan} disabled={loading} className="w-full">
                            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}
                            Connect via LAN
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
