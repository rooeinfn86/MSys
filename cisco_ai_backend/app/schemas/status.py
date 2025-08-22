from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class DeviceStatus(BaseModel):
    device_id: int
    status: str  # "green", "yellow", "red"
    ping: bool
    snmp: bool
    ip: str
    name: str
    last_checked: datetime

class StatusRefreshRequest(BaseModel):
    network_id: int
    device_ids: Optional[List[int]] = None  # If None, refresh all devices

class StatusRefreshResponse(BaseModel):
    message: str
    updated: int
    total: int
    status: str  # "requested", "in_progress", "completed", "failed"
    session_id: Optional[str] = None

class DeviceStatusSummary(BaseModel):
    total: int
    green: int
    yellow: int
    red: int
    unknown: int
    network_id: int

class StatusReport(BaseModel):
    network_id: int
    device_statuses: List[Dict[str, Any]]
    timestamp: datetime
    updated_count: int

class AgentStatusRequest(BaseModel):
    type: str = "status_test"
    session_id: str
    network_id: int
    devices: List[Dict[str, Any]]
    timestamp: datetime

class AgentStatusResponse(BaseModel):
    message: str
    status: str
    session_id: Optional[str] = None
    agent_id: Optional[str] = None
    ping: Optional[bool] = None
    snmp: Optional[bool] = None
    ip: Optional[str] = None
    last_checked: Optional[str] = None 