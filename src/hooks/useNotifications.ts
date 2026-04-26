import { useContext } from 'react';
import { NotificationContext, NotificationContextType } from '@/contexts/NotificationContext';

export const useNotifications = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
