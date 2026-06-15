#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

PORT = 8080
SECRET_PATH = "/tat-may-ngay"

class ShutdownHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == SECRET_PATH:
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<html><head><meta name='viewport' content='width=device-width, initial-scale=1'></head>")
            self.wfile.write(b"<body style='text-align:center; padding: 50px; font-family: Arial;'>")
            self.wfile.write(b"<h2>Jetson Nano dang duoc tat...</h2>")
            self.wfile.write(b"<p style='color: red;'>Vui long cho 10 giay roi rut dien!</p>")
            self.wfile.write(b"</body></html>")
            # Thực thi lệnh tắt máy
            os.system("shutdown -h now")
        elif self.path == "/":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"SEB Forwarder is running.")
        else:
            self.send_response(404)
            self.end_headers()

# Ràng buộc server chỉ lắng nghe trên cổng 8080
with socketserver.TCPServer(("", PORT), ShutdownHandler) as httpd:
    print(f"Web Shutdown Server listening on port {PORT}")
    httpd.serve_forever()
