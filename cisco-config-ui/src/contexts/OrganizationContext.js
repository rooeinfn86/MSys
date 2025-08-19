import { createContext, useContext } from 'react';
import useOrganizations from '../hooks/useOrganizations';
import useFeatures from '../hooks/useFeatures';
import { useAuthContext } from './AuthContext';

const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const { role, token } = useAuthContext();
  const organizations = useOrganizations(role, token);
  const features = useFeatures(token);
  
  const contextValue = {
    ...organizations,
    ...features,
  };
  
  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganizationContext = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext must be used within an OrganizationProvider');
  }
  return context;
};

export default OrganizationContext; 