import { XCircle } from "lucide-react";

const Modal = ({ title, onClose, onSave, children, isConfirmation = false }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#1c1f2b] p-6 rounded-lg shadow-xl w-full max-w-3xl text-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        {children}
        {!isConfirmation && (
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[#2a2f45] hover:bg-[#353b54] transition-colors">
              Cancel
            </button>
            {onSave && (
              <button onClick={onSave} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors">
                Save
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Error Modal Component
export const ErrorModal = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1c1f2b] border border-[#2a2f45] rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-center mb-4">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-center text-white mb-4">Permission Denied</h3>
        <p className="text-gray-300 text-center mb-6">{message}</p>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2a2f45] hover:bg-[#353b54] text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal; 