import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axios';

const useOrganizations = (role, token) => {
  const [organizations, setOrganizations] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [allNetworks, setAllNetworks] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedNetworkId, setSelectedNetworkId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch organizations based on role
  const fetchOrganizations = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/org-network/organizations/");
      if (response.data && Array.isArray(response.data)) {
        setOrganizations(response.data);
      } else {
        console.error("Invalid organizations data:", response.data);
        setOrganizations([]);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch user-specific organizations
  const fetchUserOrganizations = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/org-network/my-orgs");
      if (response.data && Array.isArray(response.data)) {
        setOrganizations(response.data);
      } else {
        console.error("Invalid user organizations data:", response.data);
        setOrganizations([]);
      }
    } catch (error) {
      console.error("Error fetching user organizations:", error);
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch networks for selected organization
  const fetchNetworks = useCallback(async (orgId) => {
    if (!orgId || !token) {
      setNetworks([]);
      return;
    }

    try {
      const response = await axiosInstance.get(`/org-network/networks/?organization_id=${orgId}`);
      if (response.data && Array.isArray(response.data)) {
        setNetworks(response.data);
      } else {
        console.error("Invalid networks data:", response.data);
        setNetworks([]);
      }
    } catch (error) {
      console.error("Error fetching networks:", error);
      setNetworks([]);
    }
  }, [token]);

  // Fetch all networks for access management
  const fetchAllNetworks = useCallback(async () => {
    if (!token) return;

    try {
      const response = await axiosInstance.get("/org-network/all-networks");
      if (response.data && Array.isArray(response.data)) {
        setAllNetworks(response.data);
      } else {
        console.error("Invalid all networks data:", response.data);
        setAllNetworks([]);
      }
    } catch (error) {
      console.error("Error fetching all networks:", error);
      setAllNetworks([]);
    }
  }, [token]);

  // Add new organization
  const addOrganization = async (orgName) => {
    try {
      const response = await axiosInstance.post("/org-network/organizations/", {
        name: orgName
      });
      
      if (response.data) {
        setOrganizations(prev => [...prev, response.data]);
        return { success: true, organization: response.data };
      }
      return { success: false, error: "Invalid response" };
    } catch (error) {
      console.error("Error adding organization:", error);
      return { success: false, error: error.message };
    }
  };

  // Add new network
  const addNetwork = async (networkName, orgId) => {
    try {
      const response = await axiosInstance.post("/org-network/networks/", {
        name: networkName,
        organization_id: orgId
      });
      
      if (response.data) {
        setNetworks(prev => [...prev, response.data]);
        setAllNetworks(prev => [...prev, response.data]);
        return { success: true, network: response.data };
      }
      return { success: false, error: "Invalid response" };
    } catch (error) {
      console.error("Error adding network:", error);
      return { success: false, error: error.message };
    }
  };

  // Delete organization
  const deleteOrganization = async (orgId) => {
    try {
      await axiosInstance.delete(`/org-network/organizations/${orgId}`);
      setOrganizations(prev => prev.filter(org => org.id !== orgId));
      
      // Clear selection if deleted org was selected
      if (selectedOrgId === orgId.toString()) {
        setSelectedOrgId("");
        setSelectedNetworkId("");
        setNetworks([]);
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting organization:", error);
      return { success: false, error: error.message };
    }
  };

  // Delete network
  const deleteNetwork = async (networkId) => {
    try {
      await axiosInstance.delete(`/org-network/networks/${networkId}`);
      setNetworks(prev => prev.filter(net => net.id !== networkId));
      setAllNetworks(prev => prev.filter(net => net.id !== networkId));
      
      // Clear selection if deleted network was selected
      if (selectedNetworkId === networkId.toString()) {
        setSelectedNetworkId("");
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting network:", error);
      return { success: false, error: error.message };
    }
  };

  // Effect to fetch initial data
  useEffect(() => {
    if (token && role) {
      if (role === "company_admin") {
        fetchOrganizations();
      } else {
        fetchUserOrganizations();
      }
      fetchAllNetworks();
    }
  }, [token, role, fetchOrganizations, fetchUserOrganizations, fetchAllNetworks]);

  // Effect to fetch networks when organization changes
  useEffect(() => {
    if (selectedOrgId) {
      fetchNetworks(selectedOrgId);
    } else {
      setNetworks([]);
      setSelectedNetworkId("");
    }
  }, [selectedOrgId, fetchNetworks]);

  // Memoize the return object to prevent unnecessary re-renders
  return {
    // State
    organizations,
    networks,
    allNetworks,
    selectedOrgId,
    selectedNetworkId,
    isLoading,
    
    // Actions
    setSelectedOrgId,
    setSelectedNetworkId,
    fetchOrganizations,
    fetchUserOrganizations,
    fetchNetworks,
    fetchAllNetworks,
    addOrganization,
    addNetwork,
    deleteOrganization,
    deleteNetwork,
  };
};

export default useOrganizations; 