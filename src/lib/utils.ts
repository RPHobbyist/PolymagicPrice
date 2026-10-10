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

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { totalPrintHours } from "@/lib/utils/time";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detects if the application is running in a desktop environment (Electron).
 */
export const isDesktop = typeof window !== 'undefined' && 'electronAPI' in window;

/**
 * Detects if the application is running on localhost (Local Development).
 */
export const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.startsWith('192.168.'));

/**
 * Helper to determine if Local AI features should be allowed.
 * We allow them on Desktop (always) or on Localhost (for development).
 */
export const isAIAllowed = isDesktop || isLocalhost;

/**
 * Global constant for maximum file upload size (100MB)
 */
export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Global constant for maximum logo image upload size (5MB)
 */
export const MAX_LOGO_SIZE_MB = 5;
export const MAX_LOGO_SIZE_BYTES = MAX_LOGO_SIZE_MB * 1024 * 1024;

/**
 * Removes the file extension from a filename.
 * Example: "my-model.gcode" -> "my-model"
 */
export function stripFileExtension(filename: string): string {
  if (!filename) return "Unnamed Model";
  const name = filename.substring(0, filename.lastIndexOf('.')) || filename;
  // Return fallback if name is empty or only noise
  return name.trim() || "Unnamed Model";
}

/**
 * Processes a description string to check for the [HIDDEN] tag.
 * Returns the cleaned description and the visibility status.
 */
export function processVisibilityFromDescription(description: string | null, isVisibleColumn?: boolean): { description: string, is_visible: boolean } {
  let isVisible = true;
  let cleanDescription = description || "";

  // Check for [HIDDEN] tag (with or without space)
  if (cleanDescription.startsWith('[HIDDEN]')) {
    isVisible = false;
    // Remove the tag and any following whitespace
    cleanDescription = cleanDescription.replace(/^\[HIDDEN\]\s*/, '');
  }

  // Fallback for legacy column if needed
  if (isVisibleColumn === false) {
    isVisible = false;
  }

  return { description: cleanDescription, is_visible: isVisible };
}

/**
 * Adds the [HIDDEN] tag to a description if isVisible is false.
 */
export function addVisibilityTag(description: string, isVisible: boolean): string {
  let finalDescription = description || "";

  // Remove existing tag if present to avoid duplication (match with or without trailing space)
  finalDescription = finalDescription.replace(/^\[HIDDEN\]\s*/, '');

  if (!isVisible) {
    finalDescription = `[HIDDEN] ${finalDescription}`;
  }

  return finalDescription;
}

/**
 * Formats the total print time for a whole job, e.g. "3h 45m".
 *
 * This used to carry its own parser, which read "1:30" as parseFloat does — 1 — so the production
 * board displayed "1h" for a job the pricing engine had costed at 1.5 h. Everything now goes
 * through `totalPrintHours`/`parseTimeToHours`, the single parser documented in lib/utils/time.ts,
 * so one stored value can no longer be read two ways.
 */
export function calculateTotalTime(timeStr: string | undefined, quantity: number): string {
  if (!timeStr) return '0h';

  const hours = totalPrintHours(timeStr, quantity);

  // Ten-year cap (5,256,000 minutes) so a nonsense entry cannot break the layout with Infinity.
  const totalMinutes = Math.min(5256000, Math.round(hours * 60));

  const wholeHours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (wholeHours > 0 && mins > 0) return `${wholeHours}h ${mins}m`;
  if (wholeHours > 0) return `${wholeHours}h`;
  return `${mins}m`;
}

/**
 * Picks the first meaningful value when pre-filling a form field, preserving a deliberate 0.
 *
 * Form pre-fill used `String(incoming || previous || fallback)`. Because 0 is falsy, a saved
 * value of 0 (no markup, no labour hours, no overhead) was silently replaced by the previous
 * value or the default, so simply reopening a quote for revision re-priced it. Only
 * `undefined`, `null` and `""` should fall through to the next candidate.
 */
export function pick(incoming: unknown, previous: string | undefined, fallback: string): string {
  if (incoming !== undefined && incoming !== null && incoming !== "") return String(incoming);
  if (previous !== undefined && previous !== null && previous !== "") return previous;
  return fallback;
}
