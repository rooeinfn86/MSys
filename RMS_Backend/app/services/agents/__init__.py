"""
Agents Service Package

This package contains all agent-related business logic services:
- Agent CRUD operations
- Discovery logic and state management
- Authentication and authorization
- Token management
- SNMP discovery operations
"""

from .agent_service import AgentService
from .agent_discovery_service import AgentDiscoveryService
from .agent_auth_service import AgentAuthService
from .agent_token_service import AgentTokenService
from .snmp_discovery_service import SNMPDiscoveryService

__all__ = [
    "AgentService",
    "AgentDiscoveryService", 
    "AgentAuthService",
    "AgentTokenService",
    "SNMPDiscoveryService"
]

# Initialize global state variables that need to be shared across services
pending_discovery_requests = {}
discovery_sessions = {} 