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
import asyncio
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
        # Get the device first to check permissions
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Get the full user object from the database
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check network access
        permission_service = PermissionService(db)
        network = permission_service.check_network_access(user, device.network_id)
        if not network:
            raise HTTPException(status_code=403, detail="No access to this network")
        
        # Now delete the device
        device_service = DeviceService(db)
        device_service.delete_device(device_id, current_user)
        
        return {"message": "Device deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete device: {str(e)}")

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
        print(f"🔍 Device fields - username: '{device.username}', password: '{'*' * len(device.password) if device.password else 'None'}'")
        print(f"🔍 Device fields - owner_id: {device.owner_id}, company_id: {device.company_id}")
        
        # Check if we need to get credentials from the owner
        if not device.username or not device.password:
            print(f"🔍 Device has no credentials, checking owner credentials...")
            
            # Try to get owner credentials
            owner = db.query(User).filter(User.id == device.owner_id).first()
            if owner:
                print(f"🔍 Owner found: {owner.username}")
                # Use owner's credentials if device doesn't have them
                device.username = device.username or owner.username
                # Don't hardcode passwords - only use what's available
                print(f"🔍 Updated device credentials - username: '{device.username}', password: '{'*' * len(device.password) if device.password else 'None'}'")
            else:
                print(f"⚠️  No owner found for device {device.id} with owner_id {device.owner_id}")
                
                # Try to get credentials from the current user who is making the request
                current_user_obj = db.query(User).filter(User.id == current_user["user_id"]).first()
                if current_user_obj:
                    print(f"🔍 Using current user credentials: {current_user_obj.username}")
                    device.username = device.username or current_user_obj.username
                    # Note: We still don't have a password, but at least we have a username
                
            # Also check if SNMP config has credentials
            if hasattr(device, 'snmp_config') and device.snmp_config:
                if device.snmp_config.username and not device.username:
                    device.username = device.snmp_config.username
                    print(f"🔍 Using SNMP username: {device.username}")
                if device.snmp_config.auth_password and not device.password:
                    device.password = device.snmp_config.auth_password
                    print(f"🔍 Using SNMP auth password: {'*' * len(device.password)}")
                    
            # Check if we can get credentials from other devices in the same network
            if not device.password:
                print(f"🔍 Checking for credentials from other devices in network {device.network_id}")
                other_device = db.query(Device).filter(
                    Device.network_id == device.network_id,
                    Device.id != device.id,
                    Device.password.isnot(None),
                    Device.password != ''
                ).first()
                
                if other_device:
                    print(f"🔍 Found other device with credentials: {other_device.name}")
                    device.password = other_device.password
                    print(f"🔍 Using password from other device: {'*' * len(device.password)}")
                    
            # Check if we can get credentials from device topology or discovery session
            if not device.password:
                print(f"🔍 Checking device topology for stored credentials...")
                try:
                    from app.models.topology import DeviceTopology
                    topology = db.query(DeviceTopology).filter(
                        DeviceTopology.device_id == device.id
                    ).first()
                    
                    if topology and hasattr(topology, 'ssh_credentials'):
                        print(f"🔍 Found SSH credentials in topology")
                        if topology.ssh_credentials.get('username') and not device.username:
                            device.username = topology.ssh_credentials['username']
                        if topology.ssh_credentials.get('password') and not device.password:
                            device.password = topology.ssh_credentials['password']
                            print(f"🔍 Using topology SSH password: {'*' * len(device.password)}")
                except Exception as e:
                    print(f"🔍 Could not check topology: {e}")
                    
            # Check if we can get credentials from the discovery session
            if not device.password:
                print(f"🔍 Checking for recent discovery sessions...")
                try:
                    from app.models.base import DiscoverySession
                    recent_session = db.query(DiscoverySession).filter(
                        DiscoverySession.network_id == device.network_id,
                        DiscoverySession.status == "completed"
                    ).order_by(DiscoverySession.created_at.desc()).first()
                    
                    if recent_session and hasattr(recent_session, 'credentials'):
                        print(f"🔍 Found recent discovery session with credentials")
                        if recent_session.credentials.get('username') and not device.username:
                            device.username = recent_session.credentials['username']
                        if recent_session.credentials.get('password') and not device.password:
                            device.password = recent_session.credentials['password']
                            print(f"🔍 Using discovery session password: {'*' * len(device.password)}")
                except Exception as e:
                    print(f"🔍 Could not check discovery sessions: {e}")
        else:
            print(f"✅ Device has credentials - username: '{device.username}', password: {'*' * len(device.password) if device.password else 'None'}")
        
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
        
        # Use the agent discovery endpoint for full device discovery
        print(f"🔍 Using agent discovery endpoint for full device discovery refresh")
        
        # Import the required schemas
        from app.schemas.base import AgentDiscoveryRequest, DiscoveryMethod
        
        # Create discovery method configuration
        discovery_method = DiscoveryMethod(
            method="auto",  # Full SNMP + SSH discovery
            snmp_community=device.snmp_config.community if hasattr(device, 'snmp_config') and device.snmp_config else "public",
            snmp_version=device.snmp_config.snmp_version if hasattr(device, 'snmp_config') and device.snmp_config else "v2c",
            snmp_port=device.snmp_config.port if hasattr(device, 'snmp_config') and device.snmp_config else 161
        )
        
        # Create agent discovery request
        discovery_request = AgentDiscoveryRequest(
            network_id=device.network_id,
            agent_ids=[agent_id],  # Use the specific agent
            ip_range=device.ip,  # Single IP for refresh
            discovery_method=discovery_method,
            credentials={
                'username': device.username or '',  # Use device username or empty
                'password': device.password or ''   # Use device password or empty
            },
            location=device.location or "",
            device_type="auto"
        )
        
        print(f"🔍 Device credentials - username: '{device.username}', password: '{'*' * len(device.password) if device.password else 'None'}'")
        print(f"🔍 Using credentials - username: '{discovery_request.credentials['username']}', password: '{'*' * len(discovery_request.credentials['password']) if discovery_request.credentials['password'] else 'None'}'")
        
        # Validate that we have credentials before proceeding
        if not discovery_request.credentials['username'] or not discovery_request.credentials['password']:
            print(f"❌ No valid credentials found for device {device.id}")
            print(f"🔍 Tried: device credentials, owner credentials, current user, SNMP config, other devices, topology, discovery sessions")
            print(f"🔍 Device owner_id: {device.owner_id}")
            print(f"🔍 Current user_id: {current_user['user_id']}")
            
            # Check if we can get credentials from the agent's configuration
            if not discovery_request.credentials['password']:
                print(f"🔍 Checking agent configuration for stored credentials...")
                try:
                    agent_config = db.query(Agent).filter(Agent.id == agent_id).first()
                    if agent_config and hasattr(agent_config, 'stored_credentials'):
                        print(f"🔍 Found agent stored credentials")
                        if agent_config.stored_credentials.get('username') and not discovery_request.credentials['username']:
                            discovery_request.credentials['username'] = agent_config.stored_credentials['username']
                        if agent_config.stored_credentials.get('password') and not discovery_request.credentials['password']:
                            discovery_request.credentials['password'] = agent_config.stored_credentials['password']
                            print(f"🔍 Using agent stored credentials: username='{discovery_request.credentials['username']}', password='{'*' * len(discovery_request.credentials['password'])}'")
                except Exception as e:
                    print(f"🔍 Could not check agent configuration: {e}")
            
            # Final validation
            if not discovery_request.credentials['username'] or not discovery_request.credentials['password']:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Device refresh requires valid SSH credentials. Device {device.name} ({device.ip}) has no stored credentials. Please run auto-discovery again with proper SSH credentials to populate this device."
                )
        
        # Call the agent discovery endpoint
        from app.api.v1.endpoints.agents import start_agent_discovery
        
        print(f"🔍 Starting agent discovery for device {device.ip}")
        discovery_result = await start_agent_discovery(
            agent_id=agent_id,
            discovery_data=discovery_request,
            current_user=current_user,
            db=db
        )
        
        print(f"✅ Full device discovery refresh started via agent {agent_id}")
        print(f"🔍 Agent will perform complete SNMP/SSH discovery and update both database tables")
        
        return {
            "message": "Full device discovery refresh started via agent",
            "session_id": discovery_result.get("session_id", session_id),
            "agent_id": agent_id,
            "device_id": device_id,
            "discovery_method": "AgentDiscovery"
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