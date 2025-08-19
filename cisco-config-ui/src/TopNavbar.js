import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, RefreshCw, LogOut, Users } from "lucide-react";
import { tokenManager } from "./utils/secureStorage";

export default function TopNavbar({
  username,
  organizations,
  selectedOrgId,
  setSelectedOrgId,
  networks,
  selectedNetworkId,
  setSelectedNetworkId,
  onOpenOrgModal,
  onOpenNetworkModal,
  onRefresh,
  onOpenTeamModal, // ✅ Add prop to open Team Management modal
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const timeoutRef = useRef(null);

  return (
    <nav className="sticky top-0 z-50 bg-[#1c1f2b] backdrop-blur-lg shadow-md border-b border-[#2a2f45] py-3 px-6 flex justify-between items-center">
      {/* Left: Logo and dropdowns */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white tracking-tight">⚙️ AI Config Assistant</h1>

        <div className="flex items-center gap-2">
          <select
            className="bg-[#11131a] border border-[#333c57] text-white px-4 py-2 rounded-lg"
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
          >
            <option value="">Organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <button
            onClick={onOpenOrgModal}
            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-full"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="bg-[#11131a] border border-[#333c57] text-white px-4 py-2 rounded-lg"
            value={selectedNetworkId}
            onChange={(e) => setSelectedNetworkId(e.target.value)}
            disabled={!selectedOrgId}
          >
            <option value="">Network</option>
            {networks.map((net) => (
              <option key={net.id} value={net.id}>{net.name}</option>
            ))}
          </select>
          <button
            onClick={onOpenNetworkModal}
            className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-full"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          onClick={onRefresh}
          className="bg-[#2a2f45] hover:bg-blue-600 text-white p-2 rounded-lg ml-2"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Right: User dropdown */}
      <div
        className="relative"
        onMouseEnter={() => {
          clearTimeout(timeoutRef.current);
          setDropdownOpen(true);
        }}
        onMouseLeave={() => {
          timeoutRef.current = setTimeout(() => setDropdownOpen(false), 200);
        }}
      >
        <button className="bg-[#2a2f45] hover:bg-[#343b5b] text-white px-4 py-2 rounded-full flex items-center gap-2 border border-[#3a405a]">
          <span>👤</span><span>{username}</span><ChevronDown size={16} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-[#1f2233] border border-[#3a405a] rounded-xl shadow-lg">
            <button
              onClick={onOpenTeamModal}
              className="w-full px-4 py-3 text-sm text-white hover:bg-[#2a2f45] rounded-t-xl flex items-center gap-2"
            >
              <Users size={16} /> Team Management
            </button>
            <button
              onClick={() => {
                tokenManager.clearAll();
                window.location.href = "/login";
              }}
              className="w-full px-4 py-3 text-sm text-white hover:bg-red-600 rounded-b-xl flex items-center gap-2"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
