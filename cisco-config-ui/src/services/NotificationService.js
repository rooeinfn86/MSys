class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
  }

  /**
   * Add a notification listener
   * @param {Function} callback - Function to call when notifications change
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.notifications));
  }

  /**
   * Show a success notification
   * @param {string} message - Success message
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  showSuccess(message, duration = 3000) {
    const notification = {
      id: Date.now(),
      type: 'success',
      message,
      duration,
      timestamp: new Date()
    };

    this.notifications.push(notification);
    this.notifyListeners();

    // Auto-remove after duration
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, duration);

    return notification.id;
  }

  /**
   * Show an error notification
   * @param {string} message - Error message
   * @param {number} duration - Duration in milliseconds (default: 5000)
   */
  showError(message, duration = 5000) {
    const notification = {
      id: Date.now(),
      type: 'error',
      message,
      duration,
      timestamp: new Date()
    };

    this.notifications.push(notification);
    this.notifyListeners();

    // Auto-remove after duration
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, duration);

    return notification.id;
  }

  /**
   * Show an info notification
   * @param {string} message - Info message
   * @param {number} duration - Duration in milliseconds (default: 4000)
   */
  showInfo(message, duration = 4000) {
    const notification = {
      id: Date.now(),
      type: 'info',
      message,
      duration,
      timestamp: new Date()
    };

    this.notifications.push(notification);
    this.notifyListeners();

    // Auto-remove after duration
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, duration);

    return notification.id;
  }

  /**
   * Show a warning notification
   * @param {string} message - Warning message
   * @param {number} duration - Duration in milliseconds (default: 4000)
   */
  showWarning(message, duration = 4000) {
    const notification = {
      id: Date.now(),
      type: 'warning',
      message,
      duration,
      timestamp: new Date()
    };

    this.notifications.push(notification);
    this.notifyListeners();

    // Auto-remove after duration
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, duration);

    return notification.id;
  }

  /**
   * Remove a specific notification
   * @param {number} id - Notification ID
   */
  removeNotification(id) {
    this.notifications = this.notifications.filter(notification => notification.id !== id);
    this.notifyListeners();
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Get all current notifications
   * @returns {Array} Array of notifications
   */
  getNotifications() {
    return [...this.notifications];
  }

  /**
   * Handle API response and show appropriate notification
   * @param {Object} result - API response result
   * @param {string} successMessage - Message to show on success
   * @param {string} errorMessage - Message to show on error (optional)
   */
  handleApiResponse(result, successMessage, errorMessage = null) {
    if (result.success) {
      this.showSuccess(successMessage);
    } else {
      const message = errorMessage || result.error || 'An error occurred';
      this.showError(message);
    }
    return result;
  }

  /**
   * Handle promise-based operations with notifications
   * @param {Promise} promise - Promise to handle
   * @param {string} successMessage - Success message
   * @param {string} errorMessage - Error message prefix
   */
  async handleAsync(promise, successMessage, errorMessage = 'Operation failed') {
    try {
      const result = await promise;
      this.showSuccess(successMessage);
      return result;
    } catch (error) {
      this.showError(`${errorMessage}: ${error.message}`);
      throw error;
    }
  }
}

// Export a singleton instance
const notificationService = new NotificationService();
export default notificationService; 