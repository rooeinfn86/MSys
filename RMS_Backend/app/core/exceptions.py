from fastapi import HTTPException
from typing import Any, Dict, Optional

class BaseCustomException(HTTPException):
    """Base custom exception class."""
    def __init__(self, status_code: int, detail: str, headers: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status_code, detail=detail, headers=headers)

class PermissionDeniedError(BaseCustomException):
    """Raised when user doesn't have permission to perform an action."""
    def __init__(self, detail: str = "Permission denied"):
        super().__init__(status_code=403, detail=detail)

class ResourceNotFoundError(BaseCustomException):
    """Raised when a requested resource is not found."""
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=404, detail=detail)

class ValidationError(BaseCustomException):
    """Raised when input validation fails."""
    def __init__(self, detail: str = "Validation error"):
        super().__init__(status_code=400, detail=detail)

class AuthenticationError(BaseCustomException):
    """Raised when authentication fails."""
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=401, detail=detail)

class NetworkAccessError(BaseCustomException):
    """Raised when user doesn't have access to a network."""
    def __init__(self, detail: str = "No access to this network"):
        super().__init__(status_code=403, detail=detail)

class DeviceOperationError(BaseCustomException):
    """Raised when a device operation fails."""
    def __init__(self, detail: str = "Device operation failed"):
        super().__init__(status_code=400, detail=detail)

class DiscoveryError(BaseCustomException):
    """Raised when device discovery fails."""
    def __init__(self, detail: str = "Device discovery failed"):
        super().__init__(status_code=500, detail=detail)

class SNMPError(BaseCustomException):
    """Raised when SNMP operations fail."""
    def __init__(self, detail: str = "SNMP operation failed"):
        super().__init__(status_code=400, detail=detail)

class SSHConnectionError(BaseCustomException):
    """Raised when SSH connection fails."""
    def __init__(self, detail: str = "SSH connection failed"):
        super().__init__(status_code=400, detail=detail)

class RateLimitExceededError(BaseCustomException):
    """Raised when rate limit is exceeded."""
    def __init__(self, detail: str = "Rate limit exceeded", retry_after: int = 60):
        headers = {"Retry-After": str(retry_after)}
        super().__init__(status_code=429, detail=detail, headers=headers)

class ServiceUnavailableError(BaseCustomException):
    """Raised when a service is temporarily unavailable."""
    def __init__(self, detail: str = "Service temporarily unavailable"):
        super().__init__(status_code=503, detail=detail)

class ConfigurationError(BaseCustomException):
    """Raised when there's a configuration error."""
    def __init__(self, detail: str = "Configuration error"):
        super().__init__(status_code=500, detail=detail)

class DatabaseError(BaseCustomException):
    """Raised when a database operation fails."""
    def __init__(self, detail: str = "Database operation failed"):
        super().__init__(status_code=500, detail=detail)

class ExternalServiceError(BaseCustomException):
    """Raised when an external service call fails."""
    def __init__(self, detail: str = "External service error"):
        super().__init__(status_code=502, detail=detail)

class TimeoutError(BaseCustomException):
    """Raised when an operation times out."""
    def __init__(self, detail: str = "Operation timed out"):
        super().__init__(status_code=408, detail=detail)

class InsufficientResourcesError(BaseCustomException):
    """Raised when there are insufficient resources."""
    def __init__(self, detail: str = "Insufficient resources"):
        super().__init__(status_code=507, detail=detail) 