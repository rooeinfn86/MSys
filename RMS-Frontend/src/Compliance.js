import { useState, useEffect, useCallback } from 'react';
import { Shield, FileText, Download, Trash2, Upload, X } from 'lucide-react';
import api from './utils/axios';
import './styles/Compliance.css';

const Compliance = ({ networkId }) => {
  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showNewScanForm, setShowNewScanForm] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState({
    vulnerabilityReports: [],
    penetrationReports: []
  });
  const [scanName, setScanName] = useState('');
  const [scanType, setScanType] = useState('NIST');
  const [scanStatus, setScanStatus] = useState('');
  const [scanDetails, setScanDetails] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewModalData, setViewModalData] = useState({
    scan: null,
    findings: [],
    statistics: {
      total: 0,
      compliant: 0,
      nonCompliant: 0,
      informational: 0,
      risks: {
        high: 0,
        medium: 0,
        low: 0
      }
    }
  });

  const fetchScans = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (!networkId) {
        throw new Error('No network ID provided');
      }

      const response = await api.get(`/api/v1/compliance/scans/?network_id=${networkId}`);

      // Sort scans by created_at in descending order (newest first)
      const sortedScans = response.data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      // Fetch findings for each scan to calculate informational count
      const scansWithInformational = await Promise.all(sortedScans.map(async (scan) => {
        const findingsResponse = await api.get(`/api/v1/compliance/scans/${scan.id}/findings`);
        const findings = findingsResponse.data;
        const informationalCount = findings.filter(f => f.status === 'informational').length;
        return { ...scan, informational: informationalCount };
      }));
      
      setScans(scansWithInformational);
    } catch (error) {
      console.error('Error fetching scans:', error);
    } finally {
      setIsLoading(false);
    }
  }, [networkId]);

  useEffect(() => {
    if (networkId) {
    fetchScans();
    }
  }, [networkId, fetchScans]);

  const handleFileUpload = (event, type) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(prev => ({
      ...prev,
      [type]: [...prev[type], ...files]
    }));
  };

  const removeFile = (type, index) => {
    setSelectedFiles(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Add polling for scan status
  const pollScanStatus = async (scanId) => {
    try {
      const response = await api.get(`/api/v1/compliance/scans/${scanId}`);

      if (response.data.status === 'completed' || response.data.status === 'failed') {
        // Stop polling and refresh the scans list
        fetchScans();
        setShowProgressModal(false);
        setScanStatus('');
        setScanDetails('');
        
        if (response.data.status === 'completed') {
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 5000);
        }
      } else {
        // Continue polling
        setTimeout(() => pollScanStatus(scanId), 5000);
      }
    } catch (error) {
      console.error('Error polling scan status:', error);
      setShowProgressModal(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!scanName.trim()) {
      alert('Please enter a scan name');
      return;
    }

    if (selectedFiles.vulnerabilityReports.length === 0 && selectedFiles.penetrationReports.length === 0) {
      alert('Please select at least one file');
      return;
    }

    setIsUploading(true);
    setShowProgressModal(true);
    setScanStatus('Uploading files...');
    setScanDetails('Preparing files for upload...');

    try {
      const formData = new FormData();
      formData.append('name', scanName);
      formData.append('compliance_type', scanType);
      formData.append('network_id', networkId);

      // Add vulnerability reports
      selectedFiles.vulnerabilityReports.forEach((file, index) => {
        formData.append(`vulnerability_reports`, file);
      });

      // Add penetration reports
      selectedFiles.penetrationReports.forEach((file, index) => {
        formData.append(`penetration_reports`, file);
      });

      setScanStatus('Starting compliance scan...');
      setScanDetails('Initializing scan process...');

      const response = await api.post('/api/v1/compliance/scans/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          setScanDetails(`Upload progress: ${percentCompleted}%`);
        },
      });

      setScanStatus('Scan in progress...');
      setScanDetails('Processing compliance requirements...');

      // Start polling for scan status
      pollScanStatus(response.data.id);
    } catch (error) {
      console.error('Error uploading files:', error);
      setShowProgressModal(false);
      setScanStatus('');
      setScanDetails('');
      if (error.response?.status === 401) {
        alert('Authentication error. Please log in again.');
      } else {
        alert('Error uploading files. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      await api.delete(`/api/v1/compliance/scans/${id}/`);

      setScans(prev => prev.filter(scan => scan.id !== id));
    } catch (error) {
      console.error('Error deleting scan:', error);
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      console.log('Starting PDF download for scan ID:', id);
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Making request to download PDF...');
      const response = await api.get(`/api/v1/compliance/scans/${id}/download-pdf`, {
        responseType: 'blob',
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects
        }
      });

      console.log('PDF download response received:', response);
      
      if (!response.data || response.data.size === 0) {
        throw new Error('Received empty PDF file');
      }

      const scan = scans.find(scan => scan.id === id);
      if (!scan) {
        throw new Error('Scan not found');
      }

      // Create blob with proper MIME type
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${scan.name}_report.pdf`);
      link.style.display = 'none';
      document.body.appendChild(link);
      console.log('Triggering download...');
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        console.log('PDF download completed');
      }, 100);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
    }
  };

  const handleDownloadExcel = async (id) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api.get(`/api/v1/compliance/scans/${id}/download-excel/`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${scans.find(scan => scan.id === id).name}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Excel:', error);
    }
  };

  const handleViewScan = async (scan) => {
    try {
      setSelectedScan(scan);
      setShowViewModal(true);
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Fetch findings for the scan
      const findingsResponse = await api.get(`/api/v1/compliance/scans/${scan.id}/findings`);
      
      const findings = findingsResponse.data;
      
      // Calculate statistics
      const statistics = {
        total: findings.length,
        compliant: findings.filter(f => f.status === 'compliant').length,
        nonCompliant: findings.filter(f => f.status === 'non-compliant').length,
        informational: findings.filter(f => f.status === 'informational').length,
        risks: {
          high: findings.filter(f => f.status === 'non-compliant' && f.control_id.startsWith(('ac-', 'sc-', 'si-'))).length,
          medium: findings.filter(f => f.status === 'non-compliant' && !f.control_id.startsWith(('ac-', 'sc-', 'si-'))).length,
          low: findings.filter(f => f.status === 'compliant').length
        }
      };
      
      setViewModalData({
        scan,
        findings,
        statistics
      });
    } catch (error) {
      console.error('Error fetching scan details:', error);
      alert(error.message || 'Failed to load scan details');
      setShowViewModal(false);
    }
  };

  return (
    <div className="compliance-container">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="success-message">
          Scan completed successfully!
        </div>
      )}

      <div className="compliance-header">
        <h2 className="compliance-title">Compliance Scans</h2>
        <button
          onClick={() => setShowNewScanForm(true)}
          className="btn-new-scan"
        >
          <Upload size={18} /> New Scan
        </button>
      </div>

      {/* Loading Spinner */}
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span className="loading-text">Loading scans...</span>
        </div>
      ) : (
        /* Scans Table */
        <div className="compliance-table-container">
          <table className="compliance-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Total Findings</th>
                <th>Compliant</th>
                <th>Non-Compliant</th>
                <th>Informational</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id}>
                  <td>{scan.name}</td>
                  <td>{scan.compliance_type}</td>
                  <td>
                    <span className={`status-badge ${scan.status.toLowerCase()}`}>
                      {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span className="finding-badge total">
                      {scan.total_findings} Findings
                    </span>
                  </td>
                  <td>
                    <span className="finding-badge compliant">
                      {scan.compliant} Compliant
                    </span>
                  </td>
                  <td>
                    <span className="finding-badge non-compliant">
                      {scan.non_compliant} Non-Compliant
                    </span>
                  </td>
                  <td>
                    <span className="finding-badge informational">
                      {scan.informational || 0} Informational
                    </span>
                  </td>
                  <td>
                    {new Date(scan.created_at).toLocaleString('en-US', {
                      timeZone: 'America/Los_Angeles',
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                      second: 'numeric',
                      hour12: true,
                      timeZoneName: 'short'
                    })}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleDelete(scan.id)}
                        className="btn-action delete"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(scan.id)}
                        className="btn-action pdf"
                      >
                        <FileText size={14} /> PDF
                      </button>
                      <button
                        onClick={() => handleDownloadExcel(scan.id)}
                        className="btn-action excel"
                      >
                        <Download size={14} /> Excel
                      </button>
                      <button
                        onClick={() => handleViewScan(scan)}
                        className="btn-action view"
                      >
                        <Shield size={14} /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Scan Form Modal */}
      {showNewScanForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">New Compliance Scan</h2>
            <div className="space-y-6">
              <div className="form-group">
                <label className="form-label">Scan Name</label>
                <input
                  type="text"
                  value={scanName}
                  onChange={(e) => setScanName(e.target.value)}
                  className="form-input"
                  placeholder="Enter scan name"
                  autoComplete="off"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Compliance Type</label>
                <select
                  value={scanType}
                  onChange={(e) => setScanType(e.target.value)}
                  className="form-select"
                >
                  <option value="NIST">NIST</option>
                  <option value="ISO">ISO</option>
                  <option value="PCI">PCI</option>
                  <option value="HIPAA">HIPAA</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Vulnerability Reports</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => handleFileUpload(e, 'vulnerabilityReports')}
                  className="form-input"
                />
                {selectedFiles.vulnerabilityReports.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedFiles.vulnerabilityReports.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-[#1a1a1a] p-3 rounded-lg border border-[#2a2f45]">
                        <span className="text-sm text-gray-300">{file.name}</span>
                        <button
                          onClick={() => removeFile('vulnerabilityReports', index)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Penetration Reports</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => handleFileUpload(e, 'penetrationReports')}
                  className="form-input"
                />
                {selectedFiles.penetrationReports.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedFiles.penetrationReports.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-[#1a1a1a] p-3 rounded-lg border border-[#2a2f45]">
                        <span className="text-sm text-gray-300">{file.name}</span>
                        <button
                          onClick={() => removeFile('penetrationReports', index)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                onClick={() => setShowNewScanForm(false)}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isUploading}
                className="btn-modal-save"
              >
                {isUploading ? 'Uploading...' : 'Start Scan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Scan Progress</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-300 mb-2">{scanStatus}</p>
                <p className="text-xs text-gray-400">{scanDetails}</p>
              </div>
              {uploadProgress > 0 && (
                <div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{uploadProgress}%</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Scan Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Scan Details: {viewModalData.scan?.name}</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">{viewModalData.statistics.total}</div>
                <div className="text-sm text-gray-300">Total Findings</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-400">{viewModalData.statistics.compliant}</div>
                <div className="text-sm text-gray-300">Compliant</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-400">{viewModalData.statistics.nonCompliant}</div>
                <div className="text-sm text-gray-300">Non-Compliant</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">{viewModalData.statistics.informational}</div>
                <div className="text-sm text-gray-300">Informational</div>
              </div>
            </div>

            {/* Findings Table */}
            <div className="bg-gray-700 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-600">
                <thead className="bg-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Control ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-700 divide-y divide-gray-600">
                  {viewModalData.findings.map((finding, index) => (
                    <tr key={index} className="hover:bg-gray-600">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{finding.control_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{finding.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          finding.status === 'compliant' 
                            ? 'bg-green-900 text-green-200' 
                            : finding.status === 'non-compliant'
                            ? 'bg-red-900 text-red-200'
                            : 'bg-blue-900 text-blue-200'
                        }`}>
                          {finding.status.charAt(0).toUpperCase() + finding.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{finding.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compliance; 