class ModalService {
  constructor() {
    this.modals = new Map();
    this.listeners = [];
  }

  /**
   * Add a modal state listener
   * @param {Function} callback - Function to call when modal states change
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
    this.listeners.forEach(callback => callback(this.getModalStates()));
  }

  /**
   * Open a modal
   * @param {string} modalId - Unique modal identifier
   * @param {Object} data - Optional data to pass to the modal
   */
  openModal(modalId, data = null) {
    this.modals.set(modalId, {
      isOpen: true,
      data,
      openedAt: new Date()
    });
    this.notifyListeners();
  }

  /**
   * Close a modal
   * @param {string} modalId - Modal identifier
   */
  closeModal(modalId) {
    if (this.modals.has(modalId)) {
      this.modals.set(modalId, {
        ...this.modals.get(modalId),
        isOpen: false,
        closedAt: new Date()
      });
      this.notifyListeners();
    }
  }

  /**
   * Toggle a modal
   * @param {string} modalId - Modal identifier
   * @param {Object} data - Optional data to pass when opening
   */
  toggleModal(modalId, data = null) {
    if (this.isModalOpen(modalId)) {
      this.closeModal(modalId);
    } else {
      this.openModal(modalId, data);
    }
  }

  /**
   * Check if a modal is open
   * @param {string} modalId - Modal identifier
   * @returns {boolean} True if modal is open
   */
  isModalOpen(modalId) {
    const modal = this.modals.get(modalId);
    return modal ? modal.isOpen : false;
  }

  /**
   * Get modal data
   * @param {string} modalId - Modal identifier
   * @returns {Object|null} Modal data or null
   */
  getModalData(modalId) {
    const modal = this.modals.get(modalId);
    return modal ? modal.data : null;
  }

  /**
   * Close all modals
   */
  closeAllModals() {
    for (const [modalId] of this.modals) {
      this.closeModal(modalId);
    }
  }

  /**
   * Get all modal states
   * @returns {Object} Object with modal states
   */
  getModalStates() {
    const states = {};
    for (const [modalId, modal] of this.modals) {
      states[modalId] = {
        isOpen: modal.isOpen,
        data: modal.data
      };
    }
    return states;
  }

  /**
   * Register a modal (optional - for debugging/tracking)
   * @param {string} modalId - Modal identifier
   * @param {Object} config - Modal configuration
   */
  registerModal(modalId, config = {}) {
    if (!this.modals.has(modalId)) {
      this.modals.set(modalId, {
        isOpen: false,
        data: null,
        config,
        registeredAt: new Date()
      });
    }
  }

  /**
   * Unregister a modal
   * @param {string} modalId - Modal identifier
   */
  unregisterModal(modalId) {
    this.modals.delete(modalId);
    this.notifyListeners();
  }

  /**
   * Handle confirmation modals with promise-based workflow
   * @param {string} modalId - Modal identifier
   * @param {Object} config - Confirmation config
   * @returns {Promise<boolean>} Promise that resolves with user choice
   */
  showConfirmation(modalId, config = {}) {
    return new Promise((resolve) => {
      const confirmationData = {
        ...config,
        onConfirm: () => {
          this.closeModal(modalId);
          resolve(true);
        },
        onCancel: () => {
          this.closeModal(modalId);
          resolve(false);
        }
      };
      
      this.openModal(modalId, confirmationData);
    });
  }

  /**
   * Handle form modals with data persistence
   * @param {string} modalId - Modal identifier
   * @param {Object} initialData - Initial form data
   * @returns {Promise<Object|null>} Promise that resolves with form data or null if cancelled
   */
  showFormModal(modalId, initialData = {}) {
    return new Promise((resolve) => {
      const formData = {
        ...initialData,
        onSave: (data) => {
          this.closeModal(modalId);
          resolve(data);
        },
        onCancel: () => {
          this.closeModal(modalId);
          resolve(null);
        }
      };
      
      this.openModal(modalId, formData);
    });
  }
}

// Export a singleton instance
const modalService = new ModalService();
export default modalService; 