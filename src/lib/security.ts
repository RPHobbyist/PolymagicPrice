/*
 * PolymagicPrice - Security Utilities
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

/**
 * LOCAL OBFUSCATION LAYER — NOT CRYPTOGRAPHIC ENCRYPTION
 *
 * SECURITY NOTICE:
 * This module uses XOR + Base64 to obfuscate sensitive fields in localStorage.
 * The key is hardcoded in the client bundle, making it trivially reversible by
 * anyone with access to DevTools or the source code.
 *
 * Purpose: Prevents casual visual inspection of localStorage values (e.g., a
 * user glancing at DevTools won't see raw PII or API keys). It does NOT protect
 * against a determined attacker, browser extensions, or shared-computer scenarios.
 *
 * For the Electron desktop build, Electron's safeStorage API provides real
 * OS-keychain-backed encryption as the primary layer. This obfuscation is the
 * fallback for the web version where no OS keychain exists.
 */

// SECURITY: This key is intentionally simple — it is an obfuscation salt, NOT a secret.
// Do NOT rely on this for real cryptographic security.
const OBFUSCATION_SALT = "POLY-OS-MANG-2025-XOR";

/**
 * Obfuscates a string using XOR + Base64 (NOT real encryption — see header comment)
 */
const obfuscateValue = (text: string): string => {
    if (!text) return "";
    try {
        const xored = text.split('').map((char, index) => {
            return String.fromCharCode(char.charCodeAt(0) ^ OBFUSCATION_SALT.charCodeAt(index % OBFUSCATION_SALT.length));
        }).join('');
        return btoa(unescape(encodeURIComponent(xored))); // Safe Base64 for UTF-8
    } catch (err) {
        console.error("[Security] Obfuscation failed", err);
        return text;
    }
};

/**
 * De-obfuscates a string (reverses XOR + Base64)
 */
const deobfuscateValue = (cipher: string): string => {
    if (!cipher) return "";
    try {
        const decoded = decodeURIComponent(escape(atob(cipher)));
        return decoded.split('').map((char, index) => {
            return String.fromCharCode(char.charCodeAt(0) ^ OBFUSCATION_SALT.charCodeAt(index % OBFUSCATION_SALT.length));
        }).join('');
    } catch {
        // If de-obfuscation fails, data is likely in plaintext (migration fallback)
        return cipher;
    }
};

/**
 * Protocol markers for identifying encrypted vs plain text
 */
const ENC_PREFIX = "v1:enc:";

const isEncrypted = (text: string): boolean => {
    return typeof text === 'string' && text.startsWith(ENC_PREFIX);
};

export const wrapSecret = (text: string): string => {
    if (!text || isEncrypted(text)) return text || "";
    return `${ENC_PREFIX}${obfuscateValue(text)}`;
};

export const unwrapSecret = (text: string): string => {
    if (!text || !isEncrypted(text)) return text || "";
    return deobfuscateValue(text.substring(ENC_PREFIX.length));
};
