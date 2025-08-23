"""
Status Utilities
Common helper functions for device status monitoring and health checks
"""

import logging
import statistics
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple
from collections import defaultdict, deque

logger = logging.getLogger(__name__)


def calculate_device_health_score(
    ping_status: bool,
    snmp_status: bool,
    ssh_status: bool,
    response_time_ms: Optional[float] = None,
    uptime_seconds: Optional[int] = None,
    error_count: int = 0
) -> int:
    """Calculate device health score (0-100)."""
    score = 100
    
    # Deduct points for failed status checks
    if not ping_status:
        score -= 30
    if not snmp_status:
        score -= 20
    if not ssh_status:
        score -= 15
    
    # Deduct points for slow response time
    if response_time_ms and response_time_ms > 1000:
        score -= min(20, int((response_time_ms - 1000) / 100))
    
    # Deduct points for low uptime
    if uptime_seconds and uptime_seconds < 3600:  # Less than 1 hour
        score -= 10
    
    # Deduct points for errors
    score -= min(25, error_count * 5)
    
    return max(0, score)


def get_health_status_category(health_score: int) -> str:
    """Get health status category based on score."""
    if health_score >= 90:
        return "excellent"
    elif health_score >= 80:
        return "good"
    elif health_score >= 70:
        return "fair"
    elif health_score >= 50:
        return "poor"
    else:
        return "critical"


