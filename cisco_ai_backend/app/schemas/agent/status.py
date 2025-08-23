"""
Status Schemas
Data validation and serialization for device status monitoring operations
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum


class DeviceStatus(str, Enum):
    """Device status enumeration"""
    ONLINE = "online"
    OFFLINE = "offline"
    UNKNOWN = "unknown"
    ERROR = "error"
    MAINTENANCE = "maintenance"


class HealthStatus(str, Enum):
    """Health status enumeration"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    CRITICAL = "critical"


class MonitoringType(str, Enum):
    """Monitoring type enumeration"""
    PING = "ping"
    SNMP = "snmp"
    SSH = "ssh"
    HTTP = "http"
    HTTPS = "https"
    CUSTOM = "custom"


class StatusRequest(BaseModel):
    """Schema for status check request"""
    device_ids: List[int] = Field(..., description="Device IDs to check status")
    network_id: int = Field(..., description="Network ID")
    monitoring_types: List[MonitoringType] = Field(default=[MonitoringType.PING], description="Types of monitoring to perform")
    timeout_seconds: int = Field(default=30, ge=5, le=300, description="Status check timeout")
    include_details: bool = Field(default=True, description="Include detailed status information")
    force_refresh: bool = Field(default=False, description="Force refresh ignoring cache")
    
    @validator('device_ids')
    def validate_device_ids(cls, v):
        if not v:
            raise ValueError('At least one device ID must be specified')
        if len(v) > 100:
            raise ValueError('Cannot check more than 100 devices at once')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "device_ids": [1, 2, 3],
                "network_id": 1,
                "monitoring_types": ["ping", "snmp"],
                "timeout_seconds": 30,
                "include_details": True,
                "force_refresh": False
            }
        }


class DeviceHealth(BaseModel):
    """Schema for device health information"""
    device_id: int = Field(..., description="Device ID")
    ip_address: str = Field(..., description="Device IP address")
    hostname: str = Field(..., description="Device hostname")
    status: DeviceStatus = Field(..., description="Device status")
    health_score: int = Field(..., ge=0, le=100, description="Health score (0-100)")
    health_status: HealthStatus = Field(..., description="Health status category")
    last_check: datetime = Field(..., description="Last status check time")
    response_time_ms: Optional[float] = Field(None, description="Response time in milliseconds")
    uptime_seconds: Optional[int] = Field(None, description="Device uptime in seconds")
    memory_usage_percent: Optional[float] = Field(None, description="Memory usage percentage")
    cpu_usage_percent: Optional[float] = Field(None, description="CPU usage percentage")
    disk_usage_percent: Optional[float] = Field(None, description="Disk usage percentage")
    temperature_celsius: Optional[float] = Field(None, description="Device temperature in Celsius")
    error_count: int = Field(default=0, description="Number of errors encountered")
    last_error: Optional[str] = Field(None, description="Last error message")
    monitoring_results: Dict[str, Any] = Field(default_factory=dict, description="Detailed monitoring results")
    
    @property
    def is_healthy(self) -> bool:
        """Check if device is healthy"""
        return self.health_score >= 70 and self.status == DeviceStatus.ONLINE
    
    @property
    def needs_attention(self) -> bool:
        """Check if device needs attention"""
        return self.health_score < 50 or self.status != DeviceStatus.ONLINE
    
    class Config:
        schema_extra = {
            "example": {
                "device_id": 1,
                "ip_address": "192.168.1.1",
                "hostname": "router1",
                "status": "online",
                "health_score": 85,
                "health_status": "good",
                "last_check": "2025-01-01T12:00:00Z",
                "response_time_ms": 15.5,
                "uptime_seconds": 86400,
                "memory_usage_percent": 45.2,
                "cpu_usage_percent": 25.8,
                "disk_usage_percent": 60.1,
                "temperature_celsius": 35.5,
                "error_count": 0,
                "last_error": None,
                "monitoring_results": {
                    "ping": {"status": "success", "latency": 15.5},
                    "snmp": {"status": "success", "sysdescr": "Cisco Router"}
                }
            }
        }


class NetworkStatus(BaseModel):
    """Schema for network status summary"""
    network_id: int = Field(..., description="Network ID")
    network_name: str = Field(..., description="Network name")
    total_devices: int = Field(..., description="Total number of devices")
    online_devices: int = Field(..., description="Number of online devices")
    offline_devices: int = Field(..., description="Number of offline devices")
    healthy_devices: int = Field(..., description="Number of healthy devices")
    devices_needing_attention: int = Field(..., description="Number of devices needing attention")
    average_health_score: float = Field(..., description="Average health score across all devices")
    last_updated: datetime = Field(..., description="Last status update time")
    device_health_list: List[DeviceHealth] = Field(..., description="List of device health information")
    
    @property
    def online_percentage(self) -> float:
        """Calculate percentage of online devices"""
        if self.total_devices == 0:
            return 0.0
        return (self.online_devices / self.total_devices) * 100
    
    @property
    def health_percentage(self) -> float:
        """Calculate percentage of healthy devices"""
        if self.total_devices == 0:
            return 0.0
        return (self.healthy_devices / self.total_devices) * 100
    
    class Config:
        schema_extra = {
            "example": {
                "network_id": 1,
                "network_name": "Corporate Network",
                "total_devices": 50,
                "online_devices": 48,
                "offline_devices": 2,
                "healthy_devices": 45,
                "devices_needing_attention": 3,
                "average_health_score": 82.5,
                "last_updated": "2025-01-01T12:00:00Z",
                "device_health_list": []
            }
        }


