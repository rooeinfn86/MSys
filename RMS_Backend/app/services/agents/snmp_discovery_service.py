"""
SNMP Discovery Service - SNMP discovery logic

This service handles all SNMP-related discovery operations:
- SNMPv1/v2c discovery
- SNMPv3 discovery with full security support
- Device information extraction
- SNMP configuration management
"""

import logging
import ipaddress
from typing import List, Dict, Any, Optional
from datetime import datetime

# SNMP imports - these will be imported when needed to avoid dependency issues
# from pysnmp.hlapi import *

logger = logging.getLogger(__name__)


class SNMPDiscoveryService:
    """Service class for SNMP discovery operations"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def parse_ip_range(
        self, 
        ip_range: str = None, 
        start_ip: str = None, 
        end_ip: str = None
    ) -> List[str]:
        """Parse IP range into list of IP addresses"""
        ip_list = []
        
        if ip_range:
            # Handle CIDR notation (e.g., 192.168.1.0/24)
            if '/' in ip_range:
                ip_list = self.cidr_to_ip_list(ip_range)
            # Handle range notation (e.g., 192.168.1.1-192.168.1.10)
            elif '-' in ip_range:
                start, end = ip_range.split('-')
                ip_list = self.ip_range_to_list(start.strip(), end.strip())
            # Single IP
            else:
                ip_list = [ip_range.strip()]
        elif start_ip and end_ip:
            ip_list = self.ip_range_to_list(start_ip, end_ip)
        
        return ip_list
    
    def cidr_to_ip_list(self, cidr: str) -> List[str]:
        """Convert CIDR notation to list of IP addresses"""
        try:
            network = ipaddress.IPv4Network(cidr, strict=False)
            return [str(ip) for ip in network.hosts()]
        except Exception as e:
            self.logger.error(f"Error parsing CIDR {cidr}: {e}")
            return []
    
    def ip_range_to_list(self, start_ip: str, end_ip: str) -> List[str]:
        """Convert IP range to list of IP addresses"""
        try:
            start = ipaddress.IPv4Address(start_ip)
            end = ipaddress.IPv4Address(end_ip)
            
            ip_list = []
            current = start
            while current <= end:
                ip_list.append(str(current))
                current += 1
            
            return ip_list
        except Exception as e:
            self.logger.error(f"Error parsing IP range {start_ip}-{end_ip}: {e}")
            return []
    
    def enhanced_snmp_discovery(
        self, 
        ip_address: str, 
        discovery_method: Dict, 
        credentials: Dict
    ) -> Optional[Dict]:
        """Enhanced SNMP discovery with full SNMPv3 support"""
        try:
            snmp_config = discovery_method.get('snmp_config', {})
            snmp_version = discovery_method.get('snmp_version', 'v2c')
            snmp_community = discovery_method.get('snmp_community', 'public')
            snmp_port = discovery_method.get('snmp_port', 161)
            
            if snmp_version == 'v3':
                return self.snmpv3_get_device_info(ip_address, snmp_config, snmp_port)
            else:
                return self.snmpv1v2c_get_device_info(ip_address, snmp_community, snmp_port, snmp_version)
                
        except Exception as e:
            self.logger.debug(f"Enhanced SNMP discovery failed for {ip_address}: {e}")
            return None
    
    def snmpv3_get_device_info(
        self, 
        ip_address: str, 
        snmp_config: Dict, 
        port: int = 161
    ) -> Optional[Dict]:
        """Get device information via SNMPv3"""
        try:
            # Import SNMP modules here to avoid dependency issues
            from pysnmp.hlapi import (
                SnmpEngine, UsmUserData, UdpTransportTarget, ContextData,
                ObjectType, ObjectIdentity, getCmd
            )
            
            security_level = snmp_config.get('security_level', 'noAuthNoPriv')
            username = snmp_config.get('username', '')
            auth_protocol = snmp_config.get('auth_protocol')
            auth_password = snmp_config.get('auth_password')
            priv_protocol = snmp_config.get('priv_protocol')
            priv_password = snmp_config.get('priv_password')
            
            # Create SNMPv3 user
            if security_level == 'noAuthNoPriv':
                user_data = UsmUserData(username)
            elif security_level == 'authNoPriv':
                user_data = UsmUserData(
                    username, 
                    authProtocol=self.get_auth_protocol(auth_protocol), 
                    authKey=auth_password
                )
            else:  # authPriv
                user_data = UsmUserData(
                    username, 
                    authProtocol=self.get_auth_protocol(auth_protocol), 
                    authKey=auth_password,
                    privProtocol=self.get_priv_protocol(priv_protocol),
                    privKey=priv_password
                )
            
            # SNMP OIDs to query
            oids = [
                '1.3.6.1.2.1.1.1.0',  # sysDescr
                '1.3.6.1.2.1.1.5.0',  # sysName
                '1.3.6.1.2.1.1.6.0',  # sysLocation
                '1.3.6.1.2.1.1.4.0',  # sysContact
                '1.3.6.1.2.1.1.2.0',  # sysObjectID
                '1.3.6.1.2.1.1.3.0',  # sysUpTime
            ]
            
            # Query device
            for (errorIndication, errorStatus, errorIndex, varBinds) in getCmd(
                SnmpEngine(),
                user_data,
                UdpTransportTarget((ip_address, port), timeout=3, retries=1),
                ContextData(),
                *[ObjectType(ObjectIdentity(oid)) for oid in oids],
                lexicographicMode=False,
                maxRows=0
            ):
                if errorIndication:
                    error_msg = str(errorIndication).lower()
                    if 'timeout' in error_msg:
                        self.logger.debug(f"SNMPv3 timeout for {ip_address}: {errorIndication}")
                    elif 'no response' in error_msg:
                        self.logger.debug(f"SNMPv3 no response from {ip_address}: {errorIndication}")
                    elif 'authentication' in error_msg or 'username' in error_msg:
                        self.logger.debug(f"SNMPv3 authentication failed for {ip_address}: {errorIndication}")
                    else:
                        self.logger.debug(f"SNMPv3 error indication for {ip_address}: {errorIndication}")
                    return None
                if errorStatus:
                    self.logger.debug(f"SNMPv3 error status for {ip_address}: {errorStatus.prettyPrint()}")
                    return None
                
                # Extract device information
                description = str(varBinds[0][1]) if varBinds and varBinds[0][1] else ''
                hostname = str(varBinds[1][1]) if len(varBinds) > 1 and varBinds[1][1] else ip_address
                location = str(varBinds[2][1]) if len(varBinds) > 2 and varBinds[2][1] else 'Unknown'
                contact = str(varBinds[3][1]) if len(varBinds) > 3 and varBinds[3][1] else 'Unknown'
                uptime = str(varBinds[5][1]) if len(varBinds) > 5 and varBinds[5][1] else 'Unknown'
                
                device_info = {
                    'ip_address': ip_address,
                    'hostname': hostname,
                    'description': description,
                    'location': self.extract_device_location(description, location),
                    'contact': self.extract_device_contact(description, contact),
                    'object_id': str(varBinds[4][1]) if len(varBinds) > 4 and varBinds[4][1] else 'Unknown',
                    'uptime': self.extract_device_uptime(uptime),
                    'device_type': self.detect_device_type(description),
                    'os_version': self.extract_os_version(description),
                    'serial_number': self.extract_serial_number(description),
                    'discovery_method': 'snmp',
                    'snmp_version': 'v3',
                    'capabilities': ['snmp']
                }
                
                return device_info
            
            return None
            
        except ImportError:
            self.logger.error("PySNMP library not available for SNMPv3 discovery")
            return None
        except Exception as e:
            self.logger.error(f"SNMPv3 discovery error for {ip_address}: {e}")
            return None
    
    def snmpv1v2c_get_device_info(
        self, 
        ip_address: str, 
        community: str, 
        port: int = 161, 
        version: str = 'v2c'
    ) -> Optional[Dict]:
        """Get device information via SNMPv1/v2c"""
        try:
            # Import SNMP modules here to avoid dependency issues
            from pysnmp.hlapi import (
                SnmpEngine, CommunityData, UdpTransportTarget, ContextData,
                ObjectType, ObjectIdentity, getCmd
            )
            
            # SNMP OIDs to query
            oids = [
                '1.3.6.1.2.1.1.1.0',  # sysDescr
                '1.3.6.1.2.1.1.5.0',  # sysName
                '1.3.6.1.2.1.1.6.0',  # sysLocation
                '1.3.6.1.2.1.1.4.0',  # sysContact
                '1.3.6.1.2.1.1.2.0',  # sysObjectID
                '1.3.6.1.2.1.1.3.0',  # sysUpTime
            ]
            
            # Create community data
            if version == 'v1':
                community_data = CommunityData(community, mpModel=0)
            else:
                community_data = CommunityData(community, mpModel=1)
            
            # Query device
            for (errorIndication, errorStatus, errorIndex, varBinds) in getCmd(
                SnmpEngine(),
                community_data,
                UdpTransportTarget((ip_address, port), timeout=3, retries=1),
                ContextData(),
                *[ObjectType(ObjectIdentity(oid)) for oid in oids],
                lexicographicMode=False,
                maxRows=0
            ):
                if errorIndication:
                    self.logger.debug(f"SNMP{version} error indication for {ip_address}: {errorIndication}")
                    return None
                if errorStatus:
                    self.logger.debug(f"SNMP{version} error status for {ip_address}: {errorStatus.prettyPrint()}")
                    return None
                
                # Extract device information
                description = str(varBinds[0][1]) if varBinds and varBinds[0][1] else ''
                hostname = str(varBinds[1][1]) if len(varBinds) > 1 and varBinds[1][1] else ip_address
                location = str(varBinds[2][1]) if len(varBinds) > 2 and varBinds[2][1] else 'Unknown'
                contact = str(varBinds[3][1]) if len(varBinds) > 3 and varBinds[3][1] else 'Unknown'
                uptime = str(varBinds[5][1]) if len(varBinds) > 5 and varBinds[5][1] else 'Unknown'
                
                device_info = {
                    'ip_address': ip_address,
                    'hostname': hostname,
                    'description': description,
                    'location': self.extract_device_location(description, location),
                    'contact': self.extract_device_contact(description, contact),
                    'object_id': str(varBinds[4][1]) if len(varBinds) > 4 and varBinds[4][1] else 'Unknown',
                    'uptime': self.extract_device_uptime(uptime),
                    'device_type': self.detect_device_type(description),
                    'os_version': self.extract_os_version(description),
                    'serial_number': self.extract_serial_number(description),
                    'discovery_method': 'snmp',
                    'snmp_version': version,
                    'capabilities': ['snmp']
                }
                
                return device_info
            
            return None
            
        except ImportError:
            self.logger.error("PySNMP library not available for SNMP discovery")
            return None
        except Exception as e:
            self.logger.error(f"SNMP{version} discovery error for {ip_address}: {e}")
            return None
    
    def get_auth_protocol(self, protocol: str):
        """Get SNMP authentication protocol"""
        try:
            from pysnmp.hlapi import (
                usmHMACMD5AuthProtocol, usmHMACSHA1AuthProtocol,
                usmHMAC128SHA224AuthProtocol, usmHMAC192SHA256AuthProtocol,
                usmHMAC256SHA384AuthProtocol, usmHMAC384SHA512AuthProtocol
            )
            
            protocols = {
                'md5': usmHMACMD5AuthProtocol,
                'sha': usmHMACSHA1AuthProtocol,
                'sha224': usmHMAC128SHA224AuthProtocol,
                'sha256': usmHMAC192SHA256AuthProtocol,
                'sha384': usmHMAC256SHA384AuthProtocol,
                'sha512': usmHMAC384SHA512AuthProtocol
            }
            
            return protocols.get(protocol.lower(), usmHMACMD5AuthProtocol)
        except ImportError:
            return None
    
    def get_priv_protocol(self, protocol: str):
        """Get SNMP privacy protocol"""
        try:
            from pysnmp.hlapi import (
                usmDESPrivProtocol, usm3DESEDEPrivProtocol,
                usmAesCfb128Protocol, usmAesCfb192Protocol, usmAesCfb256Protocol
            )
            
            protocols = {
                'des': usmDESPrivProtocol,
                '3des': usm3DESEDEPrivProtocol,
                'aes128': usmAesCfb128Protocol,
                'aes192': usmAesCfb192Protocol,
                'aes256': usmAesCfb256Protocol
            }
            
            return protocols.get(protocol.lower(), usmDESPrivProtocol)
        except ImportError:
            return None
    
    def extract_device_location(self, description: str, location: str) -> str:
        """Extract device location from description or location field"""
        if location and location != 'Unknown':
            return location
        
        # Try to extract location from description
        description_lower = description.lower()
        location_keywords = ['location:', 'loc:', 'site:', 'building:', 'floor:', 'room:']
        
        for keyword in location_keywords:
            if keyword in description_lower:
                start_idx = description_lower.find(keyword) + len(keyword)
                end_idx = description.find('\n', start_idx)
                if end_idx == -1:
                    end_idx = len(description)
                return description[start_idx:end_idx].strip()
        
        return 'Unknown'
    
    def extract_device_contact(self, description: str, contact: str) -> str:
        """Extract device contact from description or contact field"""
        if contact and contact != 'Unknown':
            return contact
        
        # Try to extract contact from description
        description_lower = description.lower()
        contact_keywords = ['contact:', 'admin:', 'support:', 'email:', 'phone:']
        
        for keyword in contact_keywords:
            if keyword in description_lower:
                start_idx = description_lower.find(keyword) + len(keyword)
                end_idx = description.find('\n', start_idx)
                if end_idx == -1:
                    end_idx = len(description)
                return description[start_idx:end_idx].strip()
        
        return 'Unknown'
    
    def extract_device_uptime(self, uptime: str) -> str:
        """Extract and format device uptime"""
        if not uptime or uptime == 'Unknown':
            return 'Unknown'
        
        try:
            # Convert SNMP uptime ticks to human readable format
            uptime_ticks = int(uptime)
            days = uptime_ticks // (24 * 60 * 60 * 100)
            hours = (uptime_ticks % (24 * 60 * 60 * 100)) // (60 * 60 * 100)
            minutes = (uptime_ticks % (60 * 60 * 100)) // (60 * 100)
            
            if days > 0:
                return f"{days}d {hours}h {minutes}m"
            elif hours > 0:
                return f"{hours}h {minutes}m"
            else:
                return f"{minutes}m"
        except (ValueError, TypeError):
            return uptime
    
    def detect_device_type(self, description: str) -> str:
        """Detect device type from description"""
        if not description:
            return 'Unknown'
        
        description_lower = description.lower()
        
        # Router detection
        if any(keyword in description_lower for keyword in ['router', 'gateway', 'border']):
            return 'Router'
        
        # Switch detection
        if any(keyword in description_lower for keyword in ['switch', 'catalyst', 'nexus']):
            return 'Switch'
        
        # Firewall detection
        if any(keyword in description_lower for keyword in ['firewall', 'asa', 'palo alto']):
            return 'Firewall'
        
        # Server detection
        if any(keyword in description_lower for keyword in ['server', 'host', 'workstation']):
            return 'Server'
        
        # Access point detection
        if any(keyword in description_lower for keyword in ['access point', 'ap', 'wireless']):
            return 'Access Point'
        
        return 'Unknown'
    
    def extract_os_version(self, description: str) -> str:
        """Extract OS version from description"""
        if not description:
            return 'Unknown'
        
        description_lower = description.lower()
        
        # Cisco IOS versions
        if 'ios' in description_lower:
            import re
            ios_match = re.search(r'ios\s*\(tm\)\s*([^,\s]+)', description_lower)
            if ios_match:
                return f"IOS {ios_match.group(1)}"
            return 'IOS'
        
        # Other OS detection patterns can be added here
        return 'Unknown'
    
    def extract_serial_number(self, description: str) -> str:
        """Extract serial number from description"""
        if not description:
            return 'Unknown'
        
        # Look for common serial number patterns
        import re
        
        # Cisco serial number pattern (e.g., ABC1234DEF5)
        cisco_pattern = r'\b[A-Z]{3}[0-9]{4}[A-Z]{3}[0-9]\b'
        cisco_match = re.search(cisco_pattern, description)
        if cisco_match:
            return cisco_match.group(0)
        
        # Generic serial number pattern
        generic_pattern = r'\b[A-Z0-9]{8,12}\b'
        generic_match = re.search(generic_pattern, description)
        if generic_match:
            return generic_match.group(0)
        
        return 'Unknown' 