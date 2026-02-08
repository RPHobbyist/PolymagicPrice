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

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  if (!filename) return "";
  return filename.substring(0, filename.lastIndexOf('.')) || filename;
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

  // Remove existing tag if present to avoid duplication
  if (finalDescription.startsWith('[HIDDEN] ')) {
    finalDescription = finalDescription.replace('[HIDDEN] ', '');
  }

  if (!isVisible) {
    finalDescription = `[HIDDEN] ${finalDescription}`;
  }

  return finalDescription;
}

/**
 * Calculates total print time from a string format (e.g., "1h 30m") and quantity.
 */
export function calculateTotalTime(timeStr: string | undefined, quantity: number): string {
  if (!timeStr) return '0h';
  if (quantity <= 1) return timeStr;

  // Parse time string
  let totalMinutes = 0;

  // Handle "1h 30m" format
  if (timeStr.includes('h') && timeStr.includes('m')) {
    const hMatch = timeStr.match(/(\d+(\.\d+)?)h/);
    const mMatch = timeStr.match(/(\d+(\.\d+)?)m/);
    if (hMatch) totalMinutes += parseFloat(hMatch[1]) * 60;
    if (mMatch) totalMinutes += parseFloat(mMatch[1]);
  }
  // Handle "1.5h" or "45m" formats
  else if (timeStr.includes('h')) {
    const h = parseFloat(timeStr.replace('h', ''));
    if (!isNaN(h)) totalMinutes = h * 60;
  } else if (timeStr.includes('m')) {
    const m = parseFloat(timeStr.replace('m', ''));
    if (!isNaN(m)) totalMinutes = m;
  } else {
    // Fallback if just a number (assume hours?) or unknown
    const val = parseFloat(timeStr);
    if (!isNaN(val)) totalMinutes = val * 60;
  }

  // Multiply by quantity
  totalMinutes *= quantity;

  // Format back to string
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);

  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}
