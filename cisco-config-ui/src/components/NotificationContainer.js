import useNotifications from '../hooks/useNotifications';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            max-w-sm p-4 rounded-lg shadow-lg flex items-start gap-3 animate-fade-in-up
            ${notification.type === 'success' ? 'bg-green-600 text-white' : ''}
            ${notification.type === 'error' ? 'bg-red-600 text-white' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-600 text-white' : ''}
            ${notification.type === 'info' ? 'bg-blue-600 text-white' : ''}
          `}
        >
          <div className="flex-shrink-0">
            {notification.type === 'success' && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
            {notification.type === 'error' && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
            {notification.type === 'warning' && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
            {notification.type === 'info' && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer; 