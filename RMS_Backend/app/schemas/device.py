from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class DeviceBase(BaseModel):
    name: str = Field(..., description="Device name")
    ip: str = Field(..., description="Device IP address")
    type: Optional[str] = Field(None, description="Device type")
    platform: Optional[str] = Field(None, description="Device platform")
    location: Optional[str] = Field(None, description="Device location")
    username: Optional[str] = Field(None, description="SSH username")
    password: Optional[str] = Field(None, description="SSH password")

class DeviceCreate(DeviceBase):
    network_id: int = Field(..., description="Network ID")
    username: str = Field(..., description="SSH username")
    password: str = Field(..., description="SSH password")

class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Device name")
    ip: Optional[str] = Field(None, description="Device IP address")
    type: Optional[str] = Field(None, description="Device type")
    platform: Optional[str] = Field(None, description="Device platform")
    location: Optional[str] = Field(None, description="Device location")
    username: Optional[str] = Field(None, description="SSH username")
    password: Optional[str] = Field(None, description="SSH password")

class DeviceResponse(DeviceBase):
    id: int
    owner_id: Optional[int]
    network_id: int
    is_active: bool
    ping_status: Optional[bool]
    snmp_status: Optional[bool]
    discovery_method: Optional[str]
    os_version: Optional[str]
    serial_number: Optional[str]
    company_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DeviceStatus(BaseModel):
    id: int
    ip: str
    name: str
    status: str  # "green", "yellow", "red"
    ping_status: bool
    snmp_status: bool
    last_checked: Optional[datetime]

class DeviceListResponse(BaseModel):
    devices: List[DeviceResponse]
    total: int
    network_id: int 