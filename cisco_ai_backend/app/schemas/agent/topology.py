"""
Topology Schemas
Data validation and serialization for network topology operations
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum


class TopologyStatus(str, Enum):
    """Topology status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DeviceType(str, Enum):
    """Device type enumeration"""
    ROUTER = "Router"
    SWITCH = "Switch"
    FIREWALL = "Firewall"
    SERVER = "Server"
    WORKSTATION = "Workstation"
    PRINTER = "Printer"
    CAMERA = "Camera"
    ACCESS_POINT = "Access Point"
    UNKNOWN = "Unknown"


class ConnectionType(str, Enum):
    """Connection type enumeration"""
    ETHERNET = "ethernet"
    FIBER = "fiber"
    WIRELESS = "wireless"
    SERIAL = "serial"
    USB = "usb"
    UNKNOWN = "unknown"


class DeviceNode(BaseModel):
    """Schema for device node in topology"""
    id: int = Field(..., description="Device ID")
    name: str = Field(..., description="Device name")
    ip_address: str = Field(..., description="Device IP address")
    device_type: DeviceType = Field(..., description="Type of device")
    platform: str = Field(..., description="Device platform/OS")
    vendor: str = Field(..., description="Device vendor")
    model: str = Field(..., description="Device model")
    status: str = Field(..., description="Device status (online/offline)")
    location: Optional[str] = Field(None, description="Device location")
    description: Optional[str] = Field(None, description="Device description")
    uptime: Optional[int] = Field(None, description="Device uptime in seconds")
    last_polled: Optional[datetime] = Field(None, description="Last time device was polled")
    capabilities: List[str] = Field(default_factory=list, description="Device capabilities")
    interfaces: List[Dict[str, Any]] = Field(default_factory=list, description="Device interfaces")
    
    class Config:
        schema_extra = {
            "example": {
                "id": 1,
                "name": "Core Switch 01",
                "ip_address": "192.168.1.1",
                "device_type": "Switch",
                "platform": "cisco_ios",
                "vendor": "Cisco",
                "model": "Catalyst 3850",
                "status": "online",
                "location": "Data Center",
                "description": "Core distribution switch",
                "uptime": 86400,
                "last_polled": "2025-01-01T12:00:00Z",
                "capabilities": ["snmp", "ssh", "lldp"],
                "interfaces": [
                    {
                        "name": "GigabitEthernet1/0/1",
                        "status": "up",
                        "speed": "1000",
                        "description": "Uplink to Router"
                    }
                ]
            }
        }


class ConnectionEdge(BaseModel):
    """Schema for connection between devices"""
    id: str = Field(..., description="Unique connection identifier")
    source_device_id: int = Field(..., description="Source device ID")
    target_device_id: int = Field(..., description="Target device ID")
    source_interface: str = Field(..., description="Source interface name")
    target_interface: str = Field(..., description="Target interface name")
    connection_type: ConnectionType = Field(..., description="Type of connection")
    bandwidth: Optional[str] = Field(None, description="Connection bandwidth")
    status: str = Field(..., description="Connection status")
    description: Optional[str] = Field(None, description="Connection description")
    discovered_at: datetime = Field(..., description="When connection was discovered")
    last_verified: Optional[datetime] = Field(None, description="Last verification time")
    
    class Config:
        schema_extra = {
            "example": {
                "id": "conn_1_2",
                "source_device_id": 1,
                "target_device_id": 2,
                "source_interface": "GigabitEthernet1/0/1",
                "target_interface": "GigabitEthernet1/0/1",
                "connection_type": "ethernet",
                "bandwidth": "1Gbps",
                "status": "active",
                "description": "Uplink connection",
                "discovered_at": "2025-01-01T12:00:00Z",
                "last_verified": "2025-01-01T12:00:00Z"
            }
        }


class TopologyProgress(BaseModel):
    """Schema for topology discovery progress"""
    session_id: str = Field(..., description="Topology discovery session ID")
    status: TopologyStatus = Field(..., description="Current topology status")
    total_devices: int = Field(..., description="Total devices to process")
    processed_devices: int = Field(default=0, description="Number of devices processed")
    discovered_connections: int = Field(default=0, description="Number of connections discovered")
    failed_devices: int = Field(default=0, description="Number of devices that failed")
    current_device: Optional[str] = Field(None, description="Currently processing device")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")
    errors: List[str] = Field(default_factory=list, description="List of error messages")
    
    @validator('processed_devices', 'discovered_connections', 'failed_devices')
    def validate_counts(cls, v, values):
        if 'total_devices' in values and v > values['total_devices']:
            raise ValueError('Count cannot exceed total devices')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "session_id": "topology_12345",
                "status": "in_progress",
                "total_devices": 50,
                "processed_devices": 25,
                "discovered_connections": 30,
                "failed_devices": 2,
                "current_device": "192.168.1.10",
                "estimated_completion": "2025-01-01T12:30:00Z",
                "errors": []
            }
        }


