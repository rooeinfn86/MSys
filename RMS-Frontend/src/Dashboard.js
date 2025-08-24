import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/TeamManagement.css";

// Context Hooks
import { useAuthContext } from "./contexts/AuthContext";
import { useOrganizationContext } from "./contexts/OrganizationContext";
import DeviceManager from "./DeviceManager";
import ConfigVerification from "./ConfigVerification";
import DeviceLogs from "./DeviceLogs";
import Compliance from "./Compliance";
import UnifiedConfigAssistant from "./ConfigReviewUI";
import NetworkTopology from "./pages/NetworkTopology";
import CompanyTokenManagement from "./CompanyTokenManagement";


// Layout Components
import Layout from "./components/Layout";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Modal from "./components/Modal";
import NotificationContainer from "./components/NotificationContainer";

import {
  Trash2,
  Pencil,
  Plus,
  XCircle,
} from "lucide-react";

import axiosInstance from "./utils/axios";
import { tokenManager } from "./utils/secureStorage";

// Services
import TeamManagementService from "./services/TeamManagementService";
import NotificationService from "./services/NotificationService";

export default function Dashboard() {
  // Context hooks
  const auth = useAuthContext();
  const org = useOrganizationContext();
  
  // State variables for team management
  const [teamMembers, setTeamMembers] = useState([]);
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("engineer");
  const [newMemberEngineerTier, setNewMemberEngineerTier] = useState(1);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [memberAccess, setMemberAccess] = useState({ organization_ids: [], network_ids: [], feature_names: [] });
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  
  // State for organization/network management
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newNetworkName, setNewNetworkName] = useState("");
  const [deleteOrgConfirmOpen, setDeleteOrgConfirmOpen] = useState(false);
  const [deleteNetworkConfirmOpen, setDeleteNetworkConfirmOpen] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState(null);
  const [networkToDelete, setNetworkToDelete] = useState(null);
  
  // State for UI
  const [activeTab, setActiveTab] = useState("inventory");
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  // Remove old notification states - now using NotificationService
  // const [successMessage, setSuccessMessage] = useState("");
  // const [showSuccess, setShowSuccess] = useState(false);
  // const [showErrorModal, setShowErrorModal] = useState(false);
  // const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  // Destructure values from contexts for easier access
  const {
    username,
    role,
    isLoading,
    token,
    handleLogout
  } = auth;

  const {
    organizations,
    networks,
    allNetworks: contextAllNetworks,
    selectedOrgId,
    selectedNetworkId,
    isLoading: orgLoading,
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
    allowedFeatures,
    hasFeatureAccess
  } = org;

  // Simple check to redirect if no token - the useOrganizations hook handles data fetching
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);
  
  // Keep only the dashboard-specific useEffects

  // Feature access is now handled by useFeatures hook in OrganizationContext
  // No need for duplicate fetchFeatureAccess function here

  const fetchTeamMembers = useCallback(async () => {
    const result = await TeamManagementService.fetchTeamMembers();
    if (result.success) {
      setTeamMembers(result.data);
        } else {
      NotificationService.showError(`Failed to fetch team members: ${result.error}`);
          setTeamMembers([]);
        }
  }, []);

  useEffect(() => {
    if (token) {
      try {
        // Use tokenManager instead of direct localStorage access
        const userData = tokenManager.getUserData();
        if (userData) {
          console.log("✅ User Data loaded via tokenManager:", {
            role: userData.role,
            engineer_tier: userData.engineer_tier ? Number(userData.engineer_tier) : null
          });
          
          // No need to fetch features/organizations here - useAuth handles this
        } else {
          console.warn("⚠️ No user data found via tokenManager, but token exists");
          // Don't navigate to login immediately - let useAuth handle this
        }
      } catch (err) {
        console.error("❌ Failed to get user data via tokenManager:", err);
        // Don't navigate to login immediately - let useAuth handle this
      }
    } else {
      console.log("ℹ️ No token found, useAuth will handle navigation");
    }
  }, [token]);

  // Add useEffect to fetch networks when organization changes
  useEffect(() => {
    console.log("Organization selection changed:", selectedOrgId);
    if (selectedOrgId) {
      console.log("Fetching networks for organization:", selectedOrgId);
      fetchNetworks(selectedOrgId);
    } else {
      console.log("No organization selected, clearing networks");
      // setNetworks([]); // This is now in useOrganizationContext
      setSelectedNetworkId("");
    }
  }, [selectedOrgId, fetchNetworks, setSelectedNetworkId]);

  useEffect(() => {
    console.log("Network selection changed:", selectedNetworkId);
  }, [selectedNetworkId]);

  useEffect(() => {
    console.log("Active tab changed:", activeTab);
    if (activeTab === "teamManagement" && role === "company_admin") {
      fetchTeamMembers(); // Re-enable this for now
    }
  }, [activeTab, role, fetchTeamMembers]);

  // Add useEffect to fetch networks when add member modal opens
  useEffect(() => {
    if (addMemberModalOpen || editModalOpen) {
      console.log("🚀 Fetching all networks for modal...");
      fetchAllNetworks();
    }
  }, [addMemberModalOpen, editModalOpen, fetchAllNetworks]);

  // Debug allNetworks state
  useEffect(() => {
    console.log("📡 All Networks state updated:", contextAllNetworks);
  }, [contextAllNetworks]);

  // Add a log after organizations is set
  useEffect(() => {
    console.log("Organizations state after fetch:", organizations);
  }, [organizations]);

  // Always fetch features on dashboard load or when the dashboard tab is active
  // useEffect(() => {
  //   fetchFeatureAccess();
  // }, [fetchFeatureAccess]);

  // Create handlers for TopBar
  const handleRefresh = () => {
    if (role === "company_admin") {
      fetchOrganizations();
    } else {
      fetchUserOrganizations();
    }
  };

  const handleAddMember = async () => {
    const memberData = TeamManagementService.formatMemberData({
      username: newMemberUsername,
      password: newMemberPassword,
      role: newMemberRole,
      engineer_tier: newMemberEngineerTier,
      organization_ids: memberAccess.organization_ids,
      network_ids: memberAccess.network_ids,
      feature_names: memberAccess.feature_names
    });

    const validation = TeamManagementService.validateMemberData(memberData);
    if (!validation.isValid) {
      NotificationService.showError(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    const result = await TeamManagementService.addTeamMember(memberData);
    
    if (result.success) {
      setNewMemberUsername("");
      setNewMemberPassword("");
      setNewMemberRole("engineer");
      setNewMemberEngineerTier(1);
      setEditingMemberId(null);
      setMemberAccess({ organization_ids: [], network_ids: [], feature_names: [] });
      setAddMemberModalOpen(false);
      
      NotificationService.showSuccess("Team member added successfully!");
      setTimeout(() => {
        fetchTeamMembers();
      }, 500);
    } else {
      NotificationService.showError(`Failed to add team member: ${result.error}`);
    }
  };

  const handleSaveOrg = async () => {
    try {
      const result = await addOrganization(newOrgName);
      NotificationService.handleApiResponse(result, "Organization added successfully!");
      
      if (result.success) {
        setNewOrgName("");
        setOrgModalOpen(false);
      }
    } catch (error) {
      console.error("Error adding organization:", error);
      NotificationService.showError("Failed to add organization");
    }
  };

  const handleSaveNetwork = async () => {
    if (!selectedOrgId) {
      NotificationService.showError("Please select an organization first");
      return;
    }

    try {
      const result = await addNetwork(newNetworkName, selectedOrgId);
      NotificationService.handleApiResponse(result, "Network added successfully!");
      
      if (result.success) {
        setNewNetworkName("");
        setNetworkModalOpen(false);
      }
    } catch (error) {
      console.error("Error adding network:", error);
      NotificationService.showError("Failed to add network");
    }
  };

  const handleDeleteOrganization = async () => {
    if (!organizationToDelete) return;

    try {
      const result = await deleteOrganization(organizationToDelete.id);
      NotificationService.handleApiResponse(result, "Organization deleted successfully!");
      
      if (result.success) {
        setDeleteOrgConfirmOpen(false);
        setOrganizationToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting organization:", error);
      NotificationService.showError("Failed to delete organization");
    }
  };

  const handleDeleteNetwork = async () => {
    if (!networkToDelete) return;

    try {
      const result = await deleteNetwork(networkToDelete.id);
      NotificationService.handleApiResponse(result, "Network deleted successfully!");
      
      if (result.success) {
        setDeleteNetworkConfirmOpen(false);
        setNetworkToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting network:", error);
      NotificationService.showError("Failed to delete network");
    }
  };

  // Tab navigation handler
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  };

  // Organization and network delete handlers
  const handleDeleteOrgClick = (org) => {
    if (!org || !org.id) {
      console.error("Invalid organization:", org);
      return;
    }
    setOrganizationToDelete(org);
    setDeleteOrgConfirmOpen(true);
  };

  const handleDeleteNetworkClick = (network) => {
    console.log("Delete network clicked:", network);
    if (!network || !network.id) {
      console.error("Invalid network:", network);
      return;
    }
    setNetworkToDelete(network);
    setDeleteNetworkConfirmOpen(true);
  };

  // Team member handlers
  const handleEditClick = (member) => {
    setEditingUser(member);
    setEditingMemberId(member.id);
    setNewMemberUsername(member.username);
    setNewMemberPassword("");
    setNewMemberRole(member.role);
    setNewMemberEngineerTier(member.engineer_tier || 1);
    setMemberAccess({
      organization_ids: member.organizations?.map(org => org.id) || [],
      network_ids: member.networks?.map(net => net.id) || [],
      feature_names: member.feature_access_display?.map(f => f.feature_name) || []
    });
    setEditModalOpen(true);
  };

  const handleDeleteClick = (member) => {
    setMemberToDelete(member);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (memberToDelete) {
      handleDeleteMember(memberToDelete.id);
      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
    }
  };

  const handleDeleteMember = async (id) => {
    const result = await TeamManagementService.deleteTeamMember(id);
    
    if (result.success) {
      NotificationService.showSuccess("Team member deleted successfully!");
      fetchTeamMembers();
      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
    } else {
      NotificationService.showError(`Failed to delete team member: ${result.error}`);
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMemberId) return;

    const memberData = TeamManagementService.formatMemberData({
      username: newMemberUsername,
      password: newMemberPassword,
      role: newMemberRole,
      engineer_tier: newMemberEngineerTier,
      organization_ids: memberAccess.organization_ids,
      network_ids: memberAccess.network_ids,
      feature_names: memberAccess.feature_names
    });

    const result = await TeamManagementService.updateTeamMember(editingMemberId, memberData);
    
    if (result.success) {
      setEditModalOpen(false);
      setEditingMemberId(null);
      setNewMemberUsername("");
      setNewMemberPassword("");
      setNewMemberRole("engineer");
      setNewMemberEngineerTier(1);
      setMemberAccess({ organization_ids: [], network_ids: [], feature_names: [] });
      
      NotificationService.showSuccess("Team member updated successfully!");
      fetchTeamMembers();
    } else {
      NotificationService.showError(`Failed to update team member: ${result.error}`);
    }
  };

  // Feature toggle handler
  const toggleFeature = (feature) => {
    setMemberAccess((prev) => {
      const exists = prev.feature_names.includes(feature);
      return {
        ...prev,
        feature_names: exists ? prev.feature_names.filter((f) => f !== feature) : [...prev.feature_names, feature],
      };
    });
  };

  // Render functions
  const renderRole = (member) => {
    if (member.role === "engineer") {
      const tierLabels = {
        1: "Tier 1 Engineer",
        2: "Tier 2 Engineer",
        3: "Tier 3 Engineer"
      };
      return (
        <span className="inline-block bg-purple-700 text-xs px-2 py-1 rounded">
          {tierLabels[member.engineer_tier] || "Engineer"}
        </span>
      );
    } else if (member.role === "viewer") {
      return (
        <span className="inline-block bg-yellow-500 text-xs px-2 py-1 rounded text-black">
          Viewer
        </span>
      );
    } else {
      return (
        <span className="inline-block bg-gray-700 text-xs px-2 py-1 rounded">
          {member.role}
        </span>
      );
    }
  };

  const renderFeatures = (member) => {
    const features = member.feature_access_display || 
                    (member.feature_names?.map(name => ({ feature_name: name }))) ||
                    [];
    
    if (features.length === 0) {
      return <span className="text-gray-400 text-xs">None</span>;
    }

    return features.map((f, idx) => {
      const featureName = f.feature_name || f;
      return renderFeatureBadge(featureName);
    });
  };

  const renderFeatureBadge = (featureName) => {
    const displayName = featureName === "config_assistant" ? "Config Assistant" :
                       featureName === "verification" ? "Verification" :
                       featureName;
    const bgColor = featureName === "config_assistant" ? "bg-purple-900/50 text-purple-200 border-purple-800" :
                   featureName === "verification" ? "bg-indigo-900/50 text-indigo-200 border-indigo-800" :
                   "bg-gray-900/50 text-gray-200 border-gray-800";
    return (
      <span key={featureName} className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${bgColor}`}>
        {displayName}
      </span>
    );
  };

  const renderEngineerTierSelect = () => {
    if (newMemberRole !== "engineer") return null;
    
    return (
      <div>
        <label className="block mb-1 font-semibold">Engineer Tier</label>
        <select
          value={newMemberEngineerTier}
          onChange={(e) => setNewMemberEngineerTier(parseInt(e.target.value))}
          className="p-2 bg-[#0f111a] border border-[#2a2f45] rounded w-full"
        >
          <option value={1}>Tier 1 Engineer (View Only)</option>
          <option value={2}>Tier 2 Engineer (Device Management)</option>
          <option value={3}>Tier 3 Engineer (Org/Network Management)</option>
        </select>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "inventory":
        return <DeviceManager selectedOrgId={selectedOrgId} selectedNetworkId={selectedNetworkId} />;
      case "logs":
        return <DeviceLogs selectedNetworkId={selectedNetworkId} />;
      case "config-review":
        return <UnifiedConfigAssistant selectedNetworkId={selectedNetworkId} />;
      case "config-verification":
        return <ConfigVerification selectedNetworkId={selectedNetworkId} />;
      case "compliance":
        return <Compliance networkId={selectedNetworkId} />;
      case "teamManagement":
        return <TeamManagement />;
      case "agent-deployment":
        return <CompanyTokenManagement />;

      case "network-diagram":
        return <NetworkTopology selectedNetworkId={selectedNetworkId} />;
      default:
        return null;
    }
  };

  function TeamManagement() {
    if (teamMembers.length === 0) {
      return (
        <div className="team-management-container">
          <div className="team-management-header">
            <div className="team-management-title">Team Management</div>
            <button
              onClick={() => setAddMemberModalOpen(true)}
              className="btn-add-member"
            >
              <Plus size={20} /> Add Member
            </button>
          </div>
          
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-text">No Team Members Found</div>
            <div className="empty-state-subtext">Start building your team by adding the first member</div>
          </div>
        </div>
      );
    }

    return (
      <div className="team-management-container">
        <div className="team-management-header">
          <div className="team-management-title">Team Management</div>
          <button
            onClick={() => setAddMemberModalOpen(true)}
            className="btn-add-member"
          >
            <Plus size={20} /> Add Member
          </button>
        </div>
        
        <div className="team-management-table-container">
          <table className="team-management-table">
            <thead>
              <tr>
                <th data-label="Username">Username</th>
                <th data-label="Role">Role</th>
                <th data-label="Engineer Tier">Engineer Tier</th>
                <th data-label="Organization Access">Organization Access</th>
                <th data-label="Network Access">Network Access</th>
                <th data-label="Feature Access">Feature Access</th>
                <th data-label="Actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id}>
                  <td data-label="Username">
                    <div className="flex items-center gap-3">
                      <div className="user-avatar">
                        {member.username[0]?.toUpperCase() || "U"}
                      </div>
                      <span className="font-medium text-white">{member.username}</span>
                    </div>
                  </td>
                  <td data-label="Role">
                    <span className={`role-badge ${member.role || 'default'}`}>
                      {member.role || 'N/A'}
                    </span>
                  </td>
                  <td data-label="Engineer Tier">
                    {member.role === 'engineer' ? 
                      (member.engineer_tier ? (
                        <span className={`tier-badge tier-${member.engineer_tier}`}>
                          Tier {member.engineer_tier}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">N/A</span>
                      )) : 
                      <span className="text-gray-500 text-sm">-</span>
                    }
                  </td>
                  <td data-label="Organization Access">
                    <div className="max-w-xs">
                      {member.organizations && member.organizations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.organizations.map((org) => (
                            <span key={org.id} className="access-badge organization">
                              {org.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No access</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Network Access">
                    <div className="max-w-xs">
                      {member.networks && member.networks.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.networks.map((network) => (
                            <span key={network.id} className="access-badge network">
                              {network.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No access</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Feature Access">
                    <div className="max-w-xs">
                      {member.feature_access_display && member.feature_access_display.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.feature_access_display.map((feature, index) => (
                            <span key={index} className="access-badge feature">
                              {feature.feature_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No features</span>
                      )}
                    </div>
                  </td>
                  <td data-label="Actions">
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEditClick(member)}
                        className="btn-edit"
                        title="Edit member"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(member)}
                        className="btn-delete"
                        title="Delete member"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

    return (
    <Layout
      isLoading={isLoading}
      sidebar={
        <Sidebar
          activeTab={activeTab}
          onTabClick={handleTabClick}
          allowedFeatures={allowedFeatures}
          role={role}
        />
      }
      topBar={
        <TopBar
          username={username}
          organizations={organizations}
          networks={networks}
          selectedOrgId={selectedOrgId}
          selectedNetworkId={selectedNetworkId}
          role={role}
          onOrgChange={setSelectedOrgId}
          onNetworkChange={setSelectedNetworkId}
          onAddOrg={() => setOrgModalOpen(true)}
          onAddNetwork={() => setNetworkModalOpen(true)}
          onDeleteOrg={handleDeleteOrgClick}
          onDeleteNetwork={handleDeleteNetworkClick}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />
      }
    >
      {renderContent()}

      {/* Modals */}
      {orgModalOpen && (
        <Modal title="Add Organization" onClose={() => setOrgModalOpen(false)} onSave={handleSaveOrg}>
          <input type="text" className="w-full p-2 mb-4 rounded bg-[#0f111a] border border-[#2a2f45] text-white" placeholder="Organization Name" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
        </Modal>
      )}
      {networkModalOpen && (
        <Modal title="Add Network" onClose={() => setNetworkModalOpen(false)} onSave={handleSaveNetwork}>
          <input type="text" className="w-full p-2 mb-4 rounded bg-[#0f111a] border border-[#2a2f45] text-white" placeholder="Network Name" value={newNetworkName} onChange={(e) => setNewNetworkName(e.target.value)} />
          <select className="w-full p-2 rounded bg-[#0f111a] border border-[#2a2f45] text-white" value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}>
            <option value="">-- Select Organization --</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </Modal>
      )}
      {teamModalOpen && (
        <Modal title="Team Management" onClose={() => setTeamModalOpen(false)}>
          <div className="mb-6 p-4 bg-[#181a23] rounded-lg shadow flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 font-semibold">Username</label>
                      <input type="text" placeholder="Username" value={newMemberUsername} onChange={(e) => setNewMemberUsername(e.target.value)} className="p-2 bg-[#0f111a] border border-[#2a2f45] rounded w-full" />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold">Password</label>
                      <input type="password" placeholder="Password" value={newMemberPassword} onChange={(e) => setNewMemberPassword(e.target.value)} className="p-2 bg-[#0f111a] border border-[#2a2f45] rounded w-full" />
                    </div>
                    <div>
                      <label className="block mb-1 font-semibold">Role</label>
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        className="p-2 bg-[#0f111a] border border-[#2a2f45] rounded w-full"
                      >
                        <option value="engineer">Engineer</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    {renderEngineerTierSelect()}
                    <div className="flex items-end">
                      <button onClick={handleAddMember} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full">{editingMemberId ? "Update" : "Add"} Member</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="mb-2 font-medium">Organization Access</div>
                      <div className="relative">
                        <div className="min-h-[40px] w-full px-3 py-2 bg-[#2a2f45] rounded-lg border border-[#3a405a] focus-within:ring-2 focus-within:ring-blue-500">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {memberAccess.organization_ids.map(orgId => {
                              const org = organizations.find(o => o.id === orgId);
                              return org ? (
                                <div key={org.id} className="inline-flex items-center gap-1 bg-blue-900/50 px-2 py-1 rounded-md">
                                  <span className="text-sm">{org.name}</span>
                                  <button
                                    onClick={() => {
                                      setMemberAccess(prev => ({
                                        ...prev,
                                        organization_ids: prev.organization_ids.filter(id => id !== org.id),
                                        network_ids: prev.network_ids.filter(netId => 
                                          contextAllNetworks.find(n => n.id === netId && n.organization_id !== org.id)
                                        )
                                      }));
                                    }}
                                    className="text-gray-400 hover:text-white ml-1"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                          <select
                            value=""
                            onChange={(e) => {
                              const selectedId = Number(e.target.value);
                              if (!memberAccess.organization_ids.includes(selectedId)) {
                                setMemberAccess(prev => ({
                                  ...prev,
                                  organization_ids: [...prev.organization_ids, selectedId]
                                }));
                              }
                            }}
                            className="w-full bg-transparent text-gray-400 focus:outline-none cursor-pointer [&>option]:bg-[#1c1f2b] [&>option]:text-white [&>option]:py-2 [&>option:hover]:bg-[#2a2f45]"
                            style={{
                              WebkitAppearance: 'none',
                              MozAppearance: 'none'
                            }}
                          >
                            <option value="" className="text-gray-400 bg-[#1c1f2b]">Add organization...</option>
                            {organizations
                              .filter(org => !memberAccess.organization_ids.includes(org.id))
                              .map(org => (
                                <option key={org.id} value={org.id} className="text-white bg-[#1c1f2b] hover:bg-[#2a2f45]">{org.name}</option>
                              ))
                            }
                          </select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 font-medium">Network Access</div>
                      <div className="relative">
                        <div className="min-h-[40px] w-full px-3 py-2 bg-[#2a2f45] rounded-lg border border-[#3a405a] focus-within:ring-2 focus-within:ring-blue-500">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {memberAccess.network_ids.map(netId => {
                              const network = contextAllNetworks.find(n => n.id === netId);
                              return network ? (
                                <div key={network.id} className="inline-flex items-center gap-1 bg-green-900/50 px-2 py-1 rounded-md">
                                  <span className="text-sm">{network.name}</span>
                                  <button
                                    onClick={() => {
                                      setMemberAccess(prev => ({
                                        ...prev,
                                        network_ids: prev.network_ids.filter(id => id !== network.id)
                                      }));
                                    }}
                                    className="text-gray-400 hover:text-white ml-1"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                          <select
                            value=""
                            onChange={(e) => {
                              const selectedId = Number(e.target.value);
                              if (!memberAccess.network_ids.includes(selectedId)) {
                                setMemberAccess(prev => ({
                                  ...prev,
                                  network_ids: [...prev.network_ids, selectedId]
                                }));
                              }
                            }}
                            className="w-full bg-transparent text-gray-400 focus:outline-none cursor-pointer [&>option]:bg-[#1c1f2b] [&>option]:text-white [&>option]:py-2 [&>option:hover]:bg-[#2a2f45]"
                            style={{
                              WebkitAppearance: 'none',
                              MozAppearance: 'none'
                            }}
                          >
                            <option value="" className="text-gray-400 bg-[#1c1f2b]">Add network...</option>
                            {contextAllNetworks
                              .filter(network => 
                                memberAccess.organization_ids.includes(network.organization_id) && 
                                !memberAccess.network_ids.includes(network.id)
                              )
                              .map(network => (
                                <option key={network.id} value={network.id} className="text-white bg-[#1c1f2b] hover:bg-[#2a2f45]">{network.name}</option>
                              ))
                            }
                          </select>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 font-medium">Feature Access</div>
                      <div className="space-y-2">
                        {['config_assistant', 'verification', 'compliance'].map((feature) => (
                          <label key={feature} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={memberAccess.feature_names.includes(feature)}
                              onChange={() => toggleFeature(feature)}
                              className="accent-blue-600"
                            />
                            <span>{feature.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="mb-2 font-semibold text-lg">Team Members</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-[#181a23] rounded-lg text-sm">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left">User</th>
                          <th className="px-4 py-2 text-left">Role</th>
                          <th className="px-4 py-2 text-left">Organizations</th>
                          <th className="px-4 py-2 text-left">Networks</th>
                          <th className="px-4 py-2 text-left">Features</th>
                          <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((member) => (
                          <tr key={member.id} className="border-b border-[#23263a]">
                            <td className="px-4 py-2 flex items-center gap-2">
                              <span className="inline-block w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 text-white flex items-center justify-center font-bold text-lg">
                                {member.username[0]?.toUpperCase() || "U"}
                              </span>
                              <span>{member.username}</span>
                            </td>
                            <td className="px-4 py-2">
                              {renderRole(member)}
                            </td>
                            <td className="px-4 py-2">
                              {(member.organizations || []).length > 0 ? member.organizations.map((org, idx) => (
                                <span key={idx} className="inline-block bg-blue-900 text-xs px-2 py-1 rounded mr-1 mb-1">{org.name}</span>
                              )) : <span className="text-gray-400 text-xs">None</span>}
                            </td>
                            <td className="px-4 py-2">
                              {(member.networks || []).length > 0 ? member.networks.map((net, idx) => (
                                <span key={idx} className="inline-block bg-green-900 text-xs px-2 py-1 rounded mr-1 mb-1">{net.name}</span>
                              )) : <span className="text-gray-400 text-xs">None</span>}
                            </td>
                            <td className="px-4 py-2">
                              {renderFeatures(member)}
                            </td>
                            <td className="px-4 py-2 flex gap-2">
                              <button
                                onClick={() => handleEditClick(member)}
                                title="Edit"
                                className="text-yellow-400 hover:text-yellow-600"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(member)}
                                title="Delete"
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Modal>
            )}

            {addMemberModalOpen && (
              <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
                <div 
                  className="modal-content p-6 rounded-lg shadow-lg relative"
                  style={{
                    width: '80vw',
                    maxWidth: '80vw',
                    height: 'auto',
                    maxHeight: '80vh',
                    overflow: 'visible'
                  }}
                >
                  <button 
                    onClick={() => setAddMemberModalOpen(false)}
                    className="absolute top-4 right-4 text-white hover:text-red-500 text-xl z-10 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-all"
                  >
                    &times;
                  </button>
                  
                  {/* Header Section */}
                  <div className="text-center mb-6">
                    <h3 className="modal-title text-2xl mb-2">Add Team Member</h3>
                    <p className="text-gray-400 text-sm">Configure new team member with credentials and access permissions</p>
                  </div>
                  
                  {/* Main Content - Two Column Layout */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                    {/* Left Column - Basic Information */}
                    <div className="space-y-4">
                      {/* Basic Information Section */}
                      <div className="bg-[#11131a] border border-[#00ff00]/20 rounded-lg p-4">
                        <h4 className="text-lg font-medium text-white mb-3 border-b border-[#00ff00]/20 pb-2">Basic Information</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Username *</label>
                            <input
                              type="text"
                              value={newMemberUsername}
                              onChange={(e) => setNewMemberUsername(e.target.value)}
                              className="form-input w-full"
                              placeholder="Enter username"
                              autoComplete="off"
                              autoFocus
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Password *</label>
                            <input
                              type="password"
                              value={newMemberPassword}
                              onChange={(e) => setNewMemberPassword(e.target.value)}
                              className="form-input w-full"
                              placeholder="Enter password"
                              autoComplete="new-password"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Role *</label>
                            <select
                              value={newMemberRole}
                              onChange={(e) => {
                                setNewMemberRole(e.target.value);
                                if (e.target.value !== 'engineer') {
                                  setNewMemberEngineerTier(null);
                                }
                              }}
                              className="form-input w-full"
                            >
                              <option value="full_control">Full Control</option>
                              <option value="engineer">Engineer</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                          
                          {newMemberRole === 'engineer' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Engineer Tier *</label>
                              <select
                                value={newMemberEngineerTier || ''}
                                onChange={(e) => setNewMemberEngineerTier(Number(e.target.value))}
                                className="form-input w-full"
                              >
                                <option value="">Select Tier</option>
                                <option value="1">Tier 1</option>
                                <option value="2">Tier 2</option>
                                <option value="3">Tier 3</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Column - Access Control */}
                    <div className="space-y-4">
                      {/* Access Control Section */}
                      {newMemberRole !== 'full_control' && (
                        <div className="bg-[#11131a] border border-[#00ff00]/20 rounded-lg p-4">
                          <h4 className="text-lg font-medium text-white mb-3 border-b border-[#00ff00]/20 pb-2">Access Control</h4>
                          <div className="space-y-4">
                            {/* Organization Access */}
                            <div>
                              <h5 className="text-base font-medium text-gray-300 mb-2">Organization Access</h5>
                              <div className="access-tags mb-3">
                                {memberAccess.organization_ids.map(orgId => {
                                  const org = organizations.find(o => o.id === orgId);
                                  return org ? (
                                    <div key={org.id} className="access-tag organization">
                                      <span>{org.name}</span>
                                      <button
                                        onClick={() => {
                                          setMemberAccess(prev => ({
                                            ...prev,
                                            organization_ids: prev.organization_ids.filter(id => id !== org.id),
                                            network_ids: prev.network_ids.filter(netId => 
                                              contextAllNetworks.find(n => n.id === netId && n.organization_id !== org.id)
                                            )
                                          }));
                                        }}
                                        className="access-tag-remove"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                              <select
                                value=""
                                onChange={(e) => {
                                  const selectedId = Number(e.target.value);
                                  if (!memberAccess.organization_ids.includes(selectedId)) {
                                    setMemberAccess(prev => ({
                                      ...prev,
                                      organization_ids: [...prev.organization_ids, selectedId]
                                    }));
                                  }
                                }}
                                className="form-input w-full"
                              >
                                <option value="">Add organization...</option>
                                {organizations
                                  .filter(org => !memberAccess.organization_ids.includes(org.id))
                                  .map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                  ))
                                }
                              </select>
                            </div>
                            
                            {/* Network Access */}
                            <div>
                              <h5 className="text-base font-medium text-gray-300 mb-2">Network Access</h5>
                              <div className="access-tags mb-3">
                                {memberAccess.network_ids.map(netId => {
                                  const network = contextAllNetworks.find(n => n.id === netId);
                                  return network ? (
                                    <div key={network.id} className="access-tag network">
                                      <span>{network.name}</span>
                                      <button
                                        onClick={() => {
                                          setMemberAccess(prev => ({
                                            ...prev,
                                            network_ids: prev.network_ids.filter(id => id !== network.id)
                                          }));
                                        }}
                                        className="access-tag-remove"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                              <select
                                value=""
                                onChange={(e) => {
                                  const selectedId = Number(e.target.value);
                                  if (!memberAccess.network_ids.includes(selectedId)) {
                                    setMemberAccess(prev => ({
                                      ...prev,
                                      network_ids: [...prev.network_ids, selectedId]
                                    }));
                                  }
                                }}
                                className="form-input w-full"
                              >
                                <option value="">Add network...</option>
                                {contextAllNetworks
                                  .filter(network => 
                                    memberAccess.organization_ids.includes(network.organization_id) && 
                                    !memberAccess.network_ids.includes(network.id)
                                  )
                                  .map(network => (
                                    <option key={network.id} value={network.id}>{network.name}</option>
                                  ))
                                }
                              </select>
                            </div>
                            
                            {/* Feature Access */}
                            <div>
                              <h5 className="text-base font-medium text-gray-300 mb-2">Feature Access</h5>
                              <div className="feature-checkboxes">
                                {['config_assistant', 'verification', 'compliance'].map((feature) => (
                                  <div key={feature} className="feature-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={memberAccess.feature_names.includes(feature)}
                                      onChange={() => toggleFeature(feature)}
                                    />
                                    <span>{feature.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-[#00ff00]/20">
                    <button
                      onClick={() => {
                        setAddMemberModalOpen(false);
                        setNewMemberUsername('');
                        setNewMemberPassword('');
                        setNewMemberRole('engineer');
                        setNewMemberEngineerTier(1);
                        setMemberAccess({ organization_ids: [], network_ids: [], feature_names: [] });
                      }}
                      className="btn-secondary px-6 py-2"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMember}
                      className="btn-primary px-8 py-2"
                    >
                      Add Member
                    </button>
                  </div>
                </div>
              </div>
            )}

            {editModalOpen && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h2 className="modal-title">Edit Team Member - {editingUser?.username}</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                          type="text"
                          placeholder="Username"
                          value={newMemberUsername}
                          onChange={(e) => setNewMemberUsername(e.target.value)}
                          className="form-input"
                          autoComplete="off"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">New Password (Optional)</label>
                        <input
                          type="password"
                          placeholder="Leave blank to keep current password"
                          value={newMemberPassword}
                          onChange={(e) => setNewMemberPassword(e.target.value)}
                          className="form-input"
                          autoComplete="new-password"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Role</label>
                        <select
                          value={newMemberRole}
                          onChange={(e) => { setNewMemberRole(e.target.value); if (e.target.value !== 'engineer') { setNewMemberEngineerTier(null); } }}
                          className="form-select"
                        >
                          <option value="full_control">Full Control</option>
                          <option value="engineer">Engineer</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>
                      {newMemberRole === 'engineer' && (
                        <div className="form-group">
                          <label className="form-label">Engineer Tier</label>
                          <select
                            value={newMemberEngineerTier || ''}
                            onChange={(e) => setNewMemberEngineerTier(Number(e.target.value))}
                            className="form-select"
                          >
                            <option value="">Select Tier</option>
                            <option value="1">Tier 1</option>
                            <option value="2">Tier 2</option>
                            <option value="3">Tier 3</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {newMemberRole !== 'full_control' && (
                      <div className="access-container">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          <div className="access-section">
                            <div className="access-section-title">Organization Access</div>
                            <div className="access-tags">
                              {memberAccess.organization_ids.map(orgId => {
                                const org = organizations.find(o => o.id === orgId);
                                return org ? (
                                  <div key={org.id} className="access-tag organization">
                                    <span>{org.name}</span>
                                    <button
                                      onClick={() => {
                                        setMemberAccess(prev => ({
                                          ...prev,
                                          organization_ids: prev.organization_ids.filter(id => id !== org.id),
                                          network_ids: prev.network_ids.filter(netId => 
                                            contextAllNetworks.find(n => n.id === netId && n.organization_id !== org.id)
                                          )
                                        }));
                                      }}
                                      className="access-tag-remove"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : null;
                              })}
                            </div>
                            <select
                              value=""
                              onChange={(e) => {
                                const selectedId = Number(e.target.value);
                                if (!memberAccess.organization_ids.includes(selectedId)) {
                                  setMemberAccess(prev => ({
                                    ...prev,
                                    organization_ids: [...prev.organization_ids, selectedId]
                                  }));
                                }
                              }}
                              className="form-select"
                            >
                              <option value="">Add organization...</option>
                              {organizations
                                .filter(org => !memberAccess.organization_ids.includes(org.id))
                                .map(org => (
                                  <option key={org.id} value={org.id}>{org.name}</option>
                                ))
                              }
                            </select>
                          </div>
                          
                          <div className="access-section">
                            <div className="access-section-title">Network Access</div>
                            <div className="access-tags">
                              {memberAccess.network_ids.map(netId => {
                                const network = contextAllNetworks.find(n => n.id === netId);
                                return network ? (
                                  <div key={network.id} className="access-tag network">
                                    <span>{network.name}</span>
                                    <button
                                      onClick={() => {
                                        setMemberAccess(prev => ({
                                          ...prev,
                                          network_ids: prev.network_ids.filter(id => id !== network.id)
                                        }));
                                      }}
                                      className="access-tag-remove"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : null;
                              })}
                            </div>
                            <select
                              value=""
                              onChange={(e) => {
                                const selectedId = Number(e.target.value);
                                if (!memberAccess.network_ids.includes(selectedId)) {
                                  setMemberAccess(prev => ({
                                    ...prev,
                                    network_ids: [...prev.network_ids, selectedId]
                                  }));
                                }
                              }}
                              className="form-select"
                            >
                              <option value="">Add network...</option>
                              {contextAllNetworks
                                .filter(network => 
                                  memberAccess.organization_ids.includes(network.organization_id) && 
                                  !memberAccess.network_ids.includes(network.id)
                                )
                                .map(network => (
                                  <option key={network.id} value={network.id}>{network.name}</option>
                                ))
                              }
                            </select>
                          </div>
                          
                          <div className="access-section">
                            <div className="access-section-title">Feature Access</div>
                            <div className="feature-checkboxes">
                              {['config_assistant', 'verification', 'compliance'].map((feature) => (
                                <div key={feature} className="feature-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={memberAccess.feature_names.includes(feature)}
                                    onChange={() => toggleFeature(feature)}
                                  />
                                  <span>{feature.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="modal-actions">
                    <button
                      onClick={() => {
                        setEditModalOpen(false);
                        setEditingUser(null);
                        setNewMemberUsername("");
                        setNewMemberPassword("");
                        setNewMemberRole("engineer");
                        setNewMemberEngineerTier(1);
                        setMemberAccess({ organization_ids: [], network_ids: [], feature_names: [] });
                      }}
                      className="btn-modal-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateMember}
                      className="btn-modal-save"
                    >
                      Update Member
                    </button>
                  </div>
                </div>
              </div>
            )}

            {deleteConfirmOpen && (
              <div className="modal-overlay">
                <div className="modal-content delete-confirmation-modal">
                  <h2 className="modal-title">Confirm Delete</h2>
                  <div className="space-y-4">
                    <p className="text-gray-300">
                      Are you sure you want to delete the team member "{memberToDelete?.username}"? This action cannot be undone.
                    </p>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-red-400 text-sm">
                        ⚠️ This will permanently remove the team member and all their access permissions.
                      </p>
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button
                      onClick={() => {
                        setDeleteConfirmOpen(false);
                        setMemberToDelete(null);
                      }}
                      className="btn-modal-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      className="btn-delete"
                    >
                      <Trash2 size={16} />
                      Delete Member
                    </button>
                  </div>
                </div>
              </div>
            )}

            {deleteOrgConfirmOpen && (
              <Modal title="Delete Organization" isConfirmation={true}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-red-500/20 p-3 rounded-full">
                    <Trash2 className="text-red-500" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold">Confirm Organization Deletion</h3>
                </div>
                <p className="mb-2">Are you sure you want to delete the organization "{organizationToDelete?.name}"?</p>
                <p className="mb-6 text-red-400">⚠️ This will also delete all networks and device configurations associated with this organization. This action cannot be undone.</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setDeleteOrgConfirmOpen(false);
                      setOrganizationToDelete(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#2a2f45] hover:bg-[#353b54] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteOrganization}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Organization
                  </button>
                </div>
              </Modal>
            )}

            {deleteNetworkConfirmOpen && (
              <Modal title="Delete Network" isConfirmation={true}>
                <p>Are you sure you want to delete the network "<strong>{networkToDelete?.name}</strong>"?</p>
                <p className="text-sm text-gray-400 mt-2">This action cannot be undone.</p>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setDeleteNetworkConfirmOpen(false)}
                    className="px-4 py-2 rounded-lg bg-[#2a2f45] hover:bg-[#353b54] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteNetwork}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </Modal>
            )}

        {/* Notification Container */}
        <NotificationContainer />
    </Layout>
  );
}


