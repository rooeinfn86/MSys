from sqlalchemy.orm import Session
from typing import Optional, Union
from app.models.base import User, Network, UserNetworkAccess

class PermissionService:
    def __init__(self, db: Session):
        self.db = db
    
    def _get_user_info(self, user: Union[User, dict]) -> tuple:
        """Extract user info from either User object or dict (JWT payload)."""
        if isinstance(user, dict):
            # JWT payload dict
            return user.get("user_id"), user.get("role"), user.get("company_id")
        else:
            # User object
            return user.id, user.role, user.company_id
    
    def check_network_access(self, user: Union[User, dict], network_id: int) -> Optional[Network]:
        """Check if user has access to the network."""
        user_id, role, company_id = self._get_user_info(user)
        
        if role in ["superadmin", "company_admin", "full_control"]:
            return self.db.query(Network).filter(Network.id == network_id).first()
        else:
            # For engineers, check network access through UserNetworkAccess
            network_access = self.db.query(UserNetworkAccess).filter(
                UserNetworkAccess.user_id == user_id,
                UserNetworkAccess.network_id == network_id
            ).first()
            if network_access:
                return self.db.query(Network).filter(Network.id == network_id).first()
        return None
    
    def check_device_permission(self, user: Union[User, dict], device, action: str) -> bool:
        """Check if user can perform action on device."""
        user_id, role, company_id = self._get_user_info(user)
        
        if role in ["superadmin", "full_control"]:
            return True
        
        if role == "company_admin":
            return device.company_id == company_id
        
        if role == "engineer":
            # Check engineer tier permissions
            if not self.check_engineer_tier(user, 2):
                return False
            
            # Check network access
            network_access = self.db.query(UserNetworkAccess).filter(
                UserNetworkAccess.user_id == user_id,
                UserNetworkAccess.network_id == device.network_id
            ).first()
            return network_access is not None
        
        return False
    
    def check_engineer_tier(self, user: Union[User, dict], required_tier: int) -> bool:
        """Check if engineer meets the required tier level."""
        user_id, role, company_id = self._get_user_info(user)
        
        if role != "engineer":
            return False
        
        # For dict (JWT payload), we need to fetch the User object to get engineer_tier
        if isinstance(user, dict):
            user_obj = self.db.query(User).filter(User.id == user_id).first()
            if not user_obj or not hasattr(user_obj, 'engineer_tier'):
                return False
            return user_obj.engineer_tier >= required_tier
        else:
            # User object
            if not hasattr(user, 'engineer_tier'):
                return False
            return user.engineer_tier >= required_tier
    
    def check_discovery_permission(self, user: Union[User, dict]) -> bool:
        """Check if user has permission to perform device discovery."""
        user_id, role, company_id = self._get_user_info(user)
        
        if role in ["superadmin", "company_admin", "full_control"]:
            return True
        
        if role == "engineer":
            return self.check_engineer_tier(user, 2)
        
        return False
    
    def check_device_creation_permission(self, user: Union[User, dict]) -> bool:
        """Check if user can create devices."""
        user_id, role, company_id = self._get_user_info(user)
        
        if role in ["superadmin", "company_admin", "full_control"]:
            return True
        
        if role == "engineer":
            return self.check_engineer_tier(user, 2)
        
        return False
    
    def check_device_modification_permission(self, user: Union[User, dict]) -> bool:
        """Check if user can modify devices."""
        user_id, role, company_id = self._get_user_info(user)
        
        if role in ["superadmin", "company_admin", "full_control"]:
            return True
        
        if role == "engineer":
            return self.check_engineer_tier(user, 2)
        
        return False
    
    def check_device_deletion_permission(self, user: Union[User, dict]) -> bool:
        """Check if user can delete devices."""
        user_id, role, company_id = self._get_user_info(user)
        
        if role in ["superadmin", "company_admin", "full_control"]:
            return True
        
        if role == "engineer":
            return self.check_engineer_tier(user, 2)
        
        return False
    
    def check_log_management_permission(self, user: Union[User, dict]) -> bool:
        """Check if user can manage device logs."""
        user_id, role, company_id = self._get_user_info(user)
        
        if role in ["superadmin", "company_admin", "full_control"]:
            return True
        
        if role == "engineer":
            return self.check_engineer_tier(user, 3)
        
        return False 