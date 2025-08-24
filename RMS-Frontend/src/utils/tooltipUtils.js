// Tooltip management utilities for network topology

import { TOOLTIP_SETTINGS, CYTOSCAPE_EVENTS } from './constants';
import { getDeviceStatusText } from './topologyUtils';

/**
 * Create a device tooltip element
 * @param {Object} nodeData - Node data from Cytoscape
 * @returns {HTMLElement} Tooltip DOM element
 */
export const createDeviceTooltip = (nodeData) => {
  const tooltipContainer = document.createElement('div');
  tooltipContainer.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: bold;
    border: 1px solid #00ff00;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    z-index: ${TOOLTIP_SETTINGS.Z_INDEX};
    pointer-events: none;
    white-space: nowrap;
  `;

  // Create elements safely
  const labelDiv = document.createElement('div');
  labelDiv.style.cssText = 'color: #00ff00; margin-bottom: 4px;';
  labelDiv.textContent = nodeData.label || 'Unknown Device'; // Safe text assignment

  const statusDiv = document.createElement('div');
  const statusColor = nodeData.statusColor === 'green' ? '#00ff00' : 
                     nodeData.statusColor === 'orange' ? '#ff9800' : '#ff0000';
  statusDiv.style.cssText = `color: ${statusColor};`;
  statusDiv.textContent = `Status: ${getDeviceStatusText(nodeData.statusColor)}`; // Safe text assignment

  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = 'color: #cccccc; font-size: 11px;';
  
  const ipSpan = document.createElement('span');
  ipSpan.textContent = `IP: ${nodeData.ip || 'Unknown'}`; // Safe text assignment
  
  const typeSpan = document.createElement('span');
  typeSpan.textContent = `Type: ${nodeData.deviceType || 'Unknown'}`; // Safe text assignment
  
  infoDiv.appendChild(ipSpan);
  infoDiv.appendChild(document.createElement('br'));
  infoDiv.appendChild(typeSpan);

  tooltipContainer.appendChild(labelDiv);
  tooltipContainer.appendChild(statusDiv);
  tooltipContainer.appendChild(infoDiv);

  tooltipContainer.id = CYTOSCAPE_EVENTS.TOOLTIP_ID;
  return tooltipContainer;
};

/**
 * Show tooltip at specified position
 * @param {HTMLElement} tooltip - Tooltip element to show
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
export const showTooltip = (tooltip, x, y) => {
  if (!tooltip) return;
  
  tooltip.style.left = (x + TOOLTIP_SETTINGS.OFFSET_X) + 'px';
  tooltip.style.top = (y + TOOLTIP_SETTINGS.OFFSET_Y) + 'px';
  
  if (!document.body.contains(tooltip)) {
    document.body.appendChild(tooltip);
  }
};

/**
 * Hide tooltip by removing it from DOM
 * @param {string} tooltipId - Tooltip element ID
 */
export const hideTooltip = (tooltipId = CYTOSCAPE_EVENTS.TOOLTIP_ID) => {
  const tooltip = document.getElementById(tooltipId);
  if (tooltip) {
    tooltip.remove();
  }
};

/**
 * Update tooltip position
 * @param {string} tooltipId - Tooltip element ID
 * @param {number} x - New X coordinate
 * @param {number} y - New Y coordinate
 */
export const updateTooltipPosition = (tooltipId, x, y) => {
  const tooltip = document.getElementById(tooltipId);
  if (tooltip) {
    tooltip.style.left = (x + TOOLTIP_SETTINGS.OFFSET_X) + 'px';
    tooltip.style.top = (y + TOOLTIP_SETTINGS.OFFSET_Y) + 'px';
  }
};

/**
 * Check if tooltip is currently visible
 * @param {string} tooltipId - Tooltip element ID
 * @returns {boolean} True if tooltip is visible
 */
export const isTooltipVisible = (tooltipId = CYTOSCAPE_EVENTS.TOOLTIP_ID) => {
  const tooltip = document.getElementById(tooltipId);
  return tooltip !== null;
};

/**
 * Create tooltip with custom content
 * @param {Object} options - Tooltip options
 * @param {string} options.title - Tooltip title
 * @param {string} options.content - Tooltip content
 * @param {string} options.type - Tooltip type (info, warning, error)
 * @returns {HTMLElement} Tooltip DOM element
 */
export const createCustomTooltip = ({ title, content, type = 'info' }) => {
  const tooltipContainer = document.createElement('div');
  
  const typeColors = {
    info: '#00ff00',
    warning: '#ff9800',
    error: '#ff0000'
  };
  
  tooltipContainer.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: bold;
    border: 1px solid ${typeColors[type] || typeColors.info};
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    z-index: ${TOOLTIP_SETTINGS.Z_INDEX};
    pointer-events: none;
    white-space: nowrap;
    max-width: 200px;
  `;

  if (title) {
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = `color: ${typeColors[type] || typeColors.info}; margin-bottom: 4px; font-weight: bold;`;
    titleDiv.textContent = title;
    tooltipContainer.appendChild(titleDiv);
  }

  if (content) {
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'color: #ffffff; font-size: 11px;';
    contentDiv.textContent = content;
    tooltipContainer.appendChild(contentDiv);
  }

  return tooltipContainer;
}; 