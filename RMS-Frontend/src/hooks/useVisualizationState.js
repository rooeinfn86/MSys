import { useState, useCallback, useMemo } from 'react';
import { topologyStyles, defaultLayout } from '../utils/cytoscapeStyles';

/**
 * useVisualizationState Hook
 * Consolidated state management for all visualization-related operations
 * 
 * @returns {Object} Visualization state and operations
 */
const useVisualizationState = () => {
  // Cytoscape layout configuration
  const [layout, setLayout] = useState(defaultLayout);
  
  // Cytoscape style configuration
  const [style, setStyle] = useState(topologyStyles);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Selection state
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedEdges, setSelectedEdges] = useState([]);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({
    visible: false,
    content: '',
    position: { x: 0, y: 0 },
    target: null
  });
  
  // Viewport state
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    scale: 1,
    position: { x: 0, y: 0 }
  });

  // Get Cytoscape event handlers
  const getCytoscapeEventHandlers = useCallback(() => ({
    // Node tap handler
    onNodeTap: (event) => {
      const node = event.target;
      setSelectedNodes(prev => {
        if (prev.includes(node.id())) {
          return prev.filter(id => id !== node.id());
        } else {
          return [...prev, node.id()];
        }
      });
    },

    // Mouse wheel handler for zoom
    onMouseWheel: (event) => {
      event.preventDefault();
      const newZoom = Math.max(0.1, Math.min(3, zoom + event.deltaY * 0.001));
      setZoom(newZoom);
    },

    // Context menu handler
    onContextMenu: (event) => {
      event.preventDefault();
      const node = event.target;
      const position = event.renderedPosition;
      
      // This will be handled by the modal state hook
      // We just need to provide the event data
      return {
        node,
        position,
        event
      };
    },

    // Node mouse over handler
    onNodeMouseOver: (event) => {
      const node = event.target;
      const position = event.renderedPosition;
      
      setTooltip({
        visible: true,
        content: node.data('name') || node.id(),
        position: { x: position.x, y: position.y - 30 },
        target: node
      });
    },

    // Node mouse move handler
    onNodeMouseMove: (event) => {
      const position = event.renderedPosition;
      
      setTooltip(prev => ({
        ...prev,
        position: { x: position.x, y: position.y - 30 }
      }));
    },

    // Node mouse out handler
    onNodeMouseOut: () => {
      setTooltip(prev => ({
        ...prev,
        visible: false
      }));
    },

    // Context start handler
    onContextStart: (event) => {
      // Handle context menu start
      event.preventDefault();
    }
  }), [zoom]);

  // Change layout
  const changeLayout = useCallback((newLayout) => {
    setLayout(newLayout);
  }, []);

  // Change style
  const changeStyle = useCallback((newStyle) => {
    setStyle(newStyle);
  }, []);

  // Reset zoom and pan
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setViewport(prev => ({
      ...prev,
      scale: 1,
      position: { x: 0, y: 0 }
    }));
  }, []);

  // Fit to view
  const fitToView = useCallback(() => {
    // This will be handled by the Cytoscape instance
    // We just need to trigger the action
    setViewport(prev => ({
      ...prev,
      scale: 1,
      position: { x: 0, y: 0 }
    }));
  }, []);

  // Update viewport
  const updateViewport = useCallback((width, height, scale, position) => {
    setViewport({
      width,
      height,
      scale,
      position
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedNodes([]);
    setSelectedEdges([]);
  }, []);

  // Select node
  const selectNode = useCallback((nodeId) => {
    setSelectedNodes(prev => {
      if (prev.includes(nodeId)) {
        return prev;
      }
      return [...prev, nodeId];
    });
  }, []);

  // Deselect node
  const deselectNode = useCallback((nodeId) => {
    setSelectedNodes(prev => prev.filter(id => id !== nodeId));
  }, []);

  // Select edge
  const selectEdge = useCallback((edgeId) => {
    setSelectedEdges(prev => {
      if (prev.includes(edgeId)) {
        return prev;
      }
      return [...prev, edgeId];
    });
  }, []);

  // Deselect edge
  const deselectEdge = useCallback((edgeId) => {
    setSelectedEdges(prev => prev.filter(id => id !== edgeId));
  }, []);

  // Show tooltip
  const showTooltip = useCallback((content, position, target) => {
    setTooltip({
      visible: true,
      content,
      position,
      target
    });
  }, []);

  // Hide tooltip
  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({
      ...prev,
      visible: false
    }));
  }, []);

  // Update tooltip position
  const updateTooltipPosition = useCallback((position) => {
    setTooltip(prev => ({
      ...prev,
      position
    }));
  }, []);

  // Get available layouts
  const availableLayouts = useMemo(() => [
    { value: defaultLayout, label: 'Force-Directed', description: 'Organic force-directed layout' },
    { value: { name: 'grid' }, label: 'Grid', description: 'Regular grid layout' },
    { value: { name: 'circle' }, label: 'Circle', description: 'Circular layout' },
    { value: { name: 'concentric' }, label: 'Concentric', description: 'Circular layout' },
    { value: { name: 'breadthfirst' }, label: 'Breadth-First', description: 'Tree-like layout' }
  ], []);

  // Get available styles
  const availableStyles = useMemo(() => [
    { value: 'default', label: 'Default', description: 'Standard network visualization style' },
    { value: 'dark', label: 'Dark Theme', description: 'Dark theme for low-light environments' },
    { value: 'minimal', label: 'Minimal', description: 'Clean, minimal styling' },
    { value: 'colorful', label: 'Colorful', description: 'Vibrant, colorful styling' }
  ], []);

  // Reset visualization state
  const resetVisualizationState = useCallback(() => {
    setLayout(defaultLayout);
    setStyle(topologyStyles);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodes([]);
    setSelectedEdges([]);
    setTooltip({
      visible: false,
      content: '',
      position: { x: 0, y: 0 },
      target: null
    });
    setViewport({
      width: 0,
      height: 0,
      scale: 1,
      position: { x: 0, y: 0 }
    });
  }, []);

  return {
    // State
    layout,
    style,
    zoom,
    pan,
    selectedNodes,
    selectedEdges,
    tooltip,
    viewport,
    
    // Actions
    getCytoscapeEventHandlers,
    changeLayout,
    changeStyle,
    resetView,
    fitToView,
    updateViewport,
    clearSelection,
    selectNode,
    deselectNode,
    selectEdge,
    deselectEdge,
    showTooltip,
    hideTooltip,
    updateTooltipPosition,
    resetVisualizationState,
    
    // Available options
    availableLayouts,
    availableStyles,
    
    // Setters for internal state management
    setLayout,
    setStyle,
    setZoom,
    setPan,
    setSelectedNodes,
    setSelectedEdges,
    setTooltip,
    setViewport
  };
};

export default useVisualizationState; 