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
        
        # Ensure agent status is online when heartbeats are received
        if agent.status != "online":
            agent.status = "online"
            agent.updated_at = datetime.now(timezone.utc)
            db.commit()
        
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


@router.post("/authenticate")
async def authenticate_agent(
    auth_data: dict,
    db: Session = Depends(get_db)
):
    """Authenticate agent and return JWT token for heartbeat authentication."""
    try:
        agent_id = auth_data.get("agent_id")
        agent_token = auth_data.get("agent_token")
        
        if not agent_id or not agent_token:
            raise HTTPException(
                status_code=400, 
                detail="agent_id and agent_token are required"
            )
        
        agent_service = AgentService(db)
        
        # Get agent and verify token
        agent = await agent_service.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        if agent.agent_token != agent_token:
            raise HTTPException(status_code=401, detail="Invalid agent token")
        
        # Allow both "offline" and "active" status for authentication
        # "offline" is the initial state for newly created agents
        if agent.status not in ["offline", "active"]:
            raise HTTPException(status_code=403, detail="Agent is not in a valid state for authentication")
        
        # Generate JWT token for agent
        from app.core.security import create_access_token
        from datetime import timedelta
        
        # Update agent status to online since it's now authenticated and running
        agent.status = "online"
        agent.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        # Create token with agent-specific claims
        token_data = {
            "sub": str(agent.id),
            "username": f"agent_{agent.name}",
            "user_id": agent.id,
            "role": "agent",
            "company_id": agent.company_id,
            "organization_id": agent.organization_id,
            "agent_id": agent.id
        }
        
        # Token expires in 24 hours for agents
        access_token = create_access_token(
            data=token_data,
            expires_delta=timedelta(hours=24)
        )
        
        logger.info(f"Agent {agent.id} ({agent.name}) authenticated successfully")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 24 * 60 * 60,  # 24 hours in seconds
            "agent_id": agent.id,
            "agent_name": agent.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error authenticating agent: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to authenticate agent"
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


