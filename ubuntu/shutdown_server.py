#!/usr/bin/env python3
import http.server
import socketserver
import os
import base64

PORT = 8080
# Tài khoản đăng nhập
USERNAME = "seb"
PASSWORD = "seb"

key = base64.b64encode(f"{USERNAME}:{PASSWORD}".encode('utf-8')).decode('ascii')
AUTH_HEADER = f"Basic {key}"

class AuthHandler(http.server.SimpleHTTPRequestHandler):
    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()

    def do_AUTHHEAD(self):
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="Vui long dang nhap de tat may"')
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.end_headers()

    def do_GET(self):
        auth_header = self.headers.get("Authorization")
        if auth_header is None or auth_header != AUTH_HEADER:
            self.do_AUTHHEAD()
            self.wfile.write(b"Khong co quyen truy cap.")
            return

        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<html><head><meta name='viewport' content='width=device-width, initial-scale=1'></head>")
            self.wfile.write(b"<body style='text-align:center; padding: 50px; font-family: Arial;'>")
            self.wfile.write(b"<h2>Jetson Nano Gateway</h2>")
            self.wfile.write(b"<form action='/shutdown' method='POST'>")
            self.wfile.write(b"<button style='background-color:red; color:white; padding:20px 40px; font-size:24px; font-weight:bold; border:none; border-radius:10px; cursor:pointer;'>T\xe1\xba\xaeT M\xc3\x81Y NGAY</button>")
            self.wfile.write(b"</form></body></html>")
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        auth_header = self.headers.get("Authorization")
        if auth_header is None or auth_header != AUTH_HEADER:
            self.do_AUTHHEAD()
            self.wfile.write(b"Khong co quyen truy cap.")
            return

        if self.path == "/shutdown":
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<html><head><meta name='viewport' content='width=device-width, initial-scale=1'></head>")
            self.wfile.write(b"<body style='text-align:center; padding: 50px; font-family: Arial;'>")
            self.wfile.write(b"<h2>Jetson Nano dang duoc tat...</h2>")
            self.wfile.write(b"<p style='color: red;'>Vui long cho 10 giay roi rut dien!</p>")
            self.wfile.write(b"</body></html>")
            os.system("shutdown -h now")
        else:
            self.send_response(404)
            self.end_headers()

with socketserver.TCPServer(("", PORT), AuthHandler) as httpd:
    print(f"Web Shutdown Server with Auth listening on port {PORT}")
    httpd.serve_forever()
