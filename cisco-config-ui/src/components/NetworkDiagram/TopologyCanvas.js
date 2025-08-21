 
import React from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Box, CircularProgress, Typography } from '@mui/material';


/**
 * TopologyCanvas Component
 * Handles the main Cytoscape network visualization
 * 
 * @param {Object} props - Component props
 * @param {Array} props.elements - Cytoscape elements (nodes and edges)
 * @param {Object} props.layout - Cytoscape layout configuration
 * @param {Object} props.style - Cytoscape stylesheet configuration
 * @param {boolean} props.refreshing - Whether topology is currently refreshing
 * @param {Function} props.getCytoscapeEventHandlers - Function to get event handlers
 * @param {React.RefObject} props.containerRef - Reference to the container for sizing
 */
const TopologyCanvas = React.memo(({
  elements,
  layout,
  style,
  refreshing,
  getCytoscapeEventHandlers,
  containerRef,
  setCytoscapeInstance
}) => {
  return (
    <Box 
      ref={containerRef} 
      sx={{ position: 'relative', zIndex: 1, height: '100%', width: '100%' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <CytoscapeComponent
        elements={elements}
        style={{ width: '100%', height: '100%' }}
        layout={layout}
        stylesheet={style}
        cy={(cy) => {
          // Store Cytoscape instance in the hook for status refresh access
          if (setCytoscapeInstance) {
            setCytoscapeInstance(cy);
          }
          
          const eventHandlers = getCytoscapeEventHandlers();
          console.log('🎯 Event handlers available:', Object.keys(eventHandlers));
          console.log('🎯 onContextMenu handler type:', typeof eventHandlers.onContextMenu);
          
          cy.on('tap', 'node', eventHandlers.onNodeTap);
          cy.on('mousewheel', eventHandlers.onMouseWheel);
          cy.on('cxttap', 'node', (evt) => {
            console.log('🎯 cxttap event fired!');
            console.log('🎯 Calling eventHandlers.onContextMenu...');
            try {
              eventHandlers.onContextMenu(evt);
              console.log('🎯 eventHandlers.onContextMenu executed successfully');
            } catch (error) {
              console.error('🎯 Error calling onContextMenu:', error);
            }
          });
          cy.on('mouseover', 'node', eventHandlers.onNodeMouseOver);
          cy.on('mousemove', 'node', eventHandlers.onNodeMouseMove);
          cy.on('mouseout', 'node', eventHandlers.onNodeMouseOut);
          cy.on('cxtstart', eventHandlers.onContextStart);
        }}
      />
      
      {/* Refresh Loading Overlay */}
      {refreshing && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          backdropFilter: 'blur(2px)'
        }}>
          <Box sx={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#00ff00',
            px: 4,
            py: 3,
            borderRadius: '12px',
            border: '1px solid #00ff00',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            <CircularProgress sx={{ color: '#00ff00' }} />
            <Typography variant="body1" sx={{ color: '#00ff00', fontWeight: 'bold' }}>
              Refreshing Network Topology...
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(0, 255, 0, 0.7)' }}>
              Discovering devices and connections
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
});

export default TopologyCanvas; 