"""
Agent Discovery Service - Discovery logic and global state management

This service handles all agent discovery operations:
- Discovery session management
- Global state for pending requests and sessions
- Discovery progress tracking
- Agent assignment and coordination
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.base import Agent
from app.schemas.agents.discovery import AgentDiscoveryRequest


class AgentDiscoveryService:
    """Service class for agent discovery operations and state management"""
    
    def __init__(self):
        # Global state variables - these will be shared across the application
        self.pending_discovery_requests = {}
        self.discovery_sessions = {}
        self.logger = logging.getLogger(__name__)
    
    async def start_discovery_on_agent(
        self, 
        agent: Agent, 
        session_id: str, 
        discovery_data: AgentDiscoveryRequest, 
        assigned_ips: List[str]
    ) -> Dict[str, Any]:
        """Start discovery on a specific agent"""
        try:
            # Create agent-specific discovery request
            agent_discovery_request = {
                "type": "discovery",
                "session_id": session_id,
                "network_id": discovery_data.network_id,
                "discovery_method": discovery_data.discovery_method.dict(),
                "credentials": discovery_data.credentials,
                "ip_range": discovery_data.ip_range,
                "start_ip": discovery_data.start_ip,
                "end_ip": discovery_data.end_ip,
                "assigned_ips": assigned_ips,
                "total_agents": len(discovery_data.agent_ids),
                "agent_index": discovery_data.agent_ids.index(agent.id)
            }
            
            # Store the discovery request for the agent to pick up
            self.pending_discovery_requests[agent.id] = agent_discovery_request
            
            # Also store the network_id in the discovery session immediately
            if session_id not in self.discovery_sessions:
                self.discovery_sessions[session_id] = {
                    "started_at": datetime.now(timezone.utc),
                    "discovered_devices": [],
                    "errors": []
                }
            self.discovery_sessions[session_id]["network_id"] = discovery_data.network_id
            self.logger.info(f"🔍 DEBUG: Stored network_id {discovery_data.network_id} in discovery session {session_id}")
            
            self.logger.info(f"🔍 DEBUG: Stored discovery request for agent {agent.name} (ID: {agent.id}) for session {session_id}")
            self.logger.info(f"🔍 DEBUG: Assigned IPs: {assigned_ips}")
            self.logger.info(f"🔍 DEBUG: Total pending requests: {len(self.pending_discovery_requests)}")
            self.logger.info(f"🔍 DEBUG: Pending requests keys: {list(self.pending_discovery_requests.keys())}")
            
            return {
                "agent_id": agent.id,
                "agent_name": agent.name,
                "status": "started",
                "assigned_ips": len(assigned_ips)
            }
            
        except Exception as e:
            self.logger.error(f"Error starting discovery on agent {agent.name}: {e}")
            return {
                "agent_id": agent.id,
                "agent_name": agent.name,
                "status": "failed",
                "error": str(e)
            }
    
    async def get_discovery_status(
        self, 
        session_id: str
    ) -> Dict[str, Any]:
        """Get the status of a discovery session."""
        try:
            # Check for discovery session in memory storage
            if session_id in self.discovery_sessions:
                session_data = self.discovery_sessions[session_id]
                return {
                    "session_id": session_id,
                    "status": session_data.get("status", "in_progress"),
                    "progress": session_data.get("progress", 0),
                    "discovered_devices": session_data.get("discovered_devices", []),
                    "errors": session_data.get("errors", []),
                    "started_at": session_data.get("started_at", datetime.now(timezone.utc)),
                    "estimated_completion": session_data.get("estimated_completion")
                }
            
            # Return default response if session not found
            return {
                "session_id": session_id,
                "status": "in_progress",
                "progress": 0,
                "discovered_devices": [],
                "errors": [],
                "started_at": datetime.now(timezone.utc),
                "estimated_completion": None
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error fetching discovery status: {str(e)}")
    
    async def update_discovery_progress(
        self, 
        session_id: str, 
        progress: int, 
        discovered_devices: List[Dict] = None,
        errors: List[str] = None
    ) -> bool:
        """Update discovery progress for a session."""
        try:
            if session_id not in self.discovery_sessions:
                return False
            
            session = self.discovery_sessions[session_id]
            session["progress"] = progress
            
            if discovered_devices:
                session["discovered_devices"].extend(discovered_devices)
            
            if errors:
                session["errors"].extend(errors)
            
            # Update status based on progress
            if progress >= 100:
                session["status"] = "completed"
                session["completed_at"] = datetime.now(timezone.utc)
            elif progress > 0:
                session["status"] = "in_progress"
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error updating discovery progress: {e}")
            return False
    
    async def get_pending_discovery_request(
        self, 
        agent_id: int
    ) -> Optional[Dict[str, Any]]:
        """Get pending discovery request for an agent."""
        return self.pending_discovery_requests.get(agent_id)
    
    async def remove_pending_discovery_request(
        self, 
        agent_id: int
    ) -> bool:
        """Remove pending discovery request for an agent after completion."""
        try:
            if agent_id in self.pending_discovery_requests:
                del self.pending_discovery_requests[agent_id]
                return True
            return False
        except Exception as e:
            self.logger.error(f"Error removing pending discovery request: {e}")
            return False
    
    async def cleanup_discovery_session(
        self, 
        session_id: str
    ) -> bool:
        """Clean up a completed discovery session."""
        try:
            if session_id in self.discovery_sessions:
                del self.discovery_sessions[session_id]
                return True
            return False
        except Exception as e:
            self.logger.error(f"Error cleaning up discovery session: {e}")
            return False
    
    async def get_all_discovery_sessions(self) -> Dict[str, Any]:
        """Get all active discovery sessions."""
        return self.discovery_sessions.copy()
    
    async def get_all_pending_requests(self) -> Dict[int, Any]:
        """Get all pending discovery requests."""
        return self.pending_discovery_requests.copy()
    
    async def reset_discovery_state(self) -> None:
        """Reset all discovery state (useful for testing or system restart)."""
        self.pending_discovery_requests.clear()
        self.discovery_sessions.clear()
        self.logger.info("Discovery state reset completed") 