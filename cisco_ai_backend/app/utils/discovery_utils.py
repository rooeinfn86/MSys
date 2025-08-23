"""
Discovery Utilities
Common helper functions for device and network discovery operations
"""

import logging
import ipaddress
import math
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple, Union
from ipaddress import IPv4Address, IPv4Network, ip_address

logger = logging.getLogger(__name__)


def parse_ip_range(ip_range: str) -> Tuple[List[str], Optional[str], Optional[str]]:
    """Parse IP range and return list of IPs, start IP, and end IP."""
    try:
        # Handle CIDR notation (e.g., "192.168.1.0/24")
        if '/' in ip_range:
            network = IPv4Network(ip_range, strict=False)
            ips = [str(ip) for ip in network.hosts()]
            return ips, str(network.network_address), str(network.broadcast_address)
        
        # Handle range notation (e.g., "192.168.1.1-192.168.1.254")
        elif '-' in ip_range:
            start_ip, end_ip = ip_range.split('-', 1)
            start_ip = start_ip.strip()
            end_ip = end_ip.strip()
            
            # Convert to integers for range generation
            start_int = int(IPv4Address(start_ip))
            end_int = int(IPv4Address(end_ip))
            
            if start_int > end_int:
                start_int, end_int = end_int, start_int
            
            ips = []
            for ip_int in range(start_int, end_int + 1):
                ip = str(IPv4Address(ip_int))
                ips.append(ip)
            
            return ips, start_ip, end_ip
        
        # Single IP
        else:
            ip = ip_range.strip()
            IPv4Address(ip)  # Validate IP
            return [ip], ip, ip
            
    except Exception as e:
        logger.error(f"Error parsing IP range '{ip_range}': {e}")
        return [], None, None


def validate_ip_address(ip: str) -> bool:
    """Validate if a string is a valid IP address."""
    try:
        IPv4Address(ip)
        return True
    except ValueError:
        return False


def is_private_ip(ip: str) -> bool:
    """Check if an IP address is private."""
    try:
        ip_obj = IPv4Address(ip)
        return ip_obj.is_private
    except ValueError:
        return False


def is_reserved_ip(ip: str) -> bool:
    """Check if an IP address is reserved."""
    try:
        ip_obj = IPv4Address(ip)
        return ip_obj.is_reserved
    except ValueError:
        return False


def calculate_network_info(ip_range: str) -> Dict[str, Any]:
    """Calculate network information for an IP range."""
    try:
        if '/' in ip_range:
            network = IPv4Network(ip_range, strict=False)
            return {
                "network_address": str(network.network_address),
                "broadcast_address": str(network.broadcast_address),
                "netmask": str(network.netmask),
                "prefix_length": network.prefixlen,
                "total_hosts": network.num_addresses - 2,  # Exclude network and broadcast
                "usable_hosts": network.num_addresses - 2,
                "network_class": _get_network_class(network.prefixlen)
            }
        else:
            # For single IP or range, provide basic info
            return {
                "network_address": None,
                "broadcast_address": None,
                "netmask": None,
                "prefix_length": None,
                "total_hosts": 1,
                "usable_hosts": 1,
                "network_class": "single_ip"
            }
    except Exception as e:
        logger.error(f"Error calculating network info for '{ip_range}': {e}")
        return {}


def _get_network_class(prefix_length: int) -> str:
    """Get network class based on prefix length."""
    if prefix_length <= 8:
        return "A"
    elif prefix_length <= 16:
        return "B"
    elif prefix_length <= 24:
        return "C"
    else:
        return "D"


def distribute_ips_to_agents(ips: List[str], agent_ids: List[int]) -> Dict[int, List[str]]:
    """Distribute IP addresses across available agents."""
    if not agent_ids:
        return {}
    
    distribution = {agent_id: [] for agent_id in agent_ids}
    
    for i, ip in enumerate(ips):
        agent_index = i % len(agent_ids)
        agent_id = agent_ids[agent_index]
        distribution[agent_id].append(ip)
    
    return distribution


