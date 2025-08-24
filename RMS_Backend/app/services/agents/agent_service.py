"""
Agent Service - Core agent CRUD operations

This service handles all agent-related database operations and business logic:
- Agent registration and management
- Status updates and heartbeat handling
- Agent network access management
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException

from app.models.base import Agent, User, Organization, Network, AgentNetworkAccess
from app.schemas.agents.base import AgentRegistration, AgentResponse
from .agent_token_service import AgentTokenService
from .agent_auth_service import AgentAuthService


class AgentService:
    """Service class for agent CRUD operations"""
    
    def __init__(self):
        self.token_service = AgentTokenService()
        self.auth_service = AgentAuthService()
    
    async def register_agent(
        self,
        agent_data: AgentRegistration,
        current_user: dict,
        db: Session
    ) -> Agent:
        """Register a new agent for an organization."""
        try:
            # Get user from database
            user = db.query(User).filter(User.id == current_user["user_id"]).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Validate user permissions
            if user.role not in ["company_admin", "full_control"]:
                raise HTTPException(
                    status_code=403,
                    detail="Only company_admin and full_control users can register agents."
                )
            
            company_id = user.company_id
            
            # Validate organization belongs to the company
            org = db.query(Organization).filter(Organization.id == agent_data.organization_id).first()
            if not org:
                raise HTTPException(status_code=404, detail="Organization not found")
            
            # Check if organization belongs to the company
            org_owner = db.query(User).filter(User.id == org.owner_id).first()
            if not org_owner or org_owner.company_id != company_id:
                raise HTTPException(
                    status_code=403,
                    detail="Organization does not belong to your company"
                )
            
            # Validate networks belong to the organization
            networks = db.query(Network).filter(
                and_(
                    Network.id.in_(agent_data.networks),
                    Network.organization_id == agent_data.organization_id
                )
            ).all()
            
            if len(networks) != len(agent_data.networks):
                raise HTTPException(
                    status_code=400,
                    detail="Some networks do not belong to the specified organization"
                )
            
            # Generate secure agent token
            agent_token = self.token_service.generate_agent_token()
            now = datetime.utcnow()
            
            # Create agent - use company_id from token
            agent = Agent(
                name=agent_data.name,
                company_id=company_id,
                organization_id=agent_data.organization_id,
                agent_token=agent_token,
                capabilities=agent_data.capabilities,
                version=agent_data.version,
                status="offline",
                token_status="active",
                scopes=["monitoring", "heartbeat"],
                issued_at=now,
                created_by=user.id
            )
            
            db.add(agent)
            db.flush()  # Get the agent ID
            
            # Create network access records
            for network_id in agent_data.networks:
                network_access = AgentNetworkAccess(
                    agent_id=agent.id,
                    network_id=network_id,
                    company_id=company_id,
                    organization_id=agent_data.organization_id
                )
                db.add(network_access)
            
            db.commit()
            db.refresh(agent)
            
            # Log issuance
            self.token_service.log_agent_token_event(db, agent.id, event="issued", user_id=user.id)
            return agent
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error registering agent: {str(e)}")
    
    async def get_agent_organizations(
        self,
        agent_token: str,
        db: Session
    ) -> List[Dict[str, Any]]:
        """Get organizations accessible to the agent."""
        try:
            # Validate agent token
            agent = db.query(Agent).filter(Agent.agent_token == agent_token).first()
            if not agent:
                raise HTTPException(status_code=401, detail="Invalid agent token")
            
            if agent.token_status != "active":
                raise HTTPException(status_code=401, detail="Agent token is not active")
            
            # Get organizations the agent has access to
            # Since Organization doesn't have company_id, we need to get organizations
            # that belong to users in the same company as the agent
            organizations = db.query(Organization).join(User).filter(
                User.company_id == agent.company_id
            ).all()
            
            # Log the access
            self.token_service.log_agent_token_event(db, agent.id, "organizations_accessed")
            
            return [
                {
                    "id": org.id,
                    "name": org.name
                }
                for org in organizations
            ]
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="Internal server error")
    
    async def get_agent_networks(
        self,
        agent_token: str,
        db: Session
    ) -> List[Dict[str, Any]]:
        """Get networks accessible to the agent."""
        try:
            # Validate agent token
            agent = db.query(Agent).filter(Agent.agent_token == agent_token).first()
            if not agent:
                raise HTTPException(status_code=401, detail="Invalid agent token")
            
            if agent.token_status != "active":
                raise HTTPException(status_code=401, detail="Agent token is not active")
            
            # Get networks the agent has access to
            networks = db.query(Network).filter(
                Network.organization_id == agent.organization_id
            ).all()
            
            # Log the access
            self.token_service.log_agent_token_event(db, agent.id, "networks_accessed")
            
            return [
                {
                    "id": network.id,
                    "name": network.name,
                    "organization_id": network.organization_id
                }
                for network in networks
            ]
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="Internal server error")
    
    async def update_agent_status(
        self,
        status_data: dict,
        agent_token: str,
        db: Session
    ) -> Dict[str, str]:
        """Update agent status via HTTP (Cloud Run compatible)"""
        try:
            # Validate agent token
            agent = db.query(Agent).filter(Agent.agent_token == agent_token).first()
            
            if not agent:
                raise HTTPException(status_code=401, detail="Invalid agent token")
            
            if agent.token_status != "active":
                raise HTTPException(status_code=401, detail="Agent token is not active")
            
            # Update agent status
            agent.status = status_data.get("status", "unknown")
            agent.last_heartbeat = datetime.utcnow()
            agent.last_used_at = datetime.utcnow()
            
            # Update additional fields if provided
            if "agent_name" in status_data:
                agent.agent_name = status_data["agent_name"]
            if "discovered_devices_count" in status_data:
                agent.discovered_devices_count = status_data["discovered_devices_count"]
            if "system_info" in status_data:
                agent.system_info = status_data["system_info"]
            
            db.commit()
            
            # Log the status update
            self.token_service.log_agent_token_event(
                db, agent.id, "status_updated", 
                details={"status": status_data.get("status")}
            )
            
            return {"message": "Status updated successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="Internal server error")
    
    async def handle_agent_heartbeat(
        self,
        heartbeat_data: dict,
        agent_token: str,
        db: Session
    ) -> Dict[str, Any]:
        """Handle agent heartbeat via HTTP (Cloud Run compatible)"""
        try:
            # Validate agent token
            agent = db.query(Agent).filter(Agent.agent_token == agent_token).first()
            if not agent:
                raise HTTPException(status_code=401, detail="Invalid agent token")
            
            if agent.token_status != "active":
                raise HTTPException(status_code=401, detail="Agent token is not active")
            
            # Update agent heartbeat
            agent.last_heartbeat = datetime.utcnow()
            agent.last_used_at = datetime.utcnow()
            agent.status = "online"
            
            # Update additional fields if provided
            if "agent_name" in heartbeat_data:
                agent.agent_name = heartbeat_data["agent_name"]
            if "discovered_devices_count" in heartbeat_data:
                agent.discovered_devices_count = heartbeat_data["discovered_devices_count"]
            if "system_info" in heartbeat_data:
                agent.system_info = heartbeat_data["system_info"]
            
            db.commit()
            
            # Log the heartbeat
            self.token_service.log_agent_token_event(db, agent.id, "heartbeat_received")
            
            return {
                "message": "Heartbeat received", 
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="Internal server error")
    
    async def handle_agent_pong(
        self,
        pong_data: dict,
        agent_token: str,
        db: Session
    ) -> Dict[str, Any]:
        """Handle agent pong response via HTTP (Cloud Run compatible)"""
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
            
            # Log the pong
            self.token_service.log_agent_token_event(db, agent.id, "pong_received")
            
            return {
                "message": "Pong received", 
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail="Internal server error")
    
    async def get_agents(
        self,
        current_user: dict,
        db: Session,
        skip: int = 0,
        limit: int = 100
    ) -> List[Agent]:
        """Get all agents for the current user's company."""
        try:
            # Validate user permissions
            if current_user["role"] not in ["company_admin", "full_control"]:
                raise HTTPException(
                    status_code=403,
                    detail="Insufficient permissions to view agents"
                )
            
            company_id = current_user["company_id"]
            
            # Get agents for the company
            agents = db.query(Agent).filter(
                Agent.company_id == company_id
            ).offset(skip).limit(limit).all()
            
            return agents
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving agents: {str(e)}")
    
    async def delete_agent(
        self,
        agent_id: int,
        current_user: dict,
        db: Session
    ) -> Dict[str, str]:
        """Delete an agent."""
        try:
            # Validate user permissions
            if current_user["role"] not in ["company_admin", "full_control"]:
                raise HTTPException(
                    status_code=403,
                    detail="Insufficient permissions to delete agents"
                )
            
            company_id = current_user["company_id"]
            
            # Get agent and validate ownership
            agent = db.query(Agent).filter(
                and_(Agent.id == agent_id, Agent.company_id == company_id)
            ).first()
            
            if not agent:
                raise HTTPException(status_code=404, detail="Agent not found")
            
            # Delete agent
            db.delete(agent)
            db.commit()
            
            return {"message": "Agent deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error deleting agent: {str(e)}") 