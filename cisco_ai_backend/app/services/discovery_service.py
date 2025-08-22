from typing import List, Dict, Any, Optional
import asyncio
import ipaddress
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.base import Device, DeviceLog, LogType, DeviceSNMP as DeviceSNMPModel, Network, Organization, User
from app.services.snmp_service import SNMPService
from app.services.ssh_service import SSHService
from app.services.device_service import DeviceService

class DiscoveryService:
    def __init__(self, db: Session):
        self.db = db
        self.snmp_service = SNMPService()
        self.ssh_service = SSHService()
        self.device_service = DeviceService(db)
    
    def is_valid_cidr(self, ip_range: str) -> bool:
        """Validate CIDR notation."""
        try:
            ipaddress.ip_network(ip_range)
            return True
        except ValueError:
            return False
    
    def parse_ip_range(self, ip_range: str, start_ip: str = None, end_ip: str = None) -> List[str]:
        """Parse IP range and return list of IPs to scan."""
        ip_list = []
        
        if ip_range:
            if '-' in ip_range:
                # Handle start_ip-end_ip format
                try:
                    start_ip_str, end_ip_str = ip_range.split('-')
                    start = ipaddress.IPv4Address(start_ip_str.strip())
                    end = ipaddress.IPv4Address(end_ip_str.strip())
                    ip_list = [str(ipaddress.IPv4Address(ip)) for ip in range(int(start), int(end) + 1)]
                except ValueError as e:
                    raise ValueError(f"Invalid IP range format: {str(e)}")
            else:
                # Handle CIDR notation
                if not self.is_valid_cidr(ip_range):
                    raise ValueError("Invalid CIDR notation")
                ip_list = [str(ip) for ip in ipaddress.IPv4Network(ip_range)]
        elif start_ip and end_ip:
            # Handle separate start and end IPs
            try:
                start = ipaddress.IPv4Address(start_ip)
                end = ipaddress.IPv4Address(end_ip)
                ip_list = [str(ipaddress.IPv4Address(ip)) for ip in range(int(start), int(end) + 1)]
            except ValueError as e:
                raise ValueError(f"Invalid IP range: {str(e)}")
        else:
            raise ValueError("IP range must be provided either in CIDR notation, start_ip-end_ip format, or as separate start_ip and end_ip fields")
        
        return ip_list
    
    async def scan_single_device(self, ip_address: str, credentials: Dict[str, str], 
                                network_id: int, company_id: int, owner_id: int, 
                                snmp_config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Scan a single device for discovery."""
        print(f"Scanning device at {ip_address}")

        # Initial ping check
        from app.services.status_service import DeviceStatusService
        status_service = DeviceStatusService(self.db)
        ping_ok = status_service.ping_device(ip_address)
        print(f"Initial ping check for {ip_address}: {ping_ok}")

        if not ping_ok:
            try:
                log = DeviceLog(
                    ip_address=ip_address,
                    network_id=network_id,
                    company_id=company_id,
                    log_type=LogType.UNREACHABLE.value,
                    message=f"Device at {ip_address} is unreachable"
                )
                self.db.add(log)
                self.db.commit()
            except Exception as e:
                print(f"Error creating ping failure log: {str(e)}")
                self.db.rollback()
            return {"status": "failed", "message": "Device unreachable", "ip": ip_address}

        try:
            # Create SNMP config object
            device_snmp_config = self.snmp_service.create_snmp_config(snmp_config or {})
            
            # Check SNMP
            snmp_ok, snmp_info = self.snmp_service.check_snmp_connectivity(ip_address, device_snmp_config)
            print(f"[SNMP] {ip_address} -> {'✅' if snmp_ok else '❌'}")
            
            if not snmp_ok:
                try:
                    log = DeviceLog(
                        ip_address=ip_address,
                        network_id=network_id,
                        company_id=company_id,
                        log_type=LogType.UNKNOWN_DEVICE.value,
                        message=f"SNMP authentication failed for {ip_address}"
                    )
                    self.db.add(log)
                    self.db.commit()
                except Exception as e:
                    print(f"Error creating SNMP failure log: {str(e)}")
                    self.db.rollback()
                return {"status": "failed", "message": "SNMP authentication failed", "ip": ip_address}

            # Get detailed device info via SNMP
            device_info = self.snmp_service.get_device_info(ip_address, device_snmp_config)
            
            if not device_info:
                try:
                    log = DeviceLog(
                        ip_address=ip_address,
                        network_id=network_id,
                        company_id=company_id,
                        log_type=LogType.UNKNOWN_DEVICE.value,
                        message=f"Failed to get device info via SNMP for {ip_address}"
                    )
                    self.db.add(log)
                    self.db.commit()
                except Exception as e:
                    print(f"Error creating SNMP info failure log: {str(e)}")
                    self.db.rollback()
                return {"status": "failed", "message": "Failed to get device info", "ip": ip_address}

            # Clean up device name
            hostname = device_info['hostname'].replace('.test', '').replace('.Test', '')
            
            # Create or update device in database
            device_entry = self.device_service.get_device_by_ip(ip_address, network_id)
            if device_entry:
                print(f"Updating existing device {ip_address}")
                device_entry.name = hostname
                device_entry.type = device_info['model']
                device_entry.platform = 'cisco_ios_xe' if 'IOS-XE' in device_info['description'] else 'cisco_ios'
                device_entry.username = credentials.get('username')
                device_entry.password = credentials.get('password')
                device_entry.is_active = True
                device_entry.os_version = device_info['os_version']
                device_entry.serial_number = device_info['serial_number']
                device_entry.ping_status = True
                device_entry.snmp_status = True
                device_entry.discovery_method = 'auto'
                
                # Update SNMP config
                if device_entry.snmp_config:
                    device_entry.snmp_config.snmp_version = device_snmp_config['snmp_version']
                    device_entry.snmp_config.community = device_snmp_config['community']
                    device_entry.snmp_config.username = device_snmp_config['username']
                    device_entry.snmp_config.auth_protocol = device_snmp_config['auth_protocol']
                    device_entry.snmp_config.auth_password = device_snmp_config['auth_password']
                    device_entry.snmp_config.priv_protocol = device_snmp_config['priv_protocol']
                    device_entry.snmp_config.priv_password = device_snmp_config['priv_password']
                    device_entry.snmp_config.port = device_snmp_config['port']
                else:
                    device_entry.snmp_config = DeviceSNMPModel(
                        snmp_version=device_snmp_config['snmp_version'],
                        community=device_snmp_config['community'],
                        username=device_snmp_config['username'],
                        auth_protocol=device_snmp_config['auth_protocol'],
                        auth_password=device_snmp_config['auth_password'],
                        priv_protocol=device_snmp_config['priv_protocol'],
                        priv_password=device_snmp_config['priv_password'],
                        port=device_snmp_config['port']
                    )
                
                if not device_entry.location:
                    device_entry.location = device_info['location'] or 'Default'
                self.db.add(device_entry)
            else:
                print(f"Creating new device {ip_address}")
                device_entry = Device(
                    ip=ip_address,
                    name=hostname,
                    type=device_info['model'],
                    platform='cisco_ios_xe' if 'IOS-XE' in device_info['description'] else 'cisco_ios',
                    username=credentials.get('username'),
                    password=credentials.get('password'),
                    network_id=network_id,
                    company_id=company_id,
                    owner_id=owner_id,
                    is_active=True,
                    os_version=device_info['os_version'],
                    serial_number=device_info['serial_number'],
                    location=device_info['location'] or 'Default',
                    ping_status=True,
                    snmp_status=True,
                    discovery_method='auto'
                )
                
                # Create SNMP config
                device_entry.snmp_config = DeviceSNMPModel(
                    snmp_version=device_snmp_config['snmp_version'],
                    community=device_snmp_config['community'],
                    username=device_snmp_config['username'],
                    auth_protocol=device_snmp_config['auth_protocol'],
                    auth_password=device_snmp_config['auth_password'],
                    priv_protocol=device_snmp_config['priv_protocol'],
                    priv_password=device_snmp_config['priv_password'],
                    port=device_snmp_config['port']
                )
                
                self.db.add(device_entry)

            try:
                self.db.commit()
                print(f"Successfully saved device {ip_address} to database")
            except Exception as e:
                self.db.rollback()
                print(f"Error committing device changes: {str(e)}")
                raise e

            # Create success log
            try:
                log = DeviceLog(
                    ip_address=ip_address,
                    log_type=LogType.UNKNOWN_DEVICE.value,
                    message=f"Successfully discovered device: {hostname} ({device_info['model']})",
                    network_id=network_id,
                    company_id=company_id
                )
                self.db.add(log)
                self.db.commit()
            except Exception as e:
                print(f"Error creating success log: {str(e)}")
                self.db.rollback()

            return {
                "status": "success",
                "hostname": hostname,
                "model": device_info['model'],
                "platform": 'cisco_ios_xe' if 'IOS-XE' in device_info['description'] else 'cisco_ios',
                "os_version": device_info['os_version'],
                "serial_number": device_info['serial_number'],
                "ip": ip_address,
                "ping_status": True,
                "snmp_status": True
            }

        except Exception as e:
            print(f"Error scanning device at {ip_address}: {str(e)}")
            try:
                log = DeviceLog(
                    ip_address=ip_address,
                    network_id=network_id,
                    company_id=company_id,
                    log_type=LogType.UNKNOWN_DEVICE.value,
                    message=f"Error scanning device at {ip_address}: {str(e)}"
                )
                self.db.add(log)
                self.db.commit()
            except Exception as log_e:
                print(f"Error creating error log: {str(log_e)}")
                self.db.rollback()
            return {"status": "failed", "message": str(e), "ip": ip_address}
    
    async def start_discovery(self, network_id: int, ip_range: str, credentials: Dict[str, str], 
                             snmp_config: Dict[str, Any] = None) -> str:
        """Start device discovery for a network."""
        try:
            # Get network details and validate access
            network = self.db.query(Network).filter(Network.id == network_id).first()
            if not network:
                raise ValueError("Network not found")
            
            # Get organization
            organization = self.db.query(Organization).filter(Organization.id == network.organization_id).first()
            if not organization:
                raise ValueError("Organization not found")
            
            # Get owner information and company_id
            owner = self.db.query(User).filter(User.id == organization.owner_id).first()
            if not owner:
                raise ValueError("Organization owner not found")
                
            company_id = owner.company_id
            owner_id = owner.id
            if not company_id:
                raise ValueError("Owner's company_id not found")
            
            print(f"Using company_id {company_id} from owner's record")

            # Parse IP range
            ip_list = self.parse_ip_range(ip_range)
            total_ips = len(ip_list)
            print(f"Scanning IP range: {ip_list[0]} to {ip_list[-1]}, total IPs: {total_ips}")

            # Create tasks for all IPs with controlled concurrency
            semaphore = asyncio.Semaphore(5)  # Limit concurrent scans to 5
            
            async def scan_with_semaphore(semaphore, ip_address, credentials, network_id, company_id, owner_id, snmp_config):
                async with semaphore:
                    result = await self.scan_single_device(
                        ip_address=ip_address,
                        credentials=credentials,
                        network_id=network_id,
                        company_id=company_id,
                        owner_id=owner_id,
                        snmp_config=snmp_config
                    )
                    result["ip"] = ip_address
                    return result
            
            # Scan devices concurrently
            tasks = [scan_with_semaphore(semaphore, ip, credentials, network_id, company_id, owner_id, snmp_config) 
                    for ip in ip_list]
            results = await asyncio.gather(*tasks)
            
            # Process results
            discovered_count = 0
            for result in results:
                if result["status"] == "success":
                    discovered_count += 1
                    print(f"Device {result['ip']} discovered successfully")
                else:
                    print(f"Device {result['ip']} not reachable: {result['message']}")
            
            print(f"Discovery completed. Found {discovered_count} devices.")
            return f"Discovery completed. Found {discovered_count} devices."
            
        except Exception as e:
            print(f"Error in start_discovery: {str(e)}")
            raise e 