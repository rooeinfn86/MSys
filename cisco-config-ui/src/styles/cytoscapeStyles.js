/**
 * Cytoscape Styles - Centralized styling for Cytoscape network visualization
 * Extracted from utility files to improve maintainability and organization
 */

// Cytoscape layout configurations
export const cytoscapeLayouts = {
  default: {
    name: 'cose',
    animate: 'end',
    animationDuration: 1000,
    nodeDimensionsIncludeLabels: true,
    fit: true,
    padding: 50,
    randomize: false,
    componentSpacing: 100,
    nodeRepulsion: 400000,
    nodeOverlap: 20,
    idealEdgeLength: 100,
    edgeElasticity: 100,
    nestingFactor: 1,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0
  },
  
  enhanced: {
    name: 'cose-bilkent',
    animate: 'end',
    animationDuration: 1000,
    nodeDimensionsIncludeLabels: true,
    fit: true,
    padding: 50,
    randomize: false,
    componentSpacing: 100,
    nodeRepulsion: 600000,
    nodeOverlap: 20,
    idealEdgeLength: 120,
    edgeElasticity: 120,
    nestingFactor: 1.2,
    gravity: 100,
    numIter: 1500,
    initialTemp: 250,
    coolingFactor: 0.9,
    minTemp: 1.0
  },
  
  grid: {
    name: 'grid',
    animate: 'end',
    animationDuration: 1000,
    fit: true,
    padding: 50,
    nodeDimensionsIncludeLabels: true,
    rows: undefined,
    cols: undefined,
    position: function(node) {
      return node.position();
    },
    sort: undefined,
    boundingBox: undefined
  },
  
  circle: {
    name: 'circle',
    animate: 'end',
    animationDuration: 1000,
    fit: true,
    padding: 50,
    nodeDimensionsIncludeLabels: true,
    radius: undefined,
    startAngle: 3/2 * Math.PI,
    sweep: undefined,
    clockwise: true,
    sort: undefined,
    boundingBox: undefined
  },
  
  concentric: {
    name: 'concentric',
    animate: 'end',
    animationDuration: 1000,
    fit: true,
    padding: 50,
    nodeDimensionsIncludeLabels: true,
    startAngle: 3/2 * Math.PI,
    sweep: undefined,
    clockwise: true,
    equidistant: false,
    minNodeSpacing: 10,
    concentric: function(node) {
      return node.degree();
    },
    levelWidth: function(nodes) {
      return 2;
    },
    sort: undefined,
    boundingBox: undefined
  },
  
  breadthfirst: {
    name: 'breadthfirst',
    animate: 'end',
    animationDuration: 1000,
    fit: true,
    padding: 50,
    nodeDimensionsIncludeLabels: true,
    directed: false,
    circle: false,
    grid: false,
    spacingFactor: 1.75,
    boundingBox: undefined,
    avoidOverlap: true,
    avoidOverlapPadding: 10,
    roots: undefined,
    maximalAdjustments: 0,
    ready: undefined,
    stop: undefined
  }
};

// Cytoscape stylesheet for network visualization
export const cytoscapeStylesheet = [
  // Node styles
  {
    selector: 'node',
    style: {
      'background-color': '#00ff00',
      'border-color': '#ffffff',
      'border-width': '2px',
      'border-opacity': 0.8,
      'width': '40px',
      'height': '40px',
      'label': 'data(name)',
      'color': '#000000',
      'font-size': '12px',
      'font-weight': 'bold',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '80px',
      'text-outline-color': '#ffffff',
      'text-outline-width': '2px',
      'text-outline-opacity': 0.8,
      'text-margin-y': '8px',
      'shape': 'ellipse',
      'transition-property': 'background-color, border-color, width, height',
      'transition-duration': '0.3s'
    }
  },
  
  // Edge styles
  {
    selector: 'edge',
    style: {
      'width': '3px',
      'line-color': '#00ff00',
      'line-opacity': 0.8,
      'curve-style': 'bezier',
      'target-arrow-color': '#00ff00',
      'target-arrow-shape': 'triangle',
      'target-arrow-width': '8px',
      'target-arrow-height': '8px',
      'arrow-scale': 1,
      'loop-direction': '-45deg',
      'loop-sweep': '-90deg',
      'transition-property': 'line-color, line-opacity, width',
      'transition-duration': '0.3s'
    }
  },
  
  // Node states
  {
    selector: 'node:selected',
    style: {
      'background-color': '#ff6b35',
      'border-color': '#ffffff',
      'border-width': '4px',
      'width': '50px',
      'height': '50px',
      'z-index': 10
    }
  },
  
  {
    selector: 'node:hover',
    style: {
      'background-color': '#00cc00',
      'border-color': '#ffffff',
      'border-width': '3px',
      'width': '45px',
      'height': '45px',
      'z-index': 5
    }
  },
  
  // Edge states
  {
    selector: 'edge:selected',
    style: {
      'line-color': '#ff6b35',
      'line-opacity': 1,
      'width': '5px',
      'z-index': 10
    }
  },
  
  {
    selector: 'edge:hover',
    style: {
      'line-color': '#00cc00',
      'line-opacity': 1,
      'width': '4px',
      'z-index': 5
    }
  },
  
  // Device type specific styles
  {
    selector: 'node[type="Router"]',
    style: {
      'background-color': '#ff6b35',
      'shape': 'diamond'
    }
  },
  
  {
    selector: 'node[type="Switch"]',
    style: {
      'background-color': '#00ff00',
      'shape': 'rectangle'
    }
  },
  
  {
    selector: 'node[type="Server"]',
    style: {
      'background-color': '#4ecdc4',
      'shape': 'triangle'
    }
  },
  
  {
    selector: 'node[type="PC"]',
    style: {
      'background-color': '#45b7d1',
      'shape': 'ellipse'
    }
  },
  
  // Device status styles
  {
    selector: 'node[status="online"]',
    style: {
      'background-color': '#00ff00',
      'border-color': '#00cc00'
    }
  },
  
  {
    selector: 'node[status="partial"]',
    style: {
      'background-color': '#ff9800',
      'border-color': '#f57c00'
    }
  },
  
  {
    selector: 'node[status="offline"]',
    style: {
      'background-color': '#ff0000',
      'border-color': '#cc0000'
    }
  },
  
  // Connection type styles
  {
    selector: 'edge[type="ethernet"]',
    style: {
      'line-color': '#00ff00',
      'line-style': 'solid'
    }
  },
  
  {
    selector: 'edge[type="fiber"]',
    style: {
      'line-color': '#ff6b35',
      'line-style': 'solid'
    }
  },
  
  {
    selector: 'edge[type="wireless"]',
    style: {
      'line-color': '#4ecdc4',
      'line-style': 'dashed'
    }
  }
];

// Animation and interaction styles
export const cytoscapeInteractionStyles = {
  // Zoom and pan
  zoom: {
    min: 0.1,
    max: 3.0,
    factor: 1.1
  },
  
  // Selection
  selection: {
    enabled: true,
    multiple: true,
    box: true,
    lasso: false
  },
  
  // Tooltips
  tooltip: {
    enabled: true,
    delay: 300,
    position: 'top',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    border: '1px solid #00ff00',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '12px',
    maxWidth: '200px'
  },
  
  // Context menu
  contextMenu: {
    enabled: true,
    items: [
      'Device Information',
      'Interface Information', 
      'System Health',
      'Discover Neighbors'
    ]
  }
};

// Export all cytoscape styles
export const cytoscapeStyles = {
  layouts: cytoscapeLayouts,
  stylesheet: cytoscapeStylesheet,
  interactions: cytoscapeInteractionStyles
}; 