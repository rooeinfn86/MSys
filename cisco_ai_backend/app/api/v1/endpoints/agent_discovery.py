"""
Agent Discovery Endpoints
Handle device and network discovery operations
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.api.deps import get_db
from app.services.agent_discovery_service import AgentDiscoveryService
from app.services.agent_status_service import AgentStatusService
from app.utils.discovery_utils import (
    parse_ip_range, validate_discovery_credentials, 
    create_discovery_session_id, calculate_discovery_metrics
)
from app.schemas.agent.discovery import (
    DiscoveryRequest, DiscoveryResponse, DiscoveryProgress,
    DiscoverySession, DiscoveryResult
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/discovery/start", response_model=DiscoveryResponse)
async def start_discovery(
    request: DiscoveryRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new discovery operation."""
    try:
        discovery_service = AgentDiscoveryService(db)
        status_service = AgentStatusService()
        
        # Validate discovery credentials
        is_valid, errors = validate_discovery_credentials(request.credentials)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid discovery credentials: {', '.join(errors)}"
            )
        
        # Parse IP range
        ips, start_ip, end_ip = parse_ip_range(request.ip_range)
        if not ips:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid IP range format"
            )
        
        # Start discovery operation
        discovery_session = await discovery_service.start_discovery(
            network_id=request.network_id,
            ip_range=request.ip_range,
            ips=ips,
            credentials=request.credentials,
            current_user=current_user
        )
        
        # Create status tracking
        status_service.create_discovery_request(
            session_id=discovery_session.session_id,
            network_id=request.network_id,
            ips=ips,
            credentials=request.credentials
        )
        
        return DiscoveryResponse(
            session_id=discovery_session.session_id,
            status="started",
            message="Discovery operation started successfully",
            total_ips=len(ips),
            estimated_time=discovery_session.estimated_time,
            session=discovery_session
        )
        
    except Exception as e:
        logger.error(f"Error starting discovery: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start discovery: {str(e)}"
        )


@router.get("/discovery/{session_id}/status", response_model=DiscoveryProgress)
async def get_discovery_status(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get discovery operation status."""
    try:
        status_service = AgentStatusService()
        discovery_service = AgentDiscoveryService(db)
        
        # Get discovery session
        session = await discovery_service.get_discovery_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discovery session not found"
            )
        
        # Get progress from status service
        progress = status_service.get_discovery_session(session_id)
        if not progress:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discovery progress not found"
            )
        
        return DiscoveryProgress(
            session_id=session_id,
            status=progress.get('status', 'unknown'),
            progress_percentage=progress.get('progress_percentage', 0),
            discovered_devices=progress.get('discovered_devices', 0),
            total_ips=progress.get('total_ips', 0),
            errors=progress.get('errors', []),
            start_time=progress.get('start_time'),
            estimated_completion=progress.get('estimated_completion')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting discovery status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get discovery status: {str(e)}"
        )


@router.post("/discovery/{session_id}/cancel")
async def cancel_discovery(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel an active discovery operation."""
    try:
        discovery_service = AgentDiscoveryService(db)
        status_service = AgentStatusService()
        
        # Cancel discovery
        success = await discovery_service.cancel_discovery(session_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discovery session not found or already completed"
            )
        
        # Cleanup status tracking
        status_service.cleanup_discovery_request(session_id)
        
        return {
            "message": "Discovery operation cancelled successfully",
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling discovery: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel discovery: {str(e)}"
        )


@router.get("/discovery/{session_id}/results", response_model=List[DiscoveryResult])
async def get_discovery_results(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get discovery results for a completed session."""
    try:
        discovery_service = AgentDiscoveryService(db)
        
        # Get discovery results
        results = await discovery_service.get_discovery_results(session_id)
        if not results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discovery results not found"
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting discovery results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get discovery results: {str(e)}"
        )


@router.post("/discovery/{session_id}/results")
async def submit_discovery_results(
    session_id: str,
    results: List[Dict[str, Any]] = Body(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit discovery results from agent."""
    try:
        discovery_service = AgentDiscoveryService(db)
        status_service = AgentStatusService()
        
        # Process discovery results
        processed_results = await discovery_service.process_discovery_results(
            session_id=session_id,
            results=results,
            current_user=current_user
        )
        
        # Update status tracking
        status_service.add_discovery_results(session_id, processed_results)
        
        return {
            "message": "Discovery results submitted successfully",
            "session_id": session_id,
            "devices_processed": len(processed_results)
        }
        
    except Exception as e:
        logger.error(f"Error submitting discovery results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit discovery results: {str(e)}"
        )


@router.get("/discovery/sessions", response_model=List[DiscoverySession])
async def list_discovery_sessions(
    network_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List discovery sessions with optional filtering."""
    try:
        discovery_service = AgentDiscoveryService(db)
        
        # Get discovery sessions
        sessions = await discovery_service.list_discovery_sessions(
            network_id=network_id,
            status=status,
            current_user=current_user
        )
        
        return sessions
        
    except Exception as e:
        logger.error(f"Error listing discovery sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list discovery sessions: {str(e)}"
        )


@router.delete("/discovery/{session_id}")
async def delete_discovery_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a discovery session and its data."""
    try:
        discovery_service = AgentDiscoveryService(db)
        status_service = AgentStatusService()
        
        # Delete discovery session
        success = await discovery_service.delete_discovery_session(session_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discovery session not found"
            )
        
        # Cleanup status tracking
        status_service.cleanup_discovery_request(session_id)
        
        return {
            "message": "Discovery session deleted successfully",
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting discovery session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete discovery session: {str(e)}"
        )


@router.get("/discovery/{session_id}/metrics")
async def get_discovery_metrics(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get discovery performance metrics."""
    try:
        discovery_service = AgentDiscoveryService(db)
        
        # Get discovery metrics
        metrics = await discovery_service.get_discovery_metrics(session_id)
        if not metrics:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discovery metrics not found"
            )
        
        return metrics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting discovery metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get discovery metrics: {str(e)}"
        ) 