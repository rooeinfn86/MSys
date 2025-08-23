"""
Agent Status Endpoints
Handle device status monitoring and health checks
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.api.deps import get_db
from app.services.agent_status_service import AgentStatusService
from app.services.agent_service import AgentService
from app.utils.status_utils import (
    calculate_device_health_score, calculate_network_health_summary,
    detect_anomalies, generate_health_alert
)
from app.schemas.agent.status import (
    StatusRequest, StatusResponse, DeviceHealth, NetworkStatus,
    HealthCheck, StatusSummary
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/status/check", response_model=StatusResponse)
async def check_device_status(
    request: StatusRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check status of a specific device."""
    try:
        status_service = AgentStatusService()
        agent_service = AgentService(db)
        
        # Validate request
        if not request.device_id and not request.ip_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either device_id or ip_address is required"
            )
        
        # Create status check request
        session_id = f"status_check_{int(datetime.now(timezone.utc).timestamp())}"
        status_service.create_status_test_request(
            session_id=session_id,
            network_id=request.network_id,
            device_id=request.device_id,
            ip_address=request.ip_address,
            check_types=request.check_types
        )
        
        return StatusResponse(
            session_id=session_id,
            status="requested",
            message="Status check requested successfully",
            device_id=request.device_id,
            ip_address=request.ip_address,
            check_types=request.check_types
        )
        
    except Exception as e:
        logger.error(f"Error requesting status check: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to request status check: {str(e)}"
        )


@router.get("/status/{device_id}", response_model=DeviceHealth)
async def get_device_status(
    device_id: int,
    include_history: bool = False,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current status of a specific device."""
    try:
        status_service = AgentStatusService()
        
        # Get device status
        device_status = status_service.get_device_status(device_id)
        if not device_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device status not found"
            )
        
        # Calculate health score
        health_score = calculate_device_health_score(
            ping_status=device_status.get('ping_status', False),
            snmp_status=device_status.get('snmp_status', False),
            ssh_status=device_status.get('ssh_status', False),
            response_time_ms=device_status.get('response_time_ms'),
            uptime_seconds=device_status.get('uptime_seconds'),
            error_count=device_status.get('error_count', 0)
        )
        
        return DeviceHealth(
            device_id=device_id,
            status=device_status.get('status', 'unknown'),
            health_score=health_score,
            ping_status=device_status.get('ping_status', False),
            snmp_status=device_status.get('snmp_status', False),
            ssh_status=device_status.get('ssh_status', False),
            response_time_ms=device_status.get('response_time_ms'),
            uptime=device_status.get('uptime'),
            last_check=device_status.get('last_check'),
            error_count=device_status.get('error_count', 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting device status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get device status: {str(e)}"
        )


@router.post("/status/{device_id}/refresh")
async def refresh_device_status(
    device_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refresh status of a specific device."""
    try:
        status_service = AgentStatusService()
        
        # Get device info for refresh
        device_info = status_service.get_device_info_for_refresh(device_id)
        if not device_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found"
            )
        
        # Create refresh request
        session_id = f"refresh_{device_id}_{int(datetime.now(timezone.utc).timestamp())}"
        status_service.create_status_test_request(
            session_id=session_id,
            network_id=device_info['network_id'],
            device_id=device_id,
            ip_address=device_info['ip_address'],
            check_types=['ping', 'snmp', 'ssh']
        )
        
        return {
            "message": "Device status refresh requested successfully",
            "device_id": device_id,
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing device status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh device status: {str(e)}"
        )


@router.get("/status/network/{network_id}", response_model=NetworkStatus)
async def get_network_status(
    network_id: int,
    include_offline: bool = True,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status summary for all devices in a network."""
    try:
        status_service = AgentStatusService()
        
        # Get network status
        network_status = status_service.get_network_status(network_id)
        if not network_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Network status not found"
            )
        
        # Calculate network health summary
        device_health_list = network_status.get('devices', [])
        health_summary = calculate_network_health_summary(device_health_list)
        
        return NetworkStatus(
            network_id=network_id,
            total_devices=health_summary['total_devices'],
            online_devices=health_summary['online_devices'],
            offline_devices=health_summary['offline_devices'],
            online_percentage=health_summary['online_percentage'],
            average_health_score=health_summary['average_health_score'],
            health_distribution=health_summary['health_distribution'],
            devices_needing_attention=health_summary['devices_needing_attention'],
            last_updated=network_status.get('last_updated')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting network status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get network status: {str(e)}"
        )


@router.post("/status/network/{network_id}/refresh")
async def refresh_network_status(
    network_id: int,
    device_ids: Optional[List[int]] = Body(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refresh status of all devices in a network."""
    try:
        status_service = AgentStatusService()
        
        # Get network devices
        network_devices = status_service.get_network_devices(network_id)
        if not network_devices:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No devices found in network"
            )
        
        # Filter devices if specific IDs provided
        if device_ids:
            network_devices = [d for d in network_devices if d['id'] in device_ids]
        
        # Create refresh requests for each device
        refresh_sessions = []
        for device in network_devices:
            session_id = f"refresh_{device['id']}_{int(datetime.now(timezone.utc).timestamp())}"
            status_service.create_status_test_request(
                session_id=session_id,
                network_id=network_id,
                device_id=device['id'],
                ip_address=device['ip_address'],
                check_types=['ping', 'snmp', 'ssh']
            )
            refresh_sessions.append(session_id)
        
        return {
            "message": f"Status refresh requested for {len(refresh_sessions)} devices",
            "network_id": network_id,
            "devices_refreshed": len(refresh_sessions),
            "refresh_sessions": refresh_sessions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing network status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh network status: {str(e)}"
        )