class StatusMonitoring(BaseModel):
    """Schema for status monitoring configuration"""
    device_id: int = Field(..., description="Device ID")
    monitoring_enabled: bool = Field(default=True, description="Whether monitoring is enabled")
    monitoring_interval_seconds: int = Field(default=300, ge=60, le=3600, description="Monitoring interval")
    monitoring_types: List[MonitoringType] = Field(default=[MonitoringType.PING], description="Monitoring types")
    alert_thresholds: Dict[str, Any] = Field(default_factory=dict, description="Alert thresholds")
    notification_enabled: bool = Field(default=True, description="Whether notifications are enabled")
    last_monitoring_config: Optional[datetime] = Field(None, description="Last monitoring configuration update")
    
    class Config:
        schema_extra = {
            "example": {
                "device_id": 1,
                "monitoring_enabled": True,
                "monitoring_interval_seconds": 300,
                "monitoring_types": ["ping", "snmp"],
                "alert_thresholds": {
                    "response_time_ms": 100,
                    "cpu_usage_percent": 80,
                    "memory_usage_percent": 85
                },
                "notification_enabled": True,
                "last_monitoring_config": "2025-01-01T12:00:00Z"
            }
        }


class HealthCheck(BaseModel):
    """Schema for health check result"""
    check_id: str = Field(..., description="Unique health check identifier")
    device_id: int = Field(..., description="Device ID")
    check_type: MonitoringType = Field(..., description="Type of health check")
    status: str = Field(..., description="Check status (success/failure)")
    start_time: datetime = Field(..., description="Check start time")
    end_time: datetime = Field(..., description="Check end time")
    duration_ms: float = Field(..., description="Check duration in milliseconds")
    result: Dict[str, Any] = Field(..., description="Check result details")
    error_message: Optional[str] = Field(None, description="Error message if check failed")
    
    @property
    def is_successful(self) -> bool:
        """Check if health check was successful"""
        return self.status == "success"
    
    @property
    def response_time_ms(self) -> float:
        """Get response time in milliseconds"""
        return self.duration_ms
    
    class Config:
        schema_extra = {
            "example": {
                "check_id": "health_check_12345",
                "device_id": 1,
                "check_type": "ping",
                "status": "success",
                "start_time": "2025-01-01T12:00:00Z",
                "end_time": "2025-01-01T12:00:01Z",
                "duration_ms": 15.5,
                "result": {
                    "latency": 15.5,
                    "packet_loss": 0.0,
                    "ttl": 64
                },
                "error_message": None
            }
        }


class StatusSummary(BaseModel):
    """Schema for status summary response"""
    success: bool = Field(..., description="Whether status check was successful")
    network_id: int = Field(..., description="Network ID")
    total_devices: int = Field(..., description="Total devices checked")
    successful_checks: int = Field(default=0, description="Number of successful checks")
    failed_checks: int = Field(default=0, description="Number of failed checks")
    online_devices: int = Field(default=0, description="Number of online devices")
    offline_devices: int = Field(default=0, description="Number of offline devices")
    average_response_time_ms: float = Field(default=0.0, description="Average response time")
    last_check_time: datetime = Field(..., description="Last status check time")
    next_scheduled_check: Optional[datetime] = Field(None, description="Next scheduled check time")
    device_statuses: List[DeviceHealth] = Field(default_factory=list, description="Individual device statuses")
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.total_devices == 0:
            return 0.0
        return (self.successful_checks / self.total_devices) * 100
    
    @property
    def online_percentage(self) -> float:
        """Calculate online percentage"""
        if self.total_devices == 0:
            return 0.0
        return (self.online_devices / self.total_devices) * 100
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "network_id": 1,
                "total_devices": 50,
                "successful_checks": 48,
                "failed_checks": 2,
                "online_devices": 48,
                "offline_devices": 2,
                "average_response_time_ms": 25.5,
                "last_check_time": "2025-01-01T12:00:00Z",
                "next_scheduled_check": "2025-01-01T12:05:00Z",
                "device_statuses": []
            }
        }


class StatusResponse(BaseModel):
    """Schema for status check response"""
    success: bool = Field(..., description="Whether status check was successful")
    message: str = Field(..., description="Response message")
    network_id: int = Field(..., description="Network ID")
    session_id: Optional[str] = Field(None, description="Status check session ID")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")
    progress_url: Optional[str] = Field(None, description="URL to check status progress")
    summary: Optional[StatusSummary] = Field(None, description="Status summary if available")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Status check started successfully",
                "network_id": 1,
                "session_id": "status_check_12345",
                "estimated_completion": "2025-01-01T12:01:00Z",
                "progress_url": "/api/v1/agents/status/status_check_12345/progress",
                "summary": None
            }
        } 