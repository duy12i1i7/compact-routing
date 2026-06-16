<?php
require_once(__DIR__ . '/config.php');

// Yêu cầu đăng nhập và quyền Admin
require_login();
if (!is_siteadmin()) {
    header('HTTP/1.0 403 Forbidden');
    echo json_encode(["error" => "Access Denied: Admin only"]);
    die();
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// Jetson Nano IP qua mạng Tailscale
$JETSON_NANO_URL = "http://100.89.184.32:8080";

if ($action === 'stats') {
    $ch = curl_init($JETSON_NANO_URL . "/api/stats");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    header('Content-Type: application/json');
    if ($http_code == 200) {
        echo $response;
    } else {
        echo json_encode(["error" => "Không thể kết nối đến trạm kiểm soát Jetson Nano. ($http_code)"]);
    }
} 
elseif ($action === 'shutdown') {
    $ch = curl_init($JETSON_NANO_URL . "/shutdown");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code == 200) {
        echo json_encode(["success" => true, "message" => "Đã gửi lệnh tắt máy"]);
    } else {
        header('HTTP/1.0 500 Internal Server Error');
        echo json_encode(["error" => "Lỗi gửi lệnh tắt máy ($http_code)"]);
    }
}
else {
    header('HTTP/1.0 400 Bad Request');
    echo json_encode(["error" => "Invalid action"]);
}
