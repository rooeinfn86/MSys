import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, XCircle, Trash2 } from 'lucide-react';
import { getDeviceLogs, clearDeviceLogs } from './api';
import './styles/DeviceLogs.css';

const LogTypeChip = ({ type }) => {
  const getChipStyle = () => {
    switch (type) {
      case 'invalid_credentials':
        return {
          className: 'log-type-chip invalid-credentials',
          icon: <AlertCircle size={14} />,
          text: 'Invalid Credentials'
        };
      case 'unreachable':
        return {
          className: 'log-type-chip unreachable',
          icon: <XCircle size={14} />,
          text: 'Unreachable'
        };
      case 'unknown_device':
        return {
          className: 'log-type-chip unknown-device',
          icon: <AlertCircle size={14} />,
          text: 'Unknown Device'
        };
      default:
        return {
          className: 'log-type-chip default',
          icon: <AlertCircle size={14} />,
          text: type
        };
    }
  };

  const style = getChipStyle();

  return (
    <span className={style.className}>
      {style.icon}
      {style.text}
    </span>
  );
};

const formatDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    // Automatically use the user's local timezone
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short' // This will show the timezone abbreviation (e.g., PST, EST)
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
};

export default function DeviceLogs({ selectedNetworkId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);

  // Get user role from localStorage
  const userRole = JSON.parse(localStorage.getItem('user_data'))?.role;
  const isCompanyAdmin = userRole === 'company_admin';

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDeviceLogs(selectedNetworkId);
      setLogs(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to fetch device logs');
    } finally {
      setLoading(false);
    }
  }, [selectedNetworkId]);

  useEffect(() => {
    if (!selectedNetworkId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    fetchLogs();
  }, [selectedNetworkId, fetchLogs]);

  const handleClearLogs = async () => {
    setClearingLogs(true);
    try {
      await clearDeviceLogs(selectedNetworkId);
      // Refresh logs after clearing
      await fetchLogs();
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Error clearing logs:', err);
      setError('Failed to clear device logs');
    } finally {
      setClearingLogs(false);
    }
  };

  if (loading) {
    return (
      <div className="device-logs-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading device logs...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="device-logs-container">
        <div className="error-container">
          <XCircle size={20} />
          {error}
        </div>
      </div>
    );
  }

  if (!selectedNetworkId) {
    return (
      <div className="device-logs-container">
        <div className="network-prompt">
          Please select a network to view device logs
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="device-logs-container">
        <div className="empty-container">
          No logs found for this network
        </div>
      </div>
    );
  }

  return (
          <div className="device-logs-container">
        <div className="device-logs-header">
          <div className="device-logs-title">Device Logs</div>
          <div className="device-logs-controls">
            <button
              onClick={() => setShowConfirmDialog(true)}
              className="btn-clear-logs"
              disabled={clearingLogs}
            >
              <Trash2 size={16} />
              {clearingLogs ? 'Clearing...' : 'Clear Logs'}
            </button>
          </div>
        </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <h3 className="confirmation-title">Clear Device Logs</h3>
            <p className="confirmation-message">
              Are you sure you want to clear all device logs for this network? This action cannot be undone.
            </p>
            <div className="confirmation-actions">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="btn-cancel"
                disabled={clearingLogs}
              >
                Cancel
              </button>
              <button
                onClick={handleClearLogs}
                className="btn-confirm"
                disabled={clearingLogs}
              >
                {clearingLogs && (
                  <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                )}
                {clearingLogs ? 'Clearing...' : 'Clear Logs'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="device-logs-table-container">
        <table className="device-logs-table">
          <thead>
            <tr>
              <th>IP Address</th>
              <th>Issue Type</th>
              <th>Message</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td data-label="IP Address">{log.ip_address}</td>
                <td data-label="Issue Type">
                  <LogTypeChip type={log.log_type} />
                </td>
                <td data-label="Message">{log.message}</td>
                <td data-label="Date">
                  {formatDate(log.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 