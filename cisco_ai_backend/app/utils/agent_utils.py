"""
Agent Utilities
Common helper functions for agent operations
"""

import logging
import secrets
import string
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Union
from ipaddress import IPv4Address, IPv4Network, ip_address

logger = logging.getLogger(__name__)


def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_agent_id() -> str:
    """Generate a unique agent identifier."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    random_part = secrets.token_hex(4)
    return f"agent_{timestamp}_{random_part}"


def hash_agent_token(token: str, salt: Optional[str] = None) -> str:
    """Hash an agent token for secure storage."""
    if salt is None:
        salt = secrets.token_hex(16)
    
    # Use HMAC with SHA-256 for secure hashing
    hash_obj = hmac.new(
        salt.encode('utf-8'),
        token.encode('utf-8'),
        hashlib.sha256
    )
    return f"{salt}:{hash_obj.hexdigest()}"


def verify_agent_token(token: str, hashed_token: str) -> bool:
    """Verify an agent token against its hash."""
    try:
        salt, hash_value = hashed_token.split(':', 1)
        expected_hash = hash_agent_token(token, salt)
        return hmac.compare_digest(hashed_token, expected_hash)
    except (ValueError, AttributeError):
        return False


def calculate_agent_health_score(
    last_heartbeat: Optional[datetime],
    error_count: int = 0,
    response_time_ms: Optional[float] = None,
    uptime_seconds: Optional[int] = None
) -> int:
    """Calculate agent health score (0-100)."""
    score = 100
    
    # Deduct points for old heartbeat
    if last_heartbeat:
        # Ensure both datetimes are timezone-aware for comparison
        now = datetime.now(timezone.utc)
        
        # If last_heartbeat is timezone-naive, assume it's UTC
        if last_heartbeat.tzinfo is None:
            last_heartbeat_utc = last_heartbeat.replace(tzinfo=timezone.utc)
        else:
            last_heartbeat_utc = last_heartbeat
        
        age_minutes = (now - last_heartbeat_utc).total_seconds() / 60
        if age_minutes > 10:
            score -= min(50, int(age_minutes - 10) * 2)
    
    # Deduct points for errors
    score -= min(30, error_count * 5)
    
    # Deduct points for slow response
    if response_time_ms and response_time_ms > 1000:
        score -= min(20, int((response_time_ms - 1000) / 100))
    
    # Deduct points for low uptime
    if uptime_seconds and uptime_seconds < 3600:  # Less than 1 hour
        score -= 10
    
    return max(0, score)


def check_agent_capabilities(
    agent_capabilities: List[str],
    required_capabilities: List[str]
) -> Dict[str, bool]:
    """Check if agent has required capabilities."""
    if not agent_capabilities:
        return {cap: False for cap in required_capabilities}
    
    capability_check = {}
    for capability in required_capabilities:
        capability_check[capability] = capability in agent_capabilities
    
    return capability_check


def validate_agent_permissions(
    agent_networks: List[int],
    agent_organizations: List[int],
    target_network_id: int,
    target_organization_id: int
) -> bool:
    """Validate agent permissions for a specific target."""
    # Check network access
    if target_network_id not in agent_networks:
        return False
    
    # Check organization access
    if target_organization_id not in agent_organizations:
        return False
    
    return True


def calculate_agent_workload(
    active_discoveries: int,
    active_monitoring: int,
    pending_requests: int
) -> Dict[str, Any]:
    """Calculate agent workload metrics."""
    total_workload = active_discoveries + active_monitoring + pending_requests
    
    workload_level = "low"
    if total_workload > 20:
        workload_level = "high"
    elif total_workload > 10:
        workload_level = "medium"
    
    return {
        "total_workload": total_workload,
        "workload_level": workload_level,
        "active_discoveries": active_discoveries,
        "active_monitoring": active_monitoring,
        "pending_requests": pending_requests,
        "capacity_remaining": max(0, 50 - total_workload)  # Assume max capacity of 50
    }


def format_agent_status_summary(
    agent_id: int,
    agent_name: str,
    status: str,
    last_heartbeat: Optional[datetime],
    capabilities: List[str],
    workload: Dict[str, Any]
) -> Dict[str, Any]:
    """Format agent status summary for display."""
    health_score = calculate_agent_health_score(last_heartbeat)
    
    return {
        "agent_id": agent_id,
        "agent_name": agent_name,
        "status": status,
        "health_score": health_score,
        "health_status": _get_health_status(health_score),
        "last_heartbeat": last_heartbeat.isoformat() if last_heartbeat else None,
        "capabilities": capabilities,
        "workload": workload,
        "is_healthy": health_score >= 70,
        "needs_attention": health_score < 50
    }


def _get_health_status(health_score: int) -> str:
    """Get health status category based on score."""
    if health_score >= 90:
        return "excellent"
    elif health_score >= 80:
        return "good"
    elif health_score >= 70:
        return "fair"
    elif health_score >= 50:
        return "poor"
    else:
        return "critical"


def validate_ip_access(
    agent_allowed_networks: List[str],
    target_ip: str
) -> bool:
    """Validate if agent can access a specific IP address."""
    try:
        target_ip_obj = ip_address(target_ip)
        
        for network_str in agent_allowed_networks:
            try:
                network = IPv4Network(network_str, strict=False)
                if target_ip_obj in network:
                    return True
            except ValueError:
                # Skip invalid network strings
                continue
        
        return False
        
    except ValueError:
        logger.warning(f"Invalid IP address: {target_ip}")
        return False


def calculate_agent_performance_metrics(
    response_times: List[float],
    success_count: int,
    total_count: int,
    error_count: int
) -> Dict[str, Any]:
    """Calculate agent performance metrics."""
    if not response_times:
        return {
            "average_response_time_ms": 0,
            "min_response_time_ms": 0,
            "max_response_time_ms": 0,
            "success_rate": 0,
            "error_rate": 0,
            "performance_score": 0
        }
    
    avg_response_time = sum(response_times) / len(response_times)
    min_response_time = min(response_times)
    max_response_time = max(response_times)
    
    success_rate = (success_count / total_count * 100) if total_count > 0 else 0
    error_rate = (error_count / total_count * 100) if total_count > 0 else 0
    
    # Calculate performance score (0-100)
    performance_score = 100
    if avg_response_time > 1000:  # More than 1 second
        performance_score -= min(30, int((avg_response_time - 1000) / 100))
    if error_rate > 10:  # More than 10% errors
        performance_score -= min(40, int(error_rate - 10) * 2)
    
    return {
        "average_response_time_ms": round(avg_response_time, 2),
        "min_response_time_ms": min_response_time,
        "max_response_time_ms": max_response_time,
        "success_rate": round(success_rate, 2),
        "error_rate": round(error_rate, 2),
        "performance_score": max(0, performance_score)
    }


def generate_agent_report(
    agent_id: int,
    agent_name: str,
    start_time: datetime,
    end_time: datetime,
    metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate comprehensive agent report."""
    duration_seconds = (end_time - start_time).total_seconds()
    
    return {
        "report_id": f"report_{agent_id}_{int(start_time.timestamp())}",
        "agent_id": agent_id,
        "agent_name": agent_name,
        "report_period": {
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration_seconds": duration_seconds,
            "duration_formatted": _format_duration(duration_seconds)
        },
        "performance_metrics": metrics,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "report_version": "1.0"
    }


def _format_duration(seconds: float) -> str:
    """Format duration in human-readable format."""
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"{minutes}m {int(seconds % 60)}s"
    else:
        hours = int(seconds / 3600)
        minutes = int((seconds % 3600) / 60)
        return f"{hours}h {minutes}m"


def sanitize_agent_data(agent_data: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize agent data for logging and display."""
    sanitized = agent_data.copy()
    
    # Remove sensitive fields
    sensitive_fields = ['agent_token', 'password', 'private_key', 'secret']
    for field in sensitive_fields:
        if field in sanitized:
            if isinstance(sanitized[field], str) and len(sanitized[field]) > 8:
                sanitized[field] = sanitized[field][:8] + "..."
            else:
                sanitized[field] = "***"
    
    return sanitized 