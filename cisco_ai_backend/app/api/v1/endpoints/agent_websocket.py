"""
Agent WebSocket Endpoints
Handle real-time WebSocket communication with agents
"""

import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.api.deps import get_db
from app.services.agent_websocket_service import AgentWebSocketService
from app.services.agent_service import AgentService
from app.utils.agent_utils import verify_agent_token, sanitize_agent_data
from app.schemas.agent.websocket import (
    WebSocketMessage, RealTimeUpdate, ConnectionStatus
)

logger = logging.getLogger(__name__)
router = APIRouter()

# WebSocket connection manager
websocket_service = AgentWebSocketService()


@router.websocket("/ws/agent/{agent_token}")
async def websocket_agent_endpoint(
    websocket: WebSocket,
    agent_token: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for agent connections."""
    try:
        # Validate agent token
        agent_service = AgentService(db)
        agent = await agent_service.get_agent_by_token(agent_token)
        if not agent:
            await websocket.close(code=4001, reason="Invalid agent token")
            return
        
        # Accept connection
        await websocket.accept()
        logger.info(f"Agent {agent.id} connected via WebSocket")
        
        # Register connection
        websocket_service.connect(agent.id, websocket, agent_token)
        
        try:
            # Send connection confirmation
            await websocket.send_text(json.dumps({
                "type": "connection_confirmed",
                "agent_id": agent.id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": "WebSocket connection established"
            }))
            
            # Handle incoming messages
            while True:
                try:
                    # Receive message
                    data = await websocket.receive_text()
                    message_data = json.loads(data)
                    
                    # Process message
                    response = await _process_websocket_message(
                        agent_id=agent.id,
                        message_data=message_data,
                        db=db
                    )
                    
                    # Send response if any
                    if response:
                        await websocket.send_text(json.dumps(response))
                        
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON received from agent {agent.id}")
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Invalid JSON format"
                    }))
                    
        except WebSocketDisconnect:
            logger.info(f"Agent {agent.id} disconnected")
        except Exception as e:
            logger.error(f"Error in WebSocket communication with agent {agent.id}: {e}")
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Internal server error: {str(e)}"
            }))
            
    except Exception as e:
        logger.error(f"Error establishing WebSocket connection: {e}")
        if websocket.client_state.value < 3:  # Connection not yet closed
            await websocket.close(code=4000, reason="Connection error")
    finally:
        # Cleanup connection
        if 'agent' in locals():
            websocket_service.disconnect(agent.id)
            logger.info(f"Agent {agent.id} connection cleaned up")


@router.websocket("/ws/admin/{user_token}")
async def websocket_admin_endpoint(
    websocket: WebSocket,
    user_token: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for admin connections."""
    try:
        # Validate user token (simplified for WebSocket)
        # In production, implement proper JWT validation
        if not user_token or len(user_token) < 10:
            await websocket.close(code=4001, reason="Invalid user token")
            return
        
        # Accept connection
        await websocket.accept()
        logger.info(f"Admin user connected via WebSocket")
        
        # Register admin connection
        connection_id = f"admin_{int(datetime.now(timezone.utc).timestamp())}"
        websocket_service.connect_admin(connection_id, websocket)
        
        try:
            # Send connection confirmation
            await websocket.send_text(json.dumps({
                "type": "admin_connection_confirmed",
                "connection_id": connection_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": "Admin WebSocket connection established"
            }))
            
            # Handle admin messages
            while True:
                try:
                    data = await websocket.receive_text()
                    message_data = json.loads(data)
                    
                    # Process admin message
                    response = await _process_admin_message(
                        connection_id=connection_id,
                        message_data=message_data,
                        db=db
                    )
                    
                    if response:
                        await websocket.send_text(json.dumps(response))
                        
                except json.JSONDecodeError:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Invalid JSON format"
                    }))
                    
        except WebSocketDisconnect:
            logger.info(f"Admin user disconnected")
        except Exception as e:
            logger.error(f"Error in admin WebSocket communication: {e}")
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Internal server error: {str(e)}"
            }))
            
    except Exception as e:
        logger.error(f"Error establishing admin WebSocket connection: {e}")
        if websocket.client_state.value < 3:
            await websocket.close(code=4000, reason="Connection error")
    finally:
        # Cleanup admin connection
        websocket_service.disconnect_admin(connection_id)


@router.get("/websocket/connections")
async def get_websocket_connections(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current WebSocket connections status."""
    try:
        connections = websocket_service.get_all_connections()
        
        # Sanitize connection data
        sanitized_connections = []
        for conn in connections:
            sanitized_conn = sanitize_agent_data(conn)
            sanitized_connections.append(sanitized_conn)
        
        return {
            "total_connections": len(sanitized_connections),
            "agent_connections": len([c for c in sanitized_connections if c.get('type') == 'agent']),
            "admin_connections": len([c for c in sanitized_connections if c.get('type') == 'admin']),
            "connections": sanitized_connections
        }
        
    except Exception as e:
        logger.error(f"Error getting WebSocket connections: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get connections: {str(e)}"
        )


@router.post("/websocket/broadcast")
async def broadcast_message(
    message: WebSocketMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Broadcast message to all connected clients."""
    try:
        # Validate message
        if not message.content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message content is required"
            )
        
        # Broadcast message
        success_count = await websocket_service.broadcast_message(message)
        
        return {
            "message": "Message broadcasted successfully",
            "recipients": success_count,
            "message_type": message.message_type,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error broadcasting message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to broadcast message: {str(e)}"
        )


