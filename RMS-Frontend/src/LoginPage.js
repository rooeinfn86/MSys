import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; 
import api from "./utils/axios";
import { tokenManager } from "./utils/secureStorage";

function LoginPage() {
  const [companyName, setCompanyName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isLoading) return;
    
    setIsLoading(true);
    setError("");
    
    // Test localStorage availability in Chrome
    console.log("🧪 Testing localStorage availability...");
    try {
      localStorage.setItem('test', 'test');
      const testValue = localStorage.getItem('test');
      localStorage.removeItem('test');
      console.log("✅ localStorage test passed:", testValue === 'test');
    } catch (error) {
      console.error("❌ localStorage test failed:", error);
    }
    
    console.log("🚀 Starting login process...");
    console.log("📝 Login payload:", { company_name: companyName, username, password: "***" });
  
    const payload = {
      company_name: companyName,
      username,
      password,
    };
  
    try {
      console.log("📡 Making API call to /users/login...");
      const response = await api.post("/users/login", payload);
      console.log("✅ API response received:", response.data);
  
      const data = response.data;
      
      console.log("🔐 Storing token and user data...");
      console.log("🎫 Token to store:", data.access_token ? "Present" : "Missing");
      console.log("👤 User data to store:", data.user ? "Present" : "Missing");
      
      // Store token securely
      console.log("💾 Attempting to store token...");
      const tokenStored = tokenManager.setToken(data.access_token);
      console.log("🎯 Token storage result:", tokenStored);
      
      if (!tokenStored) {
        console.error("❌ Failed to store token securely");
        throw new Error("Failed to store token securely");
      }
      console.log("✅ Token stored successfully");

      // Store user data securely
      const userData = {
        id: data.user.id,
        username: data.user.username,
        role: data.user.role,
        engineer_tier: data.user.engineer_tier,
        first_name: data.user.first_name,
        last_name: data.user.last_name,
        position: data.user.position,
        email: data.user.email,
        telephone: data.user.telephone,
        address: data.user.address,
        company_id: data.user.company_id
      };
      
      console.log("💾 Attempting to store user data...");
      const userDataStored = tokenManager.setUserData(userData);
      console.log("🎯 User data storage result:", userDataStored);
      
      if (!userDataStored) {
        console.error("❌ Failed to store user data securely");
        throw new Error("Failed to store user data securely");
      }
      console.log("✅ User data stored successfully");
      
      // Verify storage
      console.log("🔍 Verifying stored data...");
      const storedToken = tokenManager.getToken();
      const storedUserData = tokenManager.getUserData();
      console.log("🎫 Stored token:", storedToken ? "Present" : "Missing");
      console.log("👤 Stored user data:", storedUserData ? "Present" : "Missing");
  
      // ✅ Role-based redirect
      console.log("🔄 Decoding JWT for role-based redirect...");
      const decoded = jwtDecode(data.access_token);
      console.log("🎭 Decoded JWT:", decoded);
      
      if (decoded.role === "superadmin") {
        console.log("👑 Redirecting to platform admin...");
        navigate("/platform-admin");
      } else {
        console.log("🏠 Redirecting to dashboard...");
        navigate("/dashboard");
      }
      
      console.log("🎉 Login process completed successfully!");
    } catch (err) {
      console.error("💥 Login error:", err);
      setError(err.response?.data?.detail || err.message || "Invalid login credentials");
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <input
          className="w-full p-3 border rounded mb-4"
          type="text"
          placeholder="Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />

        <input
          className="w-full p-3 border rounded mb-4"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          className="w-full p-3 border rounded mb-6"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full p-3 rounded transition-colors ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