def optimize_discovery_batch_size(total_ips: int, agent_count: int, max_concurrent: int = 10) -> int:
    """Calculate optimal batch size for discovery operations."""
    if total_ips <= 0 or agent_count <= 0:
        return 1
    
    # Base batch size
    base_batch_size = max(1, total_ips // (agent_count * 2))
    
    # Apply max concurrent limit
    optimal_batch_size = min(base_batch_size, max_concurrent)
    
    # Ensure minimum batch size
    return max(1, optimal_batch_size)


def estimate_discovery_time(
    total_ips: int,
    agent_count: int,
    avg_response_time_ms: float = 1000,
    timeout_seconds: int = 30
) -> Dict[str, Any]:
    """Estimate discovery completion time."""
    if total_ips <= 0 or agent_count <= 0:
        return {
            "estimated_seconds": 0,
            "estimated_minutes": 0,
            "estimated_formatted": "0s"
        }
    
    # Calculate time per IP (including timeout)
    time_per_ip = max(avg_response_time_ms / 1000, timeout_seconds)
    
    # Calculate total time with parallel processing
    total_time_seconds = (total_ips * time_per_ip) / agent_count
    
    # Add buffer for overhead
    total_time_seconds *= 1.2
    
    return {
        "estimated_seconds": int(total_time_seconds),
        "estimated_minutes": round(total_time_seconds / 60, 1),
        "estimated_formatted": _format_duration(total_time_seconds)
    }


def _format_duration(seconds: float) -> str:
    """Format duration in human-readable format."""
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        remaining_seconds = int(seconds % 60)
        return f"{minutes}m {remaining_seconds}s"
    else:
        hours = int(seconds / 3600)
        remaining_minutes = int((seconds % 3600) / 60)
        return f"{hours}h {remaining_minutes}m"


def create_discovery_session_id(network_id: int, agent_id: int) -> str:
    """Create a unique discovery session ID."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    return f"discovery_{timestamp}_{agent_id}"


def validate_discovery_credentials(credentials: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate discovery credentials."""
    errors = []
    
    # Check SNMP credentials
    if credentials.get('snmp_enabled', False):
        if not credentials.get('snmp_community'):
            errors.append("SNMP community string is required when SNMP is enabled")
        if not credentials.get('snmp_version'):
            errors.append("SNMP version is required when SNMP is enabled")
    
    # Check SSH credentials
    if credentials.get('ssh_enabled', False):
        if not credentials.get('ssh_username'):
            errors.append("SSH username is required when SSH is enabled")
        if not credentials.get('ssh_password') and not credentials.get('ssh_private_key'):
            errors.append("SSH password or private key is required when SSH is enabled")
    
    # At least one discovery method must be enabled
    if not credentials.get('snmp_enabled', False) and not credentials.get('ssh_enabled', False):
        errors.append("At least one discovery method (SNMP or SSH) must be enabled")
    
    return len(errors) == 0, errors


def process_discovery_results(
    raw_results: List[Dict[str, Any]],
    network_id: int
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """Process and validate discovery results."""
    processed_devices = []
    errors = []
    
    for result in raw_results:
        try:
            # Validate required fields
            required_fields = ['ip', 'hostname', 'device_type']
            for field in required_fields:
                if field not in result or not result[field]:
                    errors.append(f"Missing required field '{field}' for device {result.get('ip', 'unknown')}")
                    continue
            
            # Validate IP address
            if not validate_ip_address(result['ip']):
                errors.append(f"Invalid IP address: {result['ip']}")
                continue
            
            # Add network_id if not present
            if 'network_id' not in result:
                result['network_id'] = network_id
            
            # Add discovery timestamp
            result['discovered_at'] = datetime.now(timezone.utc).isoformat()
            
            # Sanitize device data
            sanitized_result = _sanitize_device_data(result)
            processed_devices.append(sanitized_result)
            
        except Exception as e:
            errors.append(f"Error processing device {result.get('ip', 'unknown')}: {str(e)}")
    
    return processed_devices, errors


def _sanitize_device_data(device_data: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize device data for storage."""
    sanitized = device_data.copy()
    
    # Ensure string fields are properly formatted
    string_fields = ['hostname', 'description', 'location', 'contact']
    for field in string_fields:
        if field in sanitized and sanitized[field]:
            sanitized[field] = str(sanitized[field]).strip()
    
    # Ensure numeric fields are properly formatted
    numeric_fields = ['uptime', 'serial_number']
    for field in numeric_fields:
        if field in sanitized and sanitized[field]:
            try:
                sanitized[field] = str(sanitized[field])
            except (ValueError, TypeError):
                sanitized[field] = None
    
    return sanitized


def calculate_discovery_metrics(
    start_time: datetime,
    end_time: datetime,
    total_ips: int,
    discovered_devices: int,
    errors: List[str]
) -> Dict[str, Any]:
    """Calculate discovery performance metrics."""
    duration_seconds = (end_time - start_time).total_seconds()
    
    success_rate = (discovered_devices / total_ips * 100) if total_ips > 0 else 0
    error_rate = (len(errors) / total_ips * 100) if total_ips > 0 else 0
    ips_per_second = total_ips / duration_seconds if duration_seconds > 0 else 0
    
    return {
        "duration_seconds": duration_seconds,
        "duration_formatted": _format_duration(duration_seconds),
        "total_ips": total_ips,
        "discovered_devices": discovered_devices,
        "failed_ips": total_ips - discovered_devices,
        "error_count": len(errors),
        "success_rate": round(success_rate, 2),
        "error_rate": round(error_rate, 2),
        "ips_per_second": round(ips_per_second, 2),
        "efficiency_score": _calculate_efficiency_score(success_rate, duration_seconds, total_ips)
    }


def _calculate_efficiency_score(success_rate: float, duration: float, total_ips: int) -> int:
    """Calculate discovery efficiency score (0-100)."""
    score = 100
    
    # Deduct points for low success rate
    if success_rate < 80:
        score -= min(40, int((80 - success_rate) * 2))
    
    # Deduct points for slow discovery
    if total_ips > 0:
        ips_per_second = total_ips / duration
        if ips_per_second < 1:
            score -= min(30, int((1 - ips_per_second) * 30))
    
    return max(0, score)


def generate_discovery_report(
    session_id: str,
    network_id: int,
    start_time: datetime,
    end_time: datetime,
    metrics: Dict[str, Any],
    discovered_devices: List[Dict[str, Any]],
    errors: List[str]
) -> Dict[str, Any]:
    """Generate comprehensive discovery report."""
    return {
        "report_id": f"discovery_report_{session_id}",
        "session_id": session_id,
        "network_id": network_id,
        "discovery_period": {
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration_seconds": metrics.get("duration_seconds", 0),
            "duration_formatted": metrics.get("duration_formatted", "0s")
        },
        "performance_metrics": metrics,
        "discovered_devices_count": len(discovered_devices),
        "error_count": len(errors),
        "discovered_devices": discovered_devices,
        "errors": errors,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "report_version": "1.0"
    } 