"""
Agent Management Endpoints
Core agent registration, management, and CRUD operations
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.api.deps import get_db
from app.services.agent_service import AgentService
from app.services.agent_auth_service import AgentAuthService
from app.utils.agent_utils import (
    generate_secure_token, calculate_agent_health_score,
    format_agent_status_summary, sanitize_agent_data
)
from app.schemas.agent.agent import (
    AgentCreate, AgentUpdate, AgentResponse, AgentRegistration,
    AgentToken, AgentHealth, AgentCapabilities, AgentScopes
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=AgentResponse)
async def register_agent(
    agent_data: AgentRegistration,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register a new agent for an organization."""
    try:
        # Debug logging to see what data is received
        logger.info(f"Agent registration request received:")
        logger.info(f"  - agent_data: {agent_data}")
        logger.info(f"  - current_user: {current_user}")
        
        agent_service = AgentService(db)
        
        # Register agent using service
        agent = await agent_service.register_agent(agent_data, current_user)
        
        return AgentResponse(
            id=agent.id,
            name=agent.name,
            company_id=agent.company_id,
            organization_id=agent.organization_id,
            agent_token=agent.agent_token,
            capabilities=_convert_capabilities_to_model(agent.capabilities),
            scopes=_convert_scopes_to_model(agent.scopes),
            version=agent.version,
            status=agent.status,
            token_status=agent.token_status,
            health=_create_agent_health(agent),
            issued_at=_ensure_timezone_aware(agent.issued_at),
            created_by=agent.created_by,
            created_at=_ensure_timezone_aware(agent.created_at),
            updated_at=_ensure_timezone_aware(agent.updated_at),
            last_heartbeat=_ensure_timezone_aware(agent.last_heartbeat),
            last_ip=getattr(agent, 'last_ip', None),
            description=getattr(agent, 'description', None)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error registering agent: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to register agent"
        )


