

export const DeleteConfirmationModal = ({
  showConfirmModal,
  setShowConfirmModal,
  deviceToDelete,
  setDeviceToDelete,
  handleConfirmDelete
}) => {
  if (!showConfirmModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content delete-confirmation-modal">
        <h2 className="modal-title">Confirm Delete</h2>
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete this device? This action cannot be undone.
          </p>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm">
              ⚠️ This will permanently remove the device from your network inventory.
            </p>
          </div>
        </div>
        <div className="modal-actions">
          <button
            onClick={() => {
              setShowConfirmModal(false);
              setDeviceToDelete(null);
            }}
            className="btn-modal-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDelete}
            className="btn-delete"
          >
            Delete Device
          </button>
        </div>
      </div>
    </div>
  );
}; 