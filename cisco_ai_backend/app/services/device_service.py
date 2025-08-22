from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.base import Device, DeviceLog, LogType, DeviceSNMP as DeviceSNMPModel
from app.schemas.base import DeviceCreate, Device as DeviceSchema
from datetime import datetime
import json

class DeviceService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_devices_by_network(self, network_id: int) -> List[Dict[str, Any]]:
        """Get all devices for a network with their status."""
        devices = self.db.query(Device).filter(Device.network_id == network_id).all()
        device_list = []
        
        for device in devices:
            # Get the stored status from the database
            ping_status = device.ping_status if device.ping_status is not None else False
            snmp_status = device.snmp_status if device.snmp_status is not None else True
            
            device_dict = {
                "id": device.id,
                "name": device.name,
                "ip": device.ip,
                "location": device.location,
                "type": device.type,
                "platform": device.platform,
                "username": device.username,
                "password": device.password,
                "owner_id": device.owner_id,
                "network_id": device.network_id,
                "is_active": device.is_active,
                "created_at": device.created_at,
                "updated_at": device.updated_at,
                "os_version": device.os_version,
                "serial_number": device.serial_number,
                "company_id": device.company_id,
                "ping_status": ping_status,
                "snmp_status": snmp_status,
                "discovery_method": device.discovery_method
            }
            device_list.append(device_dict)
        
        return device_list
    
    def create_device(self, device_data: DeviceCreate, user_id: int, company_id: int) -> Device:
        """Create a new device."""
        device_dict = device_data.dict()
        device_dict["is_active"] = True
        device_dict["discovery_method"] = "manual"
        
        new_device = Device(**device_dict, owner_id=user_id, company_id=company_id)
        
        try:
            self.db.add(new_device)
            self.db.commit()
            self.db.refresh(new_device)
            return new_device
        except Exception as e:
            self.db.rollback()
            raise e
    
    def update_device(self, device_id: int, updated_data: DeviceCreate) -> Device:
        """Update an existing device."""
        device = self.db.query(Device).filter(Device.id == device_id).first()
        if not device:
            raise ValueError("Device not found")
        
        # Preserve discovery_method if it's 'auto'
        discovery_method = device.discovery_method
        for key, value in updated_data.dict().items():
            if key != 'discovery_method':
                setattr(device, key, value)
        
        if discovery_method == 'auto':
            device.discovery_method = 'auto'
        
        try:
            self.db.commit()
            self.db.refresh(device)
            return device
        except Exception as e:
            self.db.rollback()
            raise e
    
    def delete_device(self, device_id: int) -> bool:
        """Delete a device and all related records."""
        device = self.db.query(Device).filter(Device.id == device_id).first()
        if not device:
            raise ValueError("Device not found")
        
        try:
            # Delete all related records first
            self.db.execute(text("DELETE FROM device_interfaces WHERE device_id = :device_id"), {"device_id": device_id})
            self.db.execute(text("DELETE FROM device_status WHERE device_id = :device_id"), {"device_id": device_id})
            self.db.query(DeviceLog).filter(DeviceLog.ip_address == device.ip).delete()
            
            # Delete the device
            self.db.delete(device)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_device_by_id(self, device_id: int) -> Optional[Device]:
        """Get a device by ID."""
        return self.db.query(Device).filter(Device.id == device_id).first()
    
    def get_device_by_ip(self, ip: str, network_id: int) -> Optional[Device]:
        """Get a device by IP address and network ID."""
        return self.db.query(Device).filter(
            Device.ip == ip,
            Device.network_id == network_id
        ).first()
    
    def update_device_status(self, device_id: int, ping_status: bool, snmp_status: bool) -> Device:
        """Update device ping and SNMP status."""
        device = self.get_device_by_id(device_id)
        if not device:
            raise ValueError("Device not found")
        
        device.ping_status = ping_status
        device.snmp_status = snmp_status
        device.updated_at = datetime.utcnow()
        
        try:
            self.db.add(device)
            self.db.commit()
            self.db.refresh(device)
            return device
        except Exception as e:
            self.db.rollback()
            raise e
    
    def toggle_device_service(self, device_id: int, is_active: bool) -> Device:
        """Toggle device service status."""
        device = self.get_device_by_id(device_id)
        if not device:
            raise ValueError("Device not found")
        
        device.is_active = is_active
        
        try:
            self.db.commit()
            self.db.refresh(device)
            return device
        except Exception as e:
            self.db.rollback()
            raise e
    
    def get_all_devices(self, company_id: Optional[int] = None, network_id: Optional[int] = None) -> List[Device]:
        """Get all devices with optional filtering."""
        query = self.db.query(Device)
        
        if company_id:
            query = query.filter(Device.company_id == company_id)
        
        if network_id:
            query = query.filter(Device.network_id == network_id)
        
        return query.all() 