def calculate_network_health_summary(
    device_health_list: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Calculate network-wide health summary."""
    if not device_health_list:
        return {
            "total_devices": 0,
            "online_devices": 0,
            "offline_devices": 0,
            "average_health_score": 0,
            "health_distribution": {},
            "devices_needing_attention": 0
        }
    
    total_devices = len(device_health_list)
    online_devices = sum(1 for device in device_health_list if device.get('status') == 'online')
    offline_devices = total_devices - online_devices
    
    # Calculate health scores
    health_scores = [device.get('health_score', 0) for device in device_health_list]
    average_health_score = statistics.mean(health_scores) if health_scores else 0
    
    # Health distribution
    health_distribution = defaultdict(int)
    for score in health_scores:
        category = get_health_status_category(score)
        health_distribution[category] += 1
    
    # Devices needing attention (health score < 50)
    devices_needing_attention = sum(1 for score in health_scores if score < 50)
    
    return {
        "total_devices": total_devices,
        "online_devices": online_devices,
        "offline_devices": offline_devices,
        "online_percentage": round((online_devices / total_devices) * 100, 2) if total_devices > 0 else 0,
        "average_health_score": round(average_health_score, 2),
        "health_distribution": dict(health_distribution),
        "devices_needing_attention": devices_needing_attention,
        "attention_percentage": round((devices_needing_attention / total_devices) * 100, 2) if total_devices > 0 else 0
    }


def optimize_monitoring_schedule(
    devices: List[Dict[str, Any]],
    max_concurrent: int = 10,
    priority_devices: Optional[List[int]] = None
) -> List[List[Dict[str, Any]]]:
    """Optimize monitoring schedule for devices."""
    if not devices:
        return []
    
    # Sort devices by priority and health
    sorted_devices = sorted(
        devices,
        key=lambda x: (
            # Priority devices first
            0 if priority_devices and x.get('id') in priority_devices else 1,
            # Then by health score (lower scores first)
            x.get('health_score', 100),
            # Then by last check time (older first)
            x.get('last_check', datetime.min)
        )
    )
    
    # Distribute devices across batches
    batches = []
    current_batch = []
    
    for device in sorted_devices:
        current_batch.append(device)
        
        if len(current_batch) >= max_concurrent:
            batches.append(current_batch)
            current_batch = []
    
    # Add remaining devices to last batch
    if current_batch:
        batches.append(current_batch)
    
    return batches


def calculate_monitoring_performance(
    start_time: datetime,
    end_time: datetime,
    total_devices: int,
    successful_checks: int,
    failed_checks: int,
    response_times: List[float]
) -> Dict[str, Any]:
    """Calculate monitoring performance metrics."""
    duration_seconds = (end_time - start_time).total_seconds()
    
    success_rate = (successful_checks / total_devices * 100) if total_devices > 0 else 0
    failure_rate = (failed_checks / total_devices * 100) if total_devices > 0 else 0
    
    # Response time statistics
    if response_times:
        avg_response_time = statistics.mean(response_times)
        min_response_time = min(response_times)
        max_response_time = max(response_times)
        median_response_time = statistics.median(response_times)
    else:
        avg_response_time = min_response_time = max_response_time = median_response_time = 0
    
    # Performance score
    performance_score = 100
    if success_rate < 95:
        performance_score -= min(40, int((95 - success_rate) * 2))
    if avg_response_time > 5000:  # More than 5 seconds
        performance_score -= min(30, int((avg_response_time - 5000) / 1000))
    
    return {
        "duration_seconds": duration_seconds,
        "duration_formatted": _format_duration(duration_seconds),
        "total_devices": total_devices,
        "successful_checks": successful_checks,
        "failed_checks": failed_checks,
        "success_rate": round(success_rate, 2),
        "failure_rate": round(failure_rate, 2),
        "response_time_stats": {
            "average_ms": round(avg_response_time, 2),
            "minimum_ms": min_response_time,
            "maximum_ms": max_response_time,
            "median_ms": median_response_time
        },
        "performance_score": max(0, performance_score),
        "devices_per_second": round(total_devices / duration_seconds, 2) if duration_seconds > 0 else 0
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


def detect_anomalies(
    device_history: List[Dict[str, Any]],
    threshold_multiplier: float = 2.0
) -> List[Dict[str, Any]]:
    """Detect anomalies in device monitoring data."""
    if len(device_history) < 3:
        return []
    
    anomalies = []
    
    # Group data by metric type
    metrics = defaultdict(list)
    for record in device_history:
        for key, value in record.items():
            if isinstance(value, (int, float)) and key not in ['id', 'device_id', 'timestamp']:
                metrics[key].append(value)
    
    # Detect anomalies for each metric
    for metric_name, values in metrics.items():
        if len(values) < 3:
            continue
        
        mean_value = statistics.mean(values)
        std_dev = statistics.stdev(values) if len(values) > 1 else 0
        
        if std_dev == 0:
            continue
        
        threshold = threshold_multiplier * std_dev
        
        for i, value in enumerate(values):
            if abs(value - mean_value) > threshold:
                anomalies.append({
                    "metric": metric_name,
                    "value": value,
                    "expected_range": f"{mean_value - threshold:.2f} to {mean_value + threshold:.2f}",
                    "deviation": abs(value - mean_value),
                    "severity": "high" if abs(value - mean_value) > 3 * std_dev else "medium",
                    "timestamp": device_history[i].get('timestamp'),
                    "device_id": device_history[i].get('device_id')
                })
    
    return anomalies


def generate_health_alert(
    device_id: int,
    alert_type: str,
    severity: str,
    message: str,
    current_value: Any,
    threshold_value: Any,
    timestamp: Optional[datetime] = None
) -> Dict[str, Any]:
    """Generate health alert for a device."""
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)
    
    return {
        "alert_id": f"alert_{device_id}_{int(timestamp.timestamp())}",
        "device_id": device_id,
        "alert_type": alert_type,
        "severity": severity,
        "message": message,
        "current_value": current_value,
        "threshold_value": threshold_value,
        "timestamp": timestamp.isoformat(),
        "status": "active",
        "acknowledged": False,
        "resolved": False
    }


def calculate_trend_analysis(
    device_history: List[Dict[str, Any]],
    metric_name: str,
    time_window_hours: int = 24
) -> Dict[str, Any]:
    """Calculate trend analysis for a specific metric."""
    if len(device_history) < 2:
        return {
            "trend": "insufficient_data",
            "change_percentage": 0,
            "slope": 0,
            "prediction": None
        }
    
    # Filter data within time window
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=time_window_hours)
    recent_data = [
        record for record in device_history
        if record.get('timestamp') and datetime.fromisoformat(record['timestamp'].replace('Z', '+00:00')) > cutoff_time
    ]
    
    if len(recent_data) < 2:
        return {
            "trend": "insufficient_data",
            "change_percentage": 0,
            "slope": 0,
            "prediction": None
        }
    
    # Sort by timestamp
    recent_data.sort(key=lambda x: x.get('timestamp', ''))
    
    # Extract metric values
    values = [record.get(metric_name, 0) for record in recent_data if isinstance(record.get(metric_name), (int, float))]
    
    if len(values) < 2:
        return {
            "trend": "insufficient_data",
            "change_percentage": 0,
            "slope": 0,
            "prediction": None
        }
    
    # Calculate trend
    first_value = values[0]
    last_value = values[-1]
    
    if first_value == 0:
        change_percentage = 100 if last_value > 0 else 0
    else:
        change_percentage = ((last_value - first_value) / first_value) * 100
    
    # Simple linear regression slope
    n = len(values)
    x_values = list(range(n))
    slope = _calculate_slope(x_values, values)
    
    # Determine trend direction
    if abs(change_percentage) < 5:
        trend = "stable"
    elif change_percentage > 0:
        trend = "increasing"
    else:
        trend = "decreasing"
    
    # Simple prediction (next value)
    prediction = last_value + slope if abs(slope) < abs(last_value) * 0.5 else None
    
    return {
        "trend": trend,
        "change_percentage": round(change_percentage, 2),
        "slope": round(slope, 4),
        "prediction": round(prediction, 2) if prediction is not None else None,
        "data_points": len(values),
        "time_window_hours": time_window_hours
    }


def _calculate_slope(x_values: List[int], y_values: List[float]) -> float:
    """Calculate slope using simple linear regression."""
    n = len(x_values)
    if n != len(y_values) or n < 2:
        return 0
    
    sum_x = sum(x_values)
    sum_y = sum(y_values)
    sum_xy = sum(x * y for x, y in zip(x_values, y_values))
    sum_x_squared = sum(x * x for x in x_values)
    
    denominator = n * sum_x_squared - sum_x * sum_x
    if denominator == 0:
        return 0
    
    slope = (n * sum_xy - sum_x * sum_y) / denominator
    return slope


def optimize_cache_strategy(
    device_count: int,
    monitoring_frequency_minutes: int,
    cache_size_mb: int,
    memory_available_mb: int
) -> Dict[str, Any]:
    """Optimize caching strategy for status monitoring."""
    # Calculate optimal cache settings
    optimal_cache_size_mb = min(cache_size_mb, memory_available_mb * 0.3)  # Use max 30% of available memory
    
    # Calculate cache retention time based on device count and frequency
    base_retention_hours = 24
    if device_count > 100:
        base_retention_hours = 12
    elif device_count > 50:
        base_retention_hours = 18
    
    # Adjust based on monitoring frequency
    if monitoring_frequency_minutes <= 5:
        base_retention_hours = min(base_retention_hours, 6)
    elif monitoring_frequency_minutes <= 15:
        base_retention_hours = min(base_retention_hours, 12)
    
    # Calculate optimal batch size
    optimal_batch_size = max(1, min(50, device_count // 4))
    
    return {
        "optimal_cache_size_mb": optimal_cache_size_mb,
        "cache_retention_hours": base_retention_hours,
        "optimal_batch_size": optimal_batch_size,
        "cache_cleanup_interval_minutes": max(30, monitoring_frequency_minutes * 2),
        "memory_usage_percentage": round((optimal_cache_size_mb / memory_available_mb) * 100, 2),
        "recommendations": _generate_cache_recommendations(
            device_count, monitoring_frequency_minutes, optimal_cache_size_mb
        )
    }


def _generate_cache_recommendations(
    device_count: int,
    monitoring_frequency_minutes: int,
    cache_size_mb: int
) -> List[str]:
    """Generate cache optimization recommendations."""
    recommendations = []
    
    if device_count > 100:
        recommendations.append("Consider implementing distributed caching for large device counts")
    
    if monitoring_frequency_minutes <= 5:
        recommendations.append("High-frequency monitoring detected; consider reducing cache retention time")
    
    if cache_size_mb > 500:
        recommendations.append("Large cache size detected; consider implementing cache compression")
    
    if not recommendations:
        recommendations.append("Current cache configuration appears optimal")
    
    return recommendations


def generate_status_report(
    network_id: int,
    start_time: datetime,
    end_time: datetime,
    health_summary: Dict[str, Any],
    performance_metrics: Dict[str, Any],
    anomalies: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Generate comprehensive status monitoring report."""
    return {
        "report_id": f"status_report_{network_id}_{int(start_time.timestamp())}",
        "network_id": network_id,
        "report_period": {
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration_seconds": (end_time - start_time).total_seconds(),
            "duration_formatted": _format_duration((end_time - start_time).total_seconds())
        },
        "health_summary": health_summary,
        "performance_metrics": performance_metrics,
        "anomalies": {
            "count": len(anomalies),
            "high_severity": len([a for a in anomalies if a.get('severity') == 'high']),
            "medium_severity": len([a for a in anomalies if a.get('severity') == 'medium']),
            "details": anomalies
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "report_version": "1.0"
    } 