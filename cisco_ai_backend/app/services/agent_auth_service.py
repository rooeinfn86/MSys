"""
Agent Auth Service - Authentication and authorization for agents
Extracted from agents.py to improve code organization and maintainability
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.base import Agent, AgentTokenAuditLog, User

logger = logging.getLogger(__name__)


class AgentAuthService:
    """Service for managing agent authentication and authorization"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def authenticate_agent(self, agent_token: str, ip_address: Optional[str] = None) -> Optional[Agent]:
        """Authenticate an agent using their token."""
        try:
            # Find agent by token
            agent = self.db.query(Agent).filter(
                Agent.agent_token == agent_token,
                Agent.token_status == "active"
            ).first()
            
            if not agent:
                logger.warning(f"Authentication failed: Invalid or inactive token")
                return None
            
            # Check if token is expired
            if agent.issued_at and agent.issued_at < datetime.now(timezone.utc) - timedelta(days=365):
                logger.warning(f"Authentication failed: Token expired for agent {agent.id}")
                return None
            
            # Check if token is revoked
            if agent.token_status == "revoked":
                logger.warning(f"Authentication failed: Token revoked for agent {agent.id}")
                return None
            
            # Update last used timestamp
            agent.last_used_at = datetime.now(timezone.utc)
            if ip_address:
                agent.last_ip = ip_address
            
            self.db.commit()
            
            # Log successful authentication
            self.log_auth_event(agent.id, "authentication_success", ip_address=ip_address)
            
            logger.info(f"Agent {agent.id} authenticated successfully from {ip_address or 'unknown IP'}")
            return agent
            
        except Exception as e:
            logger.error(f"Error during agent authentication: {e}")
            return None
    
    def validate_agent_permissions(self, agent: Agent, network_id: int) -> bool:
        """Validate that an agent has access to a specific network."""
        try:
            from app.models.base import AgentNetworkAccess
            
            # Check if agent has access to the network
            access = self.db.query(AgentNetworkAccess).filter(
                AgentNetworkAccess.agent_id == agent.id,
                AgentNetworkAccess.network_id == network_id
            ).first()
            
            if not access:
                logger.warning(f"Agent {agent.id} does not have access to network {network_id}")
                return False
            
            # Check if agent is online and active
            if agent.status != "online" or agent.token_status != "active":
                logger.warning(f"Agent {agent.id} is not online or active")
                return False
            
            # Check if agent's last heartbeat is recent (within 5 minutes)
            if agent.last_heartbeat and agent.last_heartbeat < datetime.now(timezone.utc) - timedelta(minutes=5):
                logger.warning(f"Agent {agent.id} heartbeat is too old")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating agent permissions: {e}")
            return False
    
    def check_agent_capabilities(self, agent: Agent, required_capabilities: list) -> bool:
        """Check if an agent has the required capabilities."""
        try:
            if not agent.capabilities:
                logger.warning(f"Agent {agent.id} has no capabilities defined")
                return False
            
            # Check if agent has all required capabilities
            for capability in required_capabilities:
                if capability not in agent.capabilities:
                    logger.warning(f"Agent {agent.id} missing required capability: {capability}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking agent capabilities: {e}")
            return False
    
    def log_auth_event(self, agent_id: int, event_type: str, user_id: Optional[int] = None, 
                       ip_address: Optional[str] = None, details: Optional[Dict] = None) -> None:
        """Log authentication event for audit purposes."""
        try:
            audit = AgentTokenAuditLog(
                agent_id=agent_id,
                event_type=event_type,
                timestamp=datetime.now(timezone.utc),
                user_id=user_id,
                ip_address=ip_address,
                details=details or {}
            )
            self.db.add(audit)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error logging auth event: {e}")
            self.db.rollback()
    
    def revoke_agent_token(self, agent_id: int, user_id: int, reason: str = "Manual revocation") -> bool:
        """Revoke an agent's token."""
        try:
            agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
            if not agent:
                logger.error(f"Agent {agent_id} not found")
                return False
            
            # Revoke token
            agent.token_status = "revoked"
            agent.revoked_at = datetime.now(timezone.utc)
            agent.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            
            # Log revocation
            self.log_auth_event(
                agent_id, 
                "token_revoked", 
                user_id=user_id,
                details={"reason": reason}
            )
            
            logger.info(f"Agent {agent_id} token revoked by user {user_id}: {reason}")
            return True
            
        except Exception as e:
            logger.error(f"Error revoking agent token: {e}")
            self.db.rollback()
            return False
    
    def rotate_agent_token(self, agent_id: int, user_id: int) -> Optional[str]:
        """Rotate an agent's token."""
        try:
            from app.services.agent_service import AgentService
            
            agent_service = AgentService(self.db)
            # Note: This would need to be called asynchronously from the calling function
            # For now, we'll handle this differently to avoid circular dependencies
            logger.info(f"Token rotation requested for agent {agent_id} by user {user_id}")
            
            # Log token rotation request
            self.log_auth_event(
                agent_id, 
                "token_rotation_requested", 
                user_id=user_id
            )
            
            return "token_rotation_requested"
            
        except Exception as e:
            logger.error(f"Error requesting agent token rotation: {e}")
            return None
    
    def get_agent_auth_history(self, agent_id: int, limit: int = 100) -> list:
        """Get authentication history for an agent."""
        try:
            audit_logs = self.db.query(AgentTokenAuditLog).filter(
                AgentTokenAuditLog.agent_id == agent_id
            ).order_by(AgentTokenAuditLog.timestamp.desc()).limit(limit).all()
            
            return [
                {
                    "event_type": log.event_type,
                    "timestamp": log.timestamp.isoformat(),
                    "user_id": log.user_id,
                    "ip_address": log.ip_address,
                    "details": log.details
                }
                for log in audit_logs
            ]
            
        except Exception as e:
            logger.error(f"Error getting agent auth history: {e}")
            return []
    
    def validate_user_agent_access(self, user: User, agent_id: int) -> bool:
        """Validate that a user has access to manage an agent."""
        try:
            agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
            if not agent:
                return False
            
            # Superadmin can access all agents
            if user.role == "superadmin":
                return True
            
            # Company admin can access agents in their company
            if user.role == "company_admin" and agent.company_id == user.company_id:
                return True
            
            # Full control users can access agents in their company
            if user.role == "full_control" and agent.company_id == user.company_id:
                return True
            
            # Engineers cannot manage agents
            if user.role == "engineer":
                return False
            
            return False
            
        except Exception as e:
            logger.error(f"Error validating user agent access: {e}")
            return False
    
    def get_agent_security_status(self, agent_id: int) -> Dict[str, Any]:
        """Get security status for an agent."""
        try:
            agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
            if not agent:
                return {"error": "Agent not found"}
            
            # Calculate token age
            token_age_days = None
            if agent.issued_at:
                token_age_days = (datetime.now(timezone.utc) - agent.issued_at).days
            
            # Get recent auth events
            recent_events = self.get_agent_auth_history(agent_id, limit=10)
            
            # Check for suspicious activity
            failed_auths = [e for e in recent_events if e["event_type"] == "authentication_failed"]
            successful_auths = [e for e in recent_events if e["event_type"] == "authentication_success"]
            
            security_score = 100  # Start with perfect score
            
            # Deduct points for various security issues
            if token_age_days and token_age_days > 90:
                security_score -= 20  # Old token
            
            if len(failed_auths) > len(successful_auths):
                security_score -= 30  # More failed than successful auths
            
            if agent.status != "online":
                security_score -= 10  # Agent offline
            
            if agent.token_status != "active":
                security_score -= 50  # Token not active
            
            return {
                "agent_id": agent_id,
                "token_status": agent.token_status,
                "token_age_days": token_age_days,
                "last_used": agent.last_used_at.isoformat() if agent.last_used_at else None,
                "last_ip": agent.last_ip,
                "security_score": max(0, security_score),
                "recent_events": recent_events,
                "failed_auths_count": len(failed_auths),
                "successful_auths_count": len(successful_auths),
                "recommendations": self._get_security_recommendations(security_score, token_age_days, agent)
            }
            
        except Exception as e:
            logger.error(f"Error getting agent security status: {e}")
            return {"error": str(e)}
    
    def _get_security_recommendations(self, security_score: int, token_age_days: Optional[int], agent: Agent) -> list:
        """Get security recommendations based on agent status."""
        recommendations = []
        
        if security_score < 50:
            recommendations.append("CRITICAL: Immediate attention required")
        
        if token_age_days and token_age_days > 90:
            recommendations.append("Consider rotating the agent token")
        
        if agent.status != "online":
            recommendations.append("Agent appears to be offline - investigate connectivity")
        
        if agent.token_status != "active":
            recommendations.append("Token is not active - check if it was revoked")
        
        if security_score < 70:
            recommendations.append("Review recent authentication events for suspicious activity")
        
        if not recommendations:
            recommendations.append("Security status is good - no immediate action required")
        
        return recommendations 