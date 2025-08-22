from typing import Tuple, Optional, Dict, Any
from pysnmp.hlapi import (
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
    getCmd
)
import re

class SNMPService:
    def __init__(self):
        pass
    
    def check_snmp_connectivity(self, ip: str, snmp_config: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Check SNMP connectivity to a device."""
        try:
            iterator = getCmd(
                SnmpEngine(),
                CommunityData(snmp_config.get('community', 'public'), 
                            mpModel=0 if snmp_config.get('snmp_version') == 'v1' else 1),
                UdpTransportTarget((ip, snmp_config.get('port', 161)), timeout=2, retries=1),
                ContextData(),
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0'))  # sysDescr
            )
            
            error_indication, error_status, error_index, var_binds = next(iterator)
            
            if error_indication:
                print(f"SNMP error indication: {error_indication}")
                return False, None
            elif error_status:
                print(f"SNMP error status: {error_status}")
                return False, None
            else:
                return True, var_binds[0][1].prettyPrint()
        except Exception as e:
            print(f"SNMP error for {ip}: {str(e)}")
            return False, None
    
    def get_device_info(self, ip: str, snmp_config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get detailed device information via SNMP."""
        try:
            iterator = getCmd(
                SnmpEngine(),
                CommunityData(snmp_config.get('community', 'public'), 
                            mpModel=0 if snmp_config.get('snmp_version') == 'v1' else 1),
                UdpTransportTarget((ip, snmp_config.get('port', 161)), timeout=2, retries=1),
                ContextData(),
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.5.0')),  # sysName
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0')),  # sysDescr
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.6.0')),  # sysLocation
                ObjectType(ObjectIdentity('1.3.6.1.2.1.47.1.1.1.1.11.1')),  # entPhysicalSerialNum
                ObjectType(ObjectIdentity('1.3.6.1.2.1.47.1.1.1.1.13.1'))   # entPhysicalModelName
            )
            
            error_indication, error_status, error_index, var_binds = next(iterator)
            
            if error_indication:
                print(f"SNMP error indication: {error_indication}")
                return None
            elif error_status:
                print(f"SNMP error status: {error_status}")
                return None
            
            info = {
                'hostname': var_binds[0][1].prettyPrint(),
                'description': var_binds[1][1].prettyPrint(),
                'location': var_binds[2][1].prettyPrint() or 'Default',
                'serial_number': var_binds[3][1].prettyPrint(),
                'model': var_binds[4][1].prettyPrint()
            }
            
            # Extract OS version from description
            version_match = re.search(r'Version\s+([\d\.]+[a-z]?)', info['description'])
            if version_match:
                info['os_version'] = version_match.group(1)
            else:
                info['os_version'] = 'Unknown'
            
            return info
        except Exception as e:
            print(f"Error getting SNMP info for {ip}: {str(e)}")
            return None
    
    def create_snmp_config(self, snmp_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create SNMP configuration object."""
        return {
            'snmp_version': snmp_data.get('snmp_version', 'v2c'),
            'community': snmp_data.get('community', 'public'),
            'username': snmp_data.get('username'),
            'auth_protocol': snmp_data.get('auth_protocol'),
            'auth_password': snmp_data.get('auth_password'),
            'priv_protocol': snmp_data.get('priv_protocol'),
            'priv_password': snmp_data.get('priv_password'),
            'port': int(snmp_data.get('port', 161))
        }
    
    def validate_snmp_config(self, snmp_config: Dict[str, Any]) -> bool:
        """Validate SNMP configuration parameters."""
        required_fields = ['snmp_version', 'community', 'port']
        
        for field in required_fields:
            if field not in snmp_config or snmp_config[field] is None:
                return False
        
        # Validate port range
        if not (1 <= snmp_config['port'] <= 65535):
            return False
        
        # Validate SNMP version
        if snmp_config['snmp_version'] not in ['v1', 'v2c', 'v3']:
            return False
        
        return True 