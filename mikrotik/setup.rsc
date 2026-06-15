# ==============================================================================
# CẤU HÌNH MIKROTIK CHO SEB MOODLE FORWARDER
#
# Cách dùng: 
# Copy từng dòng lệnh dưới đây và dán vào cửa sổ Terminal (New Terminal)
# trên phần mềm WinBox hoặc trang quản trị Web của MikroTik.
# ==============================================================================

# Biến cấu hình
:local JetsonMac "48:B0:2D:5B:DC:CE"
:local JetsonIP "192.168.200.2"
:local MoodleIP "100.77.242.88/32"

# 1. Đặt IP tĩnh (Static DHCP Lease) cho Jetson Nano
# Xóa lease cũ nếu có để tránh xung đột
/ip dhcp-server lease remove [find mac-address=$JetsonMac]
# Thêm lease tĩnh mới
/ip dhcp-server lease add address=$JetsonIP mac-address=$JetsonMac server=defconf

# 2. Thêm Static Route bẻ lái gói tin Moodle về Jetson Nano
# Xóa route cũ nếu có
/ip route remove [find dst-address=$MoodleIP]
# Thêm route mới
/ip route add dst-address=$MoodleIP gateway=$JetsonIP

# ==============================================================================
# Nếu bạn thay bằng một thiết bị Jetson/Raspberry Pi khác,
# hãy đổi lại địa chỉ MAC ở biến JetsonMac bên trên cho phù hợp.
# ==============================================================================

# 3. Cho phép định tuyến không đối xứng (Asymmetric Routing Bypass)
# Tránh việc Firewall MikroTik drop nhầm gói tin do trả về qua L2
/ip firewall filter add chain=forward dst-address=$MoodleIP action=accept place-before=[find where connection-state=invalid]
