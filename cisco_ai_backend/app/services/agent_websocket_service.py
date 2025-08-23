"""
Agent WebSocket Service - Real-time communication and connection management
Extracted from agents.py to improve code organization and maintainability
"""

import logging
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class AgentWebSocketService:
    """Service for managing agent WebSocket connections"""
    
    def __init__(self):
        # Store active connections
        self._active_connections: Dict[int, WebSocket] = {}
        self._connection_info: Dict[int, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, agent_id: int) -> bool:
        """Accept WebSocket connection from an agent."""
        try:
            await websocket.accept()
            self._active_connections[agent_id] = websocket
            self._connection_info[agent_id] = {
                "connected_at": datetime.now(timezone.utc),
                "last_activity": datetime.now(timezone.utc),
                "status": "connected"
            }
            
            logger.info(f"Agent {agent_id} WebSocket connected")
            return True
            
        except Exception as e:
            logger.error(f"Error accepting WebSocket connection from agent {agent_id}: {e}")
            return False
    
    def disconnect(self, agent_id: int) -> None:
        """Handle WebSocket disconnection from an agent."""
        if agent_id in self._active_connections:
            del self._active_connections[agent_id]
            
        if agent_id in self._connection_info:
            self._connection_info[agent_id]["status"] = "disconnected"
            self._connection_info[agent_id]["disconnected_at"] = datetime.now(timezone.utc)
            
        logger.info(f"Agent {agent_id} WebSocket disconnected")
    
    async def send_message(self, agent_id: int, message: Dict[str, Any]) -> bool:
        """Send message to a specific agent via WebSocket."""
        try:
            if agent_id not in self._active_connections:
                logger.warning(f"Agent {agent_id} not connected via WebSocket")
                return False
            
            websocket = self._active_connections[agent_id]
            await websocket.send_text(json.dumps(message))
            
            # Update last activity
            if agent_id in self._connection_info:
                self._connection_info[agent_id]["last_activity"] = datetime.now(timezone.utc)
            
            logger.debug(f"Sent message to agent {agent_id}: {message.get('type', 'unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending message to agent {agent_id}: {e}")
            # Mark connection as broken
            self.disconnect(agent_id)
            return False
    
    async def broadcast_message(self, message: Dict[str, Any], exclude_agent: Optional[int] = None) -> int:
        """Broadcast message to all connected agents."""
        sent_count = 0
        failed_agents = []
        
        for agent_id in list(self._active_connections.keys()):
            if exclude_agent and agent_id == exclude_agent:
                continue
                
            if await self.send_message(agent_id, message):
                sent_count += 1
            else:
                failed_agents.append(agent_id)
        
        if failed_agents:
            logger.warning(f"Failed to send message to agents: {failed_agents}")
        
        logger.info(f"Broadcasted message to {sent_count} agents")
        return sent_count
    
    async def receive_message(self, agent_id: int) -> Optional[Dict[str, Any]]:
        """Receive message from a specific agent."""
        try:
            if agent_id not in self._active_connections:
                return None
            
            websocket = self._active_connections[agent_id]
            data = await websocket.receive_text()
            
            # Update last activity
            if agent_id in self._connection_info:
                self._connection_info[agent_id]["last_activity"] = datetime.now(timezone.utc)
            
            message = json.loads(data)
            logger.debug(f"Received message from agent {agent_id}: {message.get('type', 'unknown')}")
            
            return message
            
        except WebSocketDisconnect:
            logger.info(f"Agent {agent_id} WebSocket disconnected during receive")
            self.disconnect(agent_id)
            return None
        except Exception as e:
            logger.error(f"Error receiving message from agent {agent_id}: {e}")
            return None
    
    def get_connection_status(self, agent_id: int) -> Optional[Dict[str, Any]]:
        """Get connection status for a specific agent."""
        if agent_id not in self._connection_info:
            return None
        
        info = self._connection_info[agent_id].copy()
        info["is_connected"] = agent_id in self._active_connections
        
        return info
    
    def get_all_connections(self) -> Dict[str, Any]:
        """Get status of all WebSocket connections."""
        return {
            "total_connections": len(self._active_connections),
            "connected_agents": list(self._active_connections.keys()),
            "connection_details": self._connection_info.copy()
        }
    
    def is_connected(self, agent_id: int) -> bool:
        """Check if an agent is connected via WebSocket."""
        return agent_id in self._active_connections
    
    async def ping_agent(self, agent_id: int) -> bool:
        """Send ping message to an agent to check connectivity."""
        try:
            ping_message = {
                "type": "ping",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            return await self.send_message(agent_id, ping_message)
            
        except Exception as e:
            logger.error(f"Error pinging agent {agent_id}: {e}")
            return False
    
    async def send_discovery_request(self, agent_id: int, discovery_data: Dict[str, Any]) -> bool:
        """Send discovery request to an agent."""
        try:
            discovery_message = {
                "type": "discovery_request",
                "data": discovery_data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            return await self.send_message(agent_id, discovery_message)
            
        except Exception as e:
            logger.error(f"Error sending discovery request to agent {agent_id}: {e}")
            return False
    
    async def send_status_request(self, agent_id: int, status_data: Dict[str, Any]) -> bool:
        """Send status check request to an agent."""
        try:
            status_message = {
                "type": "status_request",
                "data": status_data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            return await self.send_message(agent_id, status_message)
            
        except Exception as e:
            logger.error(f"Error sending status request to agent {agent_id}: {e}")
            return False
    
    def cleanup_inactive_connections(self, max_inactive_minutes: int = 30) -> int:
        """Clean up inactive WebSocket connections."""
        from datetime import timedelta
        
        current_time = datetime.now(timezone.utc)
        inactive_agents = []
        
        for agent_id, info in self._connection_info.items():
            if "last_activity" in info:
                last_activity = info["last_activity"]
                if isinstance(last_activity, str):
                    last_activity = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
                
                inactive_duration = current_time - last_activity
                if inactive_duration > timedelta(minutes=max_inactive_minutes):
                    inactive_agents.append(agent_id)
        
        # Disconnect inactive agents
        for agent_id in inactive_agents:
            self.disconnect(agent_id)
        
        if inactive_agents:
            logger.info(f"Cleaned up {len(inactive_agents)} inactive WebSocket connections")
        
        return len(inactive_agents)
    
    def get_connection_health(self) -> Dict[str, Any]:
        """Get overall health status of WebSocket connections."""
        total_connections = len(self._active_connections)
        healthy_connections = 0
        
        for agent_id in self._active_connections:
            if self.get_connection_status(agent_id):
                healthy_connections += 1
        
        return {
            "total_connections": total_connections,
            "healthy_connections": healthy_connections,
            "unhealthy_connections": total_connections - healthy_connections,
            "health_percentage": f"{(healthy_connections / total_connections * 100):.1f}%" if total_connections > 0 else "0%"
        } 