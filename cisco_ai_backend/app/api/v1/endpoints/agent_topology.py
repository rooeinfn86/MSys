"""
Agent Topology Endpoints
Handle network topology discovery and management
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.api.deps import get_db
from app.services.agent_topology_service import AgentTopologyService
from app.services.agent_discovery_service import AgentDiscoveryService
from app.utils.topology_utils import (
    build_device_relationships, calculate_network_diameter,
    find_network_loops, optimize_topology_layout
)
from app.schemas.agent.topology import (
    TopologyRequest, TopologyResponse, NetworkTopology,
    TopologyProgress, DeviceNode, ConnectionEdge
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/topology/discover", response_model=TopologyResponse)
async def start_topology_discovery(
    request: TopologyRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start network topology discovery."""
    try:
        topology_service = AgentTopologyService(db)
        discovery_service = AgentDiscoveryService(db)
        
        # Validate request
        if not request.network_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Network ID is required"
            )
        
        # Start topology discovery
        topology_session = await topology_service.start_topology_discovery(
            network_id=request.network_id,
            discovery_method=request.discovery_method,
            include_interfaces=request.include_interfaces,
            current_user=current_user
        )
        
        return TopologyResponse(
            session_id=topology_session.session_id,
            status="started",
            message="Topology discovery started successfully",
            network_id=request.network_id,
            progress=topology_session.progress
        )
        
    except Exception as e:
        logger.error(f"Error starting topology discovery: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start topology discovery: {str(e)}"
        )


@router.get("/topology/{network_id}", response_model=NetworkTopology)
async def get_network_topology(
    network_id: int,
    include_interfaces: bool = False,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get network topology for a specific network."""
    try:
        topology_service = AgentTopologyService(db)
        
        # Get network topology
        topology = await topology_service.get_network_topology(
            network_id=network_id,
            include_interfaces=include_interfaces,
            current_user=current_user
        )
        
        if not topology:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network topology not found"
            )
        
        return topology
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting network topology: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get network topology: {str(e)}"
        )


@router.get("/topology/{network_id}/progress", response_model=TopologyProgress)
async def get_topology_progress(
    network_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get topology discovery progress for a network."""
    try:
        topology_service = AgentTopologyService(db)
        
        # Get topology progress
        progress = await topology_service.get_topology_progress(network_id)
        if not progress:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topology progress not found"
            )
        
        return progress
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting topology progress: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get topology progress: {str(e)}"
        )


