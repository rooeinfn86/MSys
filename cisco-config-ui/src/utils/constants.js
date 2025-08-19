// Constants and configuration values for network topology

/**
 * Status color constants
 */
export const STATUS_COLORS = {
  GREEN: 'green',
  ORANGE: 'orange',
  RED: 'red'
};

/**
 * Device status thresholds
 */
export const STATUS_THRESHOLDS = {
  MEMORY_WARNING: 80,
  MEMORY_CRITICAL: 95,
  CPU_WARNING: 80,
  CPU_CRITICAL: 95,
  TEMPERATURE_WARNING: 60,
  TEMPERATURE_CRITICAL: 80
};

/**
 * Device categories
 */
export const DEVICE_CATEGORIES = {
  ROUTER: 'router',
  SWITCH: 'switch',
  FIREWALL: 'firewall',
  ACCESS_POINT: 'access point',
  SERVER: 'server',
  APPLIANCE: 'appliance',
  UNKNOWN: 'unknown'
};

/**
 * Interface types
 */
export const INTERFACE_TYPES = {
  ETHERNET: 'Ethernet',
  GIGABIT_ETHERNET: 'GigabitEthernet',
  FAST_ETHERNET: 'FastEthernet',
  TEN_GIGABIT_ETHERNET: 'TenGigabitEthernet',
  LOOPBACK: 'Loopback',
  VLAN: 'Vlan',
  PORT_CHANNEL: 'Port-channel'
};

/**
 * Interface abbreviations for display
 */
export const INTERFACE_ABBREVIATIONS = {
  'GigabitEthernet': 'Gi',
  'FastEthernet': 'Fa',
  'TenGigabitEthernet': 'Te',
  'Ethernet': 'Eth',
  'Loopback': 'Lo',
  'Vlan': 'Vl',
  'Port-channel': 'Po'
};

/**
 * Power status values
 */
export const POWER_STATUS = {
  OK: 'OK',
  GOOD: 'GOOD',
  NORMAL: 'NORMAL',
  UNKNOWN: 'unknown'
};

/**
 * Default values
 */
export const DEFAULTS = {
  ICON_WIDTH: 64,
  ICON_HEIGHT: 64,
  MEMORY_USAGE: 0,
  CPU_USAGE: 0,
  TEMPERATURE: 0,
  UPTIME: 0
};

/**
 * Chart colors for different statuses
 */
export const CHART_COLORS = {
  NORMAL: '#4caf50',
  WARNING: '#ff9800',
  CRITICAL: '#f44336',
  UNKNOWN: '#9e9e9e'
};

/**
 * Animation settings
 */
export const ANIMATION_SETTINGS = {
  DURATION: 1000,
  EASING: 'easeInOutCubic',
  DELAY: 100
};

/**
 * Cytoscape layout names
 */
export const LAYOUT_NAMES = {
  COSE: 'cose',
  GRID: 'grid',
  RANDOM: 'random',
  CIRCLE: 'circle',
  CONCENTRIC: 'concentric',
  BREADTHFIRST: 'breadthfirst',
  DEPTHFIRST: 'depthfirst'
};

/**
 * Modal types
 */
export const MODAL_TYPES = {
  DEVICE_INFO: 'deviceInfo',
  INTERFACE_INFO: 'interfaceInfo',
  SYSTEM_HEALTH: 'systemHealth',
  CONTEXT_MENU: 'contextMenu'
};

/**
 * Context menu actions
 */
export const CONTEXT_MENU_ACTIONS = {
  SHOW_DEVICE_INFO: 'showDeviceInfo',
  SHOW_INTERFACES: 'showInterfaces',
  SHOW_HEALTH: 'showHealth',
  REMOVE_DEVICE: 'removeDevice'
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  FAILED_TO_LOAD_TOPOLOGY: 'Failed to load topology data',
  FAILED_TO_LOAD_DEVICE_INFO: 'Failed to load device information',
  FAILED_TO_LOAD_INTERFACES: 'Failed to load interface information',
  FAILED_TO_LOAD_HEALTH: 'Failed to load health information',
  NETWORK_NOT_FOUND: 'Network not found',
  DEVICE_NOT_FOUND: 'Device not found',
  INTERFACE_NOT_FOUND: 'Interface not found'
};

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  TOPOLOGY_LOADED: 'Topology loaded successfully',
  DEVICE_INFO_LOADED: 'Device information loaded successfully',
  INTERFACES_LOADED: 'Interface information loaded successfully',
  HEALTH_LOADED: 'Health information loaded successfully'
};

/**
 * Loading messages
 */
export const LOADING_MESSAGES = {
  LOADING_TOPOLOGY: 'Loading topology...',
  LOADING_DEVICE_INFO: 'Loading device information...',
  LOADING_INTERFACES: 'Loading interface information...',
  LOADING_HEALTH: 'Loading health information...'
}; 