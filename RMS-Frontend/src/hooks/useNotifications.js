import { useState, useEffect } from 'react';
import NotificationService from '../services/NotificationService';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = NotificationService.addListener((newNotifications) => {
      setNotifications(newNotifications);
    });

    // Initialize with current notifications
    setNotifications(NotificationService.getNotifications());

    return unsubscribe;
  }, []);

  return {
    notifications,
    showSuccess: NotificationService.showSuccess.bind(NotificationService),
    showError: NotificationService.showError.bind(NotificationService),
    showInfo: NotificationService.showInfo.bind(NotificationService),
    showWarning: NotificationService.showWarning.bind(NotificationService),
    removeNotification: NotificationService.removeNotification.bind(NotificationService),
    clearAll: NotificationService.clearAll.bind(NotificationService),
    handleApiResponse: NotificationService.handleApiResponse.bind(NotificationService),
    handleAsync: NotificationService.handleAsync.bind(NotificationService),
  };
};

export default useNotifications; 