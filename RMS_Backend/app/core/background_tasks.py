import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.base import Network, Device, Agent, AgentNetworkAccess
from app.services.agents import pending_discovery_requests

logger = logging.getLogger(__name__)

async def background_device_monitoring():
    """Background task that automatically checks device statuses every 3 minutes"""
    
    while True:
        try:
            logger.info("🔄 Starting background device status check...")
            
            # Get a database session
            db = SessionLocal()
            
            try:
                # Get all active networks (networks with devices)
                active_networks = db.query(Network).join(Device).distinct().all()
                
                logger.info(f"Found {len(active_networks)} active networks to check")
                
                total_devices_checked = 0
                
                for network in active_networks:
                    try:
                        logger.info(f"Checking devices in network: {network.name} (ID: {network.id})")
                        
                        # Get all devices in the network
                        devices = db.query(Device).filter(Device.network_id == network.id).all()
                        logger.info(f"Found {len(devices)} devices in network {network.name}")
                        
                        if not devices:
                            logger.info(f"No devices found in network {network.name}, skipping...")
                            continue
                        
                        # Get available ONLINE agents for this network
                        online_agents = db.query(Agent).join(AgentNetworkAccess).filter(
                            AgentNetworkAccess.network_id == network.id,
                            Agent.status == "online",
                            Agent.token_status == "active"
                        ).all()
                        
                        if not online_agents:
                            logger.warning(f"No online agents available for network {network.name}, skipping...")
                            continue
                        
                        # Use the first available online agent
                        agent = online_agents[0]
                        agent_id = agent.id
                        logger.info(f"Using agent {agent.name} (ID: {agent_id}) for network {network.name}")
                        
                        # Create a session ID for tracking this status refresh
                        import uuid
                        session_id = f"background_status_{uuid.uuid4().hex[:8]}"
                        
                        # Prepare complete device data for agent
                        device_data = []
                        for device in devices:
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
                                logger.debug(f"Device {device.ip} has SNMP config: {snmp_config}")
                            else:
                                logger.debug(f"Device {device.ip} has no SNMP config")
                            
                            device_info = {
                                'id': device.id,
                                'ip': device.ip,
                                'name': device.name if hasattr(device, 'name') else "",
                                'network_id': device.network_id,
                                'company_id': device.company_id,
                                'snmp_config': snmp_config
                            }
                            device_data.append(device_info)
                        
                        # Store status test request for agent to pick up
                        status_request = {
                            "type": "status_test",
                            "session_id": session_id,
                            "network_id": network.id,
                            "devices": device_data,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "source": "background_monitoring"
                        }
                        
                        pending_discovery_requests[agent_id] = status_request
                        total_devices_checked += len(devices)
                        logger.info(f"✅ Background status check requested for network {network.name} with {len(devices)} devices via agent {agent.name}")
                        
                    except Exception as network_error:
                        logger.error(f"❌ Error checking network {network.name}: {network_error}")
                        continue
                        
            finally:
                db.close()
                
            logger.info(f"🔄 Background device status check completed. Total devices checked: {total_devices_checked}")
            
        except Exception as e:
            logger.error(f"❌ Background monitoring error: {e}")
            
        # Wait 3 minutes (180 seconds) before next check
        logger.info("⏰ Waiting 3 minutes until next background check...")
        await asyncio.sleep(180)

def start_background_monitoring():
    """Start the background monitoring task"""
    try:
        # Create and start the background task
        loop = asyncio.get_event_loop()
        task = loop.create_task(background_device_monitoring())
        logger.info("🚀 Background device monitoring started successfully")
        return task
    except Exception as e:
        logger.error(f"❌ Failed to start background monitoring: {e}")
        return None 