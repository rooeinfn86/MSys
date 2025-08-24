"""
Token Schemas - Agent token management data models

This module contains all token-related Pydantic schemas:
- Token audit logging
- Token information and status
- Token operations (rotation, revocation, etc.)
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel


class AgentTokenAuditLogResponse(BaseModel):
    """Schema for agent token audit log responses."""
    id: int
    agent_id: int
    event_type: str
    timestamp: datetime
    ip_address: Optional[str] = None
    user_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AgentTokenInfo(BaseModel):
    """Schema for agent token information (excluding sensitive data)."""
    agent_id: int
    agent_name: str
    token_status: Literal["active", "inactive", "revoked", "expired"] = "active"
    scopes: Optional[List[str]] = None
    issued_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    rotated_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    last_used_ip: Optional[str] = None
    created_by: Optional[int] = None
    token_age_days: Optional[int] = None
    days_until_expiry: Optional[int] = None

    class Config:
        from_attributes = True


class TokenRotationRequest(BaseModel):
    """Schema for token rotation requests."""
    reason: Optional[str] = None
    notify_agent: bool = True
    invalidate_old_token: bool = True
    generate_new_scopes: bool = False
    new_scopes: Optional[List[str]] = None

    class Config:
        from_attributes = True


class TokenRevocationRequest(BaseModel):
    """Schema for token revocation requests."""
    reason: Literal["security_breach", "user_request", "policy_violation", "expired", "other"] = "other"
    description: Optional[str] = None
    permanent: bool = False
    notify_agent: bool = True
    audit_log: bool = True

    class Config:
        from_attributes = True


class TokenActivationRequest(BaseModel):
    """Schema for token activation requests."""
    reason: Optional[str] = None
    new_expiry: Optional[datetime] = None
    new_scopes: Optional[List[str]] = None
    audit_log: bool = True

    class Config:
        from_attributes = True


class TokenExtensionRequest(BaseModel):
    """Schema for token extension requests."""
    days: int = 30
    reason: Optional[str] = None
    audit_log: bool = True

    class Config:
        from_attributes = True


class TokenValidationRequest(BaseModel):
    """Schema for token validation requests."""
    token: str
    required_scopes: Optional[List[str]] = None
    validate_expiry: bool = True
    validate_status: bool = True

    class Config:
        from_attributes = True


class TokenValidationResponse(BaseModel):
    """Schema for token validation responses."""
    is_valid: bool
    agent_id: Optional[int] = None
    agent_name: Optional[str] = None
    scopes: Optional[List[str]] = None
    issued_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    status: Optional[str] = None
    validation_errors: Optional[List[str]] = None

    class Config:
        from_attributes = True


class TokenUsageStats(BaseModel):
    """Schema for token usage statistics."""
    agent_id: int
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    last_request: Optional[datetime] = None
    first_request: Optional[datetime] = None
    average_response_time: Optional[float] = None
    most_used_endpoints: Optional[List[str]] = None
    error_rate: Optional[float] = None

    class Config:
        from_attributes = True


class TokenSecurityEvent(BaseModel):
    """Schema for token security events."""
    event_id: str
    agent_id: int
    event_type: Literal["suspicious_activity", "multiple_failures", "unusual_pattern", "geographic_anomaly", "other"] = "other"
    severity: Literal["low", "medium", "high", "critical"] = "low"
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location: Optional[str] = None
    description: str
    action_taken: Optional[str] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None

    class Config:
        from_attributes = True


class TokenPolicy(BaseModel):
    """Schema for token policies."""
    policy_id: str
    name: str
    description: Optional[str] = None
    max_token_age_days: Optional[int] = None
    required_scopes: Optional[List[str]] = None
    allowed_ip_ranges: Optional[List[str]] = None
    max_failed_attempts: int = 5
    lockout_duration_minutes: int = 30
    require_mfa: bool = False
    enforce_rotation: bool = True
    rotation_interval_days: int = 90
    audit_logging: bool = True
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenBulkOperation(BaseModel):
    """Schema for bulk token operations."""
    operation: Literal["rotate", "revoke", "activate", "extend"] = "rotate"
    agent_ids: List[int]
    reason: Optional[str] = None
    notify_agents: bool = True
    audit_log: bool = True
    dry_run: bool = False

    class Config:
        from_attributes = True


class TokenBulkOperationResult(BaseModel):
    """Schema for bulk token operation results."""
    operation: str
    total_agents: int
    successful_operations: int
    failed_operations: int
    results: List[Dict[str, Any]]
    summary: str
    completed_at: datetime

    class Config:
        from_attributes = True 