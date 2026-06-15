#!/bin/bash
#====================================================================
# SEB Moodle Forwarder - Ubuntu/Linux
# Chạy 1 lệnh duy nhất, tất cả tự động:
#   sudo ./setup.sh        -> Cài đặt forwarder
#   sudo ./setup.sh stop   -> Dọn dẹp & khôi phục ban đầu
#   sudo ./setup.sh status -> Xem trạng thái
#====================================================================

MOODLE_IP="100.77.242.88"
MOODLE_PORT=80
MARKER_FILE="/tmp/seb_forwarder_active"

if [ "$EUID" -ne 0 ]; then
  echo "❌ Chạy với sudo: sudo ./setup.sh [stop|status]"
  exit 1
fi

# ======================== STOP ========================
do_stop() {
    echo "=========================================="
    echo "  🧹 Dọn dẹp & Khôi phục"
    echo "=========================================="
    echo ""

    echo "      ⏳ Đang chờ Tailscale khởi tạo đường truyền..."
    for i in {1..300}; do
        TS_IFACE=$(ip route get $MOODLE_IP 2>/dev/null | head -1 | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}')
        if [ "$TS_IFACE" = "tailscale0" ]; then break; fi
        sleep 1
    done


    if [ -n "$TS_IFACE" ]; then
        iptables -D FORWARD -d $MOODLE_IP -o $TS_IFACE -j ACCEPT 2>/dev/null
        iptables -D FORWARD -s $MOODLE_IP -i $TS_IFACE -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null
    fi
    echo "[✓] FORWARD rules đã xóa."

    RULES=$(iptables -t nat -nL POSTROUTING --line-numbers 2>/dev/null | grep "$MOODLE_IP" | awk '{print $1}' | sort -nr)
    for RULE_NUM in $RULES; do
        iptables -t nat -D POSTROUTING $RULE_NUM 2>/dev/null
    done
    echo "[✓] NAT rules đã xóa."

    sysctl -w net.ipv4.ip_forward=0 > /dev/null
    sed -i '/# SEB Moodle Forwarder/d' /etc/sysctl.conf 2>/dev/null
    sed -i '/net.ipv4.ip_forward=1/d' /etc/sysctl.conf 2>/dev/null
    echo "[✓] IP Forwarding đã tắt."

    # Tắt Web Server
    pkill -f "shutdown_server.py" 2>/dev/null || true

    # Xóa Cron Keepalive
    crontab -l 2>/dev/null | grep -v "ping -c 1 $MOODLE_IP" | crontab - 2>/dev/null || true

    rm -f $MARKER_FILE
    echo ""
    echo "  ✅ Đã khôi phục về trạng thái ban đầu."
    echo "=========================================="
}

# ======================== STATUS ========================
do_status() {
    echo "=========================================="
    echo "  📊 Trạng thái Forwarder"
    echo "=========================================="
    echo ""

    FWD=$(sysctl -n net.ipv4.ip_forward)
    if [ "$FWD" = "1" ]; then
        echo "  IP Forward:   🟢 Bật"
    else
        echo "  IP Forward:   🔴 Tắt"
    fi

    echo "      ⏳ Đang chờ Tailscale khởi tạo đường truyền..."
    for i in {1..300}; do
        TS_IFACE=$(ip route get $MOODLE_IP 2>/dev/null | head -1 | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}')
        if [ "$TS_IFACE" = "tailscale0" ]; then break; fi
        sleep 1
    done

    if [ -n "$TS_IFACE" ]; then
        echo "  Tailscale:    🟢 $TS_IFACE"
    else
        echo "  Tailscale:    🔴 Không tìm thấy"
    fi

    NAT_COUNT=$(iptables -t nat -nL POSTROUTING 2>/dev/null | grep -c "$MOODLE_IP")
    if [ "$NAT_COUNT" -gt 0 ]; then
        echo "  NAT rules:    🟢 $NAT_COUNT rule(s)"
    else
        echo "  NAT rules:    🔴 Chưa có"
    fi

    if curl -s -o /dev/null -m 3 http://$MOODLE_IP; then
        echo "  Moodle:       🟢 Kết nối OK"
    else
        echo "  Moodle:       🔴 Không kết nối được"
    fi

    echo "=========================================="
}

