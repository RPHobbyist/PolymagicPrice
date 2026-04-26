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
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Notification, NotificationStatus } from '@/types/notifications';
import { 
    getNotifications, 
    saveNotification, 
    updateNotificationStatus, 
    deleteNotification as deleteFromStorage, 
    clearAllNotifications as clearAllInStorage, 
    getSystemHealthIssues
} from '@/lib/core/sessionStorage';
import { toast } from 'sonner';

import { NotificationContext } from '@/contexts/NotificationContext';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const refresh = useCallback(() => {
        setNotifications(getNotifications());
    }, []);

    const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "status">) => {
        const newNotif = saveNotification(notification);
        setNotifications(prev => [newNotif, ...prev]);
        
        // Show a small toast for new notifications if not already on the notifications page
        if (window.location.pathname !== '/notifications') {
            const toastType = (notification.type.toLowerCase() === 'warning' ? 'warning' : 
                               notification.type.toLowerCase() === 'success' ? 'success' :
                               notification.type.toLowerCase() === 'error' ? 'error' : 'info') as 'info' | 'success' | 'warning' | 'error';
            toast[toastType](notification.title, {
                description: notification.message,
            });
        }
    }, []);

    const checkHealth = useCallback(() => {
        const issues = getSystemHealthIssues();
        const currentNotifs = getNotifications();
        
        issues.forEach(issue => {
            // Only add if a notification with this title doesn't already exist (and isn't deleted)
            const exists = currentNotifs.some(n => n.title === issue.title && n.status !== 'CANCELLED');
            if (!exists) {
                addNotification(issue);
            }
        });
        
        refresh();
    }, [addNotification, refresh]);

    useEffect(() => {
        refresh();
        // Initial health check
        checkHealth();
        
        // Poll for updates every 1 minute for system health
        const interval = setInterval(checkHealth, 60000);

        // Cross-tab Synchronization: Refresh notifications when they change in storage
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'session_notifications') {
                refresh();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [refresh, checkHealth]);

    const unreadCount = useMemo(() => 
        notifications.filter(n => n.status === 'NEW').length, 
    [notifications]);

    const updateStatus = useCallback((id: string, status: NotificationStatus) => {
        updateNotificationStatus(id, status);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, status } : n));
    }, []);

    const deleteNotification = useCallback((id: string) => {
        deleteFromStorage(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        clearAllInStorage();
        setNotifications([]);
    }, []);

    const value = useMemo(() => ({
        notifications,
        unreadCount,
        addNotification,
        updateStatus,
        deleteNotification,
        clearAll,
        refresh
    }), [notifications, unreadCount, addNotification, updateStatus, deleteNotification, clearAll, refresh]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