@router.get("/all", response_model=List[AgentResponse])
async def get_all_agents(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all agents accessible to the current user."""
    try:
        agent_service = AgentService(db)
        
        if current_user["role"] == "superadmin":
            agents = await agent_service.get_all_agents()
        else:
            agents = await agent_service.get_agents_by_company(current_user["company_id"])
        
        return [
            AgentResponse(
                id=agent.id,
                name=agent.name,
                company_id=agent.company_id,
                organization_id=agent.organization_id,
                agent_token=agent.agent_token,
                capabilities=_convert_capabilities_to_model(agent.capabilities),
                scopes=_convert_scopes_to_model(agent.scopes),
                version=agent.version,
                status=agent.status,
                token_status=agent.token_status,
                health=_create_agent_health(agent),
                issued_at=_ensure_timezone_aware(agent.issued_at),
                created_by=agent.created_by,
                created_at=_ensure_timezone_aware(agent.created_at),
                updated_at=_ensure_timezone_aware(agent.updated_at),
                last_heartbeat=_ensure_timezone_aware(agent.last_heartbeat),
                last_ip=getattr(agent, 'last_ip', None),
                description=getattr(agent, 'description', None)
            )
            for agent in agents
        ]
        
    except Exception as e:
        logger.error(f"Error getting agents: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get agents"
        )


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific agent by ID."""
    try:
        agent_service = AgentService(db)
        
        agent = await agent_service.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Check access permissions
        if current_user["role"] not in ["superadmin", "full_control"]:
            if current_user["role"] == "company_admin" and agent.company_id != current_user["company_id"]:
                raise HTTPException(status_code=403, detail="Not authorized to access this agent")
            elif current_user["role"] == "engineer":
                raise HTTPException(status_code=403, detail="Engineers cannot access agent details")
        
        return AgentResponse(
            id=agent.id,
            name=agent.name,
            company_id=agent.company_id,
            organization_id=agent.organization_id,
            agent_token=agent.agent_token,
            capabilities=_convert_capabilities_to_model(agent.capabilities),
            scopes=_convert_scopes_to_model(agent.scopes),
            version=agent.version,
            status=agent.status,
            token_status=agent.token_status,
            health=_create_agent_health(agent),
            issued_at=_ensure_timezone_aware(agent.issued_at),
            created_by=agent.created_by,
            created_at=_ensure_timezone_aware(agent.created_at),
            updated_at=_ensure_timezone_aware(agent.updated_at),
            last_heartbeat=_ensure_timezone_aware(agent.last_heartbeat),
            last_ip=getattr(agent, 'last_ip', None),
            description=getattr(agent, 'description', None)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get agent"
        )


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    agent_update: AgentUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing agent."""
    try:
        agent_service = AgentService(db)
        
        # Get current agent
        current_agent = await agent_service.get_agent(agent_id)
        if not current_agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Check permissions
        if current_user["role"] not in ["superadmin", "full_control"]:
            if current_user["role"] == "company_admin" and current_agent.company_id != current_user["company_id"]:
                raise HTTPException(status_code=403, detail="Not authorized to update this agent")
            elif current_user["role"] == "engineer":
                raise HTTPException(status_code=403, detail="Engineers cannot update agents")
        
        # Update agent
        updated_agent = await agent_service.update_agent(agent_id, agent_update)
        
        return AgentResponse(
            id=updated_agent.id,
            name=updated_agent.name,
            company_id=updated_agent.company_id,
            organization_id=updated_agent.organization_id,
            agent_token=updated_agent.agent_token,
            capabilities=_convert_capabilities_to_model(updated_agent.capabilities),
            scopes=_convert_scopes_to_model(updated_agent.scopes),
            version=updated_agent.version,
            status=updated_agent.status,
            token_status=updated_agent.token_status,
            health=_create_agent_health(updated_agent),
            issued_at=_ensure_timezone_aware(updated_agent.issued_at),
            created_by=updated_agent.created_by,
            created_at=_ensure_timezone_aware(updated_agent.created_at),
            updated_at=_ensure_timezone_aware(updated_agent.updated_at),
            last_heartbeat=_ensure_timezone_aware(updated_agent.last_heartbeat),
            last_ip=getattr(updated_agent, 'last_ip', None),
            description=getattr(updated_agent, 'description', None)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agent: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update agent"
        )


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an agent."""
    try:
        agent_service = AgentService(db)
        
        # Delete agent using service
        success = await agent_service.delete_agent(agent_id, current_user)
        if not success:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agent: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete agent"
        )


