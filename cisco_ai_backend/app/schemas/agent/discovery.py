"""
Discovery Schemas
Data validation and serialization for device and network discovery operations
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator, IPvAnyAddress
from enum import Enum


class DiscoveryMethod(str, Enum):
    """Discovery method enumeration"""
    SNMP = "snmp"
    SSH = "ssh"
    PING = "ping"
    ENHANCED = "enhanced"  # Both SNMP and SSH
    AUTO = "auto"  # Automatic method selection


class DiscoveryStatus(str, Enum):
    """Discovery status enumeration"""
    PENDING = "pending"
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SNMPVersion(str, Enum):
    """SNMP version enumeration"""
    V1 = "v1"
    V2C = "v2c"
    V3 = "v3"


class SSHProtocol(str, Enum):
    """SSH protocol enumeration"""
    SSH2 = "ssh2"
    SSH1 = "ssh1"


class DiscoveryCredentials(BaseModel):
    """Credentials for device discovery"""
    snmp_community: Optional[str] = Field(None, description="SNMP community string")
    snmp_version: SNMPVersion = Field(default=SNMPVersion.V2C, description="SNMP version")
    snmp_username: Optional[str] = Field(None, description="SNMP username (for v3)")
    snmp_auth_protocol: Optional[str] = Field(None, description="SNMP authentication protocol")
    snmp_auth_password: Optional[str] = Field(None, description="SNMP authentication password")
    snmp_priv_protocol: Optional[str] = Field(None, description="SNMP privacy protocol")
    snmp_priv_password: Optional[str] = Field(None, description="SNMP privacy password")
    snmp_port: int = Field(default=161, ge=1, le=65535, description="SNMP port")
    
    ssh_username: Optional[str] = Field(None, description="SSH username")
    ssh_password: Optional[str] = Field(None, description="SSH password")
    ssh_private_key: Optional[str] = Field(None, description="SSH private key")
    ssh_port: int = Field(default=22, ge=1, le=65535, description="SSH port")
    ssh_protocol: SSHProtocol = Field(default=SSHProtocol.SSH2, description="SSH protocol version")
    
    @validator('snmp_community')
    def validate_snmp_community(cls, v):
        if v is not None and len(v) < 1:
            raise ValueError('SNMP community string cannot be empty')
        return v
    
    @validator('ssh_username')
    def validate_ssh_username(cls, v):
        if v is not None and len(v) < 1:
            raise ValueError('SSH username cannot be empty')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "snmp_community": "public",
                "snmp_version": "v2c",
                "snmp_port": 161,
                "ssh_username": "admin",
                "ssh_password": "password123",
                "ssh_port": 22
            }
        }


class DiscoveryRequest(BaseModel):
    """Schema for discovery request"""
    network_id: int = Field(..., description="Network ID to discover")
    agent_ids: List[int] = Field(..., description="Agent IDs to perform discovery")
    discovery_method: DiscoveryMethod = Field(default=DiscoveryMethod.ENHANCED, description="Discovery method")
    credentials: DiscoveryCredentials = Field(..., description="Discovery credentials")
    ip_range: Optional[str] = Field(None, description="IP range (CIDR or range notation)")
    start_ip: Optional[Union[str, IPvAnyAddress]] = Field(None, description="Start IP address")
    end_ip: Optional[Union[str, IPvAnyAddress]] = Field(None, description="End IP address")
    timeout_seconds: int = Field(default=30, ge=5, le=300, description="Discovery timeout in seconds")
    max_concurrent: int = Field(default=10, ge=1, le=100, description="Maximum concurrent discoveries")
    include_offline: bool = Field(default=False, description="Include offline devices in results")
    
    @validator('agent_ids')
    def validate_agent_ids(cls, v):
        if not v:
            raise ValueError('At least one agent ID must be specified')
        if len(v) > 10:
            raise ValueError('Cannot use more than 10 agents for discovery')
        return v
    
    @validator('ip_range', 'start_ip', 'end_ip')
    def validate_ip_configuration(cls, v, values):
        if 'ip_range' in values and values['ip_range'] and ('start_ip' in values or 'end_ip' in values):
            raise ValueError('Cannot specify both ip_range and start_ip/end_ip')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "network_id": 1,
                "agent_ids": [1, 2],
                "discovery_method": "enhanced",
                "credentials": {
                    "snmp_community": "public",
                    "snmp_version": "v2c",
                    "ssh_username": "admin",
                    "ssh_password": "password123"
                },
                "ip_range": "192.168.1.0/24",
                "timeout_seconds": 30,
                "max_concurrent": 10,
                "include_offline": False
            }
        }


class DiscoveryProgress(BaseModel):
    """Schema for discovery progress updates"""
    session_id: str = Field(..., description="Discovery session ID")
    status: DiscoveryStatus = Field(..., description="Current discovery status")
    total_ips: int = Field(..., description="Total IP addresses to scan")
    scanned_ips: int = Field(default=0, description="Number of IPs scanned")
    discovered_devices: int = Field(default=0, description="Number of devices discovered")
    failed_ips: int = Field(default=0, description="Number of IPs that failed")
    current_ip: Optional[str] = Field(None, description="Currently scanning IP")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")
    errors: List[str] = Field(default_factory=list, description="List of error messages")
    
    @validator('scanned_ips', 'discovered_devices', 'failed_ips')
    def validate_counts(cls, v, values):
        if 'total_ips' in values and v > values['total_ips']:
            raise ValueError('Count cannot exceed total IPs')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "session_id": "discovery_12345",
                "status": "in_progress",
                "total_ips": 254,
                "scanned_ips": 100,
                "discovered_devices": 15,
                "failed_ips": 5,
                "current_ip": "192.168.1.100",
                "estimated_completion": "2025-01-01T12:30:00Z",
                "errors": []
            }
        }


class DiscoverySession(BaseModel):
    """Schema for discovery session"""
    session_id: str = Field(..., description="Unique session identifier")
    network_id: int = Field(..., description="Network being discovered")
    agent_ids: List[int] = Field(..., description="Agents performing discovery")
    discovery_method: DiscoveryMethod = Field(..., description="Discovery method used")
    status: DiscoveryStatus = Field(default=DiscoveryStatus.PENDING, description="Session status")
    created_at: datetime = Field(..., description="Session creation timestamp")
    started_at: Optional[datetime] = Field(None, description="Discovery start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Discovery completion timestamp")
    total_ips: int = Field(..., description="Total IP addresses to scan")
    discovered_devices: int = Field(default=0, description="Number of devices discovered")
    errors: List[str] = Field(default_factory=list, description="List of error messages")
    
    class Config:
        schema_extra = {
            "example": {
                "session_id": "discovery_12345",
                "network_id": 1,
                "agent_ids": [1, 2],
                "discovery_method": "enhanced",
                "status": "in_progress",
                "created_at": "2025-01-01T12:00:00Z",
                "started_at": "2025-01-01T12:01:00Z",
                "total_ips": 254,
                "discovered_devices": 15,
                "errors": []
            }
        }


class DiscoveryResult(BaseModel):
    """Schema for discovery result"""
    session_id: str = Field(..., description="Discovery session ID")
    agent_id: int = Field(..., description="Agent that performed discovery")
    discovered_devices: List[Dict[str, Any]] = Field(default_factory=list, description="List of discovered devices")
    errors: List[str] = Field(default_factory=list, description="List of discovery errors")
    start_time: datetime = Field(..., description="Discovery start time")
    end_time: datetime = Field(..., description="Discovery end time")
    total_ips_scanned: int = Field(..., description="Total IP addresses scanned")
    successful_discoveries: int = Field(..., description="Number of successful discoveries")
    failed_discoveries: int = Field(..., description="Number of failed discoveries")
    
    @property
    def duration_seconds(self) -> float:
        """Calculate discovery duration in seconds"""
        return (self.end_time - self.start_time).total_seconds()
    
    @property
    def success_rate(self) -> float:
        """Calculate discovery success rate"""
        if self.total_ips_scanned == 0:
            return 0.0
        return (self.successful_discoveries / self.total_ips_scanned) * 100
    
    class Config:
        schema_extra = {
            "example": {
                "session_id": "discovery_12345",
                "agent_id": 1,
                "discovered_devices": [
                    {
                        "ip": "192.168.1.1",
                        "hostname": "router1",
                        "device_type": "Router",
                        "platform": "cisco_ios"
                    }
                ],
                "errors": [],
                "start_time": "2025-01-01T12:00:00Z",
                "end_time": "2025-01-01T12:05:00Z",
                "total_ips_scanned": 254,
                "successful_discoveries": 15,
                "failed_discoveries": 5
            }
        }


class DiscoveryResponse(BaseModel):
    """Schema for discovery response"""
    success: bool = Field(..., description="Whether discovery was successful")
    session_id: str = Field(..., description="Discovery session ID")
    message: str = Field(..., description="Response message")
    discovered_devices: int = Field(default=0, description="Number of devices discovered")
    errors: List[str] = Field(default_factory=list, description="List of error messages")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")
    progress_url: Optional[str] = Field(None, description="URL to check discovery progress")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "session_id": "discovery_12345",
                "message": "Discovery started successfully",
                "discovered_devices": 0,
                "errors": [],
                "estimated_completion": "2025-01-01T12:30:00Z",
                "progress_url": "/api/v1/agents/discovery/discovery_12345/status"
            }
        } 