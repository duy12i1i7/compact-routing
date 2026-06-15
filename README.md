# Compact Routing for SEB Moodle

Hệ thống **Compact Routing** là một giải pháp mạng chuyên dụng để định tuyến lưu lượng thi trắc nghiệm (Safe Exam Browser - SEB) từ hàng trăm thiết bị của sinh viên trong một mạng nội bộ (LAN) kết nối đến máy chủ Moodle trung tâm thông qua mạng riêng ảo **Tailscale**.

## 🏗 Kiến trúc Hệ thống

Hệ thống bao gồm 3 thành phần chính:
1. **MikroTik Router & WiFi AP**: Cung cấp mạng WiFi cho sinh viên, cấp phát IP và bẻ lái (Policy-Based Routing) các gói tin đi tới Moodle sang cho thiết bị Gateway.
2. **Jetson Nano / Raspberry Pi (Ubuntu Gateway)**: Đóng vai trò là cửa ngõ (Gateway) chạy Tailscale. Nhận gói tin từ Router, chuyển đổi địa chỉ mạng (NAT MASQUERADE) và đưa dữ liệu vào đường hầm mã hóa Tailscale để gửi tới máy chủ Moodle.
3. **Moodle Server (Tailscale HTTPS)**: Máy chủ trung tâm nằm trong mạng lưới Tailscale. Được bảo vệ bằng tường lửa chặt chẽ và giao tiếp an toàn qua chứng chỉ SSL.

### Lợi ích của kiến trúc này:
- **Hiệu năng cao**: Máy chủ Moodle không cần cấp hàng trăm kết nối VPN riêng lẻ cho từng sinh viên. Toàn bộ cơ sở thi chỉ cần 1 kết nối duy nhất (qua Gateway).
- **Trải nghiệm mượt mà**: Học sinh chỉ cần bắt WiFi và vào thi như bình thường, hoàn toàn trong suốt, không cần cài đặt VPN trên thiết bị cá nhân.
- **Tính bảo mật tối đa**: Chống hacker, đóng mọi cửa hậu với MAC Address Filtering và SSH Keys, 100% dữ liệu phòng thi được mã hóa HTTPS.

---

## 🔒 3 Tính Năng Độc Đáo Của Hệ Thống

### 1. Pháo Đài Khóa Trái Bằng Vân Tay Phần Cứng (MAC Address Filtering)
Hệ thống cấm tiệt sinh viên (hoặc các thiết bị lạ) thâm nhập vào cổng quản trị SSH (Port 22) bằng 3 tầng bảo mật:
- Tầng 1: Loại bỏ hoàn toàn tính năng đăng nhập bằng mật khẩu. Bắt buộc dùng **Chìa khóa mã hóa (SSH Key RSA 4096-bit)** lưu độc quyền trên máy của giáo viên.
- Tầng 2: **MikroTik Firewall** chặn mọi luồng SSH đi vào Moodle từ tất cả các máy tính nội bộ, ngoại trừ luồng tín hiệu mang thẻ "MAC Address" trùng khớp với máy tính của giáo viên.
- Tầng 3: **Jetson Nano iptables** bịt kín cổng 22, trở nên tàng hình với mọi công cụ rà quét mạng trong LAN, chỉ ưu ái mở cửa nhận chìa khóa khi phát hiện đúng MAC Address của máy giáo viên.

### 2. Tích Hợp Nút Tắt Máy Trực Tiếp Trên Moodle
Thay vì phải nhớ lệnh SSH phức tạp, hệ thống được cấu hình tự động nổi lên nút **"TẮT MÁY SEB"** ngay trên giao diện Moodle của Quản trị viên (Site Admin).
- **Cơ chế Backend an toàn**: Trình duyệt không gọi thẳng về Gateway mạng LAN (192.168.200.2). Mọi tín hiệu đều được gọi ngầm (Backend PHP) qua Moodle `is_siteadmin()`, sau đó Moodle sẽ đóng vai trò người đưa thư bí mật truyền tín hiệu tắt máy chui qua đường hầm Tailscale tới Jetson Nano.
- Học sinh dù có biết đường link tắt máy (`/shutdown_gateway.php`) cũng sẽ bị máy chủ chặn đứng ngay lập tức do không có phiên đăng nhập của Admin.

