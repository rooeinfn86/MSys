"""
Discovery Schemas - Discovery operation data models

This module contains all discovery-related Pydantic schemas:
- SNMPv3 configuration
- Discovery methods and credentials
- Discovery requests and responses
- Discovery sessions and progress
- Discovery devices and results
- Discovery configuration and scheduling
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class SNMPv3Config(BaseModel):
    """SNMPv3 configuration schema."""
    security_level: Literal["noAuthNoPriv", "authNoPriv", "authPriv"] = "noAuthNoPriv"
    username: str
    auth_protocol: Optional[Literal["MD5", "SHA", "SHA224", "SHA256", "SHA384", "SHA512"]] = None
    auth_password: Optional[str] = None
    priv_protocol: Optional[Literal["DES", "AES", "AES192", "AES256", "AES192CISCO", "AES256CISCO"]] = None
    priv_password: Optional[str] = None

    class Config:
        from_attributes = True


class DiscoveryMethod(BaseModel):
    """Discovery method configuration."""
    method: Literal["auto", "snmp_only", "ssh_only", "ping_only"] = "auto"
    snmp_config: Optional[SNMPv3Config] = None
    snmp_community: Optional[str] = None
    snmp_version: Optional[Literal["v1", "v2c", "v3"]] = None
    snmp_port: int = 161
    ssh_port: int = 22
    timeout: int = 5

    class Config:
        from_attributes = True


class DiscoveryCredentials(BaseModel):
    """Discovery credentials for different methods."""
    snmp_community: Optional[str] = None
    snmp_username: Optional[str] = None
    snmp_auth_password: Optional[str] = None
    snmp_priv_password: Optional[str] = None
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None
    ssh_key_file: Optional[str] = None

    class Config:
        from_attributes = True


class DiscoveryRequest(BaseModel):
    """Basic discovery request."""
    network_id: int
    ip_range: Optional[str] = None
    start_ip: Optional[str] = None
    end_ip: Optional[str] = None
    discovery_method: DiscoveryMethod
    credentials: Optional[DiscoveryCredentials] = None
    location: str = ""
    device_type: str = "auto"

    class Config:
        from_attributes = True


class AgentDiscoveryRequest(BaseModel):
    """Enhanced discovery request with agent selection and SNMP configuration."""
    network_id: int
    agent_ids: List[int]  # Multiple agents for parallel discovery
    ip_range: Optional[str] = None
    start_ip: Optional[str] = None
    end_ip: Optional[str] = None
    discovery_method: DiscoveryMethod
    credentials: Optional[dict] = None  # SSH credentials if needed
    location: str = ""
    device_type: str = "auto"

    class Config:
        from_attributes = True


class DiscoveryResponse(BaseModel):
    """Discovery response with session information."""
    message: str
    session_id: str
    network_id: int
    agent_ids: List[int]
    total_ips: int
    status: str
    estimated_duration: Optional[int] = None

    class Config:
        from_attributes = True


class DiscoverySession(BaseModel):
    """Discovery session tracking."""
    session_id: str
    network_id: int
    agent_ids: List[int]
    status: Literal["pending", "started", "in_progress", "completed", "failed", "cancelled"]
    progress: int = 0  # 0-100
    started_at: datetime
    completed_at: Optional[datetime] = None
    discovered_devices: List[dict] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    total_ips: Optional[int] = None
    processed_ips: int = 0

    class Config:
        from_attributes = True


class DiscoveryDevice(BaseModel):
    """Discovered device information."""
    ip_address: str
    hostname: Optional[str] = None
    device_type: Optional[str] = None
    os_version: Optional[str] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None
    status: Literal["online", "offline", "unknown"] = "unknown"
    discovery_method: Literal["snmp", "ssh", "ping"] = "ping"
    discovered_by_agent: int
    discovered_at: datetime
    snmp_info: Optional[dict] = None
    ssh_info: Optional[dict] = None

    class Config:
        from_attributes = True


class DiscoveryProgress(BaseModel):
    """Discovery progress update."""
    session_id: str
    agent_id: int
    progress: int
    processed_ips: int
    discovered_devices: List[DiscoveryDevice]
    errors: List[str]
    status: Literal["running", "completed", "failed"]

    class Config:
        from_attributes = True


class DiscoveryResult(BaseModel):
    """Final discovery result."""
    session_id: str
    network_id: int
    total_devices: int
    successful_discoveries: int
    failed_discoveries: int
    devices: List[DiscoveryDevice]
    errors: List[str]
    completion_time: datetime
    total_duration: float  # in seconds

    class Config:
        from_attributes = True


class DiscoveryConfig(BaseModel):
    """Discovery configuration settings."""
    max_concurrent_discoveries: int = 5
    timeout_per_device: int = 30
    retry_attempts: int = 3
    parallel_agents: bool = True
    load_balancing: bool = True
    auto_retry_failed: bool = True

    class Config:
        from_attributes = True


class DiscoveryFilter(BaseModel):
    """Discovery filtering options."""
    device_types: Optional[List[str]] = None
    os_versions: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    status: Optional[List[str]] = None
    exclude_ips: Optional[List[str]] = None
    include_ips: Optional[List[str]] = None

    class Config:
        from_attributes = True


class DiscoverySchedule(BaseModel):
    """Discovery scheduling configuration."""
    enabled: bool = False
    frequency: Literal["hourly", "daily", "weekly", "monthly"] = "daily"
    start_time: Optional[str] = None  # HH:MM format
    days_of_week: Optional[List[int]] = None  # 0-6 (Monday-Sunday)
    day_of_month: Optional[int] = None  # 1-31
    auto_start: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None

    class Config:
        from_attributes = True 