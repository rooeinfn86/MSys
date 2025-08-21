import { deviceService } from './deviceService';

class BackgroundMonitoringService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.currentNetworkId = null;
    this.monitoringInterval = 180000; // 3 minutes
    this.listeners = new Set();
    this.lastCheck = null;
    this.nextCheck = null;
  }

  // Start background monitoring for a specific network
  startMonitoring(networkId) {
    if (this.isRunning && this.currentNetworkId === networkId) {
      console.log("🔄 Background monitoring already running for network:", networkId);
      return;
    }

    // Stop existing monitoring if different network
    if (this.isRunning) {
      this.stopMonitoring();
    }

    console.log("🚀 Starting global background monitoring for network:", networkId);
    
    this.currentNetworkId = networkId;
    this.isRunning = true;
    this.lastCheck = new Date();
    
    // Start the monitoring interval
    this.interval = setInterval(async () => {
      await this.performStatusCheck();
    }, this.monitoringInterval);
    
    // Notify listeners
    this.notifyListeners({
      type: 'monitoring_started',
      networkId: networkId,
      interval: this.monitoringInterval
    });
  }

  // Stop background monitoring
  stopMonitoring() {
    if (!this.isRunning) return;
    
    console.log("🛑 Stopping global background monitoring");
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    this.isRunning = false;
    this.currentNetworkId = null;
    this.lastCheck = null;
    this.nextCheck = null;
    
    // Notify listeners
    this.notifyListeners({
      type: 'monitoring_stopped'
    });
  }

  // Perform the actual status check
  async performStatusCheck() {
    if (!this.isRunning || !this.currentNetworkId) return;
    
    try {
      console.log("🔄 Global background monitoring: Performing status check...");
      
      // Update last check time
      this.lastCheck = new Date();
      this.nextCheck = new Date(Date.now() + this.monitoringInterval);
      
      // Notify listeners that check is starting
      this.notifyListeners({
        type: 'check_started',
        lastCheck: this.lastCheck,
        nextCheck: this.nextCheck
      });
      
      // Perform the status refresh
      await deviceService.refreshAllDeviceStatuses(this.currentNetworkId);
      
      console.log("✅ Global background monitoring: Status check completed");
      
      // Notify listeners that check completed
      this.notifyListeners({
        type: 'check_completed',
        lastCheck: this.lastCheck,
        nextCheck: this.nextCheck
      });
      
    } catch (error) {
      console.error("❌ Global background monitoring: Status check failed:", error);
      
      // Notify listeners of error
      this.notifyListeners({
        type: 'check_failed',
        error: error.message,
        lastCheck: this.lastCheck,
        nextCheck: this.nextCheck
      });
    }
  }

  // Get current monitoring status
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentNetworkId: this.currentNetworkId,
      lastCheck: this.lastCheck,
      nextCheck: this.nextCheck,
      interval: this.monitoringInterval
    };
  }

  // Subscribe to monitoring events
  subscribe(listener) {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in background monitoring listener:", error);
      }
    });
  }

  // Change monitoring interval
  setInterval(intervalMs) {
    this.monitoringInterval = intervalMs;
    
    if (this.isRunning) {
      // Restart monitoring with new interval
      this.stopMonitoring();
      this.startMonitoring(this.currentNetworkId);
    }
  }

  // Get monitoring statistics
  getStats() {
    return {
      isRunning: this.isRunning,
      currentNetworkId: this.currentNetworkId,
      lastCheck: this.lastCheck,
      nextCheck: this.nextCheck,
      interval: this.monitoringInterval,
      listenerCount: this.listeners.size
    };
  }
}

// Create singleton instance
const backgroundMonitoringService = new BackgroundMonitoringService();

export default backgroundMonitoringService; 