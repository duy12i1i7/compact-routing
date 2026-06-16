from flask import Flask, jsonify, request, Response
from functools import wraps
from flask_cors import CORS
import routeros_api
import requests
import time
import threading

import subprocess

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')
CORS(app)

MIKROTIK_IP = '192.168.200.1'
MIKROTIK_USER = 'admin'
MIKROTIK_PASS = ''

MOODLE_API = 'https://seb.tail873d88.ts.net/dashboard_api.php'
MOODLE_IP = '100.77.242.88'

# Cấu hình tài khoản đăng nhập (Admin)
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'seb'

def check_auth(username, password):
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD

def authenticate():
    return Response(
    'Vui lòng đăng nhập bằng tài khoản quản trị để truy cập Dashboard.', 401,
    {'WWW-Authenticate': 'Basic realm="Admin Dashboard Login Required"'})

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated


def get_mikrotik_api():
    connection = routeros_api.RouterOsApiPool(
        MIKROTIK_IP, username=MIKROTIK_USER, password=MIKROTIK_PASS, plaintext_login=True
    )
    return connection.get_api()

@app.route('/shutdown', methods=['POST'])
@requires_auth
def shutdown():
    try:
        subprocess.Popen(['/sbin/shutdown', '-h', 'now'])
        return "Shutting down...", 200
    except Exception as e:
        return str(e), 500

@app.route('/')
@requires_auth
def serve_frontend():
    return app.send_static_file('index.html')

@app.route('/api/stats')
@requires_auth
def get_stats():
    stats = {
        "mikrotik": {},
        "moodle": {},
        "devices": []
    }
    
    try:
        api = get_mikrotik_api()
        
        # 1. Get overall bandwidth
        ifaces = api.get_resource('/interface')
        iface_stats = ifaces.get()
        bridge_stats = next((i for i in iface_stats if i.get('name') == 'bridge'), None)
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
        for l in leases:
            mac = l.get('mac-address')
            devices[mac] = {
                "ip": l.get('address'),
                "mac": mac,
                "hostname": l.get('host-name', 'Unknown Device'),
                "status": l.get('status'),
                "active_on_moodle": False
            }
            
        for a in arp:
            mac = a.get('mac-address')
            if mac and mac not in devices:
                devices[mac] = {
                    "ip": a.get('address'),
                    "mac": mac,
                    "hostname": "Static/Unknown",
                    "status": "active",
                    "active_on_moodle": False
                }
                
        # 3. Get active connections to Moodle via Torch
        # Torch blocks execution, so we just run it for 1 second
        # RouterOS API doesn't support duration well, so we use a quick command
        # Alternatively, we can use Firewall Connections
        conns = api.get_resource('/ip/firewall/connection').get()
        active_ips = set()
        for c in conns:
            if MOODLE_IP in c.get('dst-address', '') and '443' in c.get('dst-address', ''):
                src_ip = c.get('src-address', '').split(':')[0]
                active_ips.add(src_ip)
                
        for mac, dev in devices.items():
            if dev['ip'] in active_ips:
                dev['active_on_moodle'] = True
                
        stats["devices"] = list(devices.values())
        # API doesn't strictly need manual disconnect if not kept open forever, 
        # but let's ignore disconnect error
        
    except Exception as e:
        stats["mikrotik"]["error"] = str(e)
        
    try:
        # Get Moodle data
        # Note: Jetson Nano connects to Moodle via Tailscale, so we bypass SSL verify since it might be self-signed locally
        resp = requests.get(MOODLE_API, verify=False, timeout=3)
        if resp.status_code == 200:
            stats["moodle"] = resp.json()
    except Exception as e:
        stats["moodle"]["error"] = str(e)

    return jsonify(stats)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
