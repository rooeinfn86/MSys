"""
Core Agent Schemas - Base agent data models

This module contains all core agent-related Pydantic schemas:
- Agent base, create, update, and response models
- Agent registration and network access models
- Agent heartbeat and status models
"""

from datetime import datetime
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel


class AgentBase(BaseModel):
    """Base agent schema with common fields."""
    name: str
    company_id: int
    organization_id: int
    capabilities: Optional[List[str]] = ["snmp_discovery", "ssh_config", "health_monitoring"]
    version: Optional[str] = "1.0.0"

    class Config:
        from_attributes = True


class AgentCreate(AgentBase):
    """Schema for creating a new agent."""
    pass


class AgentUpdate(BaseModel):
    """Schema for updating an existing agent."""
    name: Optional[str] = None
    status: Optional[str] = None
    capabilities: Optional[List[str]] = None
    version: Optional[str] = None

    class Config:
        from_attributes = True


class AgentResponse(AgentBase):
    """Schema for agent responses."""
    id: int
    agent_token: str
    status: str
    last_heartbeat: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    # New agent token management fields
    token_status: str
    scopes: Optional[list] = None
    issued_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    rotated_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    last_used_ip: Optional[str] = None
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


class AgentRegistration(BaseModel):
    """Schema for agent registration requests."""
    name: str
    organization_id: int
    capabilities: Optional[List[str]] = ["snmp_discovery", "ssh_config", "health_monitoring"]
    version: Optional[str] = "1.0.0"
    networks: List[int]  # List of network IDs this agent can access

    class Config:
        from_attributes = True


class AgentHeartbeat(BaseModel):
    """Schema for agent heartbeat requests."""
    agent_token: str
    status: str = "online"
    capabilities: Optional[List[str]] = None
    version: Optional[str] = None
    agent_name: Optional[str] = None
    discovered_devices_count: Optional[int] = None
    system_info: Optional[dict] = None

    class Config:
        from_attributes = True


class AgentStatus(BaseModel):
    """Schema for agent status updates."""
    status: str
    agent_name: Optional[str] = None
    discovered_devices_count: Optional[int] = None
    system_info: Optional[dict] = None

    class Config:
        from_attributes = True


class AgentNetworkAccessBase(BaseModel):
    """Base schema for agent network access."""
    agent_id: int
    network_id: int
    company_id: int
    organization_id: int

    class Config:
        from_attributes = True


class AgentNetworkAccessCreate(AgentNetworkAccessBase):
    """Schema for creating agent network access."""
    pass


class AgentNetworkAccessResponse(AgentNetworkAccessBase):
    """Schema for agent network access responses."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class AgentCapabilities(BaseModel):
    """Schema for agent capabilities."""
    snmp_discovery: bool = True
    ssh_config: bool = True
    health_monitoring: bool = True
    topology_mapping: bool = False
    compliance_scanning: bool = False
    backup_management: bool = False

    class Config:
        from_attributes = True


class AgentSystemInfo(BaseModel):
    """Schema for agent system information."""
    platform: Optional[str] = None
    python_version: Optional[str] = None
    memory_usage: Optional[str] = None
    cpu_usage: Optional[str] = None
    disk_usage: Optional[str] = None
    uptime: Optional[str] = None
    last_restart: Optional[datetime] = None

    class Config:
        from_attributes = True


class AgentMetrics(BaseModel):
    """Schema for agent performance metrics."""
    devices_discovered: int = 0
    successful_discoveries: int = 0
    failed_discoveries: int = 0
    average_response_time: Optional[float] = None
    last_discovery_duration: Optional[float] = None
    total_uptime: Optional[float] = None

    class Config:
        from_attributes = True


class AgentHealth(BaseModel):
    """Agent health information."""
    status: Literal["healthy", "warning", "critical", "unknown"] = "unknown"
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    disk_usage: Optional[float] = None
    network_latency: Optional[float] = None
    last_health_check: Optional[datetime] = None
    health_score: Optional[int] = None  # 0-100

    class Config:
        from_attributes = True


class AgentStatusRequest(BaseModel):
    """Request for agent status check."""
    type: str = "status_test"
    session_id: str
    network_id: int
    devices: List[Dict[str, Any]]
    timestamp: datetime

    class Config:
        from_attributes = True


class AgentStatusResponse(BaseModel):
    """Response from agent status check."""
    message: str
    status: str
    session_id: Optional[str] = None
    agent_id: Optional[str] = None
    ping: Optional[bool] = None
    snmp: Optional[bool] = None
    ip: Optional[str] = None
    last_checked: Optional[str] = None

    class Config:
        from_attributes = True 