@router.post("/{agent_id}/rotate_token", response_model=AgentResponse)
async def rotate_agent_token(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rotate agent token."""
    try:
        agent_service = AgentService(db)
        
        # Rotate token using service
        updated_agent = await agent_service.rotate_agent_token(agent_id, current_user)
        
        return AgentResponse(
            id=updated_agent.id,
            name=updated_agent.name,
            company_id=updated_agent.company_id,
            organization_id=updated_agent.organization_id,
            agent_token=updated_agent.agent_token,
            capabilities=_convert_capabilities_to_model(updated_agent.capabilities),
            scopes=_convert_scopes_to_model(updated_agent.scopes),
            version=updated_agent.version,
            status=updated_agent.status,
            token_status=updated_agent.token_status,
            health=_create_agent_health(updated_agent),
            issued_at=_ensure_timezone_aware(updated_agent.issued_at),
            created_by=updated_agent.created_by,
            created_at=_ensure_timezone_aware(updated_agent.created_at),
            updated_at=_ensure_timezone_aware(updated_agent.updated_at),
            last_heartbeat=_ensure_timezone_aware(updated_agent.last_heartbeat),
            last_ip=getattr(updated_agent, 'last_ip', None),
            description=getattr(updated_agent, 'description', None)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error rotating agent token: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to rotate agent token"
        )


@router.post("/{agent_id}/revoke_token", response_model=AgentResponse)
async def revoke_agent_token(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke agent token."""
    try:
        agent_service = AgentService(db)
        
        # Revoke token using service
        updated_agent = await agent_service.revoke_agent_token(agent_id, current_user)
        
        return AgentResponse(
            id=updated_agent.id,
            name=updated_agent.name,
            company_id=updated_agent.company_id,
            organization_id=updated_agent.organization_id,
            agent_token=updated_agent.agent_token,
            capabilities=updated_agent.capabilities,
            version=updated_agent.version,
            status=updated_agent.status,
            token_status=updated_agent.token_status,
            scopes=updated_agent.scopes,
            issued_at=_ensure_timezone_aware(updated_agent.issued_at),
            created_by=updated_agent.created_by,
            created_at=_ensure_timezone_aware(updated_agent.created_at),
            updated_at=_ensure_timezone_aware(updated_agent.updated_at),
            last_heartbeat=_ensure_timezone_aware(updated_agent.last_heartbeat),
            last_ip=getattr(updated_agent, 'last_ip', None),
            description=getattr(updated_agent, 'description', None)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error revoking agent token: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to revoke agent token"
        )


@router.get("/{agent_id}/audit_logs", response_model=List[Dict[str, Any]])
async def get_agent_audit_logs(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit logs for an agent."""
    try:
        agent_service = AgentService(db)
        
        # Get agent to check permissions
        agent = await agent_service.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Check permissions
        if current_user["role"] not in ["superadmin", "full_control"]:
            if current_user["role"] == "company_admin" and agent.company_id != current_user["company_id"]:
                raise HTTPException(status_code=403, detail="Not authorized to access this agent")
            elif current_user["role"] == "engineer":
                raise HTTPException(status_code=403, detail="Engineers cannot access audit logs")
        
        # Get audit logs
        audit_logs = await agent_service.get_agent_audit_logs(agent_id)
        
        return [
            {
                "id": log.id,
                "agent_id": log.agent_id,
                "event_type": log.event_type,
                "timestamp": log.timestamp.isoformat(),
                "user_id": log.user_id,
                "ip_address": log.ip_address,
                "details": log.details
            }
            for log in audit_logs
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent audit logs: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get audit logs"
        )


@router.post("/heartbeat")
async def agent_heartbeat(
    agent_token: str = Body(..., embed=True),
    ip_address: Optional[str] = Body(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Handle agent heartbeat."""
    try:
        agent_service = AgentService(db)
        
        # Get agent by token
        agent = await agent_service.get_agent_by_token(agent_token)
        if not agent:
            raise HTTPException(status_code=401, detail="Invalid agent token")
        
        # Update heartbeat
        await agent_service.update_agent_heartbeat(agent.id, ip_address)
        
        return {
            "message": "Heartbeat received",
            "agent_id": agent.id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing heartbeat: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process heartbeat"
        )


@router.get("/agent/organizations", response_model=List[Dict[str, Any]])
async def get_agent_organizations(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get organizations available for agent registration."""
    try:
        if current_user["role"] not in ["company_admin", "full_control"]:
            raise HTTPException(
                status_code=403,
                detail="Only company_admin and full_control users can register agents"
            )
        
        # Get organizations for the user's company
        from app.models.base import Organization, User
        
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        organizations = db.query(Organization).filter(
            Organization.owner_id == user.id
        ).all()
        
        return [
            {
                "id": org.id,
                "name": org.name,
                "description": org.description
            }
            for org in organizations
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting organizations: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get organizations"
        )


@router.get("/agent/networks", response_model=List[Dict[str, Any]])
async def get_agent_networks(
    organization_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get networks available for agent registration."""
    try:
        if current_user["role"] not in ["company_admin", "full_control"]:
            raise HTTPException(
                status_code=403,
                detail="Only company_admin and full_control users can register agents"
            )
        
        # Validate organization access
        from app.models.base import Organization, Network, User
        
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        org = db.query(Organization).filter(Organization.id == organization_id).first()
        if not org or org.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Organization not found or access denied")
        
        # Get networks for the organization
        networks = db.query(Network).filter(
            Network.organization_id == organization_id
        ).all()
        
        return [
            {
                "id": network.id,
                "name": network.name,
                "description": network.description,
                "subnet": network.subnet
            }
            for network in networks
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting networks: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get networks"
        )


@router.get("/{agent_id}/health", response_model=AgentHealth)
async def get_agent_health(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get agent health status."""
    try:
        agent_service = AgentService(db)
        
        # Get agent
        agent = await agent_service.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Check permissions
        if current_user["role"] not in ["superadmin", "full_control"]:
            if current_user["role"] == "company_admin" and agent.company_id != current_user["company_id"]:
                raise HTTPException(status_code=403, detail="Not authorized to access this agent")
        
        # Calculate health score
        health_score = calculate_agent_health_score(
            last_heartbeat=agent.last_heartbeat,
            error_count=0,  # Could be enhanced with actual error tracking
            response_time_ms=None,
            uptime_seconds=None
        )
        
        return AgentHealth(
            agent_id=agent.id,
            agent_name=agent.name,
            status=agent.status,
            health_score=health_score,
            last_heartbeat=agent.last_heartbeat.isoformat() if agent.last_heartbeat else None,
            capabilities=agent.capabilities,
            token_status=agent.token_status,
            last_used_at=agent.last_used_at.isoformat() if agent.last_used_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent health: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get agent health"
        )


@router.post("/test-auth", response_model=Dict[str, Any])
async def test_agent_auth(
    agent_token: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """Test agent authentication."""
    try:
        agent_service = AgentService(db)
        
        # Get agent by token
        agent = await agent_service.get_agent_by_token(agent_token)
        if not agent:
            raise HTTPException(status_code=401, detail="Invalid agent token")
        
        # Check token status
        if agent.token_status != "active":
            raise HTTPException(status_code=401, detail="Agent token is not active")
        
        return {
            "authenticated": True,
            "agent_id": agent.id,
            "agent_name": agent.name,
            "capabilities": agent.capabilities,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing agent auth: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to test authentication"
        )


# Helper functions to convert database data to schema format
def _ensure_timezone_aware(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime is timezone-aware. If naive, assume UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _convert_capabilities_to_model(capabilities_data) -> AgentCapabilities:
    """Convert database capabilities data to AgentCapabilities model."""
    if isinstance(capabilities_data, list):
        # Convert list to dict format
        capabilities_dict = {}
        for capability in capabilities_data:
            if capability in ['snmp', 'ssh', 'ping', 'topology', 'monitoring', 'configuration']:
                capabilities_dict[capability] = True
        return AgentCapabilities(**capabilities_dict)
    elif isinstance(capabilities_data, dict):
        return AgentCapabilities(**capabilities_data)
    else:
        # Default capabilities
        return AgentCapabilities()


def _convert_scopes_to_model(scopes_data) -> AgentScopes:
    """Convert database scopes data to AgentScopes model."""
    if isinstance(scopes_data, list):
        # Convert list to dict format
        return AgentScopes(
            networks=[],
            organizations=[],
            permissions=scopes_data
        )
    elif isinstance(scopes_data, dict):
        return AgentScopes(**scopes_data)
    else:
        # Default scopes
        return AgentScopes()


def _create_agent_health(agent) -> AgentHealth:
    """Create AgentHealth model from agent data."""
    from app.utils.agent_utils import calculate_agent_health_score
    
    health_score = calculate_agent_health_score(
        last_heartbeat=agent.last_heartbeat,
        error_count=0,
        response_time_ms=None,
        uptime_seconds=None
    )
    
    # Ensure last_heartbeat is timezone-aware
    last_heartbeat = None
    if agent.last_heartbeat:
        if agent.last_heartbeat.tzinfo is None:
            # If timezone-naive, assume UTC
            last_heartbeat = agent.last_heartbeat.replace(tzinfo=timezone.utc)
        else:
            last_heartbeat = agent.last_heartbeat
    
    return AgentHealth(
        status=agent.status,
        last_heartbeat=last_heartbeat,
        uptime_seconds=None,  # Not available in database
        memory_usage_mb=None,  # Not available in database
        cpu_usage_percent=None,  # Not available in database
        disk_usage_percent=None,  # Not available in database
        error_count=0,
        last_error=None
    )