### 3. Nâng Cấp Chứng Chỉ Ổ Khóa Xanh (HTTPS qua MagicDNS)
Hệ thống không sử dụng địa chỉ IP (`http://100.x.x.x`) trần trụi. Thay vào đó, nó tận dụng **Tailscale MagicDNS** để cấp phát tên miền xịn (vd: `seb.tail873d88.ts.net`) và cài đặt thành công chứng chỉ **Let's Encrypt**.
- MikroTik sẽ làm nhiệm vụ phân giải DNS ảo (Static DNS), chỉ điểm cho mạng nội bộ tìm đến Moodle.
- Web Server (Nginx) chặn đường HTTP, ép toàn bộ học sinh đi vào đường băng HTTPS được mã hóa toàn trình (End-to-End Encryption).

---

## 🚀 Hướng dẫn Cài đặt

### 1. Cấu hình Jetson Nano / Ubuntu Gateway
Thiết bị này cần được cắm dây LAN trực tiếp vào MikroTik Router.

```bash
# 1. Cài đặt các công cụ cần thiết (nếu chưa có)
sudo apt update && sudo apt install -y iptables iproute2 crontab

# 2. Tải mã nguồn về máy Gateway
git clone https://github.com/duy12i1i7/compact-routing.git
cd compact-routing/ubuntu

# 3. Phân quyền và copy script thực thi
chmod +x setup.sh shutdown_server.py
sudo cp setup.sh /home/server/setup.sh

# 4. Cài đặt Systemd Service để tự khởi động cùng máy
sudo cp seb-forwarder.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable seb-forwarder.service
sudo systemctl start seb-forwarder.service
```

### 2. Cấu hình MikroTik Router
Sử dụng file `mikrotik/setup.rsc` trong kho lưu trữ, thay đổi các thông số `JetsonMac` và `TeacherMac` cho phù hợp, sau đó import vào RouterOS bằng Terminal.
Script sẽ tự động cấp IP tĩnh, khai báo Static DNS phân giải tên miền Tailscale, và cài cắm các lớp Tường Lửa nhận diện MAC Address.

---

## 🛠 Các Tối ưu hóa Nâng cao đã được áp dụng

1. **Khắc phục độ trễ 7 giây (Asymmetric Routing Drop)**
   - Khắc phục lỗi Firewall MikroTik treo gói tin 7 giây do không bắt được cờ SYN-ACK khi dữ liệu quay về trực tiếp qua lớp L2 từ Gateway.
2. **Chống sập đường hầm Direct P2P (Tailscale DERP Relay Bottleneck)**
   - Kích hoạt Cronjob gõ cửa (Keep-alive Ping) tự động duy trì hầm ngầm ở trạng thái "Direct" tốc độ cao thay vì đứt gánh sang đường "Relay" rùa bò.
3. **Mở rộng bộ nhớ đệm chống nghẽn (Conntrack Exhaustion)**
   - Tối ưu `sysctl`, tăng `nf_conntrack_max` và `tcp_max_syn_backlog` để chống chọi đợt sóng tải cả nghìn kết nối đồng thời từ thiết bị của sinh viên khi vừa phát đề thi.
4. **Tránh lỗi nghẽn TCP MSS Clamping**
   - Tự động bóp nhỏ kích thước dữ liệu (MSS = 1240) để luồn lách mượt mà qua khe hẹp MTU (1280) của mạng VPN.

---
**Compact Routing** - Hệ thống phòng thi siêu bọc thép. Cắm điện là chạy!
