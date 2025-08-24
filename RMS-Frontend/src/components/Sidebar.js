
import { memo } from "react";
import {
  Monitor,
  Bot,
  Search,
  ClipboardList,
  Shield,
  Users,
} from "lucide-react";
import { AccountTree as AccountTreeIcon } from "@mui/icons-material";
import "../styles/Navigation.css";

const Sidebar = memo(({ activeTab, onTabClick, allowedFeatures, role }) => {
  return (
    <div className="sidebar-container">
      <h2 className="sidebar-title">RSNM System</h2>
      <ul className="sidebar-nav">
        <li
          className={`sidebar-nav-item ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => onTabClick("inventory")}
        >
          <Monitor className="sidebar-nav-icon" /> 
          <span className="sidebar-nav-text">Device Inventory</span>
        </li>
        <li
          className={`sidebar-nav-item ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => onTabClick("logs")}
        >
          <ClipboardList className="sidebar-nav-icon" /> 
          <span className="sidebar-nav-text">Device Logs</span>
        </li>

        <li
          className={`sidebar-nav-item ${activeTab === "network-diagram" ? "active" : ""}`}
          onClick={() => onTabClick("network-diagram")}
        >
          <AccountTreeIcon className="sidebar-nav-icon" /> 
          <span className="sidebar-nav-text">Network Diagram</span>
        </li>

        {allowedFeatures.includes("config_assistant") && (
          <li
            className={`sidebar-nav-item ${activeTab === "config-review" ? "active" : ""}`}
            onClick={() => onTabClick("config-review")}
          >
            <Bot className="sidebar-nav-icon" /> 
            <span className="sidebar-nav-text">Config Review</span>
          </li>
        )}
        {allowedFeatures.includes("verification") && (
          <li
            className={`sidebar-nav-item ${activeTab === "config-verification" ? "active" : ""}`}
            onClick={() => onTabClick("config-verification")}
          >
            <Search className="sidebar-nav-icon" /> 
            <span className="sidebar-nav-text">Verification</span>
          </li>
        )}

        {allowedFeatures.includes("compliance") && (
          <li
            className={`sidebar-nav-item ${activeTab === "compliance" ? "active" : ""}`}
            onClick={() => onTabClick("compliance")}
          >
            <Shield className="sidebar-nav-icon" /> 
            <span className="sidebar-nav-text">Compliance</span>
          </li>
        )}

        {role === "company_admin" && (
          <li
            className={`sidebar-nav-item ${activeTab === "teamManagement" ? "active" : ""}`}
            onClick={() => onTabClick("teamManagement")}
          >
            <Users className="sidebar-nav-icon" /> 
            <span className="sidebar-nav-text">Team Management</span>
          </li>
        )}

        {(role === "company_admin" || role === "full_control") && (
          <li
                      className={`sidebar-nav-item ${activeTab === "agent-deployment" ? "active" : ""}`}
          onClick={() => onTabClick("agent-deployment")}
          >
            <Shield className="sidebar-nav-icon" /> 
            <span className="sidebar-nav-text">Agent Deployment</span>
          </li>
        )}


      </ul>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar; 