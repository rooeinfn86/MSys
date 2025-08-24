import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenManager } from '../utils/secureStorage';

const useAuth = () => {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [engineerTier, setEngineerTier] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const navigate = useNavigate();
  const token = tokenManager.getToken();

  // Handle logout with useCallback to prevent re-renders
  const handleLogout = useCallback(() => {
    tokenManager.clearAll();
    setUsername("");
    setRole("");
    setEngineerTier(null);
    setIsAuthenticated(false);
    navigate("/login");
  }, [navigate]);

  // Update user data with useCallback
  const updateUserData = useCallback((newUserData) => {
    if (newUserData.username) setUsername(newUserData.username);
    if (newUserData.role) setRole(newUserData.role);
    if (newUserData.engineer_tier !== undefined) setEngineerTier(Number(newUserData.engineer_tier));
  }, []);

  // Initialize user data from secure storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Add a small delay to ensure storage is ready (Chrome compatibility)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (token && tokenManager.isValidToken(token)) {
          const userData = tokenManager.getUserData();
          if (userData) {
            setUsername(userData.username || "Unknown");
            setRole(userData.role);
            setEngineerTier(userData.engineer_tier ? Number(userData.engineer_tier) : null);
            setIsAuthenticated(true);
            console.log("✅ Authentication successful:", userData.username);
          } else {
            console.warn("⚠️ Token valid but no user data found");
            setIsAuthenticated(false);
          }
        } else {
          console.log("ℹ️ No valid token found, user not authenticated");
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [token]);

  return {
    // State
    username,
    role,
    engineerTier,
    isLoading,
    isAuthenticated,
    token,
    
    // Actions
    handleLogout,
    updateUserData,
    setIsLoading,
  };
};

export default useAuth; 