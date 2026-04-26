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

/// <reference types="vite/client" />

interface BambuDevice {
    dev_id: string;
    name: string;
    model: string;
    dev_access_code?: string;
    access_code?: string;
    user_id?: string;
    online?: boolean;
    print_status?: string;
}

interface PrinterConnection {
    ip: string;
    serial: string;
    status: string;
    cloudMode?: boolean;
}

interface PrintOptions {
    [key: string]: string | number | boolean | undefined;
    plate?: number;
    use_ams?: boolean;
    timelapse?: boolean;
    bed_levelling?: boolean;
    flow_cali?: boolean;
    vibration_cali?: boolean;
    layer_inspect?: boolean;
}

interface ElectronAPI {
    platform: string;
    versions: {
        node: string;
        chrome: string;
        electron: string;
    };
    printer: {
        connect: (_config: { ip?: string; accessCode?: string; serial?: string; apiKey?: string; driverType?: string; cloudMode?: boolean; expectedFingerprint?: string }) => Promise<PrinterConnection>;
        disconnect: (_ip: string) => Promise<boolean>;
        sendFile: (_config: { ip: string; filePath: string }) => Promise<{ success: boolean; message: string }>;
        startPrint: (_config: { ip: string; fileName: string; options?: PrintOptions }) => Promise<{ success: boolean }>;
        onStatus: (_callback: (data: { ip: string; status: string; error?: string }) => void) => () => void;
        onCertReceived: (_callback: (data: { serial: string; fingerprint: string }) => void) => () => void;
        onData: (_callback: (data: { ip: string; topic: string; payload: unknown }) => void) => () => void;
        onStatusUpdate: (_callback: (data: { ip: string; state: string; progress: number; remainingTime: number; nozzleTemp?: number; bedTemp?: number }) => void) => () => void;
        getConnectedPrinters: () => Promise<PrinterConnection[]>;
    };
    bambu: {
        login: (_creds: { email: string; password: string; code?: string }) => Promise<boolean>;
        getDevices: () => Promise<BambuDevice[]>;
    };
    bridge: {
        toggle: (_settings: { enabled: boolean; port: number }) => Promise<boolean>;
        status: () => Promise<boolean>;
        getIP: () => Promise<string>;
        onFileReceived: (_callback: (data: { filename: string; content: string }) => void) => () => void;
    };
}

interface Window {
    electronAPI: ElectronAPI;
}

interface ImportMetaEnv {
    readonly VITE_BASE_URL: string;
    readonly VITE_IS_OFFICIAL: string;
    readonly VITE_VENDOR_NAME: string;
    readonly VITE_VENDOR_URL: string;
    readonly VITE_GITHUB_URL: string;
    readonly VITE_YOUTUBE_URL: string;
    readonly VITE_DOWNLOAD_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

