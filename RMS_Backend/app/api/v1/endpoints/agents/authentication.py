"""
Agents Authentication Endpoints - Authentication and agent-specific operations

This module contains all authentication and agent-specific endpoints:
- Agent organization access
- Agent network access
- Agent status updates
- Agent heartbeat handling
"""

from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, Body
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.base import Agent, User, Organization, Network
from app.services.agents.agent_service import AgentService
from app.services.agents.agent_token_service import AgentTokenService

router = APIRouter()

# Initialize services
agent_service = AgentService()
token_service = AgentTokenService()


@router.get("/agent/organizations", response_model=List[Dict[str, Any]])
async def get_agent_organizations(
    agent_token: str = Header(..., alias="X-Agent-Token"),
    db: Session = Depends(get_db)
):
    """Get organizations accessible to the agent."""
    return await agent_service.get_agent_organizations(agent_token, db)


@router.get("/agent/networks", response_model=List[Dict[str, Any]])
async def get_agent_networks(
    agent_token: str = Header(..., alias="X-Agent-Token"),
    db: Session = Depends(get_db)
):
    """Get networks accessible to the agent."""
    return await agent_service.get_agent_networks(agent_token, db)


@router.put("/status")
async def update_agent_status(
    status_data: dict = Body(...),
    agent_token: str = Header(..., alias="X-Agent-Token"),
    db: Session = Depends(get_db)
):
    """Update agent status via HTTP (Cloud Run compatible)"""
    return await agent_service.update_agent_status(status_data, agent_token, db)


@router.post("/heartbeat")
async def agent_heartbeat(
    heartbeat_data: dict = Body(...),
    agent_token: str = Header(..., alias="X-Agent-Token"),
    db: Session = Depends(get_db)
):
    """Handle agent heartbeat via HTTP (Cloud Run compatible)"""
    return await agent_service.handle_agent_heartbeat(heartbeat_data, agent_token, db)


@router.post("/pong")
async def agent_pong(
    pong_data: dict = Body(...),
    agent_token: str = Header(..., alias="X-Agent-Token"),
    db: Session = Depends(get_db)
):
    """Handle agent pong response via HTTP (Cloud Run compatible)"""
    return await agent_service.handle_agent_pong(pong_data, agent_token, db)


@router.get("/agent/status")
async def get_agent_status(
    agent_token: str = Header(..., alias="X-Agent-Token"),
    db: Session = Depends(get_db)
):
    """Get current agent status."""
    try:
        # Validate agent token
        agent = db.query(Agent).filter(Agent.agent_token == agent_token).first()
        if not agent:
            raise HTTPException(status_code=401, detail="Invalid agent token")
        
        if agent.token_status != "active":
            raise HTTPException(status_code=401, detail="Agent token is not active")
        
        # Calculate real-time status
        current_time = datetime.now(timezone.utc)
        agent_time = agent.last_heartbeat
        
        if agent_time:
            # Ensure both datetime objects are timezone-aware for comparison
            if agent_time.tzinfo is None:
                agent_time = agent_time.replace(tzinfo=timezone.utc)
            
            time_diff = current_time - agent_time
            if time_diff.total_seconds() > 60:  # 1 minute timeout
                status = "offline"
            else:
                status = "online"
        else:
            status = "offline"
        
        return {
            "agent_id": agent.id,
            "agent_name": agent.name,
            "status": status,
            "last_heartbeat": agent.last_heartbeat.isoformat() if agent.last_heartbeat else None,
            "capabilities": agent.capabilities,
            "version": agent.version,
            "organization_id": agent.organization_id,
            "company_id": agent.company_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching agent status: {str(e)}")


@router.post("/agent/ping")
async def agent_ping(
    ping_data: dict = Body(...),
    agent_token: str = Header(..., alias="X-Agent-Token"),
    db: Session = Depends(get_db)
):
    """Handle agent ping request."""
    try:
        # Validate agent token
        agent = db.query(Agent).filter(Agent.agent_token == agent_token).first()
        if not agent:
            raise HTTPException(status_code=401, detail="Invalid agent token")
        
        if agent.token_status != "active":
            raise HTTPException(status_code=401, detail="Agent token is not active")
        
        # Update agent last activity
        agent.last_heartbeat = datetime.utcnow()
        agent.last_used_at = datetime.utcnow()
        
        db.commit()
        
        # Log the ping
        token_service.log_agent_token_event(db, agent.id, "ping_received")
        
        return {
            "message": "Ping received",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent_id": agent.id,
            "agent_name": agent.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error handling ping: {str(e)}")


@router.get("/agent/capabilities")
async def get_agent_capabilities(
    agent_token: str = Header(..., alias="X-Agent-Token"),
    db: Session = Depends(get_db)
):
    """Get agent capabilities and supported operations."""
    try:
        # Validate agent token
        agent = db.query(Agent).filter(Agent.agent_token == agent_token).first()
        if not agent:
            raise HTTPException(status_code=401, detail="Invalid agent token")
        
        if agent.token_status != "active":
            raise HTTPException(status_code=401, detail="Agent token is not active")
        
        return {
            "agent_id": agent.id,
            "agent_name": agent.name,
            "capabilities": agent.capabilities,
            "scopes": agent.scopes,
            "version": agent.version,
            "supported_discovery_methods": ["snmp", "ssh", "ping"],
            "supported_operations": ["device_discovery", "status_monitoring", "topology_mapping"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching capabilities: {str(e)}") 