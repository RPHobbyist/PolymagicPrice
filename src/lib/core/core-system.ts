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


// CORE SYSTEM CONFIGURATION


// Secure decoder
const _d = (s: string): string => {
    try {
        return typeof window !== 'undefined' ? window.atob(s) : Buffer.from(s, 'base64').toString('utf-8');
    } catch {
        return "";
    }
};

/**
 * System Identity Configuration
 * Critical for application integrity.
 */
export const SYSTEM_CONFIG = {
    // Encrypted Assets
    get githubUrl() {
        return _d("aHR0cHM6Ly9naXRodWIuY29tL1JQSG9iYnlpc3QvM0QtUHJpbnQtUHJpY2UtQ2FsY3VsYXRvci5naXQ=");
    },
    get youtubeUrl() {
        return "https://www.youtube.com/playlist?list=PLwLQ_Xr7StXiMV7_xrYweyu3AdNJex-H9";
    },
    get downloadUrl() {
        return _d("aHR0cHM6Ly9naXRodWIuY29tL1JQSG9iYnlpc3QvM0QtUHJpbnQtUHJpY2UtQ2FsY3VsYXRvci9yZWxlYXNlcw==");
    },
    get logo() {
        return "/logo.png";
    },

    // Protected Identifiers
    get appName() {
        return _d("UG9seW1hZ2ljUHJpY2U=");
    },

    get vendor() {
        return _d("UnAgSG9iYnlpc3Q=");
    },

    get vendorLink() {
        return _d("aHR0cHM6Ly93d3cucnBob2JieWlzdC5jb20=");
    },

    // License Validation Header
    get licenseRef() {
        return "GNU AGPLv3 License - Copyright (c) 2025 " + this.vendor;
    }
};
