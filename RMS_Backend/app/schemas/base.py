from pydantic import BaseModel, Field, constr
from typing import List, Optional, Literal
from datetime import datetime
from enum import Enum
from pydantic import validator

# ------------------- SNMP Schemas -------------------

class DeviceSNMPBase(BaseModel):
    snmp_version: str = 'v2c'
    community: Optional[str] = 'public'
    username: Optional[str] = None
    auth_protocol: Optional[str] = None
    auth_password: Optional[str] = None
    priv_protocol: Optional[str] = None
    priv_password: Optional[str] = None
    port: int = 161

class DeviceSNMPCreate(DeviceSNMPBase):
    device_id: int

class DeviceSNMP(DeviceSNMPBase):
    id: int
    device_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ------------------- Device Schemas -------------------

class DeviceBase(BaseModel):
    name: str
    ip: str
    location: str
    type: str
    username: str
    password: str
    is_active: Optional[bool] = True
    discovery_method: Optional[str] = 'manual'
    snmp_config: Optional[DeviceSNMPBase] = None

class DeviceCreate(DeviceBase):
    network_id: int

class NetworkSimple(BaseModel):
    id: int
    name: str
    organization_id: int

    class Config:
        from_attributes = True

class Device(BaseModel):
    id: int
    name: str
    ip: str
    location: str
    type: str
    platform: str = "cisco_ios"
    username: str
    password: str
    network_id: Optional[int] = None
    owner_id: int
    company_id: Optional[int] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    os_version: Optional[str] = None
    serial_number: Optional[str] = None
    ping_status: Optional[bool] = None
    snmp_status: Optional[bool] = None
    ssh_status: Optional[bool] = None
    last_status_check: Optional[datetime] = None
    discovery_method: Optional[str] = 'manual'

    class Config:
        from_attributes = True

# ------------------- Network Schemas -------------------

class NetworkBase(BaseModel):
    name: str

class NetworkCreate(NetworkBase):
    organization_id: int

class OrganizationSimple(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class Network(NetworkBase):
    id: int
    organization_id: int
    devices: List[Device] = Field(default_factory=list)
    organization: Optional[OrganizationSimple] = None

    class Config:
        from_attributes = True

# ------------------- Organization Schemas -------------------

class OrganizationBase(BaseModel):
    name: str

class OrganizationCreate(OrganizationBase):
    pass

class Organization(OrganizationBase):
    id: int
    devices: List[Device] = Field(default_factory=list)
    organization: Optional[OrganizationSimple] = None

    class Config:
        from_attributes = True

# ------------------- User Schemas -------------------

class UserBase(BaseModel):
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    position: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    address: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Literal["superadmin", "company_admin", "full_control", "engineer", "viewer"] = "engineer"
    company_id: Optional[int] = None
    engineer_tier: Optional[int] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserFeatureAccess(BaseModel):
    feature_name: str
    class Config:
        orm_mode = True

class User(UserBase):
    id: int
    role: Optional[str] = None
    engineer_tier: Optional[int] = None
    company_id: Optional[int] = None
    devices: List[Device] = Field(default_factory=list)
    organizations: List[Organization] = Field(default_factory=list)
    networks: List[Network] = Field(default_factory=list)
    feature_access_display: List[dict] = Field(default_factory=list)

    class Config:
        from_attributes = True

class UserPublic(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True

# ------------------- Company Schemas -------------------

class CompanyBase(BaseModel):
    name: str

class CompanyCreate(CompanyBase):
    username: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    position: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    address: Optional[str] = None
    config_assistant_enabled: Optional[bool] = False
    verification_enabled: Optional[bool] = False
    compliance_enabled: Optional[bool] = False

class Company(CompanyBase):
    id: int
    config_assistant_enabled: bool = False
    verification_enabled: bool = False
    compliance_enabled: bool = False
    users: List[User] = Field(default_factory=list)

    class Config:
        from_attributes = True

# ✅ Add a clean response model for feature access
class FeatureAccessResponse(BaseModel):
    company_id: int
    config_assistant_enabled: bool
    verification_enabled: bool
    compliance_enabled: bool

    class Config:
        from_attributes = True

# ------------------- Team Member Management -------------------

class TeamMemberCreate(BaseModel):
    username: str
    password: str
    role: Literal["full_control", "engineer", "viewer"]
    organization_ids: Optional[List[int]] = None
    network_ids: Optional[List[int]] = None
    feature_names: Optional[List[str]] = None
    engineer_tier: Optional[int] = None

class TeamMemberAccess(BaseModel):
    user_id: int
    organization_ids: List[int] = Field(default_factory=list)
    network_ids: List[int] = Field(default_factory=list)
    feature_names: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True

class DeviceLogBase(BaseModel):
    ip_address: str
    log_type: Literal["unknown_device", "invalid_credentials", "unreachable", "success"]
    message: str
    network_id: int

class DeviceLogCreate(DeviceLogBase):
    pass

class DeviceLog(DeviceLogBase):
    id: int
    created_at: datetime
    company_id: Optional[int] = None

    class Config:
        from_attributes = True


class UserFeatureAccessCreate(BaseModel):
    user_id: int
    feature_name: str

    class Config:
        from_attributes = True


# Agent schemas moved to app/schemas/agents/ package


class CompanyAPITokenBase(BaseModel):
    name: str

    class Config:
        from_attributes = True


class CompanyAPITokenCreate(CompanyAPITokenBase):
    pass


class CompanyAPITokenUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True


class CompanyAPITokenResponse(CompanyAPITokenBase):
    id: int
    company_id: int
    created_by: int
    created_at: datetime
    is_active: bool
    last_used: Optional[datetime] = None
    token: Optional[str] = None  # Only shown when creating

    class Config:
        from_attributes = True


class CompanyTokenValidation(BaseModel):
    token: str

    class Config:
        from_attributes = True

