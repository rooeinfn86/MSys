"""
Agent Management Schemas
Data validation and serialization for agent operations
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


class AgentStatus(str, Enum):
    """Agent status enumeration"""
    ONLINE = "online"
    OFFLINE = "offline"
    BUSY = "busy"
    ERROR = "error"
    MAINTENANCE = "maintenance"


class TokenStatus(str, Enum):
    """Agent token status enumeration"""
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"
    PENDING = "pending"


class AgentCapabilities(BaseModel):
    """Agent capabilities configuration"""
    snmp: bool = Field(default=False, description="SNMP discovery capability")
    ssh: bool = Field(default=False, description="SSH connection capability")
    ping: bool = Field(default=True, description="Ping capability")
    topology: bool = Field(default=False, description="Topology discovery capability")
    monitoring: bool = Field(default=True, description="Device monitoring capability")
    configuration: bool = Field(default=False, description="Configuration management capability")
    
    class Config:
        schema_extra = {
            "example": {
                "snmp": True,
                "ssh": True,
                "ping": True,
                "topology": True,
                "monitoring": True,
                "configuration": False
            }
        }


class AgentScopes(BaseModel):
    """Agent access scopes"""
    networks: List[int] = Field(default=[], description="Network IDs the agent can access")
    organizations: List[int] = Field(default=[], description="Organization IDs the agent can access")
    permissions: List[str] = Field(default=["read"], description="Permission levels")
    
    class Config:
        schema_extra = {
            "example": {
                "networks": [1, 2, 3],
                "organizations": [1],
                "permissions": ["read", "discover", "monitor"]
            }
        }


class AgentCreate(BaseModel):
    """Schema for creating a new agent"""
    name: str = Field(..., min_length=1, max_length=100, description="Agent name")
    company_id: int = Field(..., description="Company ID")
    organization_id: int = Field(..., description="Organization ID")
    capabilities: AgentCapabilities = Field(default_factory=AgentCapabilities, description="Agent capabilities")
    scopes: AgentScopes = Field(default_factory=AgentScopes, description="Agent access scopes")
    version: str = Field(default="1.0.0", description="Agent software version")
    description: Optional[str] = Field(None, max_length=500, description="Agent description")
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Network Agent 01",
                "company_id": 1,
                "organization_id": 1,
                "capabilities": {
                    "snmp": True,
                    "ssh": True,
                    "ping": True,
                    "topology": True,
                    "monitoring": True,
                    "configuration": False
                },
                "scopes": {
                    "networks": [1, 2],
                    "organizations": [1],
                    "permissions": ["read", "discover", "monitor"]
                },
                "version": "1.0.0",
                "description": "Primary network discovery agent"
            }
        }


class AgentUpdate(BaseModel):
    """Schema for updating an existing agent"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Agent name")
    capabilities: Optional[AgentCapabilities] = Field(None, description="Agent capabilities")
    scopes: Optional[AgentScopes] = Field(None, description="Agent access scopes")
    version: Optional[str] = Field(None, description="Agent software version")
    description: Optional[str] = Field(None, max_length=500, description="Agent description")
    status: Optional[AgentStatus] = Field(None, description="Agent status")
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Updated Network Agent 01",
                "capabilities": {
                    "snmp": True,
                    "ssh": True,
                    "ping": True,
                    "topology": True,
                    "monitoring": True,
                    "configuration": True
                },
                "status": "online"
            }
        }


class AgentToken(BaseModel):
    """Agent token information"""
    token: str = Field(..., description="Agent authentication token")
    issued_at: datetime = Field(..., description="Token issuance timestamp")
    expires_at: Optional[datetime] = Field(None, description="Token expiration timestamp")
    status: TokenStatus = Field(default=TokenStatus.ACTIVE, description="Token status")
    
    class Config:
        schema_extra = {
            "example": {
                "token": "abc123def456ghi789",
                "issued_at": "2025-01-01T00:00:00Z",
                "expires_at": "2026-01-01T00:00:00Z",
                "status": "active"
            }
        }


