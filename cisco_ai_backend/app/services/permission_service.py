from typing import Optional
from sqlalchemy.orm import Session
from app.models.base import User, Network, UserNetworkAccess

class PermissionService:
    def __init__(self, db: Session):
        self.db = db
    
    def check_network_access(self, user: User, network_id: int) -> Optional[Network]:
        """Check if user has access to the network."""
        if user.role in ["superadmin", "company_admin", "full_control"]:
            return self.db.query(Network).filter(Network.id == network_id).first()
        else:
            # For engineers, check network access through UserNetworkAccess
            network_access = self.db.query(UserNetworkAccess).filter(
                UserNetworkAccess.user_id == user.id,
                UserNetworkAccess.network_id == network_id
            ).first()
            if network_access:
                return self.db.query(Network).filter(Network.id == network_id).first()
        return None
    
    def check_device_permission(self, user: User, device, action: str) -> bool:
        """Check if user can perform action on device."""
        if user.role in ["superadmin", "full_control"]:
            return True
        
        if user.role == "company_admin":
            return device.company_id == user.company_id
        
        if user.role == "engineer":
            # Check engineer tier permissions
            if not hasattr(user, 'engineer_tier') or user.engineer_tier < 2:
                return False
            
            # Check network access
            network_access = self.db.query(UserNetworkAccess).filter(
                UserNetworkAccess.user_id == user.id,
                UserNetworkAccess.network_id == device.network_id
            ).first()
            return network_access is not None
        
        return False
    
    def check_engineer_tier(self, user: User, required_tier: int) -> bool:
        """Check if engineer meets the required tier level."""
        if user.role != "engineer":
            return False
        
        if not hasattr(user, 'engineer_tier'):
            return False
        
        return user.engineer_tier >= required_tier
    
    def check_discovery_permission(self, user: User) -> bool:
        """Check if user has permission to perform device discovery."""
        if user.role in ["superadmin", "company_admin", "full_control"]:
            return True
        
        if user.role == "engineer":
            return self.check_engineer_tier(user, 2)
        
        return False
    
    def check_device_creation_permission(self, user: User) -> bool:
        """Check if user can create devices."""
        if user.role in ["superadmin", "company_admin", "full_control"]:
            return True
        
        if user.role == "engineer":
            return self.check_engineer_tier(user, 2)
        
        return False
    
    def check_device_modification_permission(self, user: User) -> bool:
        """Check if user can modify devices."""
        if user.role in ["superadmin", "company_admin", "full_control"]:
            return True
        
        if user.role == "engineer":
            return self.check_engineer_tier(user, 2)
        
        return False
    
    def check_device_deletion_permission(self, user: User) -> bool:
        """Check if user can delete devices."""
        if user.role in ["superadmin", "company_admin", "full_control"]:
            return True
        
        if user.role == "engineer":
            return self.check_engineer_tier(user, 2)
        
        return False
    
    def check_log_management_permission(self, user: User) -> bool:
        """Check if user can manage device logs."""
        if user.role in ["superadmin", "company_admin", "full_control"]:
            return True
        
        if user.role == "engineer":
            return self.check_engineer_tier(user, 3)
        
        return False 