from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    devices,
    org_network,
    organizations,
    compliance,
    topology,
    agents,
    company_tokens
)
from app.api.v1.endpoints.devices_crud import router as devices_crud_router
from app.api.v1.endpoints.device_discovery import router as device_discovery_router
from app.api.v1.endpoints.device_status import router as device_status_router

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(devices.router, prefix="/devices", tags=["devices"])
api_router.include_router(devices_crud_router, prefix="/devices", tags=["Device CRUD"])
api_router.include_router(device_discovery_router, prefix="/devices", tags=["Device Discovery"])
api_router.include_router(device_status_router, prefix="/devices", tags=["Device Status"])
api_router.include_router(org_network.router, prefix="/org-network", tags=["networks"])
api_router.include_router(organizations.router, prefix="/org-network", tags=["organizations"])
api_router.include_router(compliance.router, prefix="/compliance", tags=["compliance"])
api_router.include_router(topology.router, prefix="/topology", tags=["topology"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(company_tokens.router, prefix="/company-tokens", tags=["company-tokens"]) 