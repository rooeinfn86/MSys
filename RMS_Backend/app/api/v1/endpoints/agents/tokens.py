"""
Agents Token Management Endpoints - Token operations and audit logging

This module contains all token management endpoints:
- Token rotation
- Token revocation
- Audit log access
- Token status management
"""

from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.base import Agent, User, AgentTokenAuditLog
from app.schemas.agents.base import AgentResponse
from app.schemas.agents.tokens import AgentTokenAuditLogResponse
from app.services.agents.agent_token_service import AgentTokenService
from app.services.agents.agent_auth_service import AgentAuthService

router = APIRouter()

# Initialize services
token_service = AgentTokenService()
auth_service = AgentAuthService()


@router.post("/{agent_id}/rotate_token", response_model=AgentResponse)
async def rotate_agent_token(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rotate (regenerate) an agent's token."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Validate user permissions
        if user.role not in ["superadmin", "company_admin", "full_control"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Validate user access to the agent
        if user.role != "superadmin":
            if not auth_service.validate_user_organization_access(user, agent.organization_id, db):
                raise HTTPException(
                    status_code=403,
                    detail="No access to this agent"
                )
        
        # Rotate the token
        new_token = token_service.regenerate_agent_token(db, agent_id, user.id)
        
        if new_token:
            # Refresh agent data
            db.refresh(agent)
            return agent
        else:
            raise HTTPException(status_code=500, detail="Failed to rotate agent token")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rotating agent token: {str(e)}")


@router.post("/{agent_id}/revoke_token", response_model=AgentResponse)
async def revoke_agent_token(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke an agent's token."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Validate user permissions
        if user.role not in ["superadmin", "company_admin", "full_control"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Validate user access to the agent
        if user.role != "superadmin":
            if not auth_service.validate_user_organization_access(user, agent.organization_id, db):
                raise HTTPException(
                    status_code=403,
                    detail="No access to this agent"
                )
        
        # Revoke the token
        success = token_service.revoke_agent_token(db, agent_id, user.id, "manual_revocation")
        
        if success:
            # Refresh agent data
            db.refresh(agent)
            return agent
        else:
            raise HTTPException(status_code=500, detail="Failed to revoke agent token")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error revoking agent token: {str(e)}")


@router.get("/{agent_id}/audit_logs", response_model=List[AgentTokenAuditLogResponse])
async def get_agent_audit_logs(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit logs for an agent's token operations."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Validate user permissions
        if user.role not in ["superadmin", "company_admin", "full_control"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Validate user access to the agent
        if user.role != "superadmin":
            if not auth_service.validate_user_organization_access(user, agent.organization_id, db):
                raise HTTPException(
                    status_code=403,
                    detail="No access to this agent"
                )
        
        # Get audit logs
        logs = db.query(AgentTokenAuditLog).filter(
            AgentTokenAuditLog.agent_id == agent_id
        ).order_by(AgentTokenAuditLog.timestamp.desc()).all()
        
        return logs
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching audit logs: {str(e)}")


@router.post("/{agent_id}/activate_token")
async def activate_agent_token(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Activate a revoked agent token."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Validate user permissions
        if user.role not in ["superadmin", "company_admin", "full_control"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Validate user access to the agent
        if user.role != "superadmin":
            if not auth_service.validate_user_organization_access(user, agent.organization_id, db):
                raise HTTPException(
                    status_code=403,
                    detail="No access to this agent"
                )
        
        # Activate the token
        agent.token_status = "active"
        agent.revoked_at = None
        agent.updated_at = datetime.utcnow()
        
        db.commit()
        
        # Log the activation
        token_service.log_agent_token_event(
            db, agent.id, "token_activated", user_id=user.id
        )
        
        db.refresh(agent)
        return {"message": "Agent token activated successfully", "agent": agent}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error activating agent token: {str(e)}")


@router.get("/{agent_id}/token_info")
async def get_agent_token_info(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed token information for an agent."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Validate user permissions
        if user.role not in ["superadmin", "company_admin", "full_control"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Validate user access to the agent
        if user.role != "superadmin":
            if not auth_service.validate_user_organization_access(user, agent.organization_id, db):
                raise HTTPException(
                    status_code=403,
                    detail="No access to this agent"
                )
        
        # Return token information (excluding the actual token for security)
        return {
            "agent_id": agent.id,
            "agent_name": agent.name,
            "token_status": agent.token_status,
            "scopes": agent.scopes,
            "issued_at": agent.issued_at.isoformat() if agent.issued_at else None,
            "expires_at": agent.expires_at.isoformat() if agent.expires_at else None,
            "rotated_at": agent.rotated_at.isoformat() if agent.rotated_at else None,
            "revoked_at": agent.revoked_at.isoformat() if agent.revoked_at else None,
            "last_used_at": agent.last_used_at.isoformat() if agent.last_used_at else None,
            "last_used_ip": agent.last_used_ip,
            "created_by": agent.created_by
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching token info: {str(e)}")


@router.post("/{agent_id}/extend_token")
async def extend_agent_token(
    agent_id: int,
    days: int = 30,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Extend the expiration date of an agent token."""
    try:
        user = db.query(User).filter(User.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Validate user permissions
        if user.role not in ["superadmin", "company_admin", "full_control"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Validate user access to the agent
        if user.role != "superadmin":
            if not auth_service.validate_user_organization_access(user, agent.organization_id, db):
                raise HTTPException(
                    status_code=403,
                    detail="No access to this agent"
                )
        
        # Extend the token expiration
        from datetime import timedelta
        
        if agent.expires_at:
            new_expiry = agent.expires_at + timedelta(days=days)
        else:
            new_expiry = datetime.utcnow() + timedelta(days=days)
        
        agent.expires_at = new_expiry
        agent.updated_at = datetime.utcnow()
        
        db.commit()
        
        # Log the extension
        token_service.log_agent_token_event(
            db, agent.id, "token_extended", user_id=user.id,
            details={"days_added": days, "new_expiry": new_expiry.isoformat()}
        )
        
        return {
            "message": f"Agent token extended by {days} days",
            "new_expiry": new_expiry.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error extending agent token: {str(e)}") 