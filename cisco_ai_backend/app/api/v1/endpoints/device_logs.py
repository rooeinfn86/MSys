from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.permission_service import PermissionService
from app.models.base import User, DeviceLog, Network
from datetime import datetime

router = APIRouter(tags=["Device Logs"])

@router.get("/logs/{network_id}", name="get_device_logs")
async def get_device_logs(
    network_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get device logs for a specific network."""
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

        # Get device logs for the network
        logs = db.query(DeviceLog).filter(DeviceLog.network_id == network_id).order_by(DeviceLog.created_at.desc()).all()
        
        # Convert to response format
        log_list = []
        for log in logs:
            log_data = {
                "id": log.id,
                "ip_address": log.ip_address,
                "log_type": log.log_type.value if log.log_type else None,
                "message": log.message,
                "network_id": log.network_id,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "company_id": log.company_id
            }
            log_list.append(log_data)
        
        return log_list
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting device logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get device logs: {str(e)}")

@router.delete("/logs/{network_id}/clear", name="clear_device_logs")
async def clear_device_logs(
    network_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Clear all device logs for a specific network."""
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

        # Check if user has permission to manage logs
        if not permission_service.check_log_management_permission(user):
            raise HTTPException(status_code=403, detail="Not authorized to manage device logs")

        # Delete all logs for the network
        deleted_count = db.query(DeviceLog).filter(DeviceLog.network_id == network_id).delete()
        db.commit()
        
        return {
            "message": f"Successfully cleared {deleted_count} device logs",
            "deleted_count": deleted_count,
            "network_id": network_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error clearing device logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clear device logs: {str(e)}") 