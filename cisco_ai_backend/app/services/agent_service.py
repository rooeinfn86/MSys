"""
Agent Service - Core agent management operations
Extracted from agents.py to improve code organization and maintainability
"""

import logging
import secrets
import string
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.base import (
    User, Company, Organization, Network, Agent, AgentNetworkAccess,
    UserOrganizationAccess, UserNetworkAccess, AgentTokenAuditLog
)
from app.schemas.base import AgentCreate, AgentUpdate, AgentResponse, AgentRegistration

logger = logging.getLogger(__name__)


class AgentService:
    """Service for managing agent operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_agent_token(self, length: int = 32) -> str:
        """Generate a secure random token for agent authentication."""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def validate_user_organization_access(self, user: User, organization_id: int) -> bool:
        """Validate that user has access to the organization."""
        if user.role == "superadmin":
            return True
        
        # Check if user owns the organization
        org = self.db.query(Organization).filter(Organization.id == organization_id).first()
        if org and org.owner_id == user.id:
            return True
        
        # Check if user has explicit access to the organization
        access = self.db.query(UserOrganizationAccess).filter(
            and_(
                UserOrganizationAccess.user_id == user.id,
                UserOrganizationAccess.organization_id == organization_id
            )
        ).first()
        
        return access is not None
    
    def validate_user_network_access(self, user: User, network_id: int) -> bool:
        """Validate that user has access to the network."""
        if user.role == "superadmin":
            return True
        
        # Check if user has explicit access to the network
        access = self.db.query(UserNetworkAccess).filter(
            and_(
                UserNetworkAccess.user_id == user.id,
                UserNetworkAccess.network_id == network_id
            )
        ).first()
        
        if access:
            return True
        
        # Check if user owns the organization that contains this network
        network = self.db.query(Network).filter(Network.id == network_id).first()
        if network:
            return self.validate_user_organization_access(user, network.organization_id)
        
        return False
    
    def log_agent_token_event(self, agent_id: int, event: str, user_id: Optional[int] = None, 
                             ip_address: Optional[str] = None, details: Optional[Dict] = None) -> None:
        """Log agent token event for audit purposes."""
        audit = AgentTokenAuditLog(
            agent_id=agent_id,
            event_type=event,
            timestamp=datetime.now(timezone.utc),
            user_id=user_id,
            ip_address=ip_address,
            details=details or {}
        )
        self.db.add(audit)
        self.db.commit()
    
    async def register_agent(self, agent_data: AgentRegistration, current_user: dict) -> Agent:
        """Register a new agent for an organization."""
        try:
            # Get user from database
            user = self.db.query(User).filter(User.id == current_user["user_id"]).first()
            if not user:
                raise ValueError("User not found")
            
            # Only company_admin and full_control users can register agents
            if user.role not in ["company_admin", "full_control"]:
                raise ValueError("Only company_admin and full_control users can register agents")
            
            company_id = user.company_id
            
            # Validate organization belongs to the company
            org = self.db.query(Organization).filter(Organization.id == agent_data.organization_id).first()
            if not org:
                raise ValueError("Organization not found")
            
            # Check if organization belongs to the company
            org_owner = self.db.query(User).filter(User.id == org.owner_id).first()
            if not org_owner or org_owner.company_id != company_id:
                raise ValueError("Organization does not belong to your company")
            
            # Validate networks belong to the organization
            networks = self.db.query(Network).filter(
                and_(
                    Network.id.in_(agent_data.networks),
                    Network.organization_id == agent_data.organization_id
                )
            ).all()
            
            if len(networks) != len(agent_data.networks):
                raise ValueError("Some networks do not belong to the specified organization")
            
            # Generate secure agent token
            agent_token = self.generate_agent_token()
            now = datetime.now(timezone.utc)
            
            # Create agent - use company_id from token
            agent = Agent(
                name=agent_data.name,
                company_id=company_id,
                organization_id=agent_data.organization_id,
                agent_token=agent_token,
                capabilities=agent_data.capabilities.model_dump() if hasattr(agent_data.capabilities, 'model_dump') else agent_data.capabilities,
                version=agent_data.version,
                status="offline",
                token_status="active",
                scopes=["monitoring", "heartbeat"],
                issued_at=now,
                created_by=user.id
            )
            
            self.db.add(agent)
            self.db.flush()  # Get the agent ID
            
            # Create network access records
            for network_id in agent_data.networks:
                network_access = AgentNetworkAccess(
                    agent_id=agent.id,
                    network_id=network_id,
                    company_id=company_id,
                    organization_id=agent_data.organization_id
                )
                self.db.add(network_access)
            
            self.db.commit()
            self.db.refresh(agent)
            
            # Log issuance
            self.log_agent_token_event(agent.id, event="issued", user_id=user.id)
            return agent
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    async def get_agent(self, agent_id: int) -> Optional[Agent]:
        """Get agent by ID."""
        return self.db.query(Agent).filter(Agent.id == agent_id).first()
    
    async def get_agent_by_token(self, agent_token: str) -> Optional[Agent]:
        """Get agent by token."""
        return self.db.query(Agent).filter(Agent.agent_token == agent_token).first()
    
    async def get_all_agents(self) -> List[Agent]:
        """Get all agents."""
        return self.db.query(Agent).all()
    
    async def get_agents_by_company(self, company_id: int) -> List[Agent]:
        """Get agents by company ID."""
        return self.db.query(Agent).filter(Agent.company_id == company_id).all()
    
    async def get_online_agents_for_network(self, network_id: int) -> List[Agent]:
        """Get online agents that have access to a specific network."""
        from datetime import timedelta
        
        return self.db.query(Agent).join(AgentNetworkAccess).filter(
            and_(
                AgentNetworkAccess.network_id == network_id,
                Agent.status == "online",
                Agent.token_status == "active",
                Agent.last_heartbeat >= datetime.now(timezone.utc) - timedelta(minutes=5)
            )
        ).all()
    
    async def update_agent_heartbeat(self, agent_id: int, ip_address: Optional[str] = None) -> None:
        """Update agent heartbeat timestamp."""
        agent = await self.get_agent(agent_id)
        if agent:
            agent.last_heartbeat = datetime.now(timezone.utc)
            agent.last_used_at = datetime.now(timezone.utc)
            if ip_address:
                agent.last_ip = ip_address
            self.db.commit()
    
    async def update_agent_status(self, agent_id: int, status: str) -> None:
        """Update agent status."""
        agent = await self.get_agent(agent_id)
        if agent:
            agent.status = status
            agent.updated_at = datetime.now(timezone.utc)
            self.db.commit()
    
    async def rotate_agent_token(self, agent_id: int, current_user: dict) -> Agent:
        """Rotate agent token."""
        try:
            user = self.db.query(User).filter(User.id == current_user["user_id"]).first()
            if not user:
                raise ValueError("User not found")
            
            agent = await self.get_agent(agent_id)
            if not agent:
                raise ValueError("Agent not found")
            
            # Generate new token
            new_token = self.generate_agent_token()
            old_token = agent.agent_token
            
            # Update agent
            agent.agent_token = new_token
            agent.rotated_at = datetime.now(timezone.utc)
            agent.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            
            # Log token rotation
            self.log_agent_token_event(
                agent_id, 
                event="rotated", 
                user_id=user.id,
                details={"old_token": old_token[:8] + "...", "new_token": new_token[:8] + "..."}
            )
            
            return agent
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    async def revoke_agent_token(self, agent_id: int, current_user: dict) -> Agent:
        """Revoke agent token."""
        try:
            user = self.db.query(User).filter(User.id == current_user["user_id"]).first()
            if not user:
                raise ValueError("User not found")
            
            agent = await self.get_agent(agent_id)
            if not agent:
                raise ValueError("Agent not found")
            
            # Revoke token
            agent.token_status = "revoked"
            agent.revoked_at = datetime.now(timezone.utc)
            agent.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            
            # Log token revocation
            self.log_agent_token_event(
                agent_id, 
                event="revoked", 
                user_id=user.id
            )
            
            return agent
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    async def delete_agent(self, agent_id: int, current_user: dict) -> bool:
        """Delete agent."""
        try:
            user = self.db.query(User).filter(User.id == current_user["user_id"]).first()
            if not user:
                raise ValueError("User not found")
            
            agent = await self.get_agent(agent_id)
            if not agent:
                raise ValueError("Agent not found")
            
            # Check permissions
            if user.role not in ["superadmin", "full_control"]:
                if user.role == "company_admin" and agent.company_id != user.company_id:
                    raise ValueError("Not authorized to delete this agent")
                elif user.role == "engineer":
                    raise ValueError("Engineers cannot delete agents")
            
            # Delete network access records first
            network_accesses = self.db.query(AgentNetworkAccess).filter(
                AgentNetworkAccess.agent_id == agent_id
            ).all()
            
            for access in network_accesses:
                self.db.delete(access)
            
            # Delete audit logs
            audit_logs = self.db.query(AgentTokenAuditLog).filter(
                AgentTokenAuditLog.agent_id == agent_id
            ).all()
            
            for log in audit_logs:
                self.db.delete(log)
            
            # Delete the agent
            self.db.delete(agent)
            self.db.commit()
            
            # Log deletion
            self.log_agent_token_event(
                agent_id, 
                event="deleted", 
                user_id=user.id
            )
            
            return True
            
        except Exception as e:
            self.db.rollback()
            raise e 