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
/**
 * Safely retrieves an environment variable with multiple fallback layers.
 * Prevents "import.meta" ReferenceErrors in non-module or non-Vite contexts.
 */
const getSafeEnv = (key: string, fallback: unknown): unknown => {
    try {
        // Check Vite environment (Frontend)
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
            return (import.meta as unknown as { env: Record<string, unknown> }).env[key];
        }
        // Check Node environment (Main Process / SSR)
        if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
            return process.env[key];
        }
    } catch {
        // Silently fall back
    }
    return fallback;
};

/**
 * Frontend Security Constants
 */
export const SECURITY_THRESHOLDS = {
  AI_METADATA_MAX_SIZE: Number(getSafeEnv('VITE_AI_METADATA_MAX_SIZE', 2000)),
  PROMPT_DELIMITER_START: '[DATA_START]',
  PROMPT_DELIMITER_END: '[DATA_END]'
};

/**
 * Sanitization Library
 * Protects against XSS, Prompt Injection, and Command Injection.
 */

/**
 * Generic string sanitizer
 */
export function sanitize(text: string): string {
    if (text === null || text === undefined) return '';
    const cleanText = String(text);
    return cleanText.replace(/[<>&"'`]/g, '').trim();
}

/**
 * Specialized sanitizer for API Keys and Serial Numbers.
 * Aggressively removes whitespace, control characters, and injection markers.
 */
export function sanitizeAPIKey(key: string): string {
    if (!key) return '';
    return String(key)
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
        .replace(/[<>'"&;()[\]{}]/g, "")
        .trim();
}

/**
 * Object-level sanitizer
 */
export function sanitizeObject(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(item => item !== null && item !== undefined ? sanitizeObject(item) : item);
    }

    const input = obj as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            const value = input[key];
            if (typeof value === 'string') {
                sanitized[key] = sanitize(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
    }
    return sanitized;
}

/**
 * Escapes HTML characters for safe PDF/HTML rendering.
 */
export function escapeHTML(str: string): string {
  if (!str) return "";
  const chars: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(str).replace(/[&<>"']/g, (m) => chars[m]);
}

export function stripAIInjection<T>(value: T): T {
  if (value === null || value === undefined) return value;
  
  if (typeof value === 'string') {
    return value.replace(/POLY-SEC-7F3A/g, '[REDACTED]') as unknown as T;
  }
  
  if (Array.isArray(value)) {
    return value.map(item => stripAIInjection(item)) as unknown as T;
  }
  
  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const scrubbed: Record<string, unknown> = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        scrubbed[key] = stripAIInjection(input[key]);
      }
    }
    return scrubbed as unknown as T;
  }
  
  return value;
}

/**
 * Checks if a port is in the "Forbidden" list
 */
export function isPortForbidden(port: number | string): boolean {
  if (port === null || port === undefined) return false;
  const p = typeof port === "string" ? parseInt(port, 10) : port;
  const forbidden = [21, 22, 23, 25, 53, 80, 443, 3306, 5000, 5432, 6379, 8000, 8080, 8888, 9000, 27017];
  return forbidden.includes(p);
}

/**
 * AI Response Shield
 */
export function sanitizeAIResponse(text: string): string {
    if (!text) return '';
    const scrubText = String(text);
    
    const forbidden = [/confirm password/gi, /enter your key/gi, /system maintenance/gi];
    let sanitized = scrubText;
    forbidden.forEach(regex => {
        sanitized = sanitized.replace(regex, '[REDACTED]');
    });

    const urlPattern = /https?:\/\/[^\s]+/g;
    sanitized = sanitized.replace(urlPattern, (match) => {
        if (match.includes('rphobbyist.com')) return match;
        return '[LINK REMOVED FOR SECURITY]';
    });

    return sanitized;
}

/**
 * Validates and limits user-provided metadata
 */
export function sanitizeMetadata(data: unknown): unknown {
    const limit = SECURITY_THRESHOLDS.AI_METADATA_MAX_SIZE;
    const json = JSON.stringify(data || {});
    
    if (json.length > limit) {
        console.warn(`[Sanitization] Metadata exceeds safety limit (${limit}). Truncating.`);
        return { 
            warning: "Data truncated for security",
            originalLength: json.length
        };
    }
    return data;
}

/**
 * Checks if a port number is in a safe range and is not forbidden.
 */
export function isValidPort(port: number | string): boolean {
    if (port === null || port === undefined) return false;
    const p = typeof port === 'string' ? parseInt(port, 10) : port;
    return !isNaN(p) && p >= 1024 && p <= 65535 && !isPortForbidden(p);
}

