"""
Agent Status Service - Device status monitoring and health checks
Extracted from agents.py to improve code organization and maintainability
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class AgentStatusService:
    """Service for managing agent status operations"""
    
    def __init__(self, db: Session):
        self.db = db
        # Move global state into service for better management
        self._pending_discovery_requests = {}
        self._discovery_sessions = {}
    
    def create_status_test_request(self, agent_id: int, network_id: int, devices: List[Dict], 
                                 source: str = "manual") -> str:
        """Create a status test request for an agent."""
        # Create a session ID for tracking this status refresh
        session_id = f"background_status_{uuid.uuid4().hex[:8]}"
        
        # Store status test request for agent to pick up
        status_request = {
            "type": "status_test",
            "session_id": session_id,
            "network_id": network_id,
            "devices": devices,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": source
        }
        
        self._pending_discovery_requests[agent_id] = status_request
        logger.info(f"Created status test request {session_id} for agent {agent_id} with {len(devices)} devices")
        
        return session_id
    
    def get_pending_discovery_requests(self, agent_id: int) -> List[Dict]:
        """Get pending discovery requests for an agent."""
        if agent_id in self._pending_discovery_requests:
            request = self._pending_discovery_requests[agent_id]
            
            # Handle both list and single object structures
            if isinstance(request, list):
                # If it's a list, take the first request and return it
                if request:
                    actual_request = request[0]
                    # Log the request type and details safely
                    request_type = actual_request.get('type', 'unknown')
                    session_id = actual_request.get('session_id', 'no-session-id')
                    logger.info(f"🔍 DEBUG: Returning pending {request_type} request for agent {agent_id}: {session_id}")
                    
                    # Remove status_test requests immediately (they don't need credential storage)
                    if request_type == 'status_test':
                        del self._pending_discovery_requests[agent_id]
                        logger.info(f"🔍 DEBUG: Removed status_test request for agent {agent_id} after delivery")
                    
                    return [actual_request]
                else:
                    logger.info(f"🔍 DEBUG: Empty list found for agent {agent_id}")
                    return []
            else:
                # If it's a single object, handle it directly
                # Log the request type and details safely
                request_type = request.get('type', 'unknown')
                session_id = request.get('session_id', 'no-session-id')
                logger.info(f"🔍 DEBUG: Returning pending {request_type} request for agent {agent_id}: {session_id}")
                
                # Remove status_test requests immediately (they don't need credential storage)
                if request_type == 'status_test':
                    del self._pending_discovery_requests[agent_id]
                    logger.info(f"🔍 DEBUG: Removed status_test request for agent {agent_id} after delivery")
                
                return [request]
        
        logger.info(f"🔍 DEBUG: No pending discovery requests found for agent {agent_id}")
        return []
    
    def create_discovery_request(self, agent_id: int, network_id: int, discovery_data: Dict, 
                               credentials: Dict, session_id: str) -> None:
        """Create a discovery request for an agent."""
        # Store discovery request for agent to pick up
        discovery_request = {
            "type": "discovery",
            "session_id": session_id,
            "network_id": network_id,
            "discovery_method": discovery_data.get("discovery_method", {}),
            "credentials": credentials,
            "ip_range": discovery_data.get("ip_range", ""),
            "start_ip": discovery_data.get("start_ip", ""),
            "end_ip": discovery_data.get("end_ip", ""),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        self._pending_discovery_requests[agent_id] = discovery_request
        logger.info(f"Created discovery request {session_id} for agent {agent_id}")
    
    def get_discovery_session(self, session_id: str) -> Optional[Dict]:
        """Get discovery session by ID."""
        return self._discovery_sessions.get(session_id)
    
    def create_discovery_session(self, session_id: str, network_id: int) -> None:
        """Create a new discovery session."""
        self._discovery_sessions[session_id] = {
            "started_at": datetime.now(timezone.utc),
            "network_id": network_id,
            "discovered_devices": [],
            "errors": [],
            "status": "pending"
        }
        logger.info(f"Created discovery session {session_id} for network {network_id}")
    
    def update_discovery_session(self, session_id: str, status: str, discovered_count: int = 0, 
                               error: Optional[str] = None) -> None:
        """Update discovery session status."""
        if session_id not in self._discovery_sessions:
            self._discovery_sessions[session_id] = {
                "started_at": datetime.now(timezone.utc),
                "discovered_devices": [],
                "errors": []
            }
        
        self._discovery_sessions[session_id]["status"] = status
        self._discovery_sessions[session_id]["discovered_count"] = discovered_count
        if error:
            self._discovery_sessions[session_id]["errors"].append(error)
        
        logger.info(f"Updated discovery session {session_id}: status={status}, count={discovered_count}")
    
    def add_discovery_results(self, session_id: str, discovered_devices: List[Dict], 
                            errors: List[str]) -> None:
        """Add discovery results to a session."""
        if session_id not in self._discovery_sessions:
            logger.warning(f"Discovery session {session_id} not found, creating new one")
            self._discovery_sessions[session_id] = {
                "started_at": datetime.now(timezone.utc),
                "discovered_devices": [],
                "errors": []
            }
        
        self._discovery_sessions[session_id]["discovered_devices"].extend(discovered_devices)
        self._discovery_sessions[session_id]["errors"].extend(errors)
        
        logger.info(f"Added {len(discovered_devices)} devices and {len(errors)} errors to session {session_id}")
    
    def cleanup_discovery_request(self, agent_id: int, session_id: str) -> None:
        """Clean up discovery request after processing is complete."""
        if agent_id in self._pending_discovery_requests:
            pending_request = self._pending_discovery_requests[agent_id]
            if pending_request.get("session_id") == session_id:
                del self._pending_discovery_requests[agent_id]
                logger.info(f"Cleaned up discovery request for agent {agent_id} and session {session_id}")
    
    def get_all_pending_requests(self) -> Dict[int, Dict]:
        """Get all pending discovery requests (for debugging)."""
        return self._pending_discovery_requests.copy()
    
    def get_all_discovery_sessions(self) -> Dict[str, Dict]:
        """Get all discovery sessions (for debugging)."""
        return self._discovery_sessions.copy()
    
    def cleanup_expired_sessions(self, max_age_hours: int = 24) -> int:
        """Clean up expired discovery sessions."""
        from datetime import timedelta
        
        current_time = datetime.now(timezone.utc)
        expired_sessions = []
        
        for session_id, session_data in self._discovery_sessions.items():
            if "started_at" in session_data:
                age = current_time - session_data["started_at"]
                if age > timedelta(hours=max_age_hours):
                    expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            del self._discovery_sessions[session_id]
        
        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired discovery sessions")
        
        return len(expired_sessions)
    
    def get_status_summary(self) -> Dict[str, Any]:
        """Get summary of current status service state."""
        return {
            "pending_requests_count": len(self._pending_discovery_requests),
            "active_sessions_count": len(self._discovery_sessions),
            "agents_with_pending_requests": list(self._pending_discovery_requests.keys()),
            "active_session_ids": list(self._discovery_sessions.keys())
        } 