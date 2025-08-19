

export const DiscoveryProgressModal = ({
  showProgressModal,
  setShowProgressModal,
  discoveryProgress,
  onClose
}) => {
  if (!showProgressModal || !discoveryProgress.isScanning) return null;

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50 p-4">
      <div 
        className="modal-content p-8 rounded-lg shadow-lg relative"
        style={{
          width: '400px',
          maxWidth: '90vw'
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="modal-title text-2xl mb-2">Discovery Progress</h3>
          <p className="text-gray-400 text-sm">Network scanning in progress...</p>
        </div>

        {/* Progress Circle */}
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32 flex items-center justify-center">
            {(() => {
              const size = 128; // svg size
              const stroke = 12; // stroke width
              const radius = (size / 2) - (stroke / 2);
              const circumference = 2 * Math.PI * radius;
              const progress = discoveryProgress.progress || 0;
              const dash = `${(progress / 100) * circumference} ${circumference}`;

              return (
                <svg width={size} height={size} className="block">
                  <g transform={`rotate(-90 ${size/2} ${size/2})`}>
                    {/* Track */}
                    <circle
                      cx={size/2}
                      cy={size/2}
                      r={radius}
                      fill="none"
                      stroke="#374151" /* gray-700 */
                      strokeWidth={stroke}
                    />
                    {/* Progress */}
                    <circle
                      cx={size/2}
                      cy={size/2}
                      r={radius}
                      fill="none"
                      stroke="#10b981" /* emerald-500 */
                      strokeWidth={stroke}
                      strokeLinecap="round"
                      strokeDasharray={dash}
                      className="transition-all duration-500 ease-out"
                    />
                  </g>
                </svg>
              );
            })()}

            {/* Percentage Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {discoveryProgress.progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center mb-6">
          <p className="text-white text-lg font-medium">
            {discoveryProgress.message || 'Scanning network...'}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowProgressModal(false)}
            className="btn-secondary px-6 py-2"
          >
            Minimize
          </button>
        </div>
      </div>
    </div>
  );
};

export const DiscoveryProgressBar = ({
  progress,
  status,
  message,
  discoveredDevices,
  processedIPs,
  totalIPs,
  currentIP,
  estimatedTime,
  failed,
  agentProgress = []
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Starting...';
    }
  };

  const steps = [
    { key: 'starting', label: 'Starting' },
    { key: 'in_progress', label: 'Scanning' },
    { key: 'completed', label: 'Completed' }
  ];

  const activeIndex = status === 'completed' ? 2 : status === 'in_progress' ? 1 : 0;

  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <div className="flex items-center gap-3">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              index <= activeIndex ? 'bg-green-500 text-black' : 'bg-gray-600 text-gray-300'
            }`}>
              {index + 1}
            </div>
            <span className={`text-sm ${index <= activeIndex ? 'text-white' : 'text-gray-400'}`}>{step.label}</span>
            {index < steps.length - 1 && (
              <div className={`w-10 h-0.5 ${index < activeIndex ? 'bg-green-500' : 'bg-gray-600'}`}></div>
            )}
          </div>
        ))}
      </div>

      {/* Status and Message */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor()}`}></span>
          <span className="text-white font-medium">{getStatusText()}</span>
        </div>
        <span className="text-gray-400 text-sm">{message}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${getStatusColor()}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Rich details */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-black/20 border border-[#00ff00]/20 p-3 rounded-lg">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Processed</p>
          <p className="text-white text-sm">{processedIPs || 0} / {totalIPs || 0} IPs</p>
        </div>
        <div className="bg-black/20 border border-[#00ff00]/20 p-3 rounded-lg">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Devices Found</p>
          <p className="text-green-400 text-lg font-semibold">{discoveredDevices || 0}</p>
        </div>
        <div className="bg-black/20 border border-[#00ff00]/20 p-3 rounded-lg">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Failed Attempts</p>
          <p className="text-red-400 text-lg font-semibold">{failed || 0}</p>
        </div>
        <div className="bg-black/20 border border-[#00ff00]/20 p-3 rounded-lg">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Current IP</p>
          <p className="text-white font-mono text-sm">{currentIP || 'Initializing...'}</p>
        </div>
      </div>

      {/* Estimated time */}
      {estimatedTime && (
        <div className="text-sm text-gray-400">Estimated time remaining: {estimatedTime}</div>
      )}

      {/* Per-agent progress (optional) */}
      {agentProgress && agentProgress.length > 0 && (
        <div className="mt-3">
          <h5 className="text-sm text-white mb-2">Agent Progress</h5>
          <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
            {agentProgress.map((a, idx) => (
              <div key={`${a.agent_id || idx}`} className="flex items-center justify-between text-sm bg-black/20 border border-[#00ff00]/10 rounded p-2">
                <span className="text-gray-300 truncate mr-2">{a.agent_name || a.agent_id}</span>
                <span className="text-gray-400 mr-2">{a.status || 'working'}</span>
                <div className="w-32 bg-gray-700 rounded h-2 overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${a.progress || 0}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const DiscoverySummaryModal = ({
  showDiscoverySummaryModal,
  setShowDiscoverySummaryModal,
  discoverySummary,
  handleCloseDiscoverySummary
}) => {
  if (!showDiscoverySummaryModal) return null;

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center z-50">
      <div className="modal-content p-8 rounded-lg shadow-lg max-w-lg w-full">
        <h2 className="modal-title text-2xl mb-6 text-center">Discovery Summary</h2>
        
        {/* Circular Result Donut */}
        <div className="flex justify-center mb-8">
          <div className="relative w-44 h-44 flex items-center justify-center">
            {(() => {
              const size = 176; // svg size
              const stroke = 14; // stroke width
              const radius = (size / 2) - (stroke / 2);
              const circumference = 2 * Math.PI * radius;
              const total = Number(discoverySummary.total_ips) || 0;
              const found = Number(discoverySummary.discovered_devices) || 0;
              const clampedFound = Math.min(found, total > 0 ? total : found);
              const progress = total > 0 ? clampedFound / total : 0;
              const dash = `${progress * circumference} ${circumference}`;

              return (
                <svg width={size} height={size} className="block">
                  <g transform={`rotate(-90 ${size/2} ${size/2})`}>
                    {/* Track */}
                    <circle
                      cx={size/2}
                      cy={size/2}
                      r={radius}
                      fill="none"
                      stroke="#374151" /* gray-700 */
                      strokeWidth={stroke}
                    />
                    {/* Progress */}
                    <circle
                      cx={size/2}
                      cy={size/2}
                      r={radius}
                      fill="none"
                      stroke="#10b981" /* emerald-500 */
                      strokeWidth={stroke}
                      strokeLinecap="round"
                      strokeDasharray={dash}
                    />
                  </g>
                </svg>
              );
            })()}

            {/* Center Labels */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white leading-tight">
                {discoverySummary.discovered_devices || 0} / {discoverySummary.total_ips || 0}
              </span>
              <span className="text-sm text-gray-300">devices</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></span>
            <span className="text-gray-300">Found</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#374151' }}></span>
            <span className="text-gray-300">Remaining</span>
          </div>
        </div>

        {/* Results Summary */}
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center p-4 bg-black/20 border border-[#00ff00]/20 rounded-lg">
            <span className="text-gray-300 font-medium">Total IPs Scanned:</span>
            <span className="text-white font-bold text-xl">{discoverySummary.total_ips}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-black/20 border border-[#00ff00]/20 rounded-lg">
            <span className="text-gray-300 font-medium">Devices Found:</span>
            <span className="text-green-400 font-bold text-xl">{discoverySummary.discovered_devices}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={handleCloseDiscoverySummary}
            className="btn-primary px-8 py-3 text-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}; 