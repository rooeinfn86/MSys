import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NetworkDiagram from '../NetworkDiagram';

// Mock the custom hooks
jest.mock('../../hooks', () => ({
  useNetworkDiagramState: jest.fn()
}));

// Mock the modal components
jest.mock('../modals', () => ({
  ContextMenu: ({ children, ...props }) => <div data-testid="context-menu" {...props}>{children}</div>
}));

// Mock the NetworkDiagram sub-components
jest.mock('../NetworkDiagram/TopologyCanvas', () => {
  return function MockTopologyCanvas(props) {
    return <div data-testid="topology-canvas" {...props} />;
  };
});

jest.mock('../NetworkDiagram/TopologyControls', () => {
  return function MockTopologyControls(props) {
    return <div data-testid="topology-controls" {...props} />;
  };
});

jest.mock('../NetworkDiagram/MatrixAnimation', () => {
  return function MockMatrixAnimation(props) {
    return <div data-testid="matrix-animation" {...props} />;
  };
});

// Mock the ErrorBoundary
jest.mock('../ErrorBoundary', () => {
  return function MockErrorBoundary({ children, onReset }) {
    return <div data-testid="error-boundary" onClick={onReset}>{children}</div>;
  };
});

describe('NetworkDiagram Component', () => {
  const mockNetworkId = 'test-network-123';
  
  const defaultMockState = {
    // State
    elements: [],
    loading: false,
    error: null,
    refreshing: false,
    lastUpdated: new Date(),
    
    // Modal states
    deviceInfoModal: { open: false, data: null, loading: false, error: null },
    interfaceInfoModal: { open: false, data: null, loading: false, error: null },
    systemHealthModal: { open: false, data: null, loading: false, error: null },
    contextMenu: { mouseX: null, mouseY: null, nodeData: null, discovering: false },
    
    // Actions
    handleRefresh: jest.fn(),
    handleDeviceInfo: jest.fn(),
    handleRefreshDeviceInfo: jest.fn(),
    handleInterfaceInfo: jest.fn(),
    handleSystemHealth: jest.fn(),
    handleDiscoverNeighbors: jest.fn(),
    closeDeviceInfoModal: jest.fn(),
    closeInterfaceInfoModal: jest.fn(),
    closeSystemHealthModal: jest.fn(),
    handleCloseContextMenu: jest.fn(),
    handleContainerContextMenu: jest.fn(),
    setContextMenuDiscovering: jest.fn(),
    
    // Visualization
    layout: { name: 'cose' },
    style: [],
    getCytoscapeEventHandlers: jest.fn(() => ({
      onNodeTap: jest.fn(),
      onMouseWheel: jest.fn(),
      onContextMenu: jest.fn(),
      onNodeMouseOver: jest.fn(),
      onNodeMouseMove: jest.fn(),
      onNodeMouseOut: jest.fn(),
      onContextStart: jest.fn()
    })),
    
    // Animation
    canvasRef: { current: null },
    getCanvasStyle: jest.fn(() => ({})),
    
    // Container
    containerRef: { current: null }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { useNetworkDiagramState } = require('../../hooks');
    useNetworkDiagramState.mockReturnValue(defaultMockState);
  });

  it('renders without crashing', () => {
    render(<NetworkDiagram networkId={mockNetworkId} />);
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('displays loading state when loading is true', () => {
    const loadingState = { ...defaultMockState, loading: true };
    const { useNetworkDiagramState } = require('../../hooks');
    useNetworkDiagramState.mockReturnValue(loadingState);

    render(<NetworkDiagram networkId={mockNetworkId} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error state when error exists', () => {
    const errorState = { ...defaultMockState, error: 'Test error message' };
    const { useNetworkDiagramState } = require('../../hooks');
    useNetworkDiagramState.mockReturnValue(errorState);

    render(<NetworkDiagram networkId={mockNetworkId} />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders main topology components when not loading and no error', () => {
    render(<NetworkDiagram networkId={mockNetworkId} />);
    
    expect(screen.getByTestId('topology-controls')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-animation')).toBeInTheDocument();
    expect(screen.getTestId('topology-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('context-menu')).toBeInTheDocument();
  });

  it('calls handleContainerContextMenu on right click', () => {
    render(<NetworkDiagram networkId={mockNetworkId} />);
    
    const container = screen.getByTestId('error-boundary').firstChild;
    fireEvent.contextMenu(container);
    
    expect(defaultMockState.handleContainerContextMenu).toHaveBeenCalled();
  });

  it('passes correct props to TopologyControls', () => {
    render(<NetworkDiagram networkId={mockNetworkId} />);
    
    const topologyControls = screen.getByTestId('topology-controls');
    expect(topologyControls).toHaveAttribute('refreshing', 'false');
    expect(topologyControls).toHaveAttribute('lastUpdated');
    expect(topologyControls).toHaveAttribute('onRefresh');
  });

  it('passes correct props to TopologyCanvas', () => {
    render(<NetworkDiagram networkId={mockNetworkId} />);
    
    const topologyCanvas = screen.getByTestId('topology-canvas');
    expect(topologyCanvas).toHaveAttribute('elements');
    expect(topologyCanvas).toHaveAttribute('layout');
    expect(topologyCanvas).toHaveAttribute('style');
    expect(topologyCanvas).toHaveAttribute('refreshing', 'false');
    expect(topologyCanvas).toHaveAttribute('getCytoscapeEventHandlers');
    expect(topologyCanvas).toHaveAttribute('containerRef');
  });

  it('passes correct props to MatrixAnimation', () => {
    render(<NetworkDiagram networkId={mockNetworkId} />);
    
    const matrixAnimation = screen.getByTestId('matrix-animation');
    expect(matrixAnimation).toHaveAttribute('canvasRef');
    expect(matrixAnimation).toHaveAttribute('getCanvasStyle');
  });

  it('passes correct props to ContextMenu', () => {
    render(<NetworkDiagram networkId={mockNetworkId} />);
    
    const contextMenu = screen.getByTestId('context-menu');
    expect(contextMenu).toHaveAttribute('open', 'false');
    expect(contextMenu).toHaveAttribute('onClose');
    expect(contextMenu).toHaveAttribute('contextMenu');
    expect(contextMenu).toHaveAttribute('onDeviceInfo');
    expect(contextMenu).toHaveAttribute('onInterfaceInfo');
    expect(contextMenu).toHaveAttribute('onSystemHealth');
    expect(contextMenu).toHaveAttribute('onDiscoverNeighbors');
  });

  it('logs networkId on render', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    render(<NetworkDiagram networkId={mockNetworkId} />);
    
    expect(consoleSpy).toHaveBeenCalledWith('NetworkDiagram render:', { networkId: mockNetworkId });
    consoleSpy.mockRestore();
  });

  it('handles missing networkId gracefully', () => {
    render(<NetworkDiagram networkId={null} />);
    
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });
});

// Test error boundary functionality
describe('NetworkDiagram Error Boundary', () => {
  it('catches and displays errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Create a component that throws an error
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <NetworkDiagram networkId="test">
        <ThrowError />
      </NetworkDiagram>
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
}); 