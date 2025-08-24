from app.api.v1.endpoints import auth, users, compliance, reports, organizations, company_tokens
from .devices_crud import router as devices_crud_router
from .device_discovery import router as device_discovery_router
from .device_status import router as device_status_router

# Include all routers
routers = [
    devices_crud_router,
    device_discovery_router,
    device_status_router
]

__all__ = ["auth", "users", "compliance", "reports", "organizations", "company_tokens"]

