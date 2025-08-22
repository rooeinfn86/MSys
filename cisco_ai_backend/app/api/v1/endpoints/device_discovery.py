from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.discovery_service import DiscoveryService
from app.services.permission_service import PermissionService
from app.schemas.discovery import DiscoveryRequest, DiscoveryResponse
from app.models.base import User
import asyncio

router = APIRouter(tags=["Device Discovery"])

@router.post("/discovery/start", response_model=DiscoveryResponse)
async def start_discovery(
    request: Request,
    discovery_data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start device discovery for a network"""
    try:
        print(f"Raw discovery request data: {discovery_data}")

        # Get the full user object from the database
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check network access
        permission_service = PermissionService(db)
        network = permission_service.check_network_access(user, discovery_data['network_id'])
        if not network:
            raise HTTPException(status_code=403, detail="No access to this network")

        # Check if user has permission to discover devices
        if not permission_service.check_discovery_permission(user):
            raise HTTPException(
                status_code=403,
                detail="Only Tier 2 and above engineers can perform device discovery"
            )

        # Get and validate IP range
        ip_range = None
        if discovery_data.get('ip_range'):
            # Check if the ip_range is in the format "start_ip-end_ip"
            if '-' in discovery_data['ip_range']:
                try:
                    start_ip_str, end_ip_str = discovery_data['ip_range'].split('-')
                    start_ip = start_ip_str.strip()
                    end_ip = end_ip_str.strip()
                    # For a range, we'll handle it directly in the discovery service
                    ip_range = f"{start_ip}-{end_ip}"
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=f"Invalid IP range format: {str(e)}")
            else:
                ip_range = discovery_data['ip_range']
        elif discovery_data.get('start_ip') and discovery_data.get('end_ip'):
            try:
                start_ip = discovery_data['start_ip']
                end_ip = discovery_data['end_ip']
                ip_range = f"{start_ip}-{end_ip}"
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid IP range: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="IP range must be provided either in CIDR notation, start_ip-end_ip format, or as separate start_ip and end_ip fields")

        print(f"Using IP range: {ip_range}")

        # Create SNMP configuration
        snmp_config = {
            'snmp_version': discovery_data.get('snmp_version', 'v2c'),
            'community': discovery_data.get('community', 'public'),
            'username': discovery_data.get('snmp_username'),
            'auth_protocol': discovery_data.get('auth_protocol'),
            'auth_password': discovery_data.get('auth_password'),
            'priv_protocol': discovery_data.get('priv_protocol'),
            'priv_password': discovery_data.get('priv_password'),
            'port': int(discovery_data.get('snmp_port', 161))
        }

        # Create credentials dictionary
        credentials = {
            'username': discovery_data['username'],
            'password': discovery_data['password']
        }

        # Start discovery process using service
        discovery_service = DiscoveryService(db)
        
        # Start discovery asynchronously
        asyncio.create_task(discovery_service.start_discovery(
            discovery_data['network_id'],
            ip_range,
            credentials,
            snmp_config
        ))

        return {
            "message": "Discovery started",
            "scan_id": str(discovery_data['network_id']),
            "network_id": discovery_data['network_id'],
            "status": "started"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Discovery error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start discovery: {str(e)}")

@router.post("/discovery/discover", response_model=Dict[str, str])
async def discover_device(
    request: Request,
    discovery_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Legacy discovery endpoint for backward compatibility"""
    try:
        print(f"Raw discovery request data: {discovery_data}")
        
        # Extract SNMP configuration
        snmp_config = {
            'snmp_version': discovery_data.get('snmp_version', 'v2c'),
            'community': discovery_data.get('community', 'public'),
            'username': discovery_data.get('snmp_username'),
            'auth_protocol': discovery_data.get('auth_protocol'),
            'auth_password': discovery_data.get('auth_password'),
            'priv_protocol': discovery_data.get('priv_protocol'),
            'priv_password': discovery_data.get('priv_password'),
            'port': int(discovery_data.get('snmp_port', 161))
        }
        
        # Extract network and IP range information
        network_id = discovery_data.get('network_id')
        if not network_id:
            raise HTTPException(status_code=400, detail="Network ID is required")
            
        # Get network and verify access
        permission_service = PermissionService(db)
        network = permission_service.check_network_access(current_user, network_id)
        if not network:
            raise HTTPException(status_code=403, detail="Access denied to this network")
            
        company_id = network.company_id
        
        # Parse IP range using discovery service
        discovery_service = DiscoveryService(db)
        try:
            ip_list = discovery_service.parse_ip_range(
                discovery_data.get('ip_range'),
                discovery_data.get('start_ip'),
                discovery_data.get('end_ip')
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
            
        print(f"Using IP range: {ip_list[0]}-{ip_list[-1]}")
        print(f"Using company_id {company_id} from owner's record")
        print(f"Scanning IP range: {ip_list[0]} to {ip_list[-1]}, total IPs: {len(ip_list)}")
        
        # Create credentials dictionary
        credentials = {
            'username': discovery_data.get('username'),
            'password': discovery_data.get('password')
        }
        
        # Start discovery process
        asyncio.create_task(discovery_service.start_discovery(
            network_id,
            discovery_data.get('ip_range') or f"{ip_list[0]}-{ip_list[-1]}",
            credentials,
            snmp_config
        ))
        
        return {"status": "success", "message": "Discovery started"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in discover_device: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/discovery/status/{network_id}")
async def get_discovery_status(
    network_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the status of device discovery for a network"""
    try:
        print(f"Checking discovery status for network: {network_id}")
        
        # Handle invalid network_id
        if network_id == "undefined" or not network_id.isdigit():
            print(f"Invalid network_id: {network_id}")
            return {
                "total_ips": 0,
                "scanned_ips": 0,
                "discovered_devices": 0,
                "status": "not_started",
                "error": None
            }

        network_id_int = int(network_id)
        
        # Get the full user object
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check network access
        permission_service = PermissionService(db)
        network = permission_service.check_network_access(user, network_id_int)
        if not network:
            raise HTTPException(status_code=403, detail="No access to this network")

        # For now, return a simple status
        # In a full implementation, you would track discovery status in the database
        return {
            "total_ips": 0,
            "scanned_ips": 0,
            "discovered_devices": 0,
            "status": "not_started",
            "error": None
        }
        
    except ValueError:
        return {
            "total_ips": 0,
            "scanned_ips": 0,
            "discovered_devices": 0,
            "status": "not_started",
            "error": None
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get discovery status: {str(e)}") 