class AgentHealth(BaseModel):
    """Agent health status"""
    status: AgentStatus = Field(..., description="Current agent status")
    last_heartbeat: Optional[datetime] = Field(None, description="Last heartbeat timestamp")
    uptime_seconds: Optional[int] = Field(None, description="Agent uptime in seconds")
    memory_usage_mb: Optional[float] = Field(None, description="Memory usage in MB")
    cpu_usage_percent: Optional[float] = Field(None, description="CPU usage percentage")
    disk_usage_percent: Optional[float] = Field(None, description="Disk usage percentage")
    error_count: int = Field(default=0, description="Number of errors encountered")
    last_error: Optional[str] = Field(None, description="Last error message")
    
    class Config:
        schema_extra = {
            "example": {
                "status": "online",
                "last_heartbeat": "2025-01-01T12:00:00Z",
                "uptime_seconds": 86400,
                "memory_usage_mb": 512.5,
                "cpu_usage_percent": 15.2,
                "disk_usage_percent": 45.8,
                "error_count": 0,
                "last_error": None
            }
        }


class AgentRegistration(BaseModel):
    """Schema for agent registration"""
    name: str = Field(..., min_length=1, max_length=100, description="Agent name")
    organization_id: int = Field(..., description="Organization ID")
    networks: List[int] = Field(..., description="Network IDs the agent will manage")
    capabilities: AgentCapabilities = Field(default_factory=AgentCapabilities, description="Agent capabilities")
    version: str = Field(default="1.0.0", description="Agent software version")
    
    @validator('networks')
    def validate_networks(cls, v):
        if not v:
            raise ValueError('At least one network must be specified')
        if len(v) > 100:
            raise ValueError('Cannot register for more than 100 networks')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Network Agent 01",
                "organization_id": 1,
                "networks": [1, 2, 3],
                "capabilities": {
                    "snmp": True,
                    "ssh": True,
                    "ping": True,
                    "topology": True,
                    "monitoring": True,
                    "configuration": False
                },
                "version": "1.0.0"
            }
        }


class AgentResponse(BaseModel):
    """Schema for agent response data"""
    id: int = Field(..., description="Agent ID")
    name: str = Field(..., description="Agent name")
    company_id: int = Field(..., description="Company ID")
    organization_id: int = Field(..., description="Organization ID")
    agent_token: str = Field(..., description="Agent authentication token")
    capabilities: AgentCapabilities = Field(..., description="Agent capabilities")
    scopes: AgentScopes = Field(..., description="Agent access scopes")
    version: str = Field(..., description="Agent software version")
    status: AgentStatus = Field(..., description="Agent status")
    token_status: TokenStatus = Field(..., description="Token status")
    health: AgentHealth = Field(..., description="Agent health information")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    last_heartbeat: Optional[datetime] = Field(None, description="Last heartbeat timestamp")
    last_ip: Optional[str] = Field(None, description="Last known IP address")
    description: Optional[str] = Field(None, description="Agent description")
    
    class Config:
        from_attributes = True
        schema_extra = {
            "example": {
                "id": 1,
                "name": "Network Agent 01",
                "company_id": 1,
                "organization_id": 1,
                "agent_token": "abc123def456ghi789",
                "capabilities": {
                    "snmp": True,
                    "ssh": True,
                    "ping": True,
                    "topology": True,
                    "monitoring": True,
                    "configuration": False
                },
                "scopes": {
                    "networks": [1, 2],
                    "organizations": [1],
                    "permissions": ["read", "discover", "monitor"]
                },
                "version": "1.0.0",
                "status": "online",
                "token_status": "active",
                "health": {
                    "status": "online",
                    "last_heartbeat": "2025-01-01T12:00:00Z",
                    "uptime_seconds": 86400,
                    "memory_usage_mb": 512.5,
                    "cpu_usage_percent": 15.2,
                    "disk_usage_percent": 45.8,
                    "error_count": 0,
                    "last_error": None
                },
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T12:00:00Z",
                "last_heartbeat": "2025-01-01T12:00:00Z",
                "last_ip": "192.168.1.100",
                "description": "Primary network discovery agent"
            }
        } 