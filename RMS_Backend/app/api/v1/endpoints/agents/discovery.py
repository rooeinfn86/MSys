"""
Agents Discovery Endpoints - Discovery operations and coordination

This module contains all discovery-related endpoints:
- Discovery request routing
- Discovery status tracking
- Agent availability for networks
- Discovery coordination
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.api.deps import get_current_user, get_db
from app.models.base import Agent, AgentNetworkAccess
from app.schemas.agents.discovery import DiscoveryRequest, DiscoveryResponse
from app.services.agents.agent_discovery_service import AgentDiscoveryService
from app.services.agents.agent_auth_service import AgentAuthService

router = APIRouter()

# Initialize services
discovery_service = AgentDiscoveryService()
auth_service = AgentAuthService()
logger = logging.getLogger(__name__)


@router.post("/discovery", response_model=DiscoveryResponse)
async def agent_discovery(
    discovery_data: DiscoveryRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Route discovery request to appropriate agent."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Validate user has access to the network
        if not auth_service.validate_user_network_access(user, discovery_data.network_id, db):
            raise HTTPException(
                status_code=403,
                detail="No access to this network"
            )
        
        # Find agent that has access to this network and is online
        agent = db.query(Agent).join(AgentNetworkAccess).filter(
            and_(
                AgentNetworkAccess.network_id == discovery_data.network_id,
                Agent.status == "online",
                Agent.last_heartbeat >= datetime.utcnow() - timedelta(minutes=5)  # Agent was active in last 5 minutes
            )
        ).first()
        
        if not agent:
            raise HTTPException(
                status_code=404,
                detail="No online agent available for this network"
            )
        
        # FUTURE ENHANCEMENT: Implement agent communication for discovery
        # This endpoint should send discovery requests to agents via WebSocket or HTTP
        # Currently returning placeholder response - agent communication not yet implemented
        logger.info(f"Discovery request would be routed to agent {agent.name} (placeholder response)")
        
        return DiscoveryResponse(
            status="pending_implementation",
            message=f"Agent discovery routing not yet implemented - would route to agent {agent.name}",
            discovered_devices=[],
            errors=["Agent communication not yet implemented"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error routing discovery: {str(e)}")


@router.get("/network/{network_id}/available-agents")
async def get_available_agents_for_network(
    network_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available agents for a specific network."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Validate user has access to the network
        if not auth_service.validate_user_network_access(user, network_id, db):
            raise HTTPException(
                status_code=403,
                detail="No access to this network"
            )
        
        # Find all agents that have access to this network
        agents = db.query(Agent).join(AgentNetworkAccess).filter(
            and_(
                AgentNetworkAccess.network_id == network_id,
                Agent.status == "online",
                Agent.last_heartbeat >= datetime.utcnow() - timedelta(minutes=5)
            )
        ).all()
        
        # Calculate real-time status for each agent
        current_time = datetime.now(timezone.utc)
        agent_list = []
        for agent in agents:
            if agent.last_heartbeat:
                # Ensure both datetime objects are timezone-aware for comparison
                agent_time = agent.last_heartbeat
                if agent_time.tzinfo is None:
                    agent_time = agent_time.replace(tzinfo=timezone.utc)
                
                time_diff = current_time - agent_time
                if time_diff.total_seconds() > 60:  # 1 minute timeout
                    agent.status = "offline"
                else:
                    agent.status = "online"
            else:
                agent.status = "offline"
            
            agent_list.append({
                "id": agent.id,
                "name": agent.name,
                "status": agent.status,
                "capabilities": agent.capabilities,
                "last_heartbeat": agent.last_heartbeat,
                "organization_id": agent.organization_id
            })
        
        return {
            "network_id": network_id,
            "available_agents": agent_list,
            "total_agents": len(agent_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching available agents: {str(e)}")


@router.get("/discovery/{session_id}/status")
async def get_discovery_status(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the status of a discovery session."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get discovery status from service
        return await discovery_service.get_discovery_status(session_id)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching discovery status: {str(e)}")


@router.post("/discovery/{session_id}/cancel")
async def cancel_discovery(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an active discovery session."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Cancel discovery session
        success = await discovery_service.cleanup_discovery_session(session_id)
        
        if success:
            return {"message": f"Discovery session {session_id} cancelled successfully"}
        else:
            raise HTTPException(status_code=404, detail="Discovery session not found")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cancelling discovery: {str(e)}")


@router.get("/discovery/sessions")
async def get_all_discovery_sessions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all active discovery sessions for the user."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all discovery sessions
        sessions = await discovery_service.get_all_discovery_sessions()
        
        # Filter sessions based on user access (if needed)
        # For now, return all sessions - this can be enhanced with user-specific filtering
        
        return {
            "sessions": sessions,
            "total_sessions": len(sessions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching discovery sessions: {str(e)}")


@router.post("/discovery/{session_id}/retry")
async def retry_discovery(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retry a failed discovery session."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get session data
        sessions = await discovery_service.get_all_discovery_sessions()
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Discovery session not found")
        
        # Reset session for retry
        session = sessions[session_id]
        session["status"] = "retrying"
        session["retry_count"] = session.get("retry_count", 0) + 1
        session["retry_at"] = datetime.now(timezone.utc).isoformat()
        
        return {
            "message": f"Discovery session {session_id} queued for retry",
            "retry_count": session["retry_count"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrying discovery: {str(e)}")


@router.get("/discovery/agents/{agent_id}/status")
async def get_agent_discovery_status(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get discovery status for a specific agent."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get agent discovery status
        pending_requests = await discovery_service.get_all_pending_requests()
        agent_request = pending_requests.get(agent_id)
        
        if agent_request:
            return {
                "agent_id": agent_id,
                "status": "busy",
                "current_task": agent_request.get("type"),
                "session_id": agent_request.get("session_id"),
                "network_id": agent_request.get("network_id")
            }
        else:
            return {
                "agent_id": agent_id,
                "status": "available",
                "current_task": None,
                "session_id": None,
                "network_id": None
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching agent discovery status: {str(e)}") 