@router.get("/status/health/check", response_model=HealthCheck)
async def perform_health_check(
    network_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Perform comprehensive health check."""
    try:
        status_service = AgentStatusService()
        
        # Get health check data
        health_data = status_service.get_health_check_data(network_id)
        
        # Detect anomalies
        anomalies = detect_anomalies(health_data.get('device_history', []))
        
        # Generate health alerts for critical issues
        alerts = []
        for anomaly in anomalies:
            if anomaly.get('severity') == 'high':
                alert = generate_health_alert(
                    device_id=anomaly.get('device_id'),
                    alert_type='anomaly_detected',
                    severity='high',
                    message=f"Anomaly detected in {anomaly.get('metric')}",
                    current_value=anomaly.get('value'),
                    threshold_value=anomaly.get('expected_range')
                )
                alerts.append(alert)
        
        return HealthCheck(
            timestamp=datetime.now(timezone.utc),
            network_id=network_id,
            total_devices=health_data.get('total_devices', 0),
            healthy_devices=health_data.get('healthy_devices', 0),
            unhealthy_devices=health_data.get('unhealthy_devices', 0),
            anomalies_detected=len(anomalies),
            critical_alerts=len([a for a in alerts if a.get('severity') == 'high']),
            overall_health_score=health_data.get('overall_health_score', 0),
            recommendations=_generate_health_recommendations(anomalies, health_data)
        )
        
    except Exception as e:
        logger.error(f"Error performing health check: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to perform health check: {str(e)}"
        )


@router.get("/status/summary", response_model=StatusSummary)
async def get_status_summary(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overall status summary across all networks."""
    try:
        status_service = AgentStatusService()
        
        # Get status summary
        summary = status_service.get_status_summary()
        
        return StatusSummary(
            timestamp=datetime.now(timezone.utc),
            total_networks=summary.get('total_networks', 0),
            total_devices=summary.get('total_devices', 0),
            online_devices=summary.get('online_devices', 0),
            offline_devices=summary.get('offline_devices', 0),
            overall_health_score=summary.get('overall_health_score', 0),
            networks_with_issues=summary.get('networks_with_issues', 0),
            devices_needing_attention=summary.get('devices_needing_attention', 0),
            last_updated=summary.get('last_updated')
        )
        
    except Exception as e:
        logger.error(f"Error getting status summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get status summary: {str(e)}"
        )


@router.post("/status/alerts/acknowledge")
async def acknowledge_health_alert(
    alert_id: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acknowledge a health alert."""
    try:
        status_service = AgentStatusService()
        
        # Acknowledge alert
        success = status_service.acknowledge_alert(alert_id, current_user['user_id'])
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        return {
            "message": "Alert acknowledged successfully",
            "alert_id": alert_id,
            "acknowledged_by": current_user['user_id']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to acknowledge alert: {str(e)}"
        )


def _generate_health_recommendations(
    anomalies: List[Dict[str, Any]],
    health_data: Dict[str, Any]
) -> List[str]:
    """Generate health improvement recommendations."""
    recommendations = []
    
    # Analyze anomalies
    if anomalies:
        high_severity_count = len([a for a in anomalies if a.get('severity') == 'high'])
        if high_severity_count > 0:
            recommendations.append(f"Address {high_severity_count} high-severity anomalies immediately")
    
    # Analyze overall health
    overall_score = health_data.get('overall_health_score', 0)
    if overall_score < 70:
        recommendations.append("Overall network health is poor; review device configurations")
    elif overall_score < 85:
        recommendations.append("Network health could be improved; check device connectivity")
    
    # Device-specific recommendations
    unhealthy_count = health_data.get('unhealthy_devices', 0)
    if unhealthy_count > 0:
        recommendations.append(f"Investigate {unhealthy_count} unhealthy devices")
    
    if not recommendations:
        recommendations.append("Network health appears to be good")
    
    return recommendations 