@router.post("/topology/{network_id}/update")
async def update_network_topology(
    network_id: int,
    topology_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update network topology with new data."""
    try:
        topology_service = AgentTopologyService(db)
        
        # Update topology
        success = await topology_service.update_network_topology(
            network_id=network_id,
            topology_data=topology_data,
            current_user=current_user
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update topology"
            )
        
        return {
            "message": "Network topology updated successfully",
            "network_id": network_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating network topology: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update topology: {str(e)}"
        )


@router.get("/topology/{network_id}/relationships")
async def get_device_relationships(
    network_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get device relationships for a network."""
    try:
        topology_service = AgentTopologyService(db)
        
        # Get device relationships
        relationships = await topology_service.get_device_relationships(network_id)
        
        return {
            "network_id": network_id,
            "relationships": relationships,
            "total_relationships": sum(len(rels) for rels in relationships.values())
        }
        
    except Exception as e:
        logger.error(f"Error getting device relationships: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get device relationships: {str(e)}"
        )


@router.get("/topology/{network_id}/path")
async def find_network_path(
    network_id: int,
    start_device: str,
    end_device: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Find network path between two devices."""
    try:
        topology_service = AgentTopologyService(db)
        
        # Get network topology
        topology = await topology_service.get_network_topology(network_id)
        if not topology:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network topology not found"
            )
        
        # Build device relationships
        devices = topology.get('devices', [])
        relationships = build_device_relationships(devices)
        
        # Find path
        path = topology_service.find_network_path(start_device, end_device, relationships)
        
        if not path:
            return {
                "network_id": network_id,
                "start_device": start_device,
                "end_device": end_device,
                "path": None,
                "message": "No path found between devices"
            }
        
        return {
            "network_id": network_id,
            "start_device": start_device,
            "end_device": end_device,
            "path": path,
            "path_length": len(path) - 1,
            "devices_in_path": path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding network path: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find network path: {str(e)}"
        )


@router.get("/topology/{network_id}/analysis")
async def analyze_network_topology(
    network_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze network topology for insights."""
    try:
        topology_service = AgentTopologyService(db)
        
        # Get network topology
        topology = await topology_service.get_network_topology(network_id)
        if not topology:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network topology not found"
            )
        
        devices = topology.get('devices', [])
        connections = topology.get('connections', [])
        
        # Build relationships for analysis
        relationships = build_device_relationships(devices)
        
        # Calculate metrics
        network_diameter = calculate_network_diameter(relationships)
        network_loops = find_network_loops(relationships)
        
        # Device type distribution
        device_types = {}
        for device in devices:
            device_type = device.get('device_type', 'unknown')
            device_types[device_type] = device_types.get(device_type, 0) + 1
        
        # Connection analysis
        connection_types = {}
        for connection in connections:
            conn_type = connection.get('connection_type', 'unknown')
            connection_types[conn_type] = connection_types.get(conn_type, 0) + 1
        
        return {
            "network_id": network_id,
            "analysis": {
                "total_devices": len(devices),
                "total_connections": len(connections),
                "network_diameter": network_diameter,
                "network_loops": len(network_loops),
                "device_types": device_types,
                "connection_types": connection_types,
                "connectivity_score": _calculate_connectivity_score(len(devices), len(connections)),
                "complexity_level": _get_complexity_level(len(devices), len(connections))
            },
            "recommendations": _generate_topology_recommendations(
                len(devices), len(connections), network_loops, network_diameter
            )
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing network topology: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze topology: {str(e)}"
        )


@router.post("/topology/{network_id}/optimize")
async def optimize_network_topology(
    network_id: int,
    optimization_type: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Optimize network topology layout."""
    try:
        topology_service = AgentTopologyService(db)
        
        # Get current topology
        topology = await topology_service.get_network_topology(network_id)
        if not topology:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network topology not found"
            )
        
        devices = topology.get('devices', [])
        
        # Optimize layout
        if optimization_type == "layout":
            optimized_layout = optimize_topology_layout(devices, {})
            return {
                "network_id": network_id,
                "optimization_type": optimization_type,
                "optimized_layout": optimized_layout,
                "message": "Topology layout optimized successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported optimization type: {optimization_type}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error optimizing network topology: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to optimize topology: {str(e)}"
        )


def _calculate_connectivity_score(device_count: int, connection_count: int) -> float:
    """Calculate network connectivity score."""
    if device_count <= 1:
        return 0.0
    
    # Ideal connectivity: each device connected to 2-3 others
    ideal_connections = device_count * 2.5
    actual_connections = connection_count
    
    if actual_connections >= ideal_connections:
        return 100.0
    
    return min(100.0, (actual_connections / ideal_connections) * 100)


def _get_complexity_level(device_count: int, connection_count: int) -> str:
    """Get network complexity level."""
    if device_count <= 5:
        return "simple"
    elif device_count <= 20:
        return "moderate"
    elif device_count <= 100:
        return "complex"
    else:
        return "very_complex"


def _generate_topology_recommendations(
    device_count: int,
    connection_count: int,
    network_loops: List,
    network_diameter: int
) -> List[str]:
    """Generate topology improvement recommendations."""
    recommendations = []
    
    if device_count > 50 and connection_count < device_count * 2:
        recommendations.append("Consider adding more connections to improve network redundancy")
    
    if network_loops and len(network_loops) > 5:
        recommendations.append("Multiple network loops detected; consider simplifying topology")
    
    if network_diameter > 10:
        recommendations.append("Network diameter is high; consider adding shortcuts or redundant paths")
    
    if connection_count > device_count * 5:
        recommendations.append("Network may be over-connected; consider removing unnecessary connections")
    
    if not recommendations:
        recommendations.append("Topology appears to be well-balanced")
    
    return recommendations 