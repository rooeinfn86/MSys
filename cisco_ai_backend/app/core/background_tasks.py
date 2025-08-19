import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.base import Network, Device, Agent
from app.api.v1.endpoints.agents import pending_discovery_requests

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
                
                for network in active_networks:
                    try:
                        logger.info(f"Checking devices in network: {network.name} (ID: {network.id})")
                        
                        # Get all devices in the network
                        devices = db.query(Device).filter(Device.network_id == network.id).all()
                        logger.info(f"Found {len(devices)} devices in network {network.name}")
                        
                        if not devices:
                            logger.info(f"No devices found in network {network.name}, skipping...")
                            continue
                        
                        # Get available agents for this network
                        agents = db.query(Agent).filter(Agent.network_id == network.id).all()
                        
                        if not agents:
                            logger.warning(f"No agents available for network {network.name}, skipping...")
                            continue
                        
                        # Use the first available agent
                        agent = agents[0]
                        agent_id = agent.id
                        
                        # Create a session ID for tracking this status refresh
                        import uuid
                        session_id = f"background_status_{uuid.uuid4().hex[:8]}"
                        
                        # Prepare device data for agent
                        device_data = []
                        for device in devices:
                            # Check if device has SNMP configuration
                            snmp_config = None
                            if hasattr(device, 'snmp_config') and device.snmp_config:
                                snmp_config = {
                                    'snmp_version': device.snmp_config.snmp_version,
                                    'community': device.snmp_config.community,
                                    'port': device.snmp_config.port
                                }
                            
                            device_info = {
                                'ip': device.ip,
                                'snmp_config': snmp_config
                            }
                            device_data.append(device_info)
                        
                        # Store status test request for agent to pick up
                        status_request = {
                            "type": "status_test",
                            "session_id": session_id,
                            "network_id": network.id,
                            "devices": device_data,
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        
                        pending_discovery_requests[agent_id] = status_request
                        logger.info(f"✅ Background status check requested for network {network.name} with {len(devices)} devices")
                        
                    except Exception as network_error:
                        logger.error(f"❌ Error checking network {network.name}: {network_error}")
                        continue
                        
            finally:
                db.close()
                
            logger.info("🔄 Background device status check completed")
            
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