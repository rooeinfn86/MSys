import api from './utils/axios';

export const getDeviceLogs = async (networkId) => {
  try {
    const response = await api.get(`/api/v1/devices/logs/${networkId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching device logs:', error);
    throw error;
  }
};

export const clearDeviceLogs = async (networkId) => {
  try {
    const response = await api.delete(`/api/v1/devices/logs/${networkId}/clear`);
    return response.data;
  } catch (error) {
    console.error('Error clearing device logs:', error);
    throw error;
  }
}; 