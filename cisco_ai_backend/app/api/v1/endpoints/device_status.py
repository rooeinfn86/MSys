from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.status_service import DeviceStatusService
from app.services.permission_service import PermissionService
from app.schemas.status import DeviceStatus, StatusRefreshRequest, StatusRefreshResponse, DeviceStatusSummary
from app.models.base import User
from datetime import datetime

router = APIRouter(prefix="/status", tags=["Device Status"])

@router.get("/{device_id}", response_model=DeviceStatus)
async def get_device_status(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current status of a device."""
    try:
        # Get the full user object from the database
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check permissions
        permission_service = PermissionService(db)
        if not permission_service.check_device_modification_permission(user):
            raise HTTPException(status_code=403, detail="Not authorized to view device status")

        # Get device status using service
        status_service = DeviceStatusService(db)
        status_data = await status_service.check_device_status(device_id)
        
        # Convert to response format
        return DeviceStatus(
            device_id=device_id,
            status=status_data["status"],
            ping=status_data["ping"],
            snmp=status_data["snmp"],
            ip=status_data["ip"],
            name="",  # You might want to get this from the device
            last_checked=status_data.get("last_checked") or datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting device status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{device_id}/refresh", response_model=DeviceStatus)
async def refresh_device_status(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Force refresh the status of a device."""
    try:
        # Get the full user object from the database
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check permissions
        permission_service = PermissionService(db)
        if not permission_service.check_device_modification_permission(user):
            raise HTTPException(status_code=403, detail="Not authorized to refresh device status")

        # Refresh device status using service
        status_service = DeviceStatusService(db)
        status_data = await status_service.refresh_device_status(device_id)
        
        # Convert to response format
        return DeviceStatus(
            device_id=device_id,
            status=status_data["status"],
            ping=status_data["ping"],
            snmp=status_data["snmp"],
            ip=status_data["ip"],
            name="",  # You might want to get this from the device
            last_checked=status_data.get("last_checked") or datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error refreshing device status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refresh-all", response_model=StatusRefreshResponse)
async def refresh_all_device_status(
    network_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Refresh status for all devices in a network."""
    try:
        # Get the full user object from the database
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check permissions
        permission_service = PermissionService(db)
        if not permission_service.check_device_modification_permission(user):
            raise HTTPException(status_code=403, detail="Not authorized to refresh device status")

        # Check network access
        network = permission_service.check_network_access(user, network_id)
        if not network:
            raise HTTPException(status_code=403, detail="No access to this network")

        # Refresh all devices status using service
        status_service = DeviceStatusService(db)
        result = await status_service.refresh_all_devices_status(network_id)
        
        return StatusRefreshResponse(
            message=result["message"],
            updated=result["updated"],
            total=result["total"],
            status=result["status"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error refreshing all device status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary/{network_id}", response_model=DeviceStatusSummary)
async def get_device_status_summary(
    network_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a summary of device statuses in a network."""
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

        # Get status summary using service
        status_service = DeviceStatusService(db)
        summary = status_service.get_device_status_summary(network_id)
        
        return DeviceStatusSummary(
            total=summary["total"],
            green=summary["green"],
            yellow=summary["yellow"],
            red=summary["red"],
            unknown=summary["unknown"],
            network_id=network_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting device status summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/report")
async def report_device_status(
    network_id: int,
    device_statuses: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Report device status from agent (for local network devices)."""
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

        # Process status reports
        status_service = DeviceStatusService(db)
        updated_count = 0
        
        for status_data in device_statuses:
            try:
                device_ip = status_data.get("ip")
                ping_status = status_data.get("ping_status", False)
                snmp_status = status_data.get("snmp_status", False)
                
                if not device_ip:
                    continue
                
                # Find device by IP in the network
                from app.services.device_service import DeviceService
                device_service = DeviceService(db)
                device = device_service.get_device_by_ip(device_ip, network_id)
                
                if device:
                    # Update device status
                    device_service.update_device_status(device.id, ping_status, snmp_status)
                    updated_count += 1
                    print(f"[AGENT REPORT] {device_ip} -> ping={ping_status}, snmp={snmp_status}")
                
            except Exception as e:
                print(f"Error processing status report for {device_ip}: {str(e)}")
                continue
        
        return {
            "message": f"Updated status for {updated_count} devices from agent",
            "updated": updated_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing status report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 