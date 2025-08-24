"""
Agents CRUD Endpoints - Basic CRUD operations

This module contains all basic CRUD operations for agents:
- Agent registration
- Agent retrieval and listing
- Agent updates
- Agent deletion
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.base import Agent, User, Organization, UserOrganizationAccess
from app.schemas.agents.base import AgentRegistration, AgentResponse, AgentUpdate
from app.services.agents.agent_service import AgentService
from app.services.agents.agent_auth_service import AgentAuthService

router = APIRouter()

# Initialize services
agent_service = AgentService()
auth_service = AgentAuthService()


@router.post("/register", response_model=AgentResponse)
async def register_agent(
    agent_data: AgentRegistration,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register a new agent for an organization."""
    return await agent_service.register_agent(agent_data, current_user, db)


@router.get("/all", response_model=List[AgentResponse])
async def get_agents(
    organization_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get agents for the user's accessible organizations."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        query = db.query(Agent)
        
        if user.role != "superadmin":
            if user.company_id:
                query = query.filter(Agent.company_id == user.company_id)
            
            if organization_id:
                # Validate access to specific organization
                if not auth_service.validate_user_organization_access(user, organization_id, db):
                    raise HTTPException(
                        status_code=403,
                        detail="No access to this organization"
                    )
                query = query.filter(Agent.organization_id == organization_id)
            else:
                # Get all organizations user has access to
                accessible_orgs = []
                
                # Organizations user owns
                owned_orgs = db.query(Organization).filter(Organization.owner_id == user.id).all()
                accessible_orgs.extend([org.id for org in owned_orgs])
                
                # Organizations user has access to
                org_access = db.query(UserOrganizationAccess).filter(
                    UserOrganizationAccess.user_id == user.id
                ).all()
                accessible_orgs.extend([access.organization_id for access in org_access])
                
                if accessible_orgs:
                    query = query.filter(Agent.organization_id.in_(accessible_orgs))
                else:
                    return []
        
        agents = query.all()
        
        # Calculate real-time status for each agent
        current_time = datetime.now(timezone.utc)
        for agent in agents:
            # Consider agent offline if no heartbeat in last 1 minute (for testing)
            if agent.last_heartbeat:
                # Ensure both datetime objects are timezone-aware for comparison
                agent_time = agent.last_heartbeat
                if agent_time.tzinfo is None:
                    agent_time = agent_time.replace(tzinfo=timezone.utc)
                
                time_diff = current_time - agent_time
                if time_diff.total_seconds() > 60:  # 1 minute (for testing)
                    agent.status = "offline"
                else:
                    agent.status = "online"
            else:
                agent.status = "offline"
        
        return agents
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching agents: {str(e)}")


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    agent_data: AgentUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update agent details."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Validate access
        if user.role != "superadmin":
            if not auth_service.validate_user_organization_access(user, agent.organization_id, db):
                raise HTTPException(
                    status_code=403,
                    detail="No access to this agent"
                )
        
        # Update fields
        if agent_data.name is not None:
            agent.name = agent_data.name
        if agent_data.status is not None:
            agent.status = agent_data.status
        if agent_data.capabilities is not None:
            agent.capabilities = agent_data.capabilities
        if agent_data.version is not None:
            agent.version = agent_data.version
        
        agent.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(agent)
        
        return agent
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating agent: {str(e)}")


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an agent."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Validate access
        if user.role != "superadmin":
            if not auth_service.validate_user_organization_access(user, agent.organization_id, db):
                raise HTTPException(
                    status_code=403,
                    detail="No access to this agent"
                )
        
        db.delete(agent)
        db.commit()
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting agent: {str(e)}")


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific agent by ID."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Validate access
        if user.role != "superadmin":
            if not auth_service.validate_user_organization_access(user, agent.organization_id, db):
                raise HTTPException(
                    status_code=403,
                    detail="No access to this agent"
                )
        
        return agent
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching agent: {str(e)}")


@router.get("/test-download/{agent_id}")
async def test_download_agent(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test download endpoint."""
    return {"message": f"Test download endpoint working for agent {agent_id}", "user": current_user}


@router.get("/simple-test")
async def simple_test():
    """Simple test endpoint without authentication."""
    return {"message": "Simple test endpoint working"} 