@router.get("/download-agent/{agent_id}")
async def download_agent_package(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download agent package for deployment."""
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
                raise HTTPException(status_code=403, detail="Engineers cannot download agent packages")
        
        # Generate a comprehensive ZIP file with agent executable and dependencies
        import zipfile
        import io
        import json
        import os
        
        # Create ZIP file in memory
        zip_buffer = io.BytesIO()
        
        logger.info(f"Creating ZIP file for agent {agent.id} ({agent.name})")
        
        try:
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Add agent configuration file
                agent_config = {
                    "agent_id": agent.id,
                    "agent_name": agent.name,
                    "agent_token": agent.agent_token,
                    "company_id": agent.company_id,
                    "organization_id": agent.organization_id,
                    "capabilities": agent.capabilities,
                    "version": agent.version,
                    "status": agent.status,
                    "token_status": agent.token_status,
                    "created_at": agent.created_at.isoformat() if agent.created_at else None,
                    "networks": [access.network_id for access in agent.network_access] if hasattr(agent, 'network_access') else []
                }
                
                logger.info(f"Adding agent_config.json to ZIP")
                zip_file.writestr("agent_config.json", json.dumps(agent_config, indent=2, default=str))
                
                # Add a comprehensive README file
                readme_content = f"""# Cisco AI Agent Package

Agent Name: {agent.name}
Agent ID: {agent.id}
Version: {agent.version}

## Installation Instructions

1. Extract this ZIP file to a directory
2. Ensure Python 3.8+ is installed
3. Install dependencies: `pip install -r requirements.txt`
4. Run the agent: `python cisco_ai_agent.py`

## Configuration

The agent_config.json file contains all necessary configuration including:
- Agent authentication token
- Network access permissions
- Capabilities and settings

## Files Included

- `cisco_ai_agent.py` - Main agent executable
- `requirements.txt` - Python dependencies
- `agent_config.json` - Agent configuration
- `install.bat` - Windows installation script
- `README.md` - This file

## Support

Contact your system administrator for deployment assistance.
"""
                logger.info(f"Adding README.md to ZIP")
                zip_file.writestr("README.md", readme_content)
                
                # Add requirements.txt with necessary dependencies
                requirements_content = """# Cisco AI Agent Dependencies
requests>=2.28.0
psutil>=5.9.0
netmiko>=4.2.0
pysnmp>=4.4.12
paramiko>=3.1.0
cryptography>=3.4.8
"""
                logger.info(f"Adding requirements.txt to ZIP")
                zip_file.writestr("requirements.txt", requirements_content)
                
                # Add the main agent executable with simpler string formatting
                agent_py_content = f"""#!/usr/bin/env python3
\"\"\"
Cisco AI Agent - Network Discovery and Monitoring Agent
Agent ID: {agent.id}
Agent Name: {agent.name}
Version: {agent.version}
\"\"\"

import json
import requests
import time
import logging
import sys
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agent.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class CiscoAIAgent:
    def __init__(self, config_file="agent_config.json"):
        \"\"\"Initialize the agent with configuration.\"\"\"
        self.config = self.load_config(config_file)
        self.agent_id = self.config.get("agent_id")
        self.agent_name = self.config.get("agent_name")
        self.agent_token = self.config.get("agent_token")
        self.backend_url = os.getenv("BACKEND_URL", "https://cisco-ai-backend-production.up.railway.app")
        self.jwt_token = None
        
        logger.info(f"Initializing Cisco AI Agent: {{self.agent_name}} (ID: {{self.agent_id}})")
    
    def load_config(self, config_file):
        \"\"\"Load agent configuration from JSON file.\"\"\"
        try:
            with open(config_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {{e}}")
            sys.exit(1)
    
    def authenticate(self):
        \"\"\"Authenticate with backend to get JWT token.\"\"\"
        try:
            auth_url = f"{{self.backend_url}}/api/v1/agents/authenticate"
            payload = {{
                "agent_id": self.agent_id,
                "agent_token": self.agent_token
            }}
            
            response = requests.post(auth_url, json=payload, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.jwt_token = data.get("access_token")
                logger.info("Authentication successful - JWT token obtained")
                return True
            else:
                logger.warning(f"Authentication failed: {{response.status_code}}")
                return False
                
        except Exception as e:
            logger.error(f"Authentication error: {{e}}")
            return False
    
    def send_heartbeat(self):
        \"\"\"Send heartbeat to backend using JWT token.\"\"\"
        try:
            # Check if we have a valid JWT token
            if not self.jwt_token:
                logger.warning("No JWT token available - attempting to authenticate")
                if not self.authenticate():
                    return False
            
            headers = {{"Authorization": f"Bearer {{self.jwt_token}}"}}
            response = requests.post(
                f"{{self.backend_url}}/api/v1/agents/heartbeat",
                json={{"agent_token": self.agent_token}},
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info("Heartbeat sent successfully")
                return True
            elif response.status_code == 401:
                # Token expired, re-authenticate
                logger.info("JWT token expired - re-authenticating")
                if self.authenticate():
                    # Retry heartbeat with new token
                    headers = {{"Authorization": f"Bearer {{self.jwt_token}}"}}
                    retry_response = requests.post(
                        f"{{self.backend_url}}/api/v1/agents/heartbeat",
                        json={{"agent_token": self.agent_token}},
                        headers=headers,
                        timeout=10
                    )
                    if retry_response.status_code == 200:
                        logger.info("Heartbeat sent successfully after re-authentication")
                        return True
                    else:
                        logger.warning(f"Heartbeat retry failed: {{retry_response.status_code}}")
                        return False
                else:
                    return False
            else:
                logger.warning(f"Heartbeat failed: {{response.status_code}}")
                return False
                
        except Exception as e:
            logger.error(f"Heartbeat error: {{e}}")
            return False
    
    def run(self):
        \"\"\"Main agent loop.\"\"\"
        logger.info("Starting Cisco AI Agent...")
        
        # Authenticate first
        if not self.authenticate():
            logger.error("Failed to authenticate - cannot start agent")
            return
        
        while True:
            try:
                # Send heartbeat
                self.send_heartbeat()
                
                # Wait before next heartbeat
                time.sleep(60)  # 1 minute intervals
                
            except KeyboardInterrupt:
                logger.info("Agent stopped by user")
                break
            except Exception as e:
                logger.error(f"Agent error: {{e}}")
                time.sleep(30)  # Wait before retry

if __name__ == "__main__":
    agent = CiscoAIAgent()
    agent.run()
"""
                logger.info(f"Adding cisco_ai_agent.py to ZIP")
                zip_file.writestr("cisco_ai_agent.py", agent_py_content)
                
                # Add a Windows installation script
                deploy_script = f"""@echo off
echo ========================================
echo Cisco AI Agent Installation
echo ========================================
echo.
echo Agent Name: {agent.name}
echo Agent ID: {agent.id}
echo Version: {agent.version}
echo.
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Dependencies installed successfully!
echo.
echo To start the agent, run:
echo   python cisco_ai_agent.py
echo.
echo The agent will start monitoring and send heartbeats to the backend.
echo.
pause
"""
                logger.info(f"Adding install.bat to ZIP")
                zip_file.writestr("install.bat", deploy_script)
                
                # Add a Linux/Mac installation script
                install_sh_content = f"""#!/bin/bash
echo "========================================"
echo "Cisco AI Agent Installation"
echo "========================================"
echo ""
echo "Agent Name: {agent.name}"
echo "Agent ID: {agent.id}"
echo "Version: {agent.version}"
echo ""
echo "Installing dependencies..."
pip3 install -r requirements.txt
echo ""
echo "Dependencies installed successfully!"
echo ""
echo "To start the agent, run:"
echo "  python3 cisco_ai_agent.py"
echo ""
echo "The agent will start monitoring and send heartbeats to the backend."
echo ""
"""
                logger.info(f"Adding install.sh to ZIP")
                zip_file.writestr("install.sh", install_sh_content)
                
                # List all files in ZIP for debugging
                file_list = zip_file.namelist()
                logger.info(f"ZIP file created with {len(file_list)} files: {file_list}")
        
        except Exception as zip_error:
            logger.error(f"Error creating ZIP file: {zip_error}")
            raise HTTPException(status_code=500, detail=f"Failed to create ZIP file: {str(zip_error)}")
        
        # Reset buffer position
        zip_buffer.seek(0)
        
        logger.info(f"ZIP file size: {len(zip_buffer.getvalue())} bytes")
        
        # Return the ZIP file as a response
        from fastapi.responses import StreamingResponse
        
        return StreamingResponse(
            io.BytesIO(zip_buffer.getvalue()),
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=cisco_ai_agent_{agent.name}_{agent.id}.zip"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading agent package: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to download agent package"
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

