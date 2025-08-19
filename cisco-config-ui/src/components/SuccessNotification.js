import { useEffect } from "react";

const SuccessNotification = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto hide after 3 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-up z-50">
      <div className="w-2 h-2 bg-white rounded-full"></div>
      {message}
    </div>
  );
};

export default SuccessNotification; 