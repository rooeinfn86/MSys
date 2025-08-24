import axiosInstance from '../utils/axios';

class TeamManagementService {
  /**
   * Fetch all team members for the current organization
   * @returns {Promise<Array>} Array of team members
   */
  async fetchTeamMembers() {
    try {
      const response = await axiosInstance.get("/users/me/users");
      if (response.data && Array.isArray(response.data)) {
        // Process the data to include organization and network names
        const processedData = response.data.map(member => {
          // Parse organizations and networks if they're strings
          const organizations = typeof member.organizations === 'string' 
            ? JSON.parse(member.organizations || '[]') 
            : (member.organizations || []);
          
          const networks = typeof member.networks === 'string' 
            ? JSON.parse(member.networks || '[]') 
            : (member.networks || []);

          return {
            ...member,
            organizations,
            networks,
            organizationNames: organizations.map(org => org.name).join(', ') || 'None',
            networkNames: networks.map(net => net.name).join(', ') || 'None'
          };
        });
        
        return { success: true, data: processedData };
      } else {
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Add a new team member
   * @param {Object} memberData - The member data
   * @returns {Promise<Object>} Result of the operation
   */
  async addTeamMember(memberData) {
    try {
      const response = await axiosInstance.post("/users/team-member-create", memberData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error adding team member:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing team member
   * @param {string} memberId - The member ID
   * @param {Object} memberData - The updated member data
   * @returns {Promise<Object>} Result of the operation
   */
  async updateTeamMember(memberId, memberData) {
    try {
      const response = await axiosInstance.put(`/users/${memberId}`, memberData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error updating team member:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a team member
   * @param {string} memberId - The member ID
   * @returns {Promise<Object>} Result of the operation
   */
  async deleteTeamMember(memberId) {
    try {
      await axiosInstance.delete(`/users/${memberId}`);
      return { success: true };
    } catch (error) {
      console.error("Error deleting team member:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate team member data
   * @param {Object} memberData - The member data to validate
   * @returns {Object} Validation result
   */
  validateMemberData(memberData) {
    const errors = [];

    if (!memberData.username || memberData.username.trim() === '') {
      errors.push('Username is required');
    }

    if (!memberData.password || memberData.password.trim() === '') {
      errors.push('Password is required');
    }

    if (!memberData.role) {
      errors.push('Role is required');
    }

    if (memberData.role === 'engineer' && (!memberData.engineer_tier || memberData.engineer_tier < 1 || memberData.engineer_tier > 3)) {
      errors.push('Engineer tier must be between 1 and 3');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format member data for API submission
   * @param {Object} formData - Form data from the UI
   * @returns {Object} Formatted data for API
   */
  formatMemberData(formData) {
    const {
      username,
      password,
      role,
      engineer_tier,
      organization_ids = [],
      network_ids = [],
      feature_names = []
    } = formData;

    return {
      username: username.trim(),
      password: password === "NO_PASSWORD_CHANGE" ? undefined : password,
      role,
      engineer_tier: role === "engineer" ? engineer_tier : null,
      organization_ids,
      network_ids,
      feature_names
    };
  }

  /**
   * Get available roles
   * @returns {Array} Array of available roles
   */
  getAvailableRoles() {
    return [
      { value: 'engineer', label: 'Engineer' },
      { value: 'full_control', label: 'Full Control' },
      { value: 'company_admin', label: 'Company Admin' }
    ];
  }

  /**
   * Get available engineer tiers
   * @returns {Array} Array of available engineer tiers
   */
  getAvailableEngineerTiers() {
    return [
      { value: 1, label: 'Tier 1 Engineer (View Only)' },
      { value: 2, label: 'Tier 2 Engineer (Device Management)' },
      { value: 3, label: 'Tier 3 Engineer (Org/Network Management)' }
    ];
  }
}

// Export a singleton instance
const teamManagementService = new TeamManagementService();
export default teamManagementService; 