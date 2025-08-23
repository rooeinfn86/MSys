"""
Agent Schemas Package
Provides data validation and serialization for agent-related operations
"""

# Agent Management Schemas
from .agent import (
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentRegistration,
    AgentToken,
    AgentCapabilities,
    AgentScopes,
    AgentStatus,
    AgentHealth
)

# Discovery Schemas
from .discovery import (
    DiscoveryRequest,
    DiscoveryResponse,
    DiscoveryMethod,
    DiscoveryProgress,
    DiscoverySession,
    DiscoveryResult,
    DiscoveryCredentials
)

# Topology Schemas
from .topology import (
    TopologyRequest,
    TopologyResponse,
    DeviceNode,
    ConnectionEdge,
    TopologyProgress,
    TopologyCache,
    NetworkTopology
)

# Status Schemas
from .status import (
    StatusRequest,
    StatusResponse,
    DeviceHealth,
    NetworkStatus,
    StatusMonitoring,
    HealthCheck,
    StatusSummary
)

# WebSocket Schemas
from .websocket import (
    WebSocketMessage,
    ConnectionStatus,
    RealTimeUpdate,
    ConnectionHealth,
    MessageRouting
)

# Version and validation info
__version__ = "1.0.0"
__schema_version__ = "2025.1"

# Export all schemas
__all__ = [
    # Agent Management
    "AgentCreate",
    "AgentUpdate", 
    "AgentResponse",
    "AgentRegistration",
    "AgentToken",
    "AgentCapabilities",
    "AgentScopes",
    "AgentStatus",
    "AgentHealth",
    
    # Discovery
    "DiscoveryRequest",
    "DiscoveryResponse",
    "DiscoveryMethod",
    "DiscoveryProgress",
    "DiscoverySession",
    "DiscoveryResult",
    "DiscoveryCredentials",
    
    # Topology
    "TopologyRequest",
    "TopologyResponse",
    "DeviceNode",
    "ConnectionEdge",
    "TopologyProgress",
    "TopologyCache",
    "NetworkTopology",
    
    # Status
    "StatusRequest",
    "StatusResponse",
    "DeviceHealth",
    "NetworkStatus",
    "StatusMonitoring",
    "HealthCheck",
    "StatusSummary",
    
    # WebSocket
    "WebSocketMessage",
    "ConnectionStatus",
    "RealTimeUpdate",
    "ConnectionHealth",
    "MessageRouting"
] 