# ======================== START ========================
do_start() {
    echo "=========================================="
    echo "  🚀 SEB Moodle Forwarder - Ubuntu"
    echo "=========================================="

    # Kiểm tra đã chạy chưa
    if [ -f "$MARKER_FILE" ]; then
        echo ""
        echo "⚠️  Forwarder đang chạy rồi."
        echo "   Dùng 'sudo ./setup.sh stop' để dừng trước."
        exit 1
    fi

    # Thêm luật MAC filtering cho cổng SSH (Chỉ cho phép Mac của GV)
    iptables -D INPUT -i eth0 -p tcp --dport 22 -m mac --mac-source e2:5b:11:5c:d0:03 -j ACCEPT 2>/dev/null || true
    iptables -D INPUT -i eth0 -p tcp --dport 22 -j DROP 2>/dev/null || true
    iptables -I INPUT 1 -i eth0 -p tcp --dport 22 -m mac --mac-source e2:5b:11:5c:d0:03 -j ACCEPT
    iptables -I INPUT 2 -i eth0 -p tcp --dport 22 -j DROP

    echo ""
    echo "[1/3] Kiểm tra Tailscale..."
    echo "      ⏳ Đang chờ Tailscale khởi tạo đường truyền..."
    for i in {1..300}; do
        TS_IFACE=$(ip route get $MOODLE_IP 2>/dev/null | head -1 | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}')
        if [ "$TS_IFACE" = "tailscale0" ]; then break; fi
        sleep 1
    done

    if [ "$TS_IFACE" != "tailscale0" ]; then
        echo "      ❌ Không tìm thấy đường đi tới $MOODLE_IP."
        echo "         Tailscale đã bật chưa?"
        exit 1
    fi
    echo "      ✓ Interface: $TS_IFACE"

    echo ""
    echo "[2/3] Tối ưu hóa Network & Bật IP Forwarding..."
    sysctl -w net.ipv4.ip_forward=1 > /dev/null
    sysctl -w net.netfilter.nf_conntrack_max=262144 > /dev/null 2>&1 || true
    sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=86400 > /dev/null 2>&1 || true
    sysctl -w net.core.somaxconn=4096 > /dev/null 2>&1 || true
    sysctl -w net.ipv4.tcp_max_syn_backlog=4096 > /dev/null 2>&1 || true
    if ! grep -q "net.ipv4.ip_forward=1" /etc/sysctl.conf 2>/dev/null; then
        echo "# SEB Moodle Forwarder" >> /etc/sysctl.conf
        echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
    fi
    echo "      ✓ OK"

    echo ""
    echo "[3/3] Cấu hình iptables..."
    iptables -I FORWARD 1 -d $MOODLE_IP -o $TS_IFACE -j ACCEPT
    iptables -I FORWARD 1 -s $MOODLE_IP -i $TS_IFACE -m state --state ESTABLISHED,RELATED -j ACCEPT
    iptables -t nat -A POSTROUTING -d $MOODLE_IP -o $TS_IFACE -j MASQUERADE
    echo "      ✓ FORWARD + NAT MASQUERADE"

    LOCAL_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')

    # Thêm Cron Keepalive để giữ kết nối Tailscale Direct (chống độ trễ lần đầu kết nối)
    (crontab -l 2>/dev/null | grep -v "ping -c 1 $MOODLE_IP"; echo "* * * * * ping -c 1 $MOODLE_IP > /dev/null 2>&1") | crontab -

    touch $MARKER_FILE

    # Bật Web Server hỗ trợ tắt máy từ xa
    if ! pgrep -f "shutdown_server.py" > /dev/null; then
        nohup python3 /home/server/shutdown_server.py > /dev/null 2>&1 &
    fi

    echo ""
    echo "=========================================="
    echo "  ✅ HOÀN TẤT! Forwarder đang hoạt động."
    echo "=========================================="
    echo ""
    echo "  CÁCH 1: Phát WiFi Hotspot từ máy này"
    echo "    Sinh viên kết nối WiFi rồi truy cập:"
    echo "    http://$MOODLE_IP"
    echo ""
    echo "  CÁCH 2: Dùng chung Router WiFi"
    echo "    Trên Router, thêm Static Route:"
    echo "      Destination: $MOODLE_IP/32"
    echo "      Gateway:     ${LOCAL_IP:-<IP máy này>}"
    echo ""
    echo "  Xem trạng thái:  sudo ./setup.sh status"
    echo "  Dừng & dọn dẹp:  sudo ./setup.sh stop"
    echo "=========================================="
}

# ======================== MAIN ========================
case "${1:-start}" in
    stop)   do_stop   ;;
    status) do_status ;;
    start)  do_start  ;;
    *)
        echo "Cách dùng: sudo ./setup.sh [start|stop|status]"
        exit 1
        ;;
esac
