"""
Agent Discovery Service - Device and network discovery logic
Extracted from agents.py to improve code organization and maintainability
"""

import logging
import ipaddress
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.models.base import Network, Device, Agent, AgentNetworkAccess, DeviceTopology
from app.schemas.base import AgentDiscoveryRequest

logger = logging.getLogger(__name__)


class AgentDiscoveryService:
    """Service for managing agent discovery operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def parse_ip_range(self, ip_range: str) -> Tuple[List[str], Optional[str], Optional[str]]:
        """Parse IP range and return list of IPs, start IP, and end IP."""
        try:
            # Handle CIDR notation (e.g., "192.168.1.0/24")
            if '/' in ip_range:
                network = ipaddress.IPv4Network(ip_range, strict=False)
                ips = [str(ip) for ip in network.hosts()]
                return ips, str(network.network_address), str(network.broadcast_address)
            
            # Handle range notation (e.g., "192.168.1.1-192.168.1.254")
            elif '-' in ip_range:
                start_ip, end_ip = ip_range.split('-', 1)
                start_ip = start_ip.strip()
                end_ip = end_ip.strip()
                
                # Convert to integers for range generation
                start_int = int(ipaddress.IPv4Address(start_ip))
                end_int = int(ipaddress.IPv4Address(end_ip))
                
                ips = []
                for ip_int in range(start_int, end_int + 1):
                    ip = str(ipaddress.IPv4Address(ip_int))
                    ips.append(ip)
                
                return ips, start_ip, end_ip
            
            # Single IP
            else:
                ip = ip_range.strip()
                ipaddress.IPv4Address(ip)  # Validate IP
                return [ip], ip, ip
                
        except Exception as e:
            logger.error(f"Error parsing IP range '{ip_range}': {e}")
            return [], None, None
    
    def distribute_ips_to_agents(self, ips: List[str], agents: List[Agent]) -> Dict[int, List[str]]:
        """Distribute IP addresses across available agents."""
        if not agents:
            return {}
        
        distribution = {agent.id: [] for agent in agents}
        
        for i, ip in enumerate(ips):
            agent_index = i % len(agents)
            agent_id = agents[agent_index].id
            distribution[agent_id].append(ip)
        
        # Log distribution
        for agent_id, agent_ips in distribution.items():
            logger.info(f"Agent {agent_id} assigned {len(agent_ips)} IPs")
        
        return distribution
    
    def get_available_agents_for_network(self, network_id: int) -> List[Agent]:
        """Get all available agents for a specific network."""
        from datetime import timedelta
        
        agents = self.db.query(Agent).join(AgentNetworkAccess).filter(
            AgentNetworkAccess.network_id == network_id,
            Agent.status == "online",
            Agent.token_status == "active",
            Agent.last_heartbeat >= datetime.now(timezone.utc) - timedelta(minutes=5)
        ).all()
        
        return agents
    
    def validate_discovery_request(self, discovery_data: AgentDiscoveryRequest, 
                                 current_user: dict) -> Tuple[bool, str, Optional[Network]]:
        """Validate discovery request and return validation result."""
        try:
            # Get user from database
            from app.models.base import User
            user = self.db.query(User).filter(User.id == current_user["user_id"]).first()
            if not user:
                return False, "User not found", None
            
            # Check network access
            network = self.db.query(Network).filter(Network.id == discovery_data.network_id).first()
            if not network:
                return False, "Network not found", None
            
            # Check if user has access to the network
            from app.services.permission_service import PermissionService
            permission_service = PermissionService(self.db)
            if not permission_service.check_network_access(current_user, discovery_data.network_id):
                return False, "No access to this network", None
            
            # Check if there are available agents
            available_agents = self.get_available_agents_for_network(discovery_data.network_id)
            if not available_agents:
                return False, "No online agents available for this network", None
            
            return True, "Validation successful", network
            
        except Exception as e:
            logger.error(f"Error validating discovery request: {e}")
            return False, f"Validation error: {str(e)}", None
    
    def create_discovery_session(self, network_id: int, discovery_data: AgentDiscoveryRequest) -> str:
        """Create a new discovery session."""
        import uuid
        
        session_id = f"discovery_{int(datetime.now(timezone.utc).timestamp())}_{discovery_data.agent_ids[0]}"
        
        logger.info(f"Created discovery session {session_id} for network {network_id}")
        return session_id
    
    def process_discovery_results(self, session_id: str, agent_id: int, 
                                discovered_devices: List[Dict], errors: List[str]) -> Dict[str, Any]:
        """Process discovery results from an agent."""
        try:
            logger.info(f"Processing discovery results for session {session_id}: {len(discovered_devices)} devices, {len(errors)} errors")
            
            # Get network_id from discovery session
            network_id = None
            
            # Try to get network_id from the discovery session
            # This would typically come from the session storage
            # For now, we'll extract it from the first device if available
            if discovered_devices:
                network_id = discovered_devices[0].get('network_id')
            
            if not network_id:
                logger.warning(f"No network_id found for session {session_id}, devices will not be saved to database")
                return {
                    "status": "received",
                    "message": f"Received {len(discovered_devices)} devices and {len(errors)} errors (no network_id found)",
                    "session_id": session_id
                }
            
            # Process discovered devices
            saved_devices = []
            for device_data in discovered_devices:
                try:
                    # Extract device information
                    device_name = device_data.get("hostname", device_data.get("name", f"Device-{device_data.get('ip', device_data.get('ip_address', 'unknown'))}"))
                    device_ip = device_data.get("ip") or device_data.get("ip_address")
                    device_type = device_data.get("device_type", "unknown")
                    location = device_data.get("location", "")
                    platform = device_data.get("vendor", "cisco_ios")
                    os_version = device_data.get("os_version", "")
                    serial_number = device_data.get("serial_number", "")
                    
                    # Extract vendor and model from description
                    description = device_data.get("description", "")
                    vendor = "Unknown"
                    model = "Unknown"
                    
                    if description:
                        if "Cisco" in description:
                            vendor = "Cisco"
                            if "Catalyst" in description:
                                model = "Catalyst L3 Switch Software"
                            elif "IOS" in description:
                                model = "Cisco IOS"
                            elif "NX-OS" in description:
                                model = "Cisco NX-OS"
                            else:
                                model = "Cisco Device"
                        elif "Juniper" in description:
                            vendor = "Juniper"
                            model = "Juniper Device"
                        elif "HP" in description or "HPE" in description:
                            vendor = "HP"
                            model = "HP Device"
                        elif "Dell" in description:
                            vendor = "Dell"
                            model = "Dell Device"
                        else:
                            vendor = "Unknown"
                            model = "Unknown Device"
                    
                    # Convert uptime to seconds if it's a string
                    uptime_value = device_data.get("uptime", 0)
                    if isinstance(uptime_value, str):
                        uptime_seconds = self._parse_uptime_string(uptime_value)
                    else:
                        uptime_seconds = uptime_value
                    
                    # Determine discovery method and status
                    discovery_method = device_data.get("discovery_method", "unknown")
                    ping_ok = device_data.get("ping_status", False)
                    snmp_ok = device_data.get("snmp_status", False)
                    
                    # Create or update device
                    existing_device = self.db.query(Device).filter(
                        Device.ip == device_ip,
                        Device.network_id == network_id
                    ).first()
                    
                    if existing_device:
                        # Update existing device
                        existing_device.name = device_name
                        existing_device.type = device_type
                        existing_device.location = location
                        existing_device.platform = platform
                        existing_device.os_version = os_version
                        existing_device.serial_number = serial_number
                        existing_device.ping_status = ping_ok
                        existing_device.snmp_status = snmp_ok
                        existing_device.discovery_method = discovery_method
                        existing_device.updated_at = datetime.now(timezone.utc)
                        
                        # Update or create DeviceTopology record
                        existing_topology = self.db.query(DeviceTopology).filter(
                            DeviceTopology.device_id == existing_device.id
                        ).first()
                        
                        if existing_topology:
                            existing_topology.hostname = device_data.get("hostname", device_name)
                            existing_topology.vendor = vendor
                            existing_topology.model = model
                            existing_topology.uptime = uptime_seconds
                            existing_topology.last_polled = datetime.now(timezone.utc)
                            existing_topology.health_data = {
                                "location": device_data.get("location", ""),
                                "contact": device_data.get("contact", ""),
                                "capabilities": device_data.get("capabilities", [])
                            }
                        else:
                            # Create new topology record
                            new_topology = DeviceTopology(
                                device_id=existing_device.id,
                                network_id=network_id,
                                hostname=device_data.get("hostname", device_name),
                                vendor=vendor,
                                model=model,
                                uptime=uptime_seconds,
                                last_polled=datetime.now(timezone.utc),
                                health_data={
                                    "location": device_data.get("location", ""),
                                    "contact": device_data.get("contact", ""),
                                    "capabilities": device_data.get("capabilities", [])
                                }
                            )
                            self.db.add(new_topology)
                        
                        saved_devices.append(existing_device)
                        logger.info(f"Updated existing device: {device_name} ({device_ip}) - Ping: {ping_ok}, SNMP: {snmp_ok}, Method: {discovery_method}")
                    
                    else:
                        # Create new device
                        new_device = Device(
                            name=device_name,
                            ip=device_ip,
                            type=device_type,
                            location=location,
                            platform=platform,
                            os_version=os_version,
                            serial_number=serial_number,
                            ping_status=ping_ok,
                            snmp_status=snmp_ok,
                            discovery_method=discovery_method,
                            network_id=network_id,
                            company_id=1,  # Default company ID
                            owner_id=1,    # Default owner ID
                            created_at=datetime.now(timezone.utc),
                            updated_at=datetime.now(timezone.utc)
                        )
                        self.db.add(new_device)
                        self.db.flush()  # Flush to get the device ID
                        
                        # Create SNMP configuration if provided
                        if device_data.get('snmp_config'):
                            snmp_config_data = device_data['snmp_config']
                            from app.models.base import DeviceSNMP
                            new_snmp_config = DeviceSNMP(
                                device_id=new_device.id,
                                snmp_version=snmp_config_data.get('snmp_version', 'v2c'),
                                community=snmp_config_data.get('community'),
                                username=snmp_config_data.get('username'),
                                auth_protocol=snmp_config_data.get('auth_protocol'),
                                auth_password=snmp_config_data.get('auth_password'),
                                priv_protocol=snmp_config_data.get('priv_protocol'),
                                priv_password=snmp_config_data.get('priv_password'),
                                port=snmp_config_data.get('port', 161)
                            )
                            self.db.add(new_snmp_config)
                            logger.info(f"Created SNMP config for device {device_ip}: version={snmp_config_data.get('snmp_version')}, community={snmp_config_data.get('community')}")
                        
                        # Create DeviceTopology record
                        new_topology = DeviceTopology(
                            device_id=new_device.id,
                            network_id=network_id,
                            hostname=device_data.get("hostname", device_name),
                            vendor=vendor,
                            model=model,
                            uptime=uptime_seconds,
                            last_polled=datetime.now(timezone.utc),
                            health_data={
                                "location": device_data.get("location", ""),
                                "contact": device_data.get("contact", ""),
                                "capabilities": device_data.get("capabilities", [])
                            }
                        )
                        self.db.add(new_topology)
                        logger.info(f"Created DeviceTopology record for device {device_ip} with hostname: {device_data.get('hostname', device_name)}")
                        
                        saved_devices.append(new_device)
                        logger.info(f"Created new device: {device_name} ({device_ip}) - Ping: {ping_ok}, SNMP: {snmp_ok}, Method: {discovery_method}")
                
                except Exception as e:
                    logger.error(f"Error saving device {device_data.get('ip', 'unknown')}: {str(e)}")
                    errors.append(f"Failed to save device {device_data.get('ip', 'unknown')}: {str(e)}")
            
            # Commit all changes to database
            try:
                self.db.commit()
                logger.info(f"Successfully saved {len(saved_devices)} devices to database")
            except Exception as e:
                self.db.rollback()
                logger.error(f"Error committing devices to database: {str(e)}")
                raise e
            
            return {
                "status": "received",
                "message": f"Received {len(discovered_devices)} devices and {len(errors)} errors",
                "session_id": session_id,
                "saved_devices": len(saved_devices),
                "errors": len(errors)
            }
            
        except Exception as e:
            logger.error(f"Error processing discovery results: {e}")
            raise e
    
    def _parse_uptime_string(self, uptime_str: str) -> int:
        """Parse uptime string and return seconds."""
        try:
            # Handle various uptime formats
            if 'd' in uptime_str:
                # Format: "5d 2h 30m 15s"
                parts = uptime_str.split()
                total_seconds = 0
                
                for part in parts:
                    if 'd' in part:
                        days = int(part.replace('d', ''))
                        total_seconds += days * 24 * 3600
                    elif 'h' in part:
                        hours = int(part.replace('h', ''))
                        total_seconds += hours * 3600
                    elif 'm' in part:
                        minutes = int(part.replace('m', ''))
                        total_seconds += minutes * 60
                    elif 's' in part:
                        seconds = int(part.replace('s', ''))
                        total_seconds += seconds
                
                return total_seconds
            else:
                # Assume it's already in seconds
                return int(uptime_str)
                
        except Exception as e:
            logger.warning(f"Could not parse uptime string '{uptime_str}': {e}")
            return 0 