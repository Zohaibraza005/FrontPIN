import React, { createContext, useContext, useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'time' | 'read'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();
    
    // Setup FCM token (mock implementation)
    // In production, initialize Firebase and get FCM token
    const setupFCM = async () => {
      try {
        // const token = await getFirebaseFCMToken();
        // await notificationAPI.updateFCMToken(token);
      } catch (error) {
        console.error('FCM setup error:', error);
      }
    };
    
    setupFCM();
  }, []);

  const loadNotifications = async () => {
    try {
      const res: any = await notificationAPI.getNotifications();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setNotifications(list);
    } catch (error) {
      setNotifications([]);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
      );
    } catch (error) {
      // ignore route errors if notification module is inactive
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'time' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      time: 'Just now',
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
