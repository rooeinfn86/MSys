import { useState, useRef, memo, useCallback } from "react";
import {
  ChevronDown,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import "../styles/Navigation.css";

const TopBar = memo(({
  username,
  organizations,
  networks,
  selectedOrgId,
  selectedNetworkId,
  role,
  onOrgChange,
  onNetworkChange,
  onAddOrg,
  onAddNetwork,
  onDeleteOrg,
  onDeleteNetwork,
  onRefresh,
  onLogout
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleDropdownMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDropdownOpen(true);
  }, []);

  const handleDropdownMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 100);
  }, []);

  const handleDeleteOrgClick = useCallback((org) => {
    onDeleteOrg(org);
  }, [onDeleteOrg]);

  const handleDeleteNetworkClick = useCallback((network) => {
    onDeleteNetwork(network);
  }, [onDeleteNetwork]);

  return (
    <div className="topbar-container">
      <div className="topbar-title">📡 AI Assistant</div>
      <div className="topbar-controls">
        {/* Organization Selector */}
        <div className="topbar-selector-group">
          <div className="topbar-selector-container">
            <select
              className="topbar-select"
              value={selectedOrgId}
              onChange={(e) => onOrgChange(e.target.value)}
            >
              <option value="">Select Organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <div className="topbar-select-chevron">
              <ChevronDown size={16} />
            </div>
            {(role === "company_admin" || role === "full_control") && selectedOrgId && (
              <button
                onClick={() => {
                  const selectedOrg = organizations.find(o => o.id.toString() === selectedOrgId.toString());
                  if (selectedOrg) {
                    handleDeleteOrgClick(selectedOrg);
                  }
                }}
                className="topbar-action-button delete"
                title="Delete Organization"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <button
            onClick={onAddOrg}
            className="topbar-action-button"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Network Selector */}
        <div className="topbar-selector-group">
          <div className="topbar-selector-container">
            <select
              className="topbar-select"
              value={selectedNetworkId}
              onChange={(e) => onNetworkChange(e.target.value)}
              disabled={!selectedOrgId}
            >
              <option value="">Select Network</option>
              {networks.map((net) => (
                <option key={net.id} value={net.id}>
                  {net.name}
                </option>
              ))}
            </select>
            <div className="topbar-select-chevron">
              <ChevronDown size={16} />
            </div>
            {(role === "company_admin" || role === "full_control") && selectedNetworkId && (
              <button
                onClick={() => {
                  const selectedNet = networks.find(n => n.id.toString() === selectedNetworkId.toString());
                  if (selectedNet) {
                    handleDeleteNetworkClick(selectedNet);
                  }
                }}
                className="topbar-action-button delete"
                title="Delete Network"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <button
            onClick={onAddNetwork}
            className="topbar-action-button"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Refresh Button */}
        <button
          className="topbar-refresh-button"
          title="Refresh"
          onClick={onRefresh}
        >
          <RefreshCw size={20} />
        </button>

        {/* User Dropdown */}
        <div
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
          className="topbar-user-section"
        >
          <button className="topbar-user-button">
            👤 {username} <ChevronDown size={16} />
          </button>
          {dropdownOpen && (
            <div className="topbar-user-dropdown">
              <button
                onClick={onLogout}
                className="topbar-dropdown-item"
              >
                <span>🚪</span> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

TopBar.displayName = 'TopBar';

export default TopBar; 