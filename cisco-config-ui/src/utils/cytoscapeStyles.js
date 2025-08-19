// Cytoscape styles and layout configurations for network topology

/**
 * Default layout configuration for the network topology
 */
export const defaultLayout = {
  name: 'cose',
  idealEdgeLength: 150,
  nodeOverlap: 20,
  refresh: 20,
  fit: true,
  padding: 50,
  randomize: false,
  componentSpacing: 150,
  nodeRepulsion: 450000,
  edgeElasticity: 150,
  nestingFactor: 5,
  gravity: 100,
  numIter: 1000,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0
};

/**
 * Cytoscape stylesheet for network topology visualization
 */
export const topologyStyles = [
  {
    selector: 'core',
    style: {
      'background-color': 'transparent'
    }
  },
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '120px',
      'font-size': '12px',
      'font-weight': '500',
      'color': '#ffffff',
      'text-outline-color': '#000000',
      'text-outline-width': '2px',
      'text-background-color': '#000000',
      'text-background-opacity': 0.3,
      'text-background-padding': '3px',
      'text-background-shape': 'roundrectangle'
    }
  },
  {
    selector: 'node[deviceCategory="router"]',
    style: {
      // No background or border, icon will be used
    }
  },
  {
    selector: 'node[deviceCategory="switch"]',
    style: {
      'shape': 'rectangle',
      'width': '64px',
      'height': '64px',
      'background-color': 'transparent',
      'background-opacity': 0,
      'border-width': 0,
      'background-image': '/images/network-icons/switch-cisco.png',
      'background-image-opacity': 1,
      'background-fit': 'contain',
      'background-clip': 'node',
      'background-position-x': '50%',
      'background-position-y': '50%',
      'label': 'data(label)',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'font-size': '13px',
      'font-weight': '600',
      'color': '#ffffff',
      'text-outline-color': '#000000',
      'text-outline-width': '2px',
      'text-background-color': '#000000',
      'text-background-opacity': 0.3,
      'text-background-padding': '4px',
      'text-background-shape': 'roundrectangle',
    }
  },
  {
    selector: 'node[deviceCategory="firewall"]',
    style: {
      // No background or border, icon will be used
    }
  },
  {
    selector: 'node[deviceCategory="access point"]',
    style: {
      // No background or border, icon will be used
    }
  },
  {
    selector: 'node[deviceCategory="server"]',
    style: {
      // No background or border, icon will be used
    }
  },
  {
    selector: 'node[deviceCategory="appliance"]',
    style: {
      // No background or border, icon will be used
    }
  },
  {
    selector: 'node[deviceCategory="unknown"]',
    style: {
      // No background or border, icon will be used
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 3,
      'line-color': '#666666',
      'target-arrow-color': '#666666',
      'target-arrow-shape': 'triangle',
      'source-arrow-color': '#666666',
      'source-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'edge-distances': 'intersection',
      'loop-direction': '-45deg',
      'loop-sweep': '-90deg',
      'text-rotation': 'autorotate',
      'text-margin-y': -10,
      'font-size': '12px',
      'font-weight': 'bold',
      'color': '#ffffff',
      'text-outline-color': '#000000',
      'text-outline-width': '2px',
      'text-background-color': '#000000',
      'text-background-opacity': 0.4,
      'text-background-padding': '3px',
      'text-background-shape': 'roundrectangle'
    }
  },
  {
    selector: 'edge[type="neighbor"]',
    style: {
      'line-color': '#4caf50',
      'target-arrow-color': '#4caf50',
      'source-arrow-color': '#4caf50',
      'label': function(ele) {
        const data = ele.data();
        return `${data.local_interface} ↔ ${data.remote_interface}`;
      }
    }
  },
  {
    selector: 'node[type="device"]',
    style: {
      'shape': 'rectangle',
      'width': 'data(width)',
      'height': 'data(height)',
      'background-color': 'transparent',
      'background-opacity': 0,
      'border-width': 0,
      'background-image': function(ele) {
        const data = ele.data();
        console.log('Setting background image for node:', data.label, 'Icon:', data.icon);
        return data.icon;
      },
      'background-image-opacity': 1,
      'background-fit': 'cover',
      'background-clip': 'node',
      'background-position-x': '50%',
      'background-position-y': '50%',
      'label': 'data(label)',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'font-size': '13px',
      'font-weight': '600',
      'color': '#ffffff',
      'text-outline-color': '#000000',
      'text-outline-width': '2px',
      'text-background-color': '#000000',
      'text-background-opacity': 0.3,
      'text-background-padding': '4px',
      'text-background-shape': 'roundrectangle',
    }
  },
  // Status indicator styles
  {
    selector: 'node[statusColor="green"]',
    style: {
      'border-width': '3px',
      'border-color': '#00ff00',
      'border-opacity': 0.8,
      'border-style': 'solid'
    }
  },
  {
    selector: 'node[statusColor="orange"]',
    style: {
      'border-width': '3px',
      'border-color': '#ff9800',
      'border-opacity': 0.8,
      'border-style': 'solid'
    }
  },
  {
    selector: 'node[statusColor="red"]',
    style: {
      'border-width': '3px',
      'border-color': '#ff0000',
      'border-opacity': 0.8,
      'border-style': 'solid'
    }
  }
];

 