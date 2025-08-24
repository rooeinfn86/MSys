from typing import Optional, Dict, Any
from netmiko import ConnectHandler
from netmiko.exceptions import NetMikoAuthenticationException, NetMikoTimeoutException
import re

class SSHService:
    def __init__(self):
        pass
    
    def connect_to_device(self, ip: str, credentials: Dict[str, str], device_type: str = "cisco_ios") -> Optional[ConnectHandler]:
        """Establish SSH connection to a device."""
        try:
            device_config = {
                'device_type': device_type,
                'ip': ip,
                'username': credentials.get('username'),
                'password': credentials.get('password'),
                'timeout': 10,
                'fast_cli': True
            }
            
            connection = ConnectHandler(**device_config)
            return connection
        except NetMikoAuthenticationException:
            print(f"Authentication failed for device at {ip}")
            return None
        except NetMikoTimeoutException:
            print(f"Connection timeout for device at {ip}")
            return None
        except Exception as e:
            print(f"SSH connection error for {ip}: {str(e)}")
            return None
    
    def get_device_info(self, connection: ConnectHandler) -> Dict[str, Any]:
        """Get device information via SSH."""
        try:
            # Get hostname from prompt
            hostname = connection.find_prompt().replace('#', '').strip()
            
            # Get version info for model and platform detection
            version_output = connection.send_command('show version')
            
            # Extract model information
            model = self._extract_model_from_version(version_output)
            
            # Determine platform (IOS or IOS-XE)
            platform = 'cisco_ios_xe' if 'IOS-XE' in version_output else 'cisco_ios'
            
            return {
                'hostname': hostname,
                'model': model,
                'platform': platform,
                'version_output': version_output
            }
        except Exception as e:
            print(f"Error getting device info via SSH: {str(e)}")
            return {}
    
    def _extract_model_from_version(self, version_output: str) -> str:
        """Extract device model from version output."""
        model = None
        
        # Try to get model from version output
        if 'WS-C' in version_output:
            # Extract Catalyst switch model (e.g., WS-C3750X-48P)
            model_match = re.search(r'(WS-C\d+[A-Z]?-\d+[A-Z]?)', version_output)
            if model_match:
                model = model_match.group(1)
        elif 'ISR' in version_output:
            # Extract ISR model
            model_match = re.search(r'(ISR\d+)', version_output)
            if model_match:
                model = model_match.group(1)
        elif 'ASR' in version_output:
            # Extract ASR model
            model_match = re.search(r'(ASR\d+)', version_output)
            if model_match:
                model = model_match.group(1)
        elif 'CSR' in version_output:
            # Extract CSR model
            model_match = re.search(r'(CSR\d+)', version_output)
            if model_match:
                model = model_match.group(1)
        
        if not model:
            # Fallback to basic model extraction
            model_match = re.search(r'[Cc]isco\s+(\S+)(?:\s+\([^)]+\))?\s+processor', version_output)
            if model_match:
                model = model_match.group(1)
            else:
                model = 'cisco_ios'
        
        return model
    
    def execute_command(self, connection: ConnectHandler, command: str) -> str:
        """Execute a command on the device."""
        try:
            return connection.send_command(command)
        except Exception as e:
            print(f"Error executing command '{command}': {str(e)}")
            return ""
    
    def disconnect_device(self, connection: ConnectHandler) -> None:
        """Safely disconnect from device."""
        try:
            if connection and connection.is_alive():
                connection.disconnect()
        except Exception as e:
            print(f"Error disconnecting from device: {str(e)}")
    
    def test_connectivity(self, ip: str, credentials: Dict[str, str], device_type: str = "cisco_ios") -> bool:
        """Test SSH connectivity to a device."""
        connection = None
        try:
            connection = self.connect_to_device(ip, credentials, device_type)
            return connection is not None
        finally:
            if connection:
                self.disconnect_device(connection)
    
    def get_device_configuration(self, connection: ConnectHandler) -> Dict[str, str]:
        """Get basic device configuration."""
        try:
            config = {}
            
            # Get running config
            config['running_config'] = connection.send_command('show running-config')
            
            # Get startup config
            config['startup_config'] = connection.send_command('show startup-config')
            
            # Get interface status
            config['interface_status'] = connection.send_command('show interfaces status')
            
            return config
        except Exception as e:
            print(f"Error getting device configuration: {str(e)}")
            return {} 