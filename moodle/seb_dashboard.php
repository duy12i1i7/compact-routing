<?php
require_once(__DIR__ . '/config.php');

// Yêu cầu đăng nhập và quyền Admin
require_login();
if (!is_siteadmin()) {
    header('HTTP/1.0 403 Forbidden');
    echo '<h1 style="color:red;text-align:center;margin-top:50px;">LỖI: Bạn không có quyền truy cập trang này!</h1>';
    die();
}

// Lấy nội dung trang HTML tĩnh từ React Build và in ra
$html_file = __DIR__ . '/seb_dashboard_assets/index.html';
if (file_exists($html_file)) {
    $html = file_get_contents($html_file);
    // Chuyển đổi đường dẫn tuyệt đối thành tương đối để tránh lỗi 404 (Trắng trang)
    $html = str_replace('"/seb_dashboard_assets/', '"./seb_dashboard_assets/', $html);
    echo $html;
} else {
    echo "Lỗi: Không tìm thấy giao diện Dashboard.";
}
