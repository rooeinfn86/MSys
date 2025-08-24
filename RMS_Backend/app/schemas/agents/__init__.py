"""
Agents Schemas Package

This package contains all agent-related Pydantic schemas:
- Core agent schemas (base, create, update, response)
- Discovery-related schemas
- Token and audit schemas
"""

from .base import (
    AgentBase,
    AgentCreate,
    AgentUpdate,
    AgentResponse,
    AgentRegistration,
    AgentNetworkAccessBase,
    AgentNetworkAccessCreate,
    AgentNetworkAccessResponse,
    AgentHeartbeat,
    AgentStatus,
    AgentCapabilities,
    AgentSystemInfo,
    AgentMetrics,
    AgentHealth,
    AgentStatusRequest,
    AgentStatusResponse
)

from .discovery import (
    SNMPv3Config,
    DiscoveryMethod,
    DiscoveryCredentials,
    DiscoveryRequest,
    AgentDiscoveryRequest,
    DiscoveryResponse,
    DiscoverySession,
    DiscoveryDevice,
    DiscoveryProgress,
    DiscoveryResult,
    DiscoveryConfig,
    DiscoveryFilter,
    DiscoverySchedule
)

from .tokens import (
    AgentTokenAuditLogResponse,
    AgentTokenInfo,
    TokenRotationRequest,
    TokenRevocationRequest,
    TokenActivationRequest,
    TokenExtensionRequest,
    TokenValidationRequest,
    TokenValidationResponse,
    TokenUsageStats,
    TokenSecurityEvent,
    TokenPolicy,
    TokenBulkOperation,
    TokenBulkOperationResult
)

__all__ = [
    # Core agent schemas
    "AgentBase",
    "AgentCreate",
    "AgentUpdate",
    "AgentResponse",
    "AgentRegistration",
    "AgentNetworkAccessBase",
    "AgentNetworkAccessCreate",
    "AgentNetworkAccessResponse",
    "AgentHeartbeat",
    "AgentStatus",
    "AgentCapabilities",
    "AgentSystemInfo",
    "AgentMetrics",
    "AgentHealth",
    "AgentStatusRequest",
    "AgentStatusResponse",
    
    # Discovery schemas
    "SNMPv3Config",
    "DiscoveryMethod",
    "DiscoveryCredentials",
    "DiscoveryRequest",
    "AgentDiscoveryRequest",
    "DiscoveryResponse",
    "DiscoverySession",
    "DiscoveryDevice",
    "DiscoveryProgress",
    "DiscoveryResult",
    "DiscoveryConfig",
    "DiscoveryFilter",
    "DiscoverySchedule",
    
    # Token schemas
    "AgentTokenAuditLogResponse",
    "AgentTokenInfo",
    "TokenRotationRequest",
    "TokenRevocationRequest",
    "TokenActivationRequest",
    "TokenExtensionRequest",
    "TokenValidationRequest",
    "TokenValidationResponse",
    "TokenUsageStats",
    "TokenSecurityEvent",
    "TokenPolicy",
    "TokenBulkOperation",
    "TokenBulkOperationResult"
] 