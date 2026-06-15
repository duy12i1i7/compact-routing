<?php
require_once(__DIR__ . '/config.php');
require_login();

// Chỉ cho phép Site Admin (hoặc người có quyền cấu hình hệ thống)
if (!is_siteadmin()) {
    header('HTTP/1.0 403 Forbidden');
    echo '<html><body style="text-align:center; padding:50px; font-family:Arial;">';
    echo '<h1 style="color:red;">LỖI BẢO MẬT: BẠN KHÔNG CÓ QUYỀN TRUY CẬP!</h1>';
    echo '<p>Trang này chỉ dành cho Quản trị viên hệ thống Moodle.</p>';
    echo '</body></html>';
    die();
}

// Gọi lệnh HTTP xuống Jetson Nano qua đường hầm Tailscale
$url = "http://100.89.184.32:8080/shutdown";
$username = "seb";
$password = "seb";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true); // Thiết kế của shutdown_server.py yêu cầu POST
curl_setopt($ch, CURLOPT_USERPWD, "$username:$password");
curl_setopt($ch, CURLOPT_TIMEOUT, 5);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>';
echo '<body style="text-align:center; padding: 50px; font-family: Arial;">';
if ($http_code == 200) {
    echo '<h2 style="color: green;">Đã gửi lệnh Tắt Máy thành công!</h2>';
    echo '<p>Chiếc Jetson Nano đang được tắt. Vui lòng đợi 10 giây rồi rút điện (nếu có mặt tại phòng máy).</p>';
    echo '<a href="/" style="display:inline-block; margin-top:20px; padding:10px 20px; background:#007bff; color:#fff; text-decoration:none; border-radius:5px;">Quay lại Trang Chủ</a>';
} else {
    echo '<h2 style="color: red;">Lỗi gửi lệnh Tắt Máy!</h2>';
    echo '<p>Không thể kết nối tới Jetson Nano qua Tailscale. Vui lòng kiểm tra lại kết nối mạng.</p>';
    echo '<p>Mã lỗi HTTP: ' . $http_code . '</p>';
    echo '<a href="/" style="display:inline-block; margin-top:20px; padding:10px 20px; background:#6c757d; color:#fff; text-decoration:none; border-radius:5px;">Quay lại Trang Chủ</a>';
}
echo '</body></html>';
