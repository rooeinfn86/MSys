import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Pencil, AlertCircle } from "lucide-react";
import api from "./utils/axios";

export default function PlatformAdminDashboard() {
  const [companies, setCompanies] = useState([]);
  const [sidebarTab, setSidebarTab] = useState("create-admin");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [companyUsers, setCompanyUsers] = useState([]);
  const navigate = useNavigate();

  const [newCompany, setNewCompany] = useState({
    name: "",
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    position: "",
    email: "",
    telephone: "",
    address: "",
    config_assistant_enabled: true,
    verification_enabled: true,
    compliance_enabled: true,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("/companies/test-auth");
        fetchCompanies();
      } catch (err) {
        console.error("Auth check failed:", err);
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (sidebarTab === "company-users" && selectedCompanyId) {
      fetchCompanyUsers(selectedCompanyId);
    }
  }, [sidebarTab, selectedCompanyId]);

  const fetchCompanies = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/companies/");
      const data = res.data;
      console.log("Fetched companies:", data);
      if (Array.isArray(data)) {
        setCompanies(data);
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      setError("Failed to load companies. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyUsers = async (companyId) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/companies/by-company?company_id=${companyId}`);
      const data = res.data;
      console.log("Fetched company users:", data);
      
      if (Array.isArray(data)) {
        // Filter out company_admin users as they are shown in the other tab
        const filteredUsers = data.filter(user => user.role !== "company_admin");
        setCompanyUsers(filteredUsers);
      } else {
        throw new Error("Invalid user data format received");
      }
    } catch (err) {
      console.error("Failed to fetch company users:", err);
      setError(err.message || "Failed to load company users. Please try refreshing the page.");
      setCompanyUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    const {
      name,
      username,
      password,
      first_name,
      last_name,
      position,
      email,
      telephone,
      address,
      config_assistant_enabled,
      verification_enabled,
      compliance_enabled,
    } = newCompany;
    if (!name || !username || !password)
      return setError("All fields are required");

    try {
      const res = await api.post("/companies/", {
        name,
        username,
        password,
        first_name,
        last_name,
        position,
        email,
        telephone,
        address,
        config_assistant_enabled,
        verification_enabled,
        compliance_enabled,
      });
      
      const created = res.data;
      setCompanies((prev) => [...prev, created]);
      setNewCompany({
        name: "",
        username: "",
        password: "",
        first_name: "",
        last_name: "",
        position: "",
        email: "",
        telephone: "",
        address: "",
        config_assistant_enabled: true,
        verification_enabled: true,
        compliance_enabled: true,
      });
      setShowModal(false);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error creating company");
    }
  };

  const handleDeleteCompany = async (companyId) => {
    try {
      await api.delete(`/companies/${companyId}`);
      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
      setError(""); // Clear any existing error
    } catch (err) {
      console.error("Error deleting company:", err);
      setError(err.message || "Failed to delete company. Please try again.");
    }
  };

  const handleEditCompany = (company) => {
    const admin = (company.users || []).find(u => u.role === "company_admin");
    setEditCompany({
      id: company.id,
      name: company.name,
      username: admin?.username || "",
      first_name: admin?.first_name || "",
      last_name: admin?.last_name || "",
      position: admin?.position || "",
      email: admin?.email || "",
      telephone: admin?.telephone || "",
      address: admin?.address || "",
      config_assistant_enabled: company.config_assistant_enabled,
      verification_enabled: company.verification_enabled,
      compliance_enabled: company.compliance_enabled,
    });
    setShowEditModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("company_id");
    localStorage.removeItem("user_id");
    navigate("/login");
  };

  const handleSaveEdit = async () => {
    if (!editCompany) return;
    setError("");
    try {
      const res = await api.patch(`/companies/${editCompany.id}`, {
        name: editCompany.name,
        username: editCompany.username,
        first_name: editCompany.first_name,
        last_name: editCompany.last_name,
        position: editCompany.position,
        email: editCompany.email,
        telephone: editCompany.telephone,
        address: editCompany.address,
        config_assistant_enabled: editCompany.config_assistant_enabled,
        verification_enabled: editCompany.verification_enabled,
        compliance_enabled: editCompany.compliance_enabled,
      });

      const updated = res.data;
      setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setShowEditModal(false);
      setEditCompany(null);
      setError(""); // Clear any existing error
    } catch (err) {
      console.error("Error updating company:", err);
      setError(err.message || "Failed to update company. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#12141c] text-white">
      {/* Sidebar */}
      <div className="w-64 bg-[#181a23] p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-8">Admin Dashboard</h2>
        <button
          className={`text-left px-4 py-2 rounded mb-2 ${sidebarTab === "create-admin" ? "bg-blue-700" : "hover:bg-[#23263a]"}`}
          onClick={() => setSidebarTab("create-admin")}
        >
          Company Admin Users
        </button>
        <button
          className={`text-left px-4 py-2 rounded mb-2 ${sidebarTab === "company-users" ? "bg-blue-700" : "hover:bg-[#23263a]"}`}
          onClick={() => setSidebarTab("company-users")}
        >
          Companies Users
        </button>
        {/* Add more sidebar tabs here if needed */}
        <button
          onClick={handleLogout}
          className="mt-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
        >
          Logout
        </button>
      </div>
      {/* Main Content */}
      <div className="flex-1 p-8">
        {error && (
          <div className="mb-4 p-4 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <>
            {sidebarTab === "create-admin" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold">Company Admins</h1>
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    <Plus className="inline mr-1" size={16} /> Add a new Company
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-[#1c1f2b] rounded-lg text-sm">
                    <thead className="sticky top-0 bg-[#23263a] z-10">
                      <tr>
                        <th className="px-4 py-2 whitespace-nowrap text-left">Company Name</th>
                        <th className="px-4 py-2 whitespace-nowrap text-left">First Name</th>
                        <th className="px-4 py-2 whitespace-nowrap text-left">Last Name</th>
                        <th className="px-4 py-2 whitespace-nowrap text-left">Position</th>
                        <th className="px-4 py-2 whitespace-nowrap text-left">Email</th>
                        <th className="px-4 py-2 whitespace-nowrap text-left">Telephone</th>
                        <th className="px-4 py-2 whitespace-nowrap text-left">Address</th>
                        <th className="px-4 py-2 whitespace-nowrap text-left">Username</th>
                        <th className="px-4 py-2 whitespace-nowrap text-left">Features</th>
                        <th className="px-4 py-2 whitespace-nowrap text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center text-gray-400 py-4">No companies found.</td>
                        </tr>
                      ) : (
                        companies.map((company) => {
                          const admin = (company.users || []).find(u => u.role === "company_admin");
                          return (
                            <tr key={company.id} className="border-b border-[#23263a]">
                              <td className="px-4 py-2 max-w-[160px] truncate text-left" title={company.name}>{company.name}</td>
                              <td className="px-4 py-2 max-w-[120px] truncate text-left" title={admin?.first_name}>{admin?.first_name || ""}</td>
                              <td className="px-4 py-2 max-w-[120px] truncate text-left" title={admin?.last_name}>{admin?.last_name || ""}</td>
                              <td className="px-4 py-2 max-w-[120px] truncate text-left" title={admin?.position}>{admin?.position || ""}</td>
                              <td className="px-4 py-2 max-w-[180px] truncate text-left" title={admin?.email}>{admin?.email || ""}</td>
                              <td className="px-4 py-2 max-w-[120px] truncate text-left" title={admin?.telephone}>{admin?.telephone || ""}</td>
                              <td className="px-4 py-2 max-w-[180px] truncate text-left" title={admin?.address}>{admin?.address || ""}</td>
                              <td className="px-4 py-2 max-w-[120px] truncate text-left" title={admin?.username}>{admin?.username || ""}</td>
                              <td className="px-4 py-2 max-w-[160px] text-left">
                                {company.config_assistant_enabled && (
                                  <span className="inline-block bg-green-700 text-xs px-2 py-1 rounded mr-1">Config Assistant</span>
                                )}
                                {company.verification_enabled && (
                                  <span className="inline-block bg-blue-700 text-xs px-2 py-1 rounded mr-1">Verification</span>
                                )}
                                {company.compliance_enabled && (
                                  <span className="inline-block bg-purple-700 text-xs px-2 py-1 rounded">Compliance</span>
                                )}
                                {!(company.config_assistant_enabled || company.verification_enabled || company.compliance_enabled) && (
                                  <span className="text-gray-400 text-xs">None</span>
                                )}
                              </td>
                              <td className="px-4 py-2 flex gap-2 text-left">
                                <button
                                  className="text-blue-400 hover:text-blue-600"
                                  onClick={() => handleEditCompany(company)}
                                  title="Edit"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  className="text-red-400 hover:text-red-600"
                                  onClick={() => handleDeleteCompany(company.id)}
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Modal for adding a new company */}
                {showModal && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-[#23263a] p-8 rounded-lg w-full max-w-lg relative">
                      <button
                        className="absolute top-2 right-2 text-gray-400 hover:text-white"
                        onClick={() => setShowModal(false)}
                      >
                        ✕
                      </button>
                      <h2 className="text-xl font-semibold mb-4">Add New Company Admin</h2>
                      {error && <p className="text-red-500 mb-2">{error}</p>}
                      <div className="grid grid-cols-1 gap-3">
                        <input
                          type="text"
                          placeholder="Company Name"
                          value={newCompany.name}
                          onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="First Name"
                          value={newCompany.first_name}
                          onChange={e => setNewCompany({ ...newCompany, first_name: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={newCompany.last_name}
                          onChange={e => setNewCompany({ ...newCompany, last_name: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="Position"
                          value={newCompany.position}
                          onChange={e => setNewCompany({ ...newCompany, position: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={newCompany.email}
                          onChange={e => setNewCompany({ ...newCompany, email: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="Telephone"
                          value={newCompany.telephone}
                          onChange={e => setNewCompany({ ...newCompany, telephone: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="Address"
                          value={newCompany.address}
                          onChange={e => setNewCompany({ ...newCompany, address: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="Admin Username"
                          value={newCompany.username}
                          onChange={e => setNewCompany({ ...newCompany, username: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="password"
                          placeholder="Admin Password"
                          value={newCompany.password}
                          onChange={e => setNewCompany({ ...newCompany, password: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                      </div>
                      <div className="flex items-center gap-6 mt-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newCompany.config_assistant_enabled}
                            onChange={e => setNewCompany({ ...newCompany, config_assistant_enabled: e.target.checked })}
                          />
                          Config Assistant
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newCompany.verification_enabled}
                            onChange={e => setNewCompany({ ...newCompany, verification_enabled: e.target.checked })}
                          />
                          Verification
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newCompany.compliance_enabled}
                            onChange={e => setNewCompany({ ...newCompany, compliance_enabled: e.target.checked })}
                          />
                          Compliance
                        </label>
                      </div>
                      <button
                        onClick={handleCreateCompany}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
                      >
                        <Plus className="inline mr-1" size={16} /> Create Company
                      </button>
                    </div>
                  </div>
                )}
                {/* Modal for editing a company */}
                {showEditModal && editCompany && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-[#23263a] p-8 rounded-lg w-full max-w-lg relative">
                      <button
                        className="absolute top-2 right-2 text-gray-400 hover:text-white"
                        onClick={() => setShowEditModal(false)}
                      >
                        ✕
                      </button>
                      <h2 className="text-xl font-semibold mb-4">Edit Company Admin</h2>
                      <div className="grid grid-cols-1 gap-3">
                        <input
                          type="text"
                          placeholder="Company Name"
                          value={editCompany.name}
                          onChange={e => setEditCompany({ ...editCompany, name: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="First Name"
                          value={editCompany.first_name}
                          onChange={e => setEditCompany({ ...editCompany, first_name: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={editCompany.last_name}
                          onChange={e => setEditCompany({ ...editCompany, last_name: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="Position"
                          value={editCompany.position}
                          onChange={e => setEditCompany({ ...editCompany, position: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={editCompany.email}
                          onChange={e => setEditCompany({ ...editCompany, email: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="Telephone"
                          value={editCompany.telephone}
                          onChange={e => setEditCompany({ ...editCompany, telephone: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="Address"
                          value={editCompany.address}
                          onChange={e => setEditCompany({ ...editCompany, address: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                        <input
                          type="text"
                          placeholder="Admin Username"
                          value={editCompany.username}
                          onChange={e => setEditCompany({ ...editCompany, username: e.target.value })}
                          className="p-2 rounded bg-[#0f111a] border border-[#2a2f45]"
                        />
                      </div>
                      <div className="flex items-center gap-6 mt-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editCompany.config_assistant_enabled}
                            onChange={e => setEditCompany({ ...editCompany, config_assistant_enabled: e.target.checked })}
                          />
                          Config Assistant
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editCompany.verification_enabled}
                            onChange={e => setEditCompany({ ...editCompany, verification_enabled: e.target.checked })}
                          />
                          Verification
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editCompany.compliance_enabled}
                            onChange={e => setEditCompany({ ...editCompany, compliance_enabled: e.target.checked })}
                          />
                          Compliance
                        </label>
                      </div>
                      <button
                        onClick={handleSaveEdit}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {sidebarTab === "company-users" && (
              <div>
                <h1 className="text-2xl font-bold mb-6">Companies Users</h1>
                <div className="mb-4">
                  <label className="block mb-2">Select Company:</label>
                  <select
                    className="p-2 rounded bg-[#0f111a] border border-[#2a2f45] text-white"
                    value={selectedCompanyId}
                    onChange={e => setSelectedCompanyId(e.target.value)}
                  >
                    <option value="">-- Select a company --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {selectedCompanyId && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-[#1c1f2b] rounded-lg text-sm">
                      <thead className="sticky top-0 bg-[#23263a] z-10">
                        <tr>
                          <th className="px-4 py-2 whitespace-nowrap text-left">Username</th>
                          <th className="px-4 py-2 whitespace-nowrap text-left">Organization Access</th>
                          <th className="px-4 py-2 whitespace-nowrap text-left">Network Access</th>
                          <th className="px-4 py-2 whitespace-nowrap text-left">Permission Level</th>
                          <th className="px-4 py-2 whitespace-nowrap text-left">Features Access</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center text-gray-400 py-4">No users found.</td>
                          </tr>
                        ) : (
                          companyUsers
                            .filter(u => u.role === "engineer" || u.role === "viewer")
                            .map((user) => (
                              <tr key={user.id} className="border-b border-[#23263a]">
                                <td className="px-4 py-2 max-w-[140px] truncate text-left" title={user.username}>{user.username}</td>
                                <td className="px-4 py-2 max-w-[200px] truncate text-left">
                                  {(user.organizations || []).map(org => org.name).join(", ") || <span className="text-gray-400 text-xs">None</span>}
                                </td>
                                <td className="px-4 py-2 max-w-[200px] truncate text-left">
                                  {(user.networks || []).map(net => net.name).join(", ") || <span className="text-gray-400 text-xs">None</span>}
                                </td>
                                <td className="px-4 py-2 max-w-[120px] truncate text-left">
                                  {user.role === "engineer" ? (
                                    <span className="inline-block bg-purple-700 text-xs px-2 py-1 rounded">Engineer</span>
                                  ) : user.role === "viewer" ? (
                                    <span className="inline-block bg-yellow-500 text-xs px-2 py-1 rounded text-black">Viewer</span>
                                  ) : (
                                    <span className="inline-block bg-gray-700 text-xs px-2 py-1 rounded">{user.role}</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 max-w-[200px] truncate text-left">
                                  {(user.feature_access_display || []).length > 0
                                    ? user.feature_access_display.map((f, idx) =>
                                        f.feature_name === "config_assistant" ? (
                                          <span key={idx} className="inline-block bg-green-700 text-xs px-2 py-1 rounded mr-1">Config Assistant</span>
                                        ) : f.feature_name === "verification" ? (
                                          <span key={idx} className="inline-block bg-blue-700 text-xs px-2 py-1 rounded mr-1">Verification</span>
                                        ) : f.feature_name === "compliance" ? (
                                          <span key={idx} className="inline-block bg-purple-700 text-xs px-2 py-1 rounded mr-1">Compliance</span>
                                        ) : (
                                          <span key={idx} className="inline-block bg-gray-700 text-xs px-2 py-1 rounded mr-1">{f.feature_name}</span>
                                        )
                                      )
                                    : <span className="text-gray-400 text-xs">None</span>
                                  }
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
