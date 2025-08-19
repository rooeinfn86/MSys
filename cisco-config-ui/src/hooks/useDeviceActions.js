import { useState } from "react";
import { deviceService } from '../services/deviceService';

export const useDeviceActions = (selectedNetworkId, fetchDevices) => {
  const [showForm, setShowForm] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshingDevices, setRefreshingDevices] = useState(new Set());

  const handleChange = (e, form, setForm) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (form, setForm, editingDeviceId, setEditingDeviceId, setShowForm) => {
    // Check all required fields
    const requiredFields = ['name', 'ip', 'location', 'type', 'username', 'password'];
    const missingFields = requiredFields.filter(field => !form[field]);
    
    if (missingFields.length > 0) {
      setErrorMessage(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setShowErrorModal(true);
      return;
    }

    // Check SNMP required fields based on version
    if (form.snmp_version !== 'v3' && !form.community) {
      setErrorMessage("Please provide a Community String for SNMP v1/v2c.");
      setShowErrorModal(true);
      return;
    }

    if (form.snmp_version === 'v3' && 
        (!form.snmp_username || !form.auth_password || !form.priv_password)) {
      setErrorMessage("Please fill in all required SNMP v3 fields.");
      setShowErrorModal(true);
      return;
    }

    if (!form.network_id) {
      setErrorMessage("Please select a network before submitting.");
      setShowErrorModal(true);
      return;
    }

    try {
      // Use the device service to add/edit device
      const deviceInfo = await deviceService.addEditDevice(form, editingDeviceId);

      // Refresh the devices list
      fetchDevices(form.network_id);
      
      // Reset form
      setForm({ 
        name: "", 
        ip: "", 
        location: "Default", 
        type: "", 
        username: "", 
        password: "", 
        network_id: "", 
        is_active: true,
        snmp_version: 'v2c',
        community: 'public',
        snmp_username: '',
        auth_protocol: 'SHA',
        auth_password: '',
        priv_protocol: 'AES',
        priv_password: '',
        snmp_port: '161'
      });
      setEditingDeviceId(null);
      setShowForm(false);
    } catch (err) {
      console.error("❌ Failed to save device:", err);
      setErrorMessage("Failed to save device. Please check connectivity and credentials.");
      setShowErrorModal(true);
    }
  };

  const handleEdit = (device, setForm, setEditingDeviceId, setShowForm) => {
    console.log("Editing device:", device);
    setForm({
      name: device.name,
      ip: device.ip,
      location: device.location,
      type: device.type,
      username: device.username,
      password: device.password,
      network_id: device.network_id,
      is_active: device.is_active,
      snmp_version: device.snmp_version || 'v2c',
      community: device.community || 'public',
      snmp_username: device.snmp_username || '',
      auth_protocol: device.auth_protocol || 'SHA',
      auth_password: device.auth_password || '',
      priv_protocol: device.priv_protocol || 'AES',
      priv_password: device.priv_password || '',
      snmp_port: device.snmp_port || '161'
    });
    setEditingDeviceId(device.id);
    setShowForm(true);
  };

  const confirmDelete = (id) => {
    console.log("confirmDelete called with ID:", id);
    setDeviceToDelete(id);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      console.log("handleConfirmDelete called with deviceToDelete:", deviceToDelete);
      
      if (!deviceToDelete) {
        console.error("No device ID to delete");
        return;
      }

      // Use the device service to delete the device
      await deviceService.deleteDevice(deviceToDelete);
      
      // Success - remove from local state and close modal
      setShowConfirmModal(false);
      setDeviceToDelete(null);
      
      console.log("Device deleted successfully!");
      
      // Refresh the devices list
      if (selectedNetworkId) {
        fetchDevices(selectedNetworkId);
      }
      
    } catch (error) {
      console.error("Delete failed:", error);
      setErrorMessage(`Failed to delete device: ${error.message}`);
      setShowConfirmModal(false);
      setDeviceToDelete(null);
    }
  };

  const handleServiceToggle = async (deviceId, currentStatus, devices, setDevices) => {
    try {
      const userRole = localStorage.getItem("user_role");
      const userTier = parseInt(localStorage.getItem("engineer_tier"), 10);
      
      if (userRole !== "company_admin" && (userRole === "engineer" && userTier < 3)) {
        setErrorMessage("You don't have permission. Please contact the network administrator.");
        setShowErrorModal(true);
        return;
      }

      const updatedDevice = await deviceService.toggleServiceStatus(deviceId, currentStatus);
      setDevices(prevDevices => 
        prevDevices.map(device => 
          device.id === deviceId ? updatedDevice : device
        )
      );
    } catch (error) {
      console.error('Error toggling service status:', error);
      setErrorMessage("You don't have permission. Please contact the network administrator.");
      setShowErrorModal(true);
    }
  };

  const handleIndividualRefresh = async (deviceId) => {
    try {
      console.log(`🔄 Refreshing status for device ID: ${deviceId}`);
      
      // Set loading state for this device
      setRefreshingDevices(prev => new Set(prev).add(deviceId));
      
      // Use the device service to refresh device status
      const updatedDevice = await deviceService.refreshDeviceStatus(deviceId, selectedNetworkId);
      
      if (updatedDevice) {
        console.log("✅ Device status updated from API:", updatedDevice);
        
        // Re-fetch the entire device list to ensure we have the latest status
        await fetchDevices(selectedNetworkId);
        
        console.log("✅ Device list refreshed successfully");
      }
    } catch (error) {
      console.error('❌ Error refreshing device status:', error);
      // You can add a toast notification here if you want
    } finally {
      // Clear loading state for this device
      setRefreshingDevices(prev => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    }
  };

  const handleGlobalRefresh = async () => {
    try {
      console.log("🔄 Refreshing all device statuses...");
      
      // Use the device service to refresh all device statuses
      await deviceService.refreshAllDeviceStatuses(selectedNetworkId);
      
      // Re-fetch devices to get updated status
      await fetchDevices(selectedNetworkId);
      
      console.log("✅ All device statuses refreshed successfully!");
    } catch (err) {
      console.error("❌ Failed to refresh devices:", err);
    }
  };

  return {
    // State
    showForm,
    editingDeviceId,
    showConfirmModal,
    deviceToDelete,
    showErrorModal,
    errorMessage,
    refreshingDevices,
    
    // Setters
    setShowForm,
    setEditingDeviceId,
    setShowConfirmModal,
    setDeviceToDelete,
    setShowErrorModal,
    setErrorMessage,
    
    // Actions
    handleChange,
    handleSubmit,
    handleEdit,
    confirmDelete,
    handleConfirmDelete,
    handleServiceToggle,
    handleIndividualRefresh,
    handleGlobalRefresh
  };
}; 