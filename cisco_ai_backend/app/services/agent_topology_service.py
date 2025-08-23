"""
Agent Topology Service - Network topology discovery and management
Extracted from agents.py to improve code organization and maintainability
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.base import Network, Device, DeviceTopology, Agent, AgentNetworkAccess

logger = logging.getLogger(__name__)


class AgentTopologyService:
    """Service for managing agent topology operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_network_topology(self, network_id: int) -> Dict[str, Any]:
        """Get complete network topology for a specific network."""
        try:
            # Get all devices in the network
            devices = self.db.query(Device).filter(Device.network_id == network_id).all()
            
            # Get topology information for each device
            topology_data = []
            for device in devices:
                topology_record = self.db.query(DeviceTopology).filter(
                    DeviceTopology.device_id == device.id
                ).first()
                
                device_info = {
                    "id": device.id,
                    "name": device.name,
                    "ip": device.ip,
                    "type": device.type,
                    "platform": device.platform,
                    "status": "online" if device.ping_status else "offline",
                    "topology": topology_record.health_data if topology_record else {}
                }
                
                if topology_record:
                    device_info.update({
                        "hostname": topology_record.hostname,
                        "vendor": topology_record.vendor,
                        "model": topology_record.model,
                        "uptime": topology_record.uptime,
                        "last_polled": topology_record.last_polled.isoformat() if topology_record.last_polled else None
                    })
                
                topology_data.append(device_info)
            
            return {
                "network_id": network_id,
                "total_devices": len(devices),
                "online_devices": len([d for d in devices if d.ping_status]),
                "offline_devices": len([d for d in devices if not d.ping_status]),
                "devices": topology_data
            }
            
        except Exception as e:
            logger.error(f"Error getting network topology for network {network_id}: {e}")
            raise e
    
    def update_device_topology(self, device_id: int, topology_data: Dict[str, Any]) -> bool:
        """Update topology information for a specific device."""
        try:
            # Get existing topology record
            topology_record = self.db.query(DeviceTopology).filter(
                DeviceTopology.device_id == device_id
            ).first()
            
            if topology_record:
                # Update existing record
                topology_record.hostname = topology_data.get("hostname", topology_record.hostname)
                topology_record.vendor = topology_data.get("vendor", topology_record.vendor)
                topology_record.model = topology_data.get("model", topology_record.model)
                topology_record.uptime = topology_data.get("uptime", topology_record.uptime)
                topology_record.last_polled = datetime.now(timezone.utc)
                
                # Update health data
                if "health_data" in topology_data:
                    topology_record.health_data.update(topology_data["health_data"])
                
                logger.info(f"Updated topology for device {device_id}")
            else:
                # Create new topology record
                device = self.db.query(Device).filter(Device.id == device_id).first()
                if not device:
                    logger.error(f"Device {device_id} not found")
                    return False
                
                new_topology = DeviceTopology(
                    device_id=device_id,
                    network_id=device.network_id,
                    hostname=topology_data.get("hostname", ""),
                    vendor=topology_data.get("vendor", "Unknown"),
                    model=topology_data.get("model", "Unknown"),
                    uptime=topology_data.get("uptime", 0),
                    last_polled=datetime.now(timezone.utc),
                    health_data=topology_data.get("health_data", {})
                )
                
                self.db.add(new_topology)
                logger.info(f"Created new topology record for device {device_id}")
            
            self.db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error updating topology for device {device_id}: {e}")
            self.db.rollback()
            return False
    
    def get_device_relationships(self, device_id: int) -> Dict[str, Any]:
        """Get device relationships and connections."""
        try:
            device = self.db.query(Device).filter(Device.id == device_id).first()
            if not device:
                return {"error": "Device not found"}
            
            # Get devices in the same network
            network_devices = self.db.query(Device).filter(
                Device.network_id == device.network_id,
                Device.id != device_id
            ).all()
            
            # Get topology information for the main device
            main_topology = self.db.query(DeviceTopology).filter(
                DeviceTopology.device_id == device_id
            ).first()
            
            relationships = {
                "device_id": device_id,
                "device_name": device.name,
                "device_ip": device.ip,
                "network_id": device.network_id,
                "topology": main_topology.health_data if main_topology else {},
                "related_devices": []
            }
            
            # Add related devices
            for related_device in network_devices:
                related_topology = self.db.query(DeviceTopology).filter(
                    DeviceTopology.device_id == related_device.id
                ).first()
                
                related_info = {
                    "id": related_device.id,
                    "name": related_device.name,
                    "ip": related_device.ip,
                    "type": related_device.type,
                    "status": "online" if related_device.ping_status else "offline",
                    "topology": related_topology.health_data if related_topology else {}
                }
                
                relationships["related_devices"].append(related_info)
            
            return relationships
            
        except Exception as e:
            logger.error(f"Error getting device relationships for device {device_id}: {e}")
            return {"error": str(e)}
    
    def cleanup_orphaned_topology_records(self) -> int:
        """Clean up topology records for devices that no longer exist."""
        try:
            # Find orphaned topology records
            orphaned_records = self.db.query(DeviceTopology).outerjoin(
                Device, DeviceTopology.device_id == Device.id
            ).filter(Device.id.is_(None)).all()
            
            count = len(orphaned_records)
            
            for record in orphaned_records:
                self.db.delete(record)
            
            if count > 0:
                self.db.commit()
                logger.info(f"Cleaned up {count} orphaned topology records")
            
            return count
            
        except Exception as e:
            logger.error(f"Error cleaning up orphaned topology records: {e}")
            self.db.rollback()
            return 0
    
    def get_topology_statistics(self, network_id: Optional[int] = None) -> Dict[str, Any]:
        """Get topology statistics for networks."""
        try:
            if network_id:
                # Single network statistics
                devices = self.db.query(Device).filter(Device.network_id == network_id).all()
                topology_records = self.db.query(DeviceTopology).join(Device).filter(
                    Device.network_id == network_id
                ).all()
                
                stats = {
                    "network_id": network_id,
                    "total_devices": len(devices),
                    "devices_with_topology": len(topology_records),
                    "online_devices": len([d for d in devices if d.ping_status]),
                    "offline_devices": len([d for d in devices if not d.ping_status]),
                    "vendor_distribution": {},
                    "device_type_distribution": {}
                }
                
                # Count vendors and device types
                for device in devices:
                    vendor = device.platform or "Unknown"
                    device_type = device.type or "Unknown"
                    
                    stats["vendor_distribution"][vendor] = stats["vendor_distribution"].get(vendor, 0) + 1
                    stats["device_type_distribution"][device_type] = stats["device_type_distribution"].get(device_type, 0) + 1
                
                return stats
            else:
                # All networks statistics
                networks = self.db.query(Network).all()
                total_stats = {
                    "total_networks": len(networks),
                    "total_devices": 0,
                    "total_topology_records": 0,
                    "online_devices": 0,
                    "offline_devices": 0
                }
                
                for network in networks:
                    network_stats = self.get_topology_statistics(network.id)
                    total_stats["total_devices"] += network_stats["total_devices"]
                    total_stats["total_topology_records"] += network_stats["devices_with_topology"]
                    total_stats["online_devices"] += network_stats["online_devices"]
                    total_stats["offline_devices"] += network_stats["offline_devices"]
                
                return total_stats
                
        except Exception as e:
            logger.error(f"Error getting topology statistics: {e}")
            return {"error": str(e)}
    
    def refresh_device_topology(self, device_id: int, agent_id: int) -> Dict[str, Any]:
        """Refresh topology information for a specific device via agent."""
        try:
            device = self.db.query(Device).filter(Device.id == device_id).first()
            if not device:
                return {"error": "Device not found"}
            
            # Check if agent has access to the device's network
            agent_access = self.db.query(AgentNetworkAccess).filter(
                AgentNetworkAccess.agent_id == agent_id,
                AgentNetworkAccess.network_id == device.network_id
            ).first()
            
            if not agent_access:
                return {"error": "Agent does not have access to this network"}
            
            # Create a topology refresh request
            refresh_request = {
                "type": "topology_refresh",
                "device_id": device_id,
                "device_ip": device.ip,
                "network_id": device.network_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Created topology refresh request for device {device_id} via agent {agent_id}")
            
            return {
                "status": "request_created",
                "message": "Topology refresh request created",
                "request": refresh_request
            }
            
        except Exception as e:
            logger.error(f"Error creating topology refresh request for device {device_id}: {e}")
            return {"error": str(e)}
    
    def get_topology_cache_status(self) -> Dict[str, Any]:
        """Get status of topology caching system."""
        try:
            # Count topology records by last polled time
            from datetime import timedelta
            
            now = datetime.now(timezone.utc)
            recent = now - timedelta(hours=1)
            today = now - timedelta(days=1)
            week = now - timedelta(days=7)
            
            recent_count = self.db.query(DeviceTopology).filter(
                DeviceTopology.last_polled >= recent
            ).count()
            
            today_count = self.db.query(DeviceTopology).filter(
                DeviceTopology.last_polled >= today
            ).count()
            
            week_count = self.db.query(DeviceTopology).filter(
                DeviceTopology.last_polled >= week
            ).count()
            
            total_count = self.db.query(DeviceTopology).count()
            
            return {
                "total_topology_records": total_count,
                "recently_updated": recent_count,
                "updated_today": today_count,
                "updated_this_week": week_count,
                "stale_records": total_count - recent_count,
                "cache_freshness": f"{(recent_count / total_count * 100):.1f}%" if total_count > 0 else "0%"
            }
            
        except Exception as e:
            logger.error(f"Error getting topology cache status: {e}")
            return {"error": str(e)} 