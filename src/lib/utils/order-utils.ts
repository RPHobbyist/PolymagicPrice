/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 */

/**
 * Extracts a human-readable Order ID from a versioned UUID or standard ID.
 * Returns a clean alphanumeric string without the '#' prefix.
 */
export const getOrderId = (id?: string): string => {
    if (!id) return "N/A";
    
    // Pattern: Batch-Master Detection (e.g., batch-XXXX-BATCH-N)
    const parts = id.split('-');
    
    // If it's the legacy batch format, clean it up to XXXXN style
    const batchIdx = parts.findIndex((p, idx) => p.toUpperCase() === 'BATCH' && idx > 0);
    if (batchIdx > 0 && batchIdx < parts.length - 1) {
        const shortId = parts[batchIdx - 1].toUpperCase();
        const index = parts[batchIdx + 1];
        return `${shortId}${index}`;
    }

    // Pattern: Generic UUID-like or old format cleanup
    // Just remove everything except alphanumeric and keep it short (~6-10 chars)
    const cleanId = id.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // If it was a 'batch-' prefix ID, it might be long. 
    // New format is typically 5-8 chars.
    if (id.startsWith('batch-') && cleanId.length > 8) {
        // Try to extract the segment before BATCH or just return cleaned
        return cleanId.slice(0, 10);
    }
    
    return cleanId;
};
