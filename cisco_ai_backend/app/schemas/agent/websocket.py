"""
WebSocket Schemas
Data validation and serialization for real-time WebSocket communication
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum


class MessageType(str, Enum):
    """WebSocket message type enumeration"""
    PING = "ping"
    PONG = "pong"
    HEARTBEAT = "heartbeat"
    STATUS_UPDATE = "status_update"
    DISCOVERY_UPDATE = "discovery_update"
    TOPOLOGY_UPDATE = "topology_update"
    ERROR = "error"
    NOTIFICATION = "notification"
    COMMAND = "command"
    RESPONSE = "response"


class ConnectionStatus(str, Enum):
    """WebSocket connection status enumeration"""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    RECONNECTING = "reconnecting"
    ERROR = "error"


class WebSocketMessage(BaseModel):
    """Schema for WebSocket message"""
    message_id: str = Field(..., description="Unique message identifier")
    type: MessageType = Field(..., description="Message type")
    timestamp: datetime = Field(..., description="Message timestamp")
    sender_id: Optional[int] = Field(None, description="Sender agent ID")
    recipient_id: Optional[int] = Field(None, description="Recipient agent ID")
    data: Dict[str, Any] = Field(default_factory=dict, description="Message data")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Message metadata")
    
    @validator('message_id')
    def validate_message_id(cls, v):
        if not v or len(v) < 1:
            raise ValueError('Message ID cannot be empty')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "message_id": "msg_12345",
                "type": "status_update",
                "timestamp": "2025-01-01T12:00:00Z",
                "sender_id": 1,
                "recipient_id": None,
                "data": {
                    "device_id": 1,
                    "status": "online",
                    "health_score": 85
                },
                "metadata": {
                    "priority": "normal",
                    "ttl": 300
                }
            }
        }


class ConnectionStatus(BaseModel):
    """Schema for WebSocket connection status"""
    agent_id: int = Field(..., description="Agent ID")
    status: ConnectionStatus = Field(..., description="Connection status")
    connected_at: Optional[datetime] = Field(None, description="Connection timestamp")
    disconnected_at: Optional[datetime] = Field(None, description="Disconnection timestamp")
    last_activity: Optional[datetime] = Field(None, description="Last activity timestamp")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    user_agent: Optional[str] = Field(None, description="Client user agent")
    connection_id: Optional[str] = Field(None, description="Unique connection identifier")
    error_count: int = Field(default=0, description="Number of connection errors")
    last_error: Optional[str] = Field(None, description="Last error message")
    
    @property
    def is_connected(self) -> bool:
        """Check if connection is active"""
        return self.status == ConnectionStatus.CONNECTED
    
    @property
    def connection_duration_seconds(self) -> Optional[float]:
        """Calculate connection duration in seconds"""
        if self.connected_at and self.disconnected_at:
            return (self.disconnected_at - self.connected_at).total_seconds()
        elif self.connected_at:
            return (datetime.now() - self.connected_at).total_seconds()
        return None
    
    class Config:
        schema_extra = {
            "example": {
                "agent_id": 1,
                "status": "connected",
                "connected_at": "2025-01-01T12:00:00Z",
                "disconnected_at": None,
                "last_activity": "2025-01-01T12:05:00Z",
                "ip_address": "192.168.1.100",
                "user_agent": "Agent/1.0",
                "connection_id": "conn_12345",
                "error_count": 0,
                "last_error": None
            }
        }


class RealTimeUpdate(BaseModel):
    """Schema for real-time update message"""
    update_id: str = Field(..., description="Unique update identifier")
    update_type: str = Field(..., description="Type of update")
    entity_type: str = Field(..., description="Entity type being updated")
    entity_id: Union[int, str] = Field(..., description="Entity identifier")
    timestamp: datetime = Field(..., description="Update timestamp")
    changes: Dict[str, Any] = Field(..., description="Changes made")
    previous_values: Optional[Dict[str, Any]] = Field(None, description="Previous values")
    new_values: Dict[str, Any] = Field(..., description="New values")
    source: str = Field(..., description="Update source")
    priority: str = Field(default="normal", description="Update priority")
    
    @validator('update_type')
    def validate_update_type(cls, v):
        valid_types = ['create', 'update', 'delete', 'status_change', 'health_change']
        if v not in valid_types:
            raise ValueError(f'Invalid update type. Must be one of: {valid_types}')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "update_id": "update_12345",
                "update_type": "status_change",
                "entity_type": "device",
                "entity_id": 1,
                "timestamp": "2025-01-01T12:00:00Z",
                "changes": {
                    "status": "offline",
                    "last_check": "2025-01-01T12:00:00Z"
                },
                "previous_values": {
                    "status": "online",
                    "last_check": "2025-01-01T11:55:00Z"
                },
                "new_values": {
                    "status": "offline",
                    "last_check": "2025-01-01T12:00:00Z"
                },
                "source": "agent_monitoring",
                "priority": "high"
            }
        }


class ConnectionHealth(BaseModel):
    """Schema for WebSocket connection health"""
    agent_id: int = Field(..., description="Agent ID")
    connection_id: str = Field(..., description="Connection identifier")
    status: ConnectionStatus = Field(..., description="Current connection status")
    health_score: int = Field(..., ge=0, le=100, description="Connection health score")
    latency_ms: Optional[float] = Field(None, description="Connection latency in milliseconds")
    packet_loss_percent: Optional[float] = Field(None, description="Packet loss percentage")
    bandwidth_mbps: Optional[float] = Field(None, description="Available bandwidth in Mbps")
    last_heartbeat: Optional[datetime] = Field(None, description="Last heartbeat received")
    heartbeat_interval_seconds: int = Field(default=30, description="Heartbeat interval")
    missed_heartbeats: int = Field(default=0, description="Number of missed heartbeats")
    reconnection_attempts: int = Field(default=0, description="Number of reconnection attempts")
    last_error: Optional[str] = Field(None, description="Last connection error")
    
    @property
    def is_healthy(self) -> bool:
        """Check if connection is healthy"""
        return self.health_score >= 70 and self.status == ConnectionStatus.CONNECTED
    
    @property
    def needs_attention(self) -> bool:
        """Check if connection needs attention"""
        return self.health_score < 50 or self.missed_heartbeats > 3
    
    class Config:
        schema_extra = {
            "example": {
                "agent_id": 1,
                "connection_id": "conn_12345",
                "status": "connected",
                "health_score": 85,
                "latency_ms": 15.5,
                "packet_loss_percent": 0.0,
                "bandwidth_mbps": 100.0,
                "last_heartbeat": "2025-01-01T12:00:00Z",
                "heartbeat_interval_seconds": 30,
                "missed_heartbeats": 0,
                "reconnection_attempts": 0,
                "last_error": None
            }
        }


class MessageRouting(BaseModel):
    """Schema for message routing configuration"""
    message_type: MessageType = Field(..., description="Message type to route")
    routing_rules: List[Dict[str, Any]] = Field(..., description="Routing rules")
    default_recipients: List[int] = Field(default_factory=list, description="Default recipient agent IDs")
    broadcast_enabled: bool = Field(default=False, description="Whether to broadcast to all agents")
    multicast_groups: List[str] = Field(default_factory=list, description="Multicast group names")
    priority_routing: bool = Field(default=False, description="Enable priority-based routing")
    retry_config: Dict[str, Any] = Field(default_factory=dict, description="Retry configuration")
    
    @validator('routing_rules')
    def validate_routing_rules(cls, v):
        if not v:
            raise ValueError('At least one routing rule must be specified')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "message_type": "status_update",
                "routing_rules": [
                    {
                        "condition": "network_id == 1",
                        "recipients": [1, 2],
                        "priority": "high"
                    }
                ],
                "default_recipients": [1],
                "broadcast_enabled": False,
                "multicast_groups": ["network_1_agents"],
                "priority_routing": True,
                "retry_config": {
                    "max_retries": 3,
                    "retry_delay_seconds": 5
                }
            }
        }


class WebSocketEvent(BaseModel):
    """Schema for WebSocket event"""
    event_id: str = Field(..., description="Unique event identifier")
    event_type: str = Field(..., description="Event type")
    timestamp: datetime = Field(..., description="Event timestamp")
    agent_id: Optional[int] = Field(None, description="Related agent ID")
    connection_id: Optional[str] = Field(None, description="Related connection ID")
    event_data: Dict[str, Any] = Field(..., description="Event data")
    severity: str = Field(default="info", description="Event severity")
    source: str = Field(..., description="Event source")
    
    @validator('severity')
    def validate_severity(cls, v):
        valid_severities = ['debug', 'info', 'warning', 'error', 'critical']
        if v not in valid_severities:
            raise ValueError(f'Invalid severity. Must be one of: {valid_severities}')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "event_id": "event_12345",
                "event_type": "connection_established",
                "timestamp": "2025-01-01T12:00:00Z",
                "agent_id": 1,
                "connection_id": "conn_12345",
                "event_data": {
                    "ip_address": "192.168.1.100",
                    "user_agent": "Agent/1.0"
                },
                "severity": "info",
                "source": "websocket_service"
            }
        } 