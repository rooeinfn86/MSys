"""
Agent Auth Service - Authentication and authorization logic

This service handles all agent-related authentication and authorization:
- User organization access validation
- User network access validation
- Permission checking for agent operations
"""

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.base import User, Organization, Network, UserOrganizationAccess, UserNetworkAccess


class AgentAuthService:
    """Service class for agent authentication and authorization"""
    
    def validate_user_organization_access(
        self, 
        user: User, 
        organization_id: int, 
        db: Session
    ) -> bool:
        """Validate that user has access to the organization."""
        if user.role == "superadmin":
            return True
        
        # Check if user owns the organization
        org = db.query(Organization).filter(Organization.id == organization_id).first()
        if org and org.owner_id == user.id:
            return True
        
        # Check if user has explicit access to the organization
        access = db.query(UserOrganizationAccess).filter(
            and_(
                UserOrganizationAccess.user_id == user.id,
                UserOrganizationAccess.organization_id == organization_id
            )
        ).first()
        
        return access is not None
    
    def validate_user_network_access(
        self, 
        user: User, 
        network_id: int, 
        db: Session
    ) -> bool:
        """Validate that user has access to the network."""
        if user.role == "superadmin":
            return True
        
        # Check if user has explicit access to the network
        access = db.query(UserNetworkAccess).filter(
            and_(
                UserNetworkAccess.user_id == user.id,
                UserNetworkAccess.network_id == network_id
            )
        ).first()
        
        if access:
            return True
        
        # Check if user owns the organization that contains this network
        network = db.query(Network).filter(Network.id == network_id).first()
        if network:
            return self.validate_user_organization_access(user, network.organization_id, db)
        
        return False
    
    def validate_agent_token(
        self, 
        agent_token: str, 
        db: Session
    ) -> Optional[dict]:
        """Validate agent token and return agent info if valid."""
        from app.models.base import Agent
        
        agent = db.query(Agent).filter(Agent.agent_token == agent_token).first()
        if not agent:
            return None
        
        if agent.token_status != "active":
            return None
        
        return {
            "id": agent.id,
            "name": agent.name,
            "company_id": agent.company_id,
            "organization_id": agent.organization_id,
            "capabilities": agent.capabilities,
            "scopes": agent.scopes
        }
    
    def check_agent_permission(
        self, 
        agent_info: dict, 
        required_scope: str
    ) -> bool:
        """Check if agent has required permission scope."""
        return required_scope in agent_info.get("scopes", [])
    
    def validate_user_agent_permissions(
        self, 
        user: User, 
        required_role: str = "company_admin"
    ) -> bool:
        """Validate that user has required role for agent operations."""
        if user.role == "superadmin":
            return True
        
        return user.role in [required_role, "full_control"] 