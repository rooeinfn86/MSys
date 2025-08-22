from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.device_service import DeviceService
from app.services.permission_service import PermissionService
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, DeviceListResponse
from app.models.base import User, Device, Agent, AgentNetworkAccess
from app.api.v1.endpoints.agents import pending_discovery_requests
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["Device CRUD"])

@router.get("/devices/", response_model=List[DeviceResponse])
async def get_devices(
    network_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all devices for a network."""
    try:
        # Get the full user object from the database
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check network access
        permission_service = PermissionService(db)
        network = permission_service.check_network_access(user, network_id)
        if not network:
            raise HTTPException(status_code=403, detail="No access to this network")

        # Get devices using service
        device_service = DeviceService(db)
        devices_data = device_service.get_devices_by_network(network_id)
        
        # Convert to response format
        device_list = []
        for device_data in devices_data:
            device_response = DeviceResponse(
                id=device_data["id"],
                name=device_data["name"],
                ip=device_data["ip"],
                location=device_data["location"],
                type=device_data["type"],
                platform=device_data["platform"],
                username=device_data["username"],
                password=device_data["password"],
                owner_id=device_data["owner_id"],
                network_id=device_data["network_id"],
                is_active=device_data["is_active"],
                created_at=device_data["created_at"],
                updated_at=device_data["updated_at"],
                os_version=device_data["os_version"],
                serial_number=device_data["serial_number"],
                company_id=device_data["company_id"],
                ping_status=device_data["ping_status"],
                snmp_status=device_data["snmp_status"],
                discovery_method=device_data["discovery_method"]
            )
            device_list.append(device_response)
        
        return device_list
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting devices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get devices: {str(e)}")

@router.post("/devices/", response_model=DeviceResponse)
def create_device(
    device: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new device if user has permission."""
    try:
        # Get the full user object from the database
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check permissions
        permission_service = PermissionService(db)
        if not permission_service.check_device_creation_permission(user):
            raise HTTPException(status_code=403, detail="Not authorized to create devices")

        # Check network access
        network = permission_service.check_network_access(user, device.network_id)
        if not network:
            raise HTTPException(status_code=403, detail="No access to this network")

        # Create device using service
        device_service = DeviceService(db)
        new_device = device_service.create_device(device, current_user["user_id"], current_user["company_id"])
        
        # Convert to response format
        return DeviceResponse(
            id=new_device.id,
            name=new_device.name,
            ip=new_device.ip,
            location=new_device.location,
            type=new_device.type,
            platform=new_device.platform,
            username=new_device.username,
            password=new_device.password,
            owner_id=new_device.owner_id,
            network_id=new_device.network_id,
            is_active=new_device.is_active,
            created_at=new_device.created_at,
            updated_at=new_device.updated_at,
            os_version=new_device.os_version,
            serial_number=new_device.serial_number,
            company_id=new_device.company_id,
            ping_status=new_device.ping_status,
            snmp_status=new_device.snmp_status,
            discovery_method=new_device.discovery_method
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating device: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/devices/{device_id}", response_model=DeviceResponse)
def update_device(
    device_id: int,
    updated_data: DeviceUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a device if user has permission."""
    try:
        # Get the full user object from the database
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check permissions
        permission_service = PermissionService(db)
        if not permission_service.check_device_modification_permission(user):
            raise HTTPException(status_code=403, detail="Not authorized to modify devices")

        # Get device and check access
        device_service = DeviceService(db)
        device = device_service.get_device_by_id(device_id)
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        # Check network access
        network = permission_service.check_network_access(user, device.network_id)
        if not network:
            raise HTTPException(status_code=403, detail="Not authorized to modify devices in this network")

        # Update device using service
        updated_device = device_service.update_device(device_id, updated_data)
        
        # Convert to response format
        return DeviceResponse(
            id=updated_device.id,
            name=updated_device.name,
            ip=updated_device.ip,
            location=updated_device.location,
            type=updated_device.type,
            platform=updated_device.platform,
            username=updated_device.username,
            password=updated_device.password,
            owner_id=updated_device.owner_id,
            network_id=updated_device.network_id,
            is_active=updated_device.is_active,
            created_at=updated_device.created_at,
            updated_at=updated_device.updated_at,
            os_version=updated_device.os_version,
            serial_number=updated_device.serial_number,
            company_id=updated_device.company_id,
            ping_status=updated_device.ping_status,
            snmp_status=updated_device.snmp_status,
            discovery_method=updated_device.discovery_method
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating device: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/devices/{device_id}")
async def delete_device(
    device_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a device"""
    try:
        device_service = DeviceService(db)
        await device_service.delete_device(device_id, current_user)
        return {"message": "Device deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/devices/{device_id}/refresh")
async def refresh_device(
    device_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refresh a single device using agent-based discovery"""
    try:
        print(f"🔄 Starting device refresh for device ID: {device_id}")
        print(f"🔍 Current user: {current_user}")
        
        # Get the device
        print(f"🔍 Querying device from database...")
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        print(f"✅ Device found: {device.name} ({device.ip})")
        
        # Check network access
        print(f"🔍 Checking network access for network ID: {device.network_id}")
        
        # Get the full user object from the database (same as other endpoints)
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        permission_service = PermissionService(db)
        network = permission_service.check_network_access(user, device.network_id)
        if not network:
            raise HTTPException(status_code=403, detail="No access to this network")
        
        print(f"✅ Network access verified: {network.name}")
        
        # Get available ONLINE agents for this network
        print(f"🔍 Querying for online agents in network: {device.network_id}")
        online_agents = db.query(Agent).join(AgentNetworkAccess).filter(
            AgentNetworkAccess.network_id == device.network_id,
            Agent.status == "online",
            Agent.token_status == "active"
        ).all()
        
        print(f"🔍 Found {len(online_agents)} online agents")
        
        if not online_agents:
            raise HTTPException(status_code=503, detail="No online agents available for this network")
        
        # Use the first available online agent
        agent = online_agents[0]
        agent_id = agent.id
        
        # Create a session ID for tracking this refresh
        session_id = f"device_refresh_{uuid.uuid4().hex[:8]}"
        
        # Prepare device data for agent (same structure as background monitoring)
        device_data = []
        
        # Check if device has SNMP configuration
        snmp_config = None
        if hasattr(device, 'snmp_config') and device.snmp_config:
            snmp_config = {
                'snmp_version': device.snmp_config.snmp_version,
                'community': device.snmp_config.community,
                'username': device.snmp_config.username,
                'auth_protocol': device.snmp_config.auth_protocol,
                'auth_password': device.snmp_config.auth_password,
                'priv_protocol': device.snmp_config.priv_protocol,
                'priv_password': device.snmp_config.priv_password,
                'port': device.snmp_config.port
            }
        
        device_info = {
            'id': device.id,
            'ip': device.ip,
            'name': device.name if hasattr(device, 'name') else "",
            'network_id': device.network_id,
            'company_id': device.company_id,
            'snmp_config': snmp_config
        }
        device_data.append(device_info)
        
        # Store refresh request for agent to pick up (same as auto-discovery)
        print(f"🔍 Creating full discovery refresh request for agent {agent_id}")
        refresh_request = {
            "type": "discovery",  # Same type as auto-discovery (not status_test)
            "session_id": session_id,
            "network_id": device.network_id,
            "devices": device_data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "device_refresh",  # Different source to distinguish from background
            "discovery_method": "refresh"  # Indicates this is a refresh operation
        }
        
        print(f"🔍 Storing full discovery request in pending_discovery_requests")
        pending_discovery_requests[agent_id] = refresh_request
        
        print(f"✅ Full device discovery refresh request successfully queued for agent {agent_id}")
        print(f"🔍 Agent will perform complete SNMP/SSH discovery and update both database tables")
        
        return {
            "message": "Device refresh started",
            "session_id": session_id,
            "agent_id": agent_id,
            "device_id": device_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in refresh_device: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start device refresh: {str(e)}")

@router.get("/devices/all", response_model=List[DeviceResponse])
def get_all_devices(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    network_id: Optional[int] = Query(None)
):
    """Get all devices including inactive ones (for admins and tier 3 engineers only)."""
    try:
        # Get the full user object from the database
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check permissions
        permission_service = PermissionService(db)
        if not permission_service.check_log_management_permission(user):
            raise HTTPException(status_code=403, detail="Only admins and tier 3 engineers can view inactive devices")

        # Get devices using service
        device_service = DeviceService(db)
        company_id = current_user.get("company_id") if current_user["role"] == "company_admin" else None
        devices = device_service.get_all_devices(company_id=company_id, network_id=network_id)
        
        # Convert to response format
        device_list = []
        for device in devices:
            device_response = DeviceResponse(
                id=device.id,
                name=device.name,
                ip=device.ip,
                location=device.location,
                type=device.type,
                platform=device.platform,
                username=device.username,
                password=device.password,
                owner_id=device.owner_id,
                network_id=device.network_id,
                is_active=device.is_active,
                created_at=device.created_at,
                updated_at=device.updated_at,
                os_version=device.os_version,
                serial_number=device.serial_number,
                company_id=device.company_id,
                ping_status=device.ping_status,
                snmp_status=device.snmp_status,
                discovery_method=device.discovery_method
            )
            device_list.append(device_response)
        
        return device_list
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting all devices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get all devices: {str(e)}")

@router.put("/devices/{device_id}/toggle-service", response_model=DeviceResponse)
def toggle_device_service(
    device_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Toggle device service status."""
    try:
        # Get the full user object from the database
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check permissions
        permission_service = PermissionService(db)
        if not permission_service.check_device_modification_permission(user):
            raise HTTPException(status_code=403, detail="Not authorized to toggle device service")

        # Get device and check access
        device_service = DeviceService(db)
        device = device_service.get_device_by_id(device_id)
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")

        # Check network access
        network = permission_service.check_network_access(user, device.network_id)
        if not network:
            raise HTTPException(status_code=403, detail="Not authorized to modify devices in this network")

        # Toggle device service using service
        is_active = data.get('is_active', not device.is_active)
        updated_device = device_service.toggle_device_service(device_id, is_active)
        
        # Convert to response format
        return DeviceResponse(
            id=updated_device.id,
            name=updated_device.name,
            ip=updated_device.ip,
            location=updated_device.location,
            type=updated_device.type,
            platform=updated_device.platform,
            username=updated_device.username,
            password=updated_device.password,
            owner_id=updated_device.owner_id,
            network_id=updated_device.network_id,
            is_active=updated_device.is_active,
            created_at=updated_device.created_at,
            updated_at=updated_device.updated_at,
            os_version=updated_device.os_version,
            serial_number=updated_device.serial_number,
            company_id=updated_device.company_id,
            ping_status=updated_device.ping_status,
            snmp_status=updated_device.snmp_status,
            discovery_method=updated_device.discovery_method
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error toggling device service: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e)) 