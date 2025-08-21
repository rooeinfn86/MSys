import React from 'react';
import { Menu, MenuItem } from '@mui/material';


/**
 * Context Menu Component for Network Topology
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether menu is open
 * @param {Function} props.onClose - Function to close menu
 * @param {Object} props.contextMenu - Context menu state data
 * @param {Function} props.onDeviceInfo - Function to handle device info
 * @param {Function} props.onInterfaceInfo - Function to handle interface info
 * @param {Function} props.onSystemHealth - Function to handle system health
 * @param {Function} props.onDiscoverNeighbors - Function to handle neighbor discovery
 */
const ContextMenu = React.memo(({
  open,
  onClose,
  contextMenu,
  onDeviceInfo,
  onInterfaceInfo,
  onSystemHealth,
  onDiscoverNeighbors
}) => {
  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={
        contextMenu.mouseY !== null && contextMenu.mouseX !== null
          ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
          : undefined
      }
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #1a1a1a 100%)',
          border: '1px solid #00ff00',
          boxShadow: '0 0 15px rgba(0, 255, 0, 0.3), 0 0 30px rgba(0, 255, 0, 0.1)',
          borderRadius: '6px',
          color: '#ffffff',
          '& .MuiMenuItem-root': {
            color: '#ffffff',
            '&:hover': {
              background: 'rgba(0, 255, 0, 0.2)',
              color: '#00ff00'
            }
          }
        }
      }}
    >
                     <MenuItem onClick={onDeviceInfo} sx={{
                 fontWeight: 'bold',
                 '&:hover': {
                   background: 'rgba(0, 255, 0, 0.2)',
                   color: '#00ff00'
                 }
               }}>
                 Device Information
               </MenuItem>
               <MenuItem onClick={onInterfaceInfo} sx={{
                 fontWeight: 'bold',
                 '&:hover': {
                   background: 'rgba(0, 255, 0, 0.2)',
                   color: '#00ff00'
                 }
               }}>
                 Interface Information
               </MenuItem>
               <MenuItem onClick={onSystemHealth} sx={{
                 fontWeight: 'bold',
                 '&:hover': {
                   background: 'rgba(0, 255, 0, 0.2)',
                   color: '#00ff00'
                 }
               }}>
                 System Health
               </MenuItem>
                     <MenuItem
                 onClick={onDiscoverNeighbors}
                 disabled={contextMenu.discovering}
                 sx={{
                   fontWeight: 'bold',
                   '&:hover': {
                     background: 'rgba(0, 255, 0, 0.2)',
                     color: '#00ff00'
                   },
                   '&:disabled': {
                     color: 'rgba(255, 255, 255, 0.5)',
                     cursor: 'not-allowed'
                   }
                 }}
               >
        {contextMenu.discovering ? 'Discovering...' : 'Discover Neighbors'}
      </MenuItem>
    </Menu>
  );
});

export default ContextMenu; 