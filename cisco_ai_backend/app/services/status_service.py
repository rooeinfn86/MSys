from typing import Dict, Any, List
import asyncio
import subprocess
import platform
import socket
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.base import Device, DeviceLog, LogType
from app.services.snmp_service import SNMPService
from app.services.device_service import DeviceService

class DeviceStatusService:
    def __init__(self, db: Session):
        self.db = db
        self.snmp_service = SNMPService()
        self.device_service = DeviceService(db)
    
    def ping_device(self, ip: str) -> bool:
        """Ping a device to check basic connectivity."""
        try:
            # First try using ping command if available
            system = platform.system().lower()
            if system == "windows":
                cmd = ["ping", "-n", "1", "-w", "1000", ip]
            else:
                cmd = ["ping", "-c", "1", "-W", "1", ip]

            try:
                output = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
                if output.returncode == 0:
                    print(f"[PING] {ip} -> ✅")
                    return True
            except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
                # Ping command not available or failed, fall back to socket-based check
                pass
            
            # Fallback: Use socket-based connectivity check
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                result = sock.connect_ex((ip, 80))  # Try port 80 (HTTP)
                sock.close()
                
                if result == 0:
                    print(f"[PING] {ip} -> ✅ (socket check)")
                    return True
                else:
                    # Try common network ports
                    for port in [22, 23, 161, 443]:  # SSH, Telnet, SNMP, HTTPS
                        try:
                            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                            sock.settimeout(1)
                            result = sock.connect_ex((ip, port))
                            sock.close()
                            if result == 0:
                                print(f"[PING] {ip} -> ✅ (port {port} open)")
                                return True
                        except:
                            continue
                    
                    print(f"[PING] {ip} -> ❌ (no open ports)")
                    return False
                    
            except Exception as e:
                print(f"[PING ERROR] {ip}: Socket check failed - {e}")
                return False
                
        except Exception as e:
            print(f"[PING ERROR] {ip}: {e}")
            return False
    
    async def check_device_status(self, device_id: int) -> Dict[str, Any]:
        """Check the current status of a device."""
        try:
            device = self.device_service.get_device_by_id(device_id)
            if not device:
                raise ValueError("Device not found")

            # Get the stored status from the database
            ping_status = device.ping_status if device.ping_status is not None else False
            snmp_status = device.snmp_status if device.snmp_status is not None else False
            
            # Calculate status based on ping and SNMP
            status = "green" if (ping_status and snmp_status) else "yellow" if ping_status else "red"
            
            return {
                "status": status,
                "ping": ping_status,
                "snmp": snmp_status,
                "ip": device.ip,
                "last_checked": device.updated_at.isoformat() if device.updated_at else None
            }
            
        except Exception as e:
            print(f"Error checking device status: {str(e)}")
            raise e
    
    async def refresh_device_status(self, device_id: int) -> Dict[str, Any]:
        """Force refresh the status of a device."""
        try:
            device = self.device_service.get_device_by_id(device_id)
            if not device:
                raise ValueError("Device not found")

            # Check if we should use agent-based status checking
            if await self._try_agent_based_status_check(device_id, device.network_id):
                print(f"[AGENT] Status refresh requested for device {device_id} via agent")
                # Return a response that includes all expected fields
                # Ensure ping and snmp are always boolean values
                current_ping = bool(device.ping_status) if device.ping_status is not None else False
                current_snmp = bool(device.snmp_status) if device.snmp_status is not None else False
                
                return {
                    "status": "pending",
                    "message": "Status refresh requested via agent",
                    "ping": current_ping,
                    "snmp": current_snmp,
                    "ip": device.ip,
                    "last_checked": datetime.now(timezone.utc).isoformat(),
                    "device_id": device_id
                }

            # Fallback to direct checks if no agent available
            print(f"[DIRECT] Performing direct status check for device {device_id}")
            
            # Perform fresh checks
            ping_ok = self.ping_device(device.ip)
            print(f"[PING] {device.ip} -> {'✅' if ping_ok else '❌'}")
            
            snmp_ok = False
            
            # Check SNMP if configuration exists
            if hasattr(device, 'snmp_config') and device.snmp_config:
                try:
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
                    snmp_ok, _ = self.snmp_service.check_snmp_connectivity(device.ip, snmp_config)
                    print(f"[SNMP] {device.ip} -> {'✅' if snmp_ok else '❌'}")
                except Exception as e:
                    print(f"Error checking SNMP for device {device.ip}: {str(e)}")
                    snmp_ok = False
            else:
                print(f"[SNMP] {device.ip} -> ⚠️ (No SNMP config)")

            # Update device in database
            try:
                updated_device = self.device_service.update_device_status(device_id, ping_ok, snmp_ok)
            except Exception as e:
                print(f"Error updating device status: {str(e)}")
                raise e

            # Calculate status
            if ping_ok and snmp_ok:
                status = "green"
            elif ping_ok and not snmp_ok:
                status = "orange"
            else:
                status = "red"

            return {
                "status": status,
                "ping": bool(ping_ok),  # Ensure boolean type
                "snmp": bool(snmp_ok),  # Ensure boolean type
                "ip": device.ip,
                "last_checked": updated_device.updated_at.isoformat(),
                "device_id": device_id
            }
        except Exception as e:
            raise e
    
    async def _try_agent_based_status_check(self, device_id: int, network_id: int) -> bool:
        """Try to use agent-based status checking if available."""
        try:
            # Check if there are any online agents for this network
            from app.models.base import Agent, AgentNetworkAccess
            
            # Find agents that have access to this network and are online
            online_agents = self.db.query(Agent).join(AgentNetworkAccess).filter(
                AgentNetworkAccess.network_id == network_id,
                Agent.status == "online",
                Agent.token_status == "active"
            ).all()
            
            if not online_agents:
                print(f"[AGENT] No online agents found for network {network_id}")
                return False
            
            # Use the first available agent
            agent = online_agents[0]
            print(f"[AGENT] Found online agent {agent.id} for network {network_id}")
            
            # Add status test request to pending requests
            # Import the global pending_discovery_requests from agents module
            try:
                from app.api.v1.endpoints.agents import pending_discovery_requests
                
                # Create a status test request
                request_id = f"status_test_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{agent.id}"
                
                # Get device information to provide complete details
                device = self.device_service.get_device_by_id(device_id)
                if not device:
                    print(f"[AGENT] Device {device_id} not found, falling back to direct check")
                    return False
                
                # Store the request directly (not in a list) to match existing pattern
                status_request = {
                    "type": "status_test",
                    "session_id": request_id,  # Use session_id to match expected format
                    "network_id": network_id,
                    "devices": [{
                        "id": device.id,
                        "ip": device.ip,
                        "name": device.name if hasattr(device, 'name') else "",
                        "network_id": device.network_id,
                        "company_id": device.company_id
                    }],  # Provide complete device information
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                pending_discovery_requests[agent.id] = status_request
                print(f"[AGENT] Status test request {request_id} queued for agent {agent.id}")
                
                # Request agent to test device status
                print(f"[AGENT] Agent {agent.id} can handle status check for device {device_id}")
                return True
                
            except ImportError:
                print(f"[AGENT] Could not import pending_discovery_requests, falling back to direct check")
                return False
            
        except Exception as e:
            print(f"[AGENT] Error checking for agent availability: {str(e)}")
            return False
    
    async def refresh_all_devices_status(self, network_id: int) -> Dict[str, Any]:
        """Refresh status for all devices in a network."""
        try:
            print(f"[STATUS] Starting status refresh for network {network_id}")
            
            # Get all devices in the network
            devices = self.device_service.get_devices_by_network(network_id)
            print(f"[STATUS] Found {len(devices)} devices in network")
            
            # Process devices
            updated_count = 0
            for device_info in devices:
                try:
                    device_id = device_info['id']
                    print(f"[STATUS] Processing device: {device_info['ip']}")
                    
                    # Refresh individual device status
                    await self.refresh_device_status(device_id)
                    updated_count += 1
                    
                except Exception as e:
                    print(f"[STATUS] Error processing device {device_info['ip']}: {str(e)}")
                    continue
            
            print(f"[STATUS] Successfully updated {updated_count} devices")
            
            return {
                "message": f"Updated status for {updated_count} devices",
                "updated": updated_count,
                "total": len(devices),
                "status": "completed"
            }
            
        except Exception as e:
            print(f"[STATUS] Error in refresh_all_devices_status: {str(e)}")
            raise e
    
    def get_device_status_summary(self, network_id: int) -> Dict[str, Any]:
        """Get a summary of device statuses in a network."""
        try:
            devices = self.device_service.get_devices_by_network(network_id)
            
            status_counts = {
                "total": len(devices),
                "green": 0,
                "yellow": 0,
                "red": 0,
                "unknown": 0
            }
            
            for device in devices:
                ping_status = device.get('ping_status', False)
                snmp_status = device.get('snmp_status', False)
                
                if ping_status and snmp_status:
                    status_counts["green"] += 1
                elif ping_status and not snmp_status:
                    status_counts["yellow"] += 1
                elif not ping_status:
                    status_counts["red"] += 1
                else:
                    status_counts["unknown"] += 1
            
            return status_counts
            
        except Exception as e:
            print(f"Error getting device status summary: {str(e)}")
            raise e
    
    def log_device_status_change(self, device_id: int, old_status: str, new_status: str, message: str = None):
        """Log a device status change."""
        try:
            device = self.device_service.get_device_by_id(device_id)
            if not device:
                return
            
            if not message:
                message = f"Device status changed from {old_status} to {new_status}"
            
            log = DeviceLog(
                ip_address=device.ip,
                network_id=device.network_id,
                company_id=device.company_id,
                log_type=LogType.UNKNOWN_DEVICE.value,
                message=message
            )
            
            self.db.add(log)
            self.db.commit()
            
        except Exception as e:
            print(f"Error logging device status change: {str(e)}")
            self.db.rollback() 