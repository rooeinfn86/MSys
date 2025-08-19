import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axios';

const useFeatures = (token) => {
  const [allowedFeatures, setAllowedFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's allowed features
  const fetchFeatureAccess = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/users/features");
      const data = response.data;
      console.log("Features API response:", data);
      
      // Convert boolean response to array of feature names
      const features = [];
      if (data.config_assistant_enabled) features.push("config_assistant");
      if (data.verification_enabled) features.push("verification");
      if (data.compliance_enabled) features.push("compliance");
      
      setAllowedFeatures(features);
      console.log("Allowed features set to:", features);
    } catch (error) {
      console.error("❌ Failed to fetch features:", error);
      // Don't enable all features by default - let the backend control this
      setAllowedFeatures([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Check if user has access to specific feature
  const hasFeatureAccess = useCallback((featureName) => {
    return allowedFeatures.includes(featureName);
  }, [allowedFeatures]);

  // Check if user has access to any of the provided features
  const hasAnyFeatureAccess = useCallback((featureNames) => {
    return featureNames.some(feature => allowedFeatures.includes(feature));
  }, [allowedFeatures]);

  // Check if user has access to all of the provided features
  const hasAllFeatureAccess = useCallback((featureNames) => {
    return featureNames.every(feature => allowedFeatures.includes(feature));
  }, [allowedFeatures]);

  // Get available features for role-based access
  const getAvailableFeatures = useCallback(() => {
    // This could be expanded to fetch from API or define statically
    return [
      'config_assistant',
      'verification',
      'compliance',
      'network_topology',
      'device_management',
      'team_management',
      'api_tokens',
      'agent_deployment'
    ];
  }, []);

  // Effect to fetch features on mount
  useEffect(() => {
    if (token) {
      fetchFeatureAccess();
    }
  }, [token, fetchFeatureAccess]);

  return {
    // State
    allowedFeatures,
    isLoading,
    
    // Actions
    fetchFeatureAccess,
    hasFeatureAccess,
    hasAnyFeatureAccess,
    hasAllFeatureAccess,
    getAvailableFeatures,
  };
};

export default useFeatures; 