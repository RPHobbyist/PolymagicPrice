/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 */

export type NotificationStatus = 'NEW' | 'ATTENDED' | 'REJECTED' | 'CANCELLED';
export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: string;
    source?: 'SYSTEM' | 'AI';
    status: NotificationStatus;
    actionLink?: string; // Optional link to related page (e.g. order details)
    metadata?: {
        type?: 'DELAY' | 'MAINTENANCE' | 'PROCUREMENT' | 'INFO' | 'SPOOL_LOW' | 'RESERVATION_SHORTAGE' | 'RESERVATION_WARNING' | 'PRICE_DRIFT' | 'QUALITY_AUDIT_MACHINE' | 'QUALITY_AUDIT_MATERIAL' | 'CARBON_METER_SUGGESTION' | 'CARBON_DIGEST';
        /**
         * Distinguishes one reporting period from another.
         *
         * De-duplication matches on `type` plus the entity ids, against every notification ever
         * stored, so a shop-wide finding without a period would be raised once in the app's
         * lifetime and never again — not even after the user attended it.
         */
        period?: string;
        [key: string]: unknown;
    };
}
