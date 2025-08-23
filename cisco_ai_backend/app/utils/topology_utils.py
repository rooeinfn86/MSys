"""
Topology Utilities
Common helper functions for network topology operations
"""

import logging
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple, Set
from collections import defaultdict, deque

logger = logging.getLogger(__name__)


def build_device_relationships(devices: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Build device relationships from device data."""
    relationships = defaultdict(list)
    
    for device in devices:
        device_id = str(device.get('id', device.get('device_id')))
        if not device_id:
            continue
        
        # Extract interface information
        interfaces = device.get('interfaces', [])
        for interface in interfaces:
            if isinstance(interface, dict):
                # Look for connection information in interface
                connected_to = interface.get('connected_to')
                if connected_to:
                    relationships[device_id].append({
                        'interface': interface.get('name', 'unknown'),
                        'connected_device': connected_to,
                        'connection_type': interface.get('connection_type', 'ethernet'),
                        'status': interface.get('status', 'unknown')
                    })
    
    return dict(relationships)


def find_network_path(
    start_device: str,
    end_device: str,
    relationships: Dict[str, List[Dict[str, Any]]]
) -> Optional[List[str]]:
    """Find network path between two devices using BFS."""
    if start_device == end_device:
        return [start_device]
    
    if start_device not in relationships or end_device not in relationships:
        return None
    
    # Use BFS to find shortest path
    queue = deque([(start_device, [start_device])])
    visited = set()
    
    while queue:
        current_device, path = queue.popleft()
        
        if current_device in visited:
            continue
        
        visited.add(current_device)
        
        # Check all connections from current device
        for connection in relationships.get(current_device, []):
            next_device = connection['connected_device']
            
            if next_device == end_device:
                return path + [next_device]
            
            if next_device not in visited:
                queue.append((next_device, path + [next_device]))
    
    return None


def calculate_network_diameter(relationships: Dict[str, List[Dict[str, Any]]]) -> int:
    """Calculate the diameter of the network (longest shortest path)."""
    if not relationships:
        return 0
    
    max_diameter = 0
    devices = list(relationships.keys())
    
    # Check all pairs of devices
    for i, device1 in enumerate(devices):
        for device2 in devices[i+1:]:
            path = find_network_path(device1, device2, relationships)
            if path:
                max_diameter = max(max_diameter, len(path) - 1)
    
    return max_diameter


def find_network_loops(relationships: Dict[str, List[Dict[str, Any]]]) -> List[List[str]]:
    """Find network loops using DFS."""
    loops = []
    visited = set()
    path = []
    
    def dfs(node: str, parent: Optional[str] = None):
        if node in path:
            # Found a loop
            loop_start = path.index(node)
            loop = path[loop_start:] + [node]
            if len(loop) > 3:  # Only consider loops with more than 3 devices
                loops.append(loop)
            return
        
        if node in visited:
            return
        
        visited.add(node)
        path.append(node)
        
        for connection in relationships.get(node, []):
            next_device = connection['connected_device']
            if next_device != parent:
                dfs(next_device, node)
        
        path.pop()
    
    # Check each device as potential start point
    for device in relationships:
        if device not in visited:
            dfs(device)
    
    return loops


def optimize_topology_layout(
    devices: List[Dict[str, Any]],
    relationships: Dict[str, List[Dict[str, Any]]]
) -> Dict[str, Dict[str, Any]]:
    """Optimize topology layout for visualization."""
    layout = {}
    
    # Simple grid layout algorithm
    grid_size = int(len(devices) ** 0.5) + 1
    current_x, current_y = 0, 0
    
    for device in devices:
        device_id = str(device.get('id', device.get('device_id')))
        if not device_id:
            continue
        
        # Calculate position
        layout[device_id] = {
            'x': current_x * 200,  # 200px spacing
            'y': current_y * 150,  # 150px spacing
            'device_type': device.get('device_type', 'unknown'),
            'status': device.get('status', 'unknown')
        }
        
        # Move to next position
        current_x += 1
        if current_x >= grid_size:
            current_x = 0
            current_y += 1
    
    return layout


def validate_topology_data(topology_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate topology data structure."""
    errors = []
    
    required_fields = ['devices', 'connections']
    for field in required_fields:
        if field not in topology_data:
            errors.append(f"Missing required field: {field}")
    
    if 'devices' in topology_data:
        devices = topology_data['devices']
        if not isinstance(devices, list):
            errors.append("Devices must be a list")
        else:
            for i, device in enumerate(devices):
                if not isinstance(device, dict):
                    errors.append(f"Device {i} must be a dictionary")
                else:
                    device_errors = _validate_device_data(device, i)
                    errors.extend(device_errors)
    
    if 'connections' in topology_data:
        connections = topology_data['connections']
        if not isinstance(connections, list):
            errors.append("Connections must be a list")
        else:
            for i, connection in enumerate(connections):
                if not isinstance(connection, dict):
                    errors.append(f"Connection {i} must be a dictionary")
                else:
                    connection_errors = _validate_connection_data(connection, i)
                    errors.extend(connection_errors)
    
    return len(errors) == 0, errors


def _validate_device_data(device: Dict[str, Any], index: int) -> List[str]:
    """Validate individual device data."""
    errors = []
    required_fields = ['id', 'name', 'ip_address']
    
    for field in required_fields:
        if field not in device:
            errors.append(f"Device {index} missing required field: {field}")
    
    return errors


def _validate_connection_data(connection: Dict[str, Any], index: int) -> List[str]:
    """Validate individual connection data."""
    errors = []
    required_fields = ['source_device', 'target_device']
    
    for field in required_fields:
        if field not in connection:
            errors.append(f"Connection {index} missing required field: {field}")
    
    return errors


def calculate_topology_metrics(
    devices: List[Dict[str, Any]],
    connections: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Calculate topology metrics and statistics."""
    if not devices:
        return {}
    
    total_devices = len(devices)
    total_connections = len(connections)
    
    # Count device types
    device_types = defaultdict(int)
    device_statuses = defaultdict(int)
    
    for device in devices:
        device_type = device.get('device_type', 'unknown')
        device_status = device.get('status', 'unknown')
        device_types[device_type] += 1
        device_statuses[device_status] += 1
    
    # Calculate connection density
    connection_density = total_connections / total_devices if total_devices > 0 else 0
    
    # Calculate redundancy (multiple paths between devices)
    redundancy_score = _calculate_redundancy_score(devices, connections)
    
    return {
        "total_devices": total_devices,
        "total_connections": total_connections,
        "connection_density": round(connection_density, 2),
        "device_types": dict(device_types),
        "device_statuses": dict(device_statuses),
        "redundancy_score": redundancy_score,
        "network_complexity": _calculate_complexity_score(total_devices, total_connections)
    }


def _calculate_redundancy_score(devices: List[Dict[str, Any]], connections: List[Dict[str, Any]]) -> float:
    """Calculate network redundancy score."""
    if len(devices) < 2:
        return 0.0
    
    # Count multiple paths between device pairs
    device_pairs = defaultdict(int)
    
    for connection in connections:
        source = connection.get('source_device')
        target = connection.get('target_device')
        
        if source and target:
            # Sort to ensure consistent pair ordering
            pair = tuple(sorted([source, target]))
            device_pairs[pair] += 1
    
    # Calculate redundancy based on multiple paths
    redundant_pairs = sum(1 for count in device_pairs.values() if count > 1)
    total_pairs = len(device_pairs)
    
    if total_pairs == 0:
        return 0.0
    
    return round((redundant_pairs / total_pairs) * 100, 2)


def _calculate_complexity_score(device_count: int, connection_count: int) -> str:
    """Calculate network complexity level."""
    if device_count <= 5:
        return "simple"
    elif device_count <= 20:
        return "moderate"
    elif device_count <= 100:
        return "complex"
    else:
        return "very_complex"


def optimize_topology_cache(
    topology_data: Dict[str, Any],
    max_cache_size_mb: int = 100
) -> Dict[str, Any]:
    """Optimize topology data for caching."""
    optimized = topology_data.copy()
    
    # Remove unnecessary fields for caching
    fields_to_remove = ['created_at', 'updated_at', 'metadata', 'temporary_data']
    for field in fields_to_remove:
        if field in optimized:
            del optimized[field]
    
    # Compress interface data
    if 'devices' in optimized:
        for device in optimized['devices']:
            if 'interfaces' in device:
                # Keep only essential interface information
                essential_interfaces = []
                for interface in device['interfaces']:
                    essential_interfaces.append({
                        'name': interface.get('name'),
                        'status': interface.get('status'),
                        'connected_to': interface.get('connected_to')
                    })
                device['interfaces'] = essential_interfaces
    
    # Calculate estimated cache size
    estimated_size = len(json.dumps(optimized, separators=(',', ':')))
    estimated_size_mb = estimated_size / (1024 * 1024)
    
    optimized['cache_info'] = {
        'estimated_size_mb': round(estimated_size_mb, 2),
        'optimized_at': datetime.now(timezone.utc).isoformat(),
        'optimization_version': "1.0"
    }
    
    return optimized


def merge_topology_updates(
    base_topology: Dict[str, Any],
    updates: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Merge topology updates with base topology."""
    merged = base_topology.copy()
    
    for update in updates:
        update_type = update.get('type')
        
        if update_type == 'device_added':
            device = update.get('device')
            if device:
                merged['devices'].append(device)
        
        elif update_type == 'device_updated':
            device_id = update.get('device_id')
            device_data = update.get('device_data')
            if device_id and device_data:
                for i, device in enumerate(merged['devices']):
                    if str(device.get('id')) == str(device_id):
                        merged['devices'][i].update(device_data)
                        break
        
        elif update_type == 'device_removed':
            device_id = update.get('device_id')
            if device_id:
                merged['devices'] = [
                    device for device in merged['devices']
                    if str(device.get('id')) != str(device_id)
                ]
        
        elif update_type == 'connection_added':
            connection = update.get('connection')
            if connection:
                merged['connections'].append(connection)
        
        elif update_type == 'connection_removed':
            connection_id = update.get('connection_id')
            if connection_id:
                merged['connections'] = [
                    conn for conn in merged['connections']
                    if conn.get('id') != connection_id
                ]
    
    # Update metadata
    merged['last_updated'] = datetime.now(timezone.utc).isoformat()
    merged['update_count'] = merged.get('update_count', 0) + len(updates)
    
    return merged


def generate_topology_summary(topology_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a summary of topology data."""
    devices = topology_data.get('devices', [])
    connections = topology_data.get('connections', [])
    
    metrics = calculate_topology_metrics(devices, connections)
    
    return {
        "summary_id": f"topology_summary_{int(datetime.now(timezone.utc).timestamp())}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "topology_info": {
            "device_count": len(devices),
            "connection_count": len(connections),
            "last_updated": topology_data.get('last_updated'),
            "version": topology_data.get('version', '1.0')
        },
        "metrics": metrics,
        "health_status": _assess_topology_health(metrics),
        "recommendations": _generate_topology_recommendations(metrics)
    }


def _assess_topology_health(metrics: Dict[str, Any]) -> str:
    """Assess overall topology health."""
    device_count = metrics.get('total_devices', 0)
    connection_density = metrics.get('connection_density', 0)
    redundancy_score = metrics.get('redundancy_score', 0)
    
    if device_count == 0:
        return "no_devices"
    elif connection_density < 0.5:
        return "low_connectivity"
    elif redundancy_score < 20:
        return "low_redundancy"
    elif connection_density > 5:
        return "over_connected"
    else:
        return "healthy"


def _generate_topology_recommendations(metrics: Dict[str, Any]) -> List[str]:
    """Generate topology improvement recommendations."""
    recommendations = []
    
    connection_density = metrics.get('connection_density', 0)
    redundancy_score = metrics.get('redundancy_score', 0)
    
    if connection_density < 0.5:
        recommendations.append("Consider adding more connections to improve network connectivity")
    
    if redundancy_score < 20:
        recommendations.append("Add redundant paths to improve network reliability")
    
    if connection_density > 5:
        recommendations.append("Network may be over-connected; consider removing unnecessary connections")
    
    if not recommendations:
        recommendations.append("Topology appears to be well-balanced")
    
    return recommendations 