<!-- Chèn đoạn code sau vào Moodle -> Site Administration -> Appearance -> Additional HTML -> Within HEAD hoặc Before BODY đóng -->
<script>
document.addEventListener("DOMContentLoaded", function() {
    // Chỉ hiển thị nút nếu phát hiện người dùng có thanh công cụ Site Administration
    if (document.querySelector('a[href*="/admin/search.php"]') || document.querySelector('a[data-key="siteadminnode"]') || document.body.classList.contains("siteadmin")) {
        var btn = document.createElement("a");
        btn.href = "/shutdown_gateway.php";
        btn.target = "_blank";
        btn.innerHTML = "TẮT MÁY SEB";
        btn.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:9999; background:#ff0000; color:#fff; padding:15px 25px; text-decoration:none; border-radius:8px; font-weight:bold; font-size:16px; box-shadow:0 4px 10px rgba(0,0,0,0.5); border: 2px solid white; transition: transform 0.2s;";
        btn.onmouseover = function() { this.style.transform = "scale(1.05)"; };
        btn.onmouseout = function() { this.style.transform = "scale(1)"; };
        document.body.appendChild(btn);
    }
});
</script>
