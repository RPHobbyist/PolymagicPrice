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
        type?: 'DELAY' | 'MAINTENANCE' | 'PROCUREMENT' | 'INFO' | 'SPOOL_LOW' | 'RESERVATION_SHORTAGE' | 'RESERVATION_WARNING' | 'PRICE_DRIFT' | 'QUALITY_AUDIT_MACHINE' | 'QUALITY_AUDIT_MATERIAL';
        [key: string]: unknown;
    };
}
