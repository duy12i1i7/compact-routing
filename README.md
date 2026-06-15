# Compact Routing for SEB Moodle

Hệ thống **Compact Routing** là một giải pháp mạng chuyên dụng để định tuyến lưu lượng thi trắc nghiệm (Safe Exam Browser - SEB) từ hàng trăm thiết bị của sinh viên trong một mạng nội bộ (LAN) kết nối đến máy chủ Moodle trung tâm thông qua mạng riêng ảo **Tailscale**.

## 🏗 Kiến trúc Hệ thống

Hệ thống bao gồm 3 thành phần chính:
1. **MikroTik Router & WiFi AP**: Cung cấp mạng WiFi cho sinh viên, cấp phát IP và bẻ lái (Policy-Based Routing) các gói tin đi tới Moodle sang cho thiết bị Gateway.
2. **Jetson Nano / Raspberry Pi (Ubuntu Gateway)**: Đóng vai trò là cửa ngõ (Gateway) chạy Tailscale. Nó nhận gói tin từ Router, chuyển đổi địa chỉ mạng (NAT MASQUERADE) và đưa dữ liệu vào đường hầm mã hóa Tailscale để gửi tới máy chủ Moodle.
3. **Moodle Server (IP: 100.77.242.88)**: Máy chủ trung tâm nằm trong mạng lưới Tailscale.

### Lợi ích của kiến trúc này:
- **Hiệu năng cao**: Máy chủ Moodle không cần cấp hàng trăm kết nối VPN riêng lẻ cho từng sinh viên. Toàn bộ cơ sở thi chỉ cần 1 kết nối duy nhất (qua Gateway).
- **Trải nghiệm mượt mà**: Học sinh chỉ cần bắt WiFi và vào thi như bình thường, hoàn toàn trong suốt, không cần cài đặt VPN trên thiết bị cá nhân.
- **Độ trễ thấp**: Đã được tối ưu hóa hạt nhân (Kernel Tuning) để chống nghẽn mạng cục bộ và tối ưu hóa kết nối hầm ngầm (Direct Tunnel).

---

## 🚀 Hướng dẫn Cài đặt

### 1. Cấu hình Jetson Nano / Ubuntu Gateway
Thiết bị này cần được cắm dây LAN trực tiếp vào MikroTik Router. Đảm bảo bạn đã cài đặt sẵn Tailscale và kết nối thành công.

```bash
# 1. Cài đặt các công cụ cần thiết (nếu chưa có)
sudo apt update && sudo apt install -y iptables iproute2 crontab

# 2. Tải mã nguồn về máy Gateway
git clone https://github.com/duy12i1i7/compact-routing.git
cd compact-routing/ubuntu

# 3. Phân quyền và copy script thực thi
chmod +x setup.sh
sudo cp setup.sh /home/server/setup.sh

# 4. Cài đặt Systemd Service để tự khởi động cùng máy
sudo cp seb-forwarder.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable seb-forwarder.service
sudo systemctl start seb-forwarder.service
```
**Lưu ý**: Kiểm tra trạng thái của Gateway bằng lệnh: `sudo /home/server/setup.sh status`.

### 2. Cấu hình MikroTik Router
Mở giao diện quản trị MikroTik (WinBox hoặc WebFig), mở cửa sổ **New Terminal**.
Trước tiên, hãy lấy địa chỉ MAC của Jetson Nano (có thể xem trong phần DHCP Leases).

Mở file `mikrotik/setup.rsc`, thay đổi biến `JetsonMac` thành địa chỉ MAC của bạn, sau đó copy toàn bộ nội dung dán vào Terminal của MikroTik và gõ Enter:

```routeros
# Lấy file mikrotik/setup.rsc trong repo và chỉnh sửa lại dòng này:
:local JetsonMac "48:B0:2D:5B:DC:CE"
```
Đoạn Script này sẽ tự động:
- Cố định IP `192.168.200.2` cho Jetson Nano vĩnh viễn.
- Thêm Route bẻ toàn bộ dữ liệu đi Moodle về IP của Jetson.
- Thêm luật Tường lửa bỏ qua lỗi định tuyến không đối xứng (Asymmetric Routing Bypass).

---

## 🛠 Các Tối ưu hóa Nâng cao đã được áp dụng

Hệ thống này đã được giải quyết các "nút thắt cổ chai" mạng kinh điển thường gặp trong môi trường thi đông người:

1. **Khắc phục độ trễ 7 giây ở kết nối đầu tiên (Asymmetric Routing Drop)**
   - **Vấn đề**: Do dữ liệu gửi đi qua L3 (MikroTik) nhưng dữ liệu phản hồi lại trả trực tiếp qua L2 (từ Jetson đến Mac/Điện thoại), tính năng Stateful Firewall của MikroTik sẽ đánh dấu gói tin này là "Invalid" và ném vào sọt rác, khiến kết nối bị treo đúng 7 giây cho đến khi TCP retransmission diễn ra.
   - **Giải pháp**: Lệnh cấu hình trong `setup.rsc` đưa Moodle IP vào danh sách ngoại lệ của Firewall, cho phép dữ liệu phản hồi lập tức. Thời gian tải giảm từ `7.00s` xuống `0.29s`.

2. **Chống sập đường hầm Direct P2P (Tailscale DERP Relay Bottleneck)**
   - **Vấn đề**: Khi không có hoạt động, Tailscale tạm đóng đường hầm trực tiếp. Khi sinh viên đầu tiên kết nối, hệ thống phải chạy qua trạm trung chuyển (DERP Relay) rất chậm để đàm phán lại.
   - **Giải pháp**: Script `setup.sh` tự động cấy một `cronjob` (Keep-alive Ping) kích hoạt mỗi phút một lần. Đường hầm tốc độ cao sẽ luôn mở sẵn cửa.

3. **Mở rộng bộ nhớ đệm chống nghẽn (Conntrack Exhaustion)**
   - **Vấn đề**: Hàng chục sinh viên truy cập cùng 1 giây sẽ tạo ra hàng nghìn kết nối TCP, làm tràn bộ đệm mạng của thiết bị Gateway nhỏ bé.
   - **Giải pháp**: Script tự động điều chỉnh `sysctl` Linux, tăng `nf_conntrack_max` lên 262.144 và mở rộng `tcp_max_syn_backlog` để máy nuốt trọn mọi đợt sóng kết nối.

4. **Tránh lỗi nghẽn gói tin phân mảnh (TCP MSS Clamping)**
   - Đường truyền VPN có chỉ số MTU nhỏ hơn LAN (1280 vs 1500). Hệ thống sẽ tự động bóp nhỏ kích thước dữ liệu thỏa thuận (MSS = 1240) để dữ liệu qua lại không bị băm nát và rớt gói tin.

---
**Compact Routing** - Deploy and Forget. Cứ cắm điện là chạy!
