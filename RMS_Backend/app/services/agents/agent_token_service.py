"""
Agent Token Service - Token management and audit logging

This service handles all agent token-related operations:
- Secure token generation
- Token validation
- Audit logging for token events
"""

import string
import secrets
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.base import AgentTokenAuditLog


class AgentTokenService:
    """Service class for agent token management and audit logging"""
    
    def generate_agent_token(self, length: int = 32) -> str:
        """Generate a secure random token for agent authentication."""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def log_agent_token_event(
        self, 
        db: Session, 
        agent_id: int, 
        event: str, 
        user_id: Optional[int] = None, 
        ip_address: Optional[str] = None, 
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log an agent token event for audit purposes."""
        try:
            audit = AgentTokenAuditLog(
                agent_id=agent_id,
                event_type=event,
                timestamp=datetime.utcnow(),
                user_id=user_id,
                ip_address=ip_address,
                details=details or {}
            )
            db.add(audit)
            db.commit()
        except Exception as e:
            # Log error but don't fail the main operation
            db.rollback()
            # In production, you might want to log this to a separate error log
            print(f"Failed to log agent token event: {e}")
    
    def validate_token_format(self, token: str) -> bool:
        """Validate that a token has the correct format."""
        if not token or len(token) < 16:
            return False
        
        # Check if token contains only valid characters
        valid_chars = set(string.ascii_letters + string.digits)
        return all(char in valid_chars for char in token)
    
    def revoke_agent_token(
        self, 
        db: Session, 
        agent_id: int, 
        user_id: Optional[int] = None,
        reason: str = "manual_revocation"
    ) -> bool:
        """Revoke an agent token and log the event."""
        try:
            from app.models.base import Agent
            
            # Update agent token status
            agent = db.query(Agent).filter(Agent.id == agent_id).first()
            if not agent:
                return False
            
            agent.token_status = "revoked"
            agent.revoked_at = datetime.utcnow()
            agent.revoked_by = user_id
            agent.revocation_reason = reason
            
            db.commit()
            
            # Log the revocation
            self.log_agent_token_event(
                db, 
                agent_id, 
                "token_revoked", 
                user_id=user_id,
                details={"reason": reason}
            )
            
            return True
            
        except Exception as e:
            db.rollback()
            print(f"Failed to revoke agent token: {e}")
            return False
    
    def regenerate_agent_token(
        self, 
        db: Session, 
        agent_id: int, 
        user_id: Optional[int] = None
    ) -> Optional[str]:
        """Regenerate an agent token and log the event."""
        try:
            from app.models.base import Agent
            
            # Generate new token
            new_token = self.generate_agent_token()
            
            # Update agent with new token
            agent = db.query(Agent).filter(Agent.id == agent_id).first()
            if not agent:
                return None
            
            # Log the old token revocation
            self.log_agent_token_event(
                db, 
                agent_id, 
                "token_regenerated", 
                user_id=user_id,
                details={"old_token_id": agent.agent_token[:8] + "..."}
            )
            
            # Update token
            agent.agent_token = new_token
            agent.token_status = "active"
            agent.issued_at = datetime.utcnow()
            agent.issued_by = user_id
            
            db.commit()
            
            return new_token
            
        except Exception as e:
            db.rollback()
            print(f"Failed to regenerate agent token: {e}")
            return None 