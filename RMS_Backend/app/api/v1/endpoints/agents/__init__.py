"""
Agents Endpoints Package

This package contains all agent-related API endpoints organized by functionality:
- CRUD operations
- Discovery operations
- Authentication and agent-specific endpoints
- Token management

This package also maintains backward compatibility with the legacy agents.py file
by providing the same router and global variables.
"""

from fastapi import APIRouter
from . import crud, discovery, authentication, tokens

# Import global state from the new agents service
from app.services.agents import pending_discovery_requests, discovery_sessions

# Create the main agents router (no prefix since it will be added by main API router)
agents_router = APIRouter(tags=["agents"])

# Include all sub-routers
agents_router.include_router(crud.router, prefix="")
agents_router.include_router(discovery.router, prefix="")
agents_router.include_router(authentication.router, prefix="")
agents_router.include_router(tokens.router, prefix="")

# Create alias for backward compatibility
router = agents_router

# Export the main router and global variables
__all__ = ["agents_router", "router", "pending_discovery_requests", "discovery_sessions"] 