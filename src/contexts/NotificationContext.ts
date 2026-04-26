import { createContext } from 'react';
import { Notification, NotificationStatus } from '@/types/notifications';

export interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, "id" | "timestamp" | "status">) => void;
    updateStatus: (id: string, status: NotificationStatus) => void;
    deleteNotification: (id: string) => void;
    clearAll: () => void;
    refresh: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