@router.post("/websocket/agent/{agent_id}/message")
async def send_agent_message(
    agent_id: int,
    message: WebSocketMessage,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send message to a specific agent."""
    try:
        # Validate agent exists
        agent_service = AgentService(db)
        agent = await agent_service.get_agent(agent_id)
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        # Send message
        success = await websocket_service.send_message(agent_id, message)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent not connected"
            )
        
        return {
            "message": "Message sent to agent successfully",
            "agent_id": agent_id,
            "message_type": message.message_type,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message to agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )


@router.get("/websocket/health")
async def get_websocket_health(
    current_user: dict = Depends(get_current_user)
):
    """Get WebSocket service health status."""
    try:
        health = websocket_service.get_connection_health()
        
        return {
            "status": "healthy" if health['is_healthy'] else "unhealthy",
            "total_connections": health['total_connections'],
            "active_agents": health['active_agents'],
            "connection_errors": health['connection_errors'],
            "last_health_check": datetime.now(timezone.utc).isoformat(),
            "uptime_seconds": health.get('uptime_seconds', 0)
        }
        
    except Exception as e:
        logger.error(f"Error getting WebSocket health: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get health status: {str(e)}"
        )


async def _process_websocket_message(
    agent_id: int,
    message_data: Dict[str, Any],
    db: Session
) -> Optional[Dict[str, Any]]:
    """Process incoming WebSocket message from agent."""
    try:
        message_type = message_data.get('type')
        
        if message_type == 'heartbeat':
            # Update agent heartbeat
            agent_service = AgentService(db)
            await agent_service.update_agent_heartbeat(agent_id)
            
            return {
                "type": "heartbeat_ack",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        elif message_type == 'discovery_progress':
            # Handle discovery progress update
            return await _handle_discovery_progress(agent_id, message_data, db)
            
        elif message_type == 'status_update':
            # Handle status update
            return await _handle_status_update(agent_id, message_data, db)
            
        elif message_type == 'error_report':
            # Handle error report
            logger.error(f"Agent {agent_id} error: {message_data.get('error')}")
            return {
                "type": "error_ack",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        else:
            logger.warning(f"Unknown message type from agent {agent_id}: {message_type}")
            return {
                "type": "error",
                "message": f"Unknown message type: {message_type}"
            }
            
    except Exception as e:
        logger.error(f"Error processing agent message: {e}")
        return {
            "type": "error",
            "message": f"Failed to process message: {str(e)}"
        }


async def _process_admin_message(
    connection_id: str,
    message_data: Dict[str, Any],
    db: Session
) -> Optional[Dict[str, Any]]:
    """Process incoming WebSocket message from admin."""
    try:
        message_type = message_data.get('type')
        
        if message_type == 'get_agent_status':
            # Return agent status information
            return await _get_agent_status_summary(db)
            
        elif message_type == 'ping':
            # Simple ping response
            return {
                "type": "pong",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        else:
            logger.warning(f"Unknown admin message type: {message_type}")
            return {
                "type": "error",
                "message": f"Unknown message type: {message_type}"
            }
            
    except Exception as e:
        logger.error(f"Error processing admin message: {e}")
        return {
            "type": "error",
            "message": f"Failed to process message: {str(e)}"
        }


async def _handle_discovery_progress(
    agent_id: int,
    message_data: Dict[str, Any],
    db: Session
) -> Dict[str, Any]:
    """Handle discovery progress update from agent."""
    try:
        # Update discovery progress
        # This would integrate with the discovery service
        return {
            "type": "discovery_progress_ack",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error handling discovery progress: {e}")
        return {
            "type": "error",
            "message": f"Failed to process discovery progress: {str(e)}"
        }


async def _handle_status_update(
    agent_id: int,
    message_data: Dict[str, Any],
    db: Session
) -> Dict[str, Any]:
    """Handle status update from agent."""
    try:
        # Update device status
        # This would integrate with the status service
        return {
            "type": "status_update_ack",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error handling status update: {e}")
        return {
            "type": "error",
            "message": f"Failed to process status update: {str(e)}"
        }


async def _get_agent_status_summary(db: Session) -> Dict[str, Any]:
    """Get summary of agent statuses."""
    try:
        agent_service = AgentService(db)
        agents = await agent_service.get_all_agents()
        
        return {
            "type": "agent_status_summary",
            "total_agents": len(agents),
            "online_agents": len([a for a in agents if a.status == 'online']),
            "offline_agents": len([a for a in agents if a.status == 'offline']),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting agent status summary: {e}")
        return {
            "type": "error",
            "message": f"Failed to get agent status: {str(e)}"
        } 