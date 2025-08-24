import React, { useCallback, useEffect, useRef, useState } from 'react';
import { defaultLayout, topologyStyles } from '../utils/topologyIndex';
import { createDeviceTooltip, hideTooltip, updateTooltipPosition } from '../utils/topologyIndex';
import { secureLog } from '../utils/robustSecureLogging';


/**
 * Custom hook for topology visualization (Cytoscape logic)
 * @returns {Object} Visualization state and handlers
 */
export const useTopologyVisualization = () => {
  const cyRef = useRef(null);
  const [contextMenu, setContextMenu] = useState({
    open: false,
    mouseX: null,
    mouseY: null,
    nodeData: null
  });



  // Debug: Log context menu state changes - REMOVED TO PREVENT FREEZING

  // Cytoscape configuration
  const layout = defaultLayout;
  const style = topologyStyles;



  // Handle close context menu - DEFINE THIS FIRST
  const handleCloseContextMenu = useCallback(() => {
    // Ensure tooltip is hidden when context menu closes
    hideTooltip('device-tooltip');
    
    setContextMenu({
      mouseX: null,
      mouseY: null,
      nodeData: null,
      discovering: false
    });
  }, []);

  // Handle context menu - NOW THIS CAN USE handleCloseContextMenu
  const handleContextMenu = useCallback((event) => {
    // Prevent browser default context menu
    event.preventDefault();
    event.stopPropagation();
    
    // Also prevent on the original event
    if (event.originalEvent) {
      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();
    }
    
    console.log('🎯 handleContextMenu called!'); // SIMPLE DEBUG LOG
    
    // Hide the tooltip when context menu is opened
    hideTooltip('device-tooltip');
    
    const node = event.target;
    
    // Debug: Log the node data structure - SIMPLIFIED TO PREVENT FREEZING
    console.log('🎯 Node data type:', typeof node?.data?.());
    console.log('🎯 Node isNode result:', node?.isNode?.());
    
    // UPDATED validation: Check for label instead of name, and handle the correct data structure
    if (node && 
        node.isNode && 
        node.isNode() && 
        node.data && 
        node.data() && 
        node.data().id && 
        node.data().label && // Changed from .name
        node.data().type &&
        typeof node.data().id === 'string' &&
        typeof node.data().label === 'string' && // Changed from .name
        typeof node.data().type === 'string') {
      
      console.log('✅ Valid node, showing context menu');
      const nodeData = node.data();
      const newContextMenu = {
        mouseX: event.originalEvent.clientX,
        mouseY: event.originalEvent.clientY,
        nodeData: nodeData
      };
      console.log('🎯 Setting context menu state:', newContextMenu);
      setContextMenu(newContextMenu);
      console.log('🎯 setContextMenu called, checking if state updated...');
    } else {
      console.log('❌ Invalid node or edge, closing context menu');
      console.log('❌ Validation failed - checking basic properties');
      // Always close context menu for non-nodes, edges, or invalid nodes
      handleCloseContextMenu();
    }
  }, [handleCloseContextMenu]);

  // Prevent browser context menu on the container
  const handleContainerContextMenu = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // Set context menu discovering state
  const setContextMenuDiscovering = useCallback((discovering) => {
    setContextMenu(prev => ({ ...prev, discovering }));
  }, []);

  // Cytoscape event handlers
  const getCytoscapeEventHandlers = useCallback(() => ({
    // Node click handler
    onNodeTap: (evt) => {
      const node = evt.target;
      console.log('Node clicked:', node.data());
    },

    // Mouse wheel handler
    onMouseWheel: (evt) => {
      if (evt.originalEvent.ctrlKey) {
        evt.preventDefault();
      }
    },

    // Context menu handler
    onContextMenu: handleContextMenu,

    // Tooltip handlers
    onNodeMouseOver: (evt) => {
      // Don't show tooltip if context menu is open
      if (contextMenu.mouseY !== null) {
        return;
      }
      
      const node = evt.target;
      const data = node.data();
      
      // Debug: Log what status data is available
      console.log('🎯 Tooltip - Node data:', data);
      console.log('🎯 Tooltip - Available status fields:', {
        statusColor: data.statusColor,
        pingStatus: data.pingStatus,
        snmpStatus: data.snmpStatus,
        isActive: data.isActive,
        ping_status: data.ping_status,
        snmp_status: data.snmp_status,
        is_active: data.is_active
      });
      
      // Use the status data that's already available in the node
      // The data transformation should have already calculated the correct status
      const tooltipData = {
        ...data,
        // Ensure we use the correct status fields
        statusColor: data.statusColor || 'green', // Default to green if not set
        pingStatus: data.pingStatus || data.ping_status || true,
        snmpStatus: data.snmpStatus || data.snmp_status || true,
        isActive: data.isActive || data.is_active || true
      };
      
      console.log('🎯 Tooltip - Final tooltip data:', tooltipData);
      
      const tooltipContainer = createDeviceTooltip(tooltipData);
      document.body.appendChild(tooltipContainer);
    },

    onNodeMouseMove: (evt) => {
      // Don't move tooltip if context menu is open
      if (contextMenu.mouseY !== null) {
        return;
      }
      
      updateTooltipPosition('device-tooltip', evt.originalEvent.pageX, evt.originalEvent.pageY);
    },

    onNodeMouseOut: () => {
      hideTooltip('device-tooltip');
    },

    // Prevent browser context menu
    onContextStart: (evt) => {
      evt.originalEvent.preventDefault();
      evt.originalEvent.stopPropagation();
    }
  }), [contextMenu.mouseY, handleContextMenu]);





  return {
    // State
    contextMenu,
    
    // Actions
    handleContextMenu,
    handleCloseContextMenu,
    handleContainerContextMenu,
    setContextMenuDiscovering,
    
    // Configuration
    layout,
    style,
    
    // Event handlers
    getCytoscapeEventHandlers,
    
    // Cytoscape instance reference for external access
    setCytoscapeInstance: (cy) => {
      cyRef.current = cy;
      secureLog('🎯 Cytoscape instance stored in hook:', cy);
    }
  };
}; 