class TopologyCache(BaseModel):
    """Schema for topology cache information"""
    network_id: int = Field(..., description="Network ID")
    last_updated: datetime = Field(..., description="Last cache update time")
    cache_size: int = Field(..., description="Cache size in bytes")
    device_count: int = Field(..., description="Number of devices in cache")
    connection_count: int = Field(..., description="Number of connections in cache")
    cache_validity_hours: int = Field(default=24, description="Cache validity in hours")
    is_stale: bool = Field(..., description="Whether cache is stale")
    next_refresh: Optional[datetime] = Field(None, description="Next scheduled refresh")
    
    @property
    def age_hours(self) -> float:
        """Calculate cache age in hours"""
        return (datetime.now() - self.last_updated).total_seconds() / 3600
    
    class Config:
        schema_extra = {
            "example": {
                "network_id": 1,
                "last_updated": "2025-01-01T12:00:00Z",
                "cache_size": 1024000,
                "device_count": 50,
                "connection_count": 75,
                "cache_validity_hours": 24,
                "is_stale": False,
                "next_refresh": "2025-01-02T12:00:00Z"
            }
        }


class NetworkTopology(BaseModel):
    """Schema for complete network topology"""
    network_id: int = Field(..., description="Network ID")
    network_name: str = Field(..., description="Network name")
    discovered_at: datetime = Field(..., description="When topology was discovered")
    last_updated: datetime = Field(..., description="Last topology update")
    total_devices: int = Field(..., description="Total number of devices")
    online_devices: int = Field(..., description="Number of online devices")
    offline_devices: int = Field(..., description="Number of offline devices")
    total_connections: int = Field(..., description="Total number of connections")
    active_connections: int = Field(..., description="Number of active connections")
    devices: List[DeviceNode] = Field(..., description="List of devices")
    connections: List[ConnectionEdge] = Field(..., description="List of connections")
    cache_info: TopologyCache = Field(..., description="Cache information")
    
    @property
    def online_percentage(self) -> float:
        """Calculate percentage of online devices"""
        if self.total_devices == 0:
            return 0.0
        return (self.online_devices / self.total_devices) * 100
    
    @property
    def connection_density(self) -> float:
        """Calculate connection density (connections per device)"""
        if self.total_devices == 0:
            return 0.0
        return self.total_connections / self.total_devices
    
    class Config:
        schema_extra = {
            "example": {
                "network_id": 1,
                "network_name": "Corporate Network",
                "discovered_at": "2025-01-01T12:00:00Z",
                "last_updated": "2025-01-01T12:00:00Z",
                "total_devices": 50,
                "online_devices": 48,
                "offline_devices": 2,
                "total_connections": 75,
                "active_connections": 72,
                "devices": [],
                "connections": [],
                "cache_info": {
                    "network_id": 1,
                    "last_updated": "2025-01-01T12:00:00Z",
                    "cache_size": 1024000,
                    "device_count": 50,
                    "connection_count": 75,
                    "cache_validity_hours": 24,
                    "is_stale": False,
                    "next_refresh": "2025-01-02T12:00:00Z"
                }
            }
        }


class TopologyRequest(BaseModel):
    """Schema for topology discovery request"""
    network_id: int = Field(..., description="Network ID to discover topology")
    agent_ids: List[int] = Field(..., description="Agent IDs to perform topology discovery")
    discovery_method: str = Field(default="lldp", description="Topology discovery method")
    include_interfaces: bool = Field(default=True, description="Include interface information")
    include_connections: bool = Field(default=True, description="Include connection information")
    refresh_cache: bool = Field(default=False, description="Force refresh of existing cache")
    timeout_seconds: int = Field(default=300, ge=60, le=1800, description="Discovery timeout")
    
    @validator('agent_ids')
    def validate_agent_ids(cls, v):
        if not v:
            raise ValueError('At least one agent ID must be specified')
        if len(v) > 5:
            raise ValueError('Cannot use more than 5 agents for topology discovery')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "network_id": 1,
                "agent_ids": [1, 2],
                "discovery_method": "lldp",
                "include_interfaces": True,
                "include_connections": True,
                "refresh_cache": False,
                "timeout_seconds": 300
            }
        }


class TopologyResponse(BaseModel):
    """Schema for topology discovery response"""
    success: bool = Field(..., description="Whether topology discovery was successful")
    session_id: str = Field(..., description="Topology discovery session ID")
    message: str = Field(..., description="Response message")
    network_id: int = Field(..., description="Network ID")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")
    progress_url: Optional[str] = Field(None, description="URL to check topology progress")
    cache_info: Optional[TopologyCache] = Field(None, description="Current cache information")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "session_id": "topology_12345",
                "message": "Topology discovery started successfully",
                "network_id": 1,
                "estimated_completion": "2025-01-01T12:30:00Z",
                "progress_url": "/api/v1/agents/topology/topology_12345/status",
                "cache_info": {
                    "network_id": 1,
                    "last_updated": "2025-01-01T12:00:00Z",
                    "cache_size": 1024000,
                    "device_count": 50,
                    "connection_count": 75,
                    "cache_validity_hours": 24,
                    "is_stale": False,
                    "next_refresh": "2025-01-02T12:00:00Z"
                }
            }
        } 