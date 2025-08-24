# Network Diagram Stencils

This folder contains professional network diagram stencils for different device types.

## File Naming Convention

All icons should be in **PNG format** with transparent backgrounds and named exactly as specified below:

### Device Type Icons

1. **Router Icons:**
   - `router-cisco.png` - Cisco router icon
   - `router-generic.png` - Generic router icon
   - `router-juniper.png` - Juniper router icon

2. **Switch Icons:**
   - `switch-cisco.png` - Cisco switch icon
   - `switch-generic.png` - Generic switch icon
   - `switch-hp.png` - HP switch icon
   - `switch-dell.png` - Dell switch icon

3. **Firewall Icons:**
   - `firewall-cisco-asa.png` - Cisco ASA firewall
   - `firewall-palo-alto.png` - Palo Alto firewall
   - `firewall-fortinet.png` - Fortinet firewall
   - `firewall-generic.png` - Generic firewall icon

4. **Access Point Icons:**
   - `access-point-cisco.png` - Cisco access point
   - `access-point-generic.png` - Generic access point
   - `access-point-wireless.png` - Wireless access point

5. **Server Icons:**
   - `server-generic.png` - Generic server
   - `server-rack.png` - Rack server
   - `server-tower.png` - Tower server
   - `workstation.png` - Workstation/PC

6. **Network Appliance Icons:**
   - `load-balancer.png` - Load balancer
   - `proxy-server.png` - Proxy server
   - `appliance-generic.png` - Generic network appliance

7. **Default Icons:**
   - `device-unknown.png` - Unknown device type
   - `device-generic.png` - Generic network device

## Icon Specifications

- **Format:** PNG with transparent background
- **Size:** 64x64 pixels (recommended)
- **Style:** Professional network diagram style
- **Colors:** Should match the color scheme used in the application
- **Quality:** High resolution, crisp edges

## Color Scheme Reference

- **Routers:** Orange (#ff6b35)
- **Switches:** Green (#4caf50)
- **Firewalls:** Red (#f44336)
- **Access Points:** Purple (#9c27b0)
- **Servers:** Blue (#2196f3)
- **Appliances:** Orange (#ff9800)
- **Unknown:** Gray (#607d8b)

## Usage

Icons will be automatically loaded based on device type detection. The system will:
1. Detect device type from backend data
2. Match to appropriate icon filename
3. Display the icon in the network diagram

## Adding New Icons

1. Save your icon with the exact filename specified above
2. Place it in this folder
3. The system will automatically detect and use the new icon
4. Make sure the icon has a transparent background
5. Test the icon in the network diagram to ensure proper display 