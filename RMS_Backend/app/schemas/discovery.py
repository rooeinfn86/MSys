from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class DiscoveryRequest(BaseModel):
    network_id: int = Field(..., description="The ID of the network to discover devices in")
    ip_range: Optional[str] = Field(None, description="CIDR notation (e.g. '192.168.1.0/24') or start_ip-end_ip format")
    start_ip: Optional[str] = Field(None, description="Start IP address for range")
    end_ip: Optional[str] = Field(None, description="End IP address for range")
    username: str = Field(..., description="Username for device authentication")
    password: str = Field(..., description="Password for device authentication")
    device_type: str = Field("cisco_ios", description="Type of device (default: cisco_ios)")
    location: str = Field("", description="Location of the devices")
    snmp_version: Optional[str] = Field(None, description="SNMP version")
    community: Optional[str] = Field(None, description="SNMP community string")
    snmp_username: Optional[str] = Field(None, description="SNMP username")
    auth_protocol: Optional[str] = Field(None, description="SNMP authentication protocol")
    auth_password: Optional[str] = Field(None, description="SNMP authentication password")
    priv_protocol: Optional[str] = Field(None, description="SNMP privacy protocol")
    priv_password: Optional[str] = Field(None, description="SNMP privacy password")
    snmp_port: int = Field(161, description="SNMP port")

    class Config:
        json_schema_extra = {
            "example": {
                "network_id": 1,
                "username": "admin",
                "password": "password123",
                "ip_range": "192.168.1.0/24"
            }
        }

class DiscoveryStatus(BaseModel):
    total_ips: int
    scanned_ips: int
    discovered_devices: int
    status: str  # "in_progress", "completed", "failed"
    error: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class DiscoveryResponse(BaseModel):
    message: str
    scan_id: str
    network_id: int
    status: str

class DiscoveryResult(BaseModel):
    ip: str
    status: str  # "success", "failed"
    hostname: Optional[str] = None
    model: Optional[str] = None
    platform: Optional[str] = None
    message: Optional[str] = None
    ping_status: Optional[bool] = None
    snmp_status: Optional[bool] = None

class DiscoverySummary(BaseModel):
    network_id: int
    total_ips: int
    successful_discoveries: int
    failed_discoveries: int
    start_time: datetime
    end_time: Optional[datetime] = None
    results: List[DiscoveryResult] 