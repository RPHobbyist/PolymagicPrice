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

/**
 * System Identity Configuration
 * Critical for application integrity and environment synchronization.
 */
export const SYSTEM_CONFIG = {
    // Assets from environment or defaults
    get githubUrl() {
        return import.meta.env.VITE_GITHUB_URL || "https://github.com/RPHobbyist/PolymagicPrice.git";
    },
    get youtubeUrl() {
        return import.meta.env.VITE_YOUTUBE_URL || "https://www.youtube.com/playlist?list=PLwLQ_Xr7StXiMV7_xrYweyu3AdNJex-H9";
    },
    get downloadUrl() {
        return import.meta.env.VITE_DOWNLOAD_URL || "https://github.com/RPHobbyist/PolymagicPrice/releases";
    },
    get logo() {
        return import.meta.env.VITE_VENDOR_LOGO || "/logo.webp";
    },
    get brandLogo() {
        return import.meta.env.VITE_BRAND_LOGO || "/brand-logo.webp";
    },

    // Protected Identifiers
    get appName() {
        return "PolymagicPrice";
    },

    get vendor() {
        return import.meta.env.VITE_VENDOR_NAME || "Rp Hobbyist";
    },

    get vendorLink() {
        return import.meta.env.VITE_VENDOR_URL || "https://www.rphobbyist.com";
    },

    get vendorEmail() {
        return import.meta.env.VITE_VENDOR_EMAIL || "rphobbyist@gmail.com";
    },

    get baseUrl() {
        return import.meta.env.VITE_BASE_URL || "https://polymagicprice.rphobbyist.com";
    },

    // Identity Logic
    get isOfficial() {
        return import.meta.env.VITE_IS_OFFICIAL === 'true';
    },

    // License Validation Header
    get licenseRef() {
        return `GNU AGPLv3 License - Copyright (c) 2025 ${this.vendor}`;
    }
};

