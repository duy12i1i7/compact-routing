import subprocess
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import requests
import routeros_api

app = Flask(__name__)
CORS(app)

MOODLE_IP = '100.77.242.88'
MIKROTIK_IP = '192.168.200.1'
MIKROTIK_USER = 'admin'
MIKROTIK_PASS = ''

# IP whitelist protection
ALLOWED_IPS = ['100.77.242.88', '127.0.0.1']

@app.before_request
def limit_remote_addr():
    if request.remote_addr not in ALLOWED_IPS:
        return Response("Access Denied: Jetson Backend only accepts requests from Moodle Server.", 403)

def get_mikrotik_api():
    connection = routeros_api.RouterOsApiPool(
        MIKROTIK_IP, username=MIKROTIK_USER, password=MIKROTIK_PASS, plaintext_login=True
    )
    return connection.get_api()

@app.route('/shutdown', methods=['POST'])
def shutdown():
    try:
        subprocess.Popen(['/sbin/shutdown', '-h', 'now'])
        return "Shutting down...", 200
    except Exception as e:
        return str(e), 500

@app.route('/api/stats')
def get_stats():
    stats = {
        "mikrotik": {},
        "moodle": {},
        "devices": []
    }
    
    # 1. Get MikroTik Bandwidth
    try:
        api = get_mikrotik_api()
        ifaces = api.get_resource('/interface')
        iface_stats = ifaces.get()
        wan_stats = next((i for i in iface_stats if i.get('name') == 'ether1'), None)
        stats["mikrotik"]["wan_rx"] = int(wan_stats.get('rx-byte', 0)) if wan_stats else 0
        stats["mikrotik"]["wan_tx"] = int(wan_stats.get('tx-byte', 0)) if wan_stats else 0
        
        # Get traffic speed
        try:
            speed = api.get_resource('/interface').call('monitor-traffic', {'interface': 'ether1', 'once': 'yes'})
            if speed and len(speed) > 0:
                stats["mikrotik"]["speed_rx_bps"] = int(speed[0].get('rx-bits-per-second', 0))
                stats["mikrotik"]["speed_tx_bps"] = int(speed[0].get('tx-bits-per-second', 0))
        except Exception as e:
            pass
        
        # 2. Get connected devices (DHCP Leases + ARP)
        leases = api.get_resource('/ip/dhcp-server/lease').get()
        arp = api.get_resource('/ip/arp').get()
        
        devices = {}
        for lease in leases:
            mac = lease.get('mac-address')
            devices[mac] = {
                "mac": mac,
                "ip": lease.get('address'),
                "hostname": lease.get('host-name', 'Unknown'),
                "status": lease.get('status', 'unknown'),
                "active_on_moodle": False
            }
            
        for a in arp:
            mac = a.get('mac-address')
            if mac and mac not in devices and not a.get('address').endswith('.1'):
                devices[mac] = {
                    "mac": mac,
                    "ip": a.get('address'),
                    "hostname": "Static/Unknown",
                    "status": "active",
                    "active_on_moodle": False
                }
                
        # 3. Call Moodle API to see who is active
        try:
            m_res = requests.get(f"http://{MOODLE_IP}/dashboard_api.php?secret=SEB_INTERNAL_API_2026", timeout=3)
            if m_res.status_code == 200:
                m_data = m_res.json()
                stats["moodle"]["active_count"] = m_data.get('active_count', 0)
                stats["moodle"]["students"] = m_data.get('students', [])
                
                # Match IP from Moodle with MikroTik Devices
                active_ips = [s['ip'] for s in stats["moodle"]["students"]]
                for mac, dev in devices.items():
                    if dev['ip'] in active_ips:
                        dev['active_on_moodle'] = True
        except Exception as e:
            stats["moodle"]["error"] = str(e)
                
        stats["devices"] = list(devices.values())
        
    except Exception as e:
        stats["mikrotik"]["error"] = str(e)

    return jsonify(stats)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
