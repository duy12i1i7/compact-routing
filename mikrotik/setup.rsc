# ==============================================================================
# CẤU HÌNH MIKROTIK CHO SEB MOODLE FORWARDER
#
# Cách dùng: 
# Copy từng dòng lệnh dưới đây và dán vào cửa sổ Terminal (New Terminal)
# trên phần mềm WinBox hoặc trang quản trị Web của MikroTik.
# ==============================================================================

# Biến cấu hình
:local JetsonMac "48:B0:2D:5B:DC:CE"
:local TeacherMac "E2:5B:11:5C:D0:03"
:local JetsonIP "192.168.200.2"
:local MoodleIP "100.77.242.88"
:local MoodleDomain "seb.tail873d88.ts.net"

# 1. Đặt IP tĩnh (Static DHCP Lease) cho Jetson Nano
/ip dhcp-server lease remove [find mac-address=$JetsonMac]
/ip dhcp-server lease add address=$JetsonIP mac-address=$JetsonMac server=defconf

# 2. Thêm Static Route bẻ lái gói tin Moodle về Jetson Nano
/ip route remove [find dst-address=($MoodleIP . "/32")]
/ip route add dst-address=($MoodleIP . "/32") gateway=$JetsonIP

# 3. Phân giải tên miền ảo (Static DNS) ép Moodle chạy HTTPS
/ip dns static remove [find name=$MoodleDomain]
/ip dns static add name=$MoodleDomain address=$MoodleIP

# ==============================================================================
# 4. CẤU HÌNH TƯỜNG LỬA (Bảo mật 2 Lớp)
# - Cho phép kết nối Web (80, 443) tới Moodle.
# - Cho phép kết nối Quản trị (SSH/22) TỚI Moodle CHỈ TỪ MÁY MAC CỦA GIÁO VIÊN.
# - Chặn toàn bộ các luồng dữ liệu khác để ngăn sinh viên thâm nhập.
# ==============================================================================

# Xóa các luật cũ liên quan đến Moodle (nếu có)
/ip firewall filter remove [find dst-address=$MoodleIP]

# Lấy ID của luật Drop Invalid để chèn luật mới lên trước nó
:local invalidRuleID [find where action=drop and connection-state=invalid and chain=forward]

# Thêm luật mở cổng Web
/ip firewall filter add chain=forward action=accept dst-address=$MoodleIP protocol=tcp dst-port=80,443 place-before=$invalidRuleID

# Thêm luật mở cổng SSH ưu tiên cho máy Giáo viên
/ip firewall filter add chain=forward action=accept dst-address=$MoodleIP protocol=tcp dst-port=22 src-mac-address=$TeacherMac place-before=$invalidRuleID

# Thêm luật chặn MỌI GÓI TIN KHÁC đến Moodle (Đóng sập cổng sau)
/ip firewall filter add chain=forward action=drop dst-address=$MoodleIP place-before=$